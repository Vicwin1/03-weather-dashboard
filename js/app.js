import { getForecast, searchCity } from "./api.js";
import { getWeatherCode } from "./weatherCodes.js";
import {
  clearCityChoices,
  clearStatus,
  renderCityChoices,
  renderFavourites,
  renderWeather,
  setWeatherLoading,
  showStatus,
  updateFavouriteButton,
  updateLocalTime,
  updateUnitButtons,
} from "./ui.js";

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#city-search");
const cityResults = document.querySelector("#city-results");
const favouritesList = document.querySelector("#favourites-list");
const manageFavouritesButton = document.querySelector("#manage-favourites");
const useLocationButton = document.querySelector("#use-location");
const FAVOURITES_KEY = "atmos-favourite-cities";
const LAST_CITY_KEY = "atmos-last-viewed-city";

let favourites = [];
let currentTimezone = "UTC";
let currentWeather;
let storageWarning = "";
let unit = readStoredUnit();
let activeController;
let searchMatches = [];

function readStoredUnit() {
  try {
    return localStorage.getItem("atmos-temperature-unit") === "F" ? "F" : "C";
  } catch (error) {
    storageWarning = error instanceof Error
      ? `Temperature preference could not be read: ${error.message}`
      : "Temperature preference could not be read.";
    return "C";
  }
}

function storeUnit(nextUnit) {
  unit = nextUnit;
  try {
    localStorage.setItem("atmos-temperature-unit", unit);
  } catch {
    storageWarning = "Unit changed for this session; browser storage is unavailable.";
  }
  updateUnitButtons(unit);
  if (currentWeather) {
    renderWeather(currentWeather, unit, isFavourite(currentWeather));
  }
  if (storageWarning) {
    showStatus(storageWarning, "error");
  }
}

function parseLocation(value) {
  if (!value || typeof value !== "object"
    || typeof value.name !== "string"
    || typeof value.country !== "string"
    || !Number.isFinite(value.latitude)
    || !Number.isFinite(value.longitude)) {
    return null;
  }
  return {
    name: value.name,
    country: value.country,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function readStoredFavourites() {
  try {
    const stored = localStorage.getItem(FAVOURITES_KEY);
    if (stored === null) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error("Saved favourites have an invalid format.");
    }
    const locations = parsed.map(parseLocation);
    if (locations.some((location) => location === null)) {
      storageWarning = "Some saved favourites were invalid and have been skipped.";
    }
    return locations.filter(Boolean);
  } catch (error) {
    storageWarning = error instanceof Error
      ? `Could not read saved favourites: ${error.message}`
      : "Could not read saved favourites.";
    return [];
  }
}

function persistFavourites() {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    storageWarning = "";
    return true;
  } catch {
    storageWarning = "Your favourites changed for this session, but could not be saved in browser storage.";
    return false;
  }
}

function persistLastViewed(location) {
  try {
    localStorage.setItem(LAST_CITY_KEY, JSON.stringify(location));
    return true;
  } catch {
    storageWarning = "Weather loaded, but the last viewed city could not be saved in browser storage.";
    return false;
  }
}

function readLastViewed() {
  try {
    return parseLocation(JSON.parse(localStorage.getItem(LAST_CITY_KEY)));
  } catch (error) {
    storageWarning = error instanceof Error
      ? `Could not read your last city: ${error.message}`
      : "Could not read your last city.";
    return null;
  }
}

function isFavourite(location) {
  return favourites.some((saved) => saved.name === location.name
    && saved.country === location.country
    && saved.latitude === location.latitude
    && saved.longitude === location.longitude);
}

function renderSavedLocations() {
  renderFavourites(favourites, currentWeather);
}

function createWeatherModel(city, forecast) {
  const current = forecast.current;
  const currentCode = getWeatherCode(current.weather_code);
  const hourly = forecast.hourly;
  const daily = forecast.daily;
  const firstHour = Math.max(0, hourly.time.findIndex((time) => time >= current.time));

  return {
    ...parseLocation(city),
    city: city.name,
    timezone: forecast.timezone || city.timezone || "UTC",
    temperature: current.temperature_2m,
    condition: currentCode.label,
    icon: currentCode.emoji,
    windSpeed: Math.round(current.wind_speed_10m),
    windUnit: forecast.current_units.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    humidityUnit: forecast.current_units.relative_humidity_2m,
    hourly: hourly.time.slice(firstHour, firstHour + 6).map((time, index) => {
      const hourlyIndex = firstHour + index;
      const code = getWeatherCode(hourly.weather_code[hourlyIndex]);
      return {
        time,
        temperature: hourly.temperature_2m[hourlyIndex],
        condition: code.label,
        icon: code.emoji,
      };
    }),
    forecast: daily.time.map((date, index) => {
      const code = getWeatherCode(daily.weather_code[index]);
      return {
        date,
        condition: code.label,
        icon: code.emoji,
        high: daily.temperature_2m_max[index],
        low: daily.temperature_2m_min[index],
      };
    }),
  };
}

function isCurrentRequest(controller) {
  return activeController === controller && !controller.signal.aborted;
}

function startRequest() {
  activeController?.abort();
  activeController = new AbortController();
  setWeatherLoading(true);
  clearStatus();
  clearCityChoices();
  searchMatches = [];
  showStatus("Fetching weather data…");
  return activeController;
}

function finishLoading() {
  setWeatherLoading(false);
  if (currentWeather) {
    renderWeather(currentWeather, unit, isFavourite(currentWeather));
  } else {
    document.querySelector("#hourly-grid").replaceChildren();
    document.querySelector("#forecast-grid").replaceChildren();
  }
}

