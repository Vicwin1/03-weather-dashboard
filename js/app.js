import { getForecast, searchCity } from "./api.js";
import { getWeatherCode } from "./weatherCodes.js";
import {
  clearCityChoices,
  clearStatus,
  renderCityChoices,
  renderFavourites,
  renderWeather,
  showStatus,
  updateLocalTime,
  updateUnitButtons,
} from "./ui.js";

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#city-search");
const cityResults = document.querySelector("#city-results");
const favouritesList = document.querySelector("#favourites-list");
const manageFavouritesButton = document.querySelector("#manage-favourites");
const favourites = [
  { name: "London", country: "United Kingdom" },
  { name: "New York", country: "United States" },
  { name: "Tokyo", country: "Japan" },
  { name: "Paris", country: "France" },
];

let currentTimezone = "UTC";
let currentWeather;
let unit = readStoredUnit();
let activeController;
let searchMatches = [];

function readStoredUnit() {
  try {
    return localStorage.getItem("atmos-temperature-unit") === "F" ? "F" : "C";
  } catch {
    return "C";
  }
}

function storeUnit(nextUnit) {
  unit = nextUnit;
  try {
    localStorage.setItem("atmos-temperature-unit", unit);
  } catch {
    showStatus("Unit changed for this session; browser storage is unavailable.");
  }
  updateUnitButtons(unit);
  if (currentWeather) {
    renderWeather(currentWeather, unit);
  }
}

function createWeatherModel(city, forecast) {
  const current = forecast.current;
  const currentCode = getWeatherCode(current.weather_code);
  const daily = forecast.daily;

  return {
    city: city.name,
    country: city.country,
    timezone: forecast.timezone || city.timezone,
    temperature: current.temperature_2m,
    condition: currentCode.label,
    icon: currentCode.emoji,
    windSpeed: Math.round(current.wind_speed_10m),
    windUnit: forecast.current_units.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    humidityUnit: forecast.current_units.relative_humidity_2m,
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

async function loadForecast(city, controller) {
  let forecast;
  try {
    forecast = await getForecast(city.latitude, city.longitude, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    if (isCurrentRequest(controller)) {
      showStatus(error instanceof Error ? error.message : "Could not load the weather forecast.", "error");
    }
    return;
  }

  if (!isCurrentRequest(controller)) {
    return;
  }

  try {
    currentWeather = createWeatherModel(city, forecast);
    currentTimezone = currentWeather.timezone;
    renderWeather(currentWeather, unit);
    renderFavourites(favourites, currentWeather.city, currentWeather.country);
    searchInput.value = currentWeather.city;
    showStatus(`Current weather for ${currentWeather.city} updated from Open-Meteo.`);
  } catch (error) {
    showStatus(error instanceof Error ? `Could not display the forecast: ${error.message}` : "Could not display the forecast.", "error");
  }
}

async function loadWeather(cityName) {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  clearStatus();
  clearCityChoices();
  searchMatches = [];
  showStatus("Loading…");

  let matches;
  try {
    matches = await searchCity(cityName, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    if (isCurrentRequest(controller)) {
      showStatus(error instanceof Error ? error.message : "Could not search for that city.", "error");
    }
    return;
  }

  if (!isCurrentRequest(controller)) {
    return;
  }
  if (matches.length === 0) {
    showStatus(`We couldn't find "${cityName.trim()}". Check the spelling and try another city.`, "error");
    return;
  }
  if (matches.length > 1) {
    searchMatches = matches;
    renderCityChoices(matches);
    showStatus("Several locations matched. Choose the city you meant.");
    return;
  }

  void loadForecast(matches[0], controller);
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
    clearCityChoices();
    showStatus("Loading…");
    void loadForecast(city, activeController);
  }
});

favouritesList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-city]");
  if (button) {
    void loadWeather(button.dataset.city);
  }
});

document.querySelector("#unit-toggle").addEventListener("click", (event) => {
  const button = event.target.closest("[data-unit]");
  if (button && (button.dataset.unit === "C" || button.dataset.unit === "F")) {
    storeUnit(button.dataset.unit);
  }
});

manageFavouritesButton.addEventListener("click", () => {
  searchInput.focus();
  showStatus("Search for a city or choose one of your saved locations.");
});

renderFavourites(favourites, "");
updateUnitButtons(unit);
void loadWeather("London");

window.setInterval(() => {
  updateLocalTime(currentTimezone);
}, 60_000);