function renderLoadedWeather(location, forecast) {
  currentWeather = createWeatherModel(location, forecast);
  currentTimezone = currentWeather.timezone;
  renderWeather(currentWeather, unit, isFavourite(currentWeather));
  renderSavedLocations();
  searchInput.value = currentWeather.name;
  persistLastViewed({
    name: currentWeather.name,
    country: currentWeather.country,
    latitude: currentWeather.latitude,
    longitude: currentWeather.longitude,
  });
  showStatus(storageWarning || `Current weather for ${currentWeather.name} updated from Open-Meteo.`, storageWarning ? "error" : "status");
}

async function loadForecast(location, controller = startRequest()) {
  let forecast;
  try {
    forecast = await getForecast(location.latitude, location.longitude, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    if (isCurrentRequest(controller)) {
      finishLoading();
      showStatus(error instanceof Error ? error.message : "Could not load the weather forecast.", "error");
    }
    return;
  }

  if (!isCurrentRequest(controller)) {
    return;
  }

  try {
    setWeatherLoading(false);
    renderLoadedWeather(location, forecast);
  } catch (error) {
    finishLoading();
    showStatus(error instanceof Error ? `Could not display the forecast: ${error.message}` : "Could not display the forecast.", "error");
  }
}

async function loadWeather(cityName, selectFirstMatch = false) {
  const controller = startRequest();
  let matches;
  try {
    matches = await searchCity(cityName, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    if (isCurrentRequest(controller)) {
      finishLoading();
      showStatus(error instanceof Error ? error.message : "Could not search for that city.", "error");
    }
    return;
  }

  if (!isCurrentRequest(controller)) {
    return;
  }
  if (matches.length === 0) {
    finishLoading();
    showStatus(`We couldn't find "${cityName.trim()}". Check the spelling and try another city.`, "error");
    return;
  }
  if (matches.length > 1 && !selectFirstMatch) {
    finishLoading();
    searchMatches = matches;
    renderCityChoices(matches);
    showStatus("Several locations matched. Choose the city you meant.");
    return;
  }

  const city = matches[0];
  if (selectFirstMatch) {
    searchInput.value = city.name;
  }
  void loadForecast(city, controller);
}

function getGeolocationError(error) {
  if (error.code === 1) {
    return "Location permission was denied. Allow location access in your browser settings, or search for a city instead.";
  }
  if (error.code === 2) {
    return "Your location is unavailable right now. Try again or search for a city.";
  }
  if (error.code === 3) {
    return "Location lookup timed out. Try again or search for a city.";
  }
  return "Could not access your location. Try again or search for a city.";
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser. You can search for a city instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        name: "My location",
        country: "Current location",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
      (error) => reject(new Error(getGeolocationError(error))),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

async function loadUserLocation() {
  const controller = startRequest();
  try {
    const location = await getCurrentPosition();
    if (!isCurrentRequest(controller)) {
      return;
    }
    await loadForecast(location, controller);
  } catch (error) {
    if (isCurrentRequest(controller)) {
      finishLoading();
      showStatus(error instanceof Error ? error.message : "Could not access your location.", "error");
    }
  }
}

async function restoreInitialLocation() {
  favourites = readStoredFavourites();
  renderSavedLocations();
  updateUnitButtons(unit);

  const lastViewed = readLastViewed();
  if (lastViewed) {
    void loadForecast(lastViewed);
    return;
  }

  if (navigator.permissions?.query && navigator.geolocation) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "granted") {
        await loadUserLocation();
        return;
      }
    } catch {
      storageWarning = storageWarning || "Could not check location permission. Use the location button if you want a local forecast.";
    }
  }

  void loadWeather("London", true);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void loadWeather(searchInput.value);
});

cityResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice-index]");
  if (!button) {
    return;
  }
  const city = searchMatches[Number(button.dataset.choiceIndex)];
  if (city) {
    void loadForecast(city);
  }
});

favouritesList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-favourite-index]");
  if (!button) {
    return;
  }
  const location = favourites[Number(button.dataset.favouriteIndex)];
  if (location) {
    void loadForecast(location);
  }
});

document.querySelector("#favourite-toggle").addEventListener("click", () => {
  if (!currentWeather) {
    return;
  }
  const location = {
    name: currentWeather.name,
    country: currentWeather.country,
    latitude: currentWeather.latitude,
    longitude: currentWeather.longitude,
  };
  if (isFavourite(location)) {
    favourites = favourites.filter((saved) => !(
      saved.name === location.name
      && saved.country === location.country
      && saved.latitude === location.latitude
      && saved.longitude === location.longitude
    ));
  } else {
    favourites.push(location);
  }
  persistFavourites();
  renderSavedLocations();
  updateFavouriteButton(isFavourite(location));
  if (storageWarning) {
    showStatus(storageWarning, "error");
  } else {
    showStatus(isFavourite(location)
      ? `${location.name} added to Favourites.`
      : `${location.name} removed from Favourites.`);
  }
});

document.querySelector("#unit-toggle").addEventListener("click", (event) => {
  const button = event.target.closest("[data-unit]");
  if (button && (button.dataset.unit === "C" || button.dataset.unit === "F")) {
    storeUnit(button.dataset.unit);
  }
});

useLocationButton.addEventListener("click", () => {
  void loadUserLocation();
});

manageFavouritesButton.addEventListener("click", () => {
  searchInput.focus();
  showStatus("Add or remove the current city with the star button.");
});

void restoreInitialLocation();

window.setInterval(() => {
  updateLocalTime(currentTimezone);
}, 60_000);
