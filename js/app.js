import { getForecast, searchCity } from "./api.js";
import { getWeatherCode } from "./weatherCodes.js";
import {
  clearStatus,
  renderFavourites,
  renderWeather,
  showStatus,
  updateLocalTime,
} from "./ui.js";

const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#city-search");
const favouritesList = document.querySelector("#favourites-list");
const manageFavouritesButton = document.querySelector("#manage-favourites");

const favourites = [
  { name: "London", country: "United Kingdom" },
  { name: "New York", country: "United States" },
  { name: "Tokyo", country: "Japan" },
  { name: "Paris", country: "France" },
];

let currentTimezone = "UTC";
let requestId = 0;

function createWeatherModel(city, forecast) {
  const current = forecast.current;
  const currentCode = getWeatherCode(current.weather_code);
  const daily = forecast.daily;

  return {
    city: city.name,
    country: city.country,
    timezone: forecast.timezone || city.timezone,
    temperature: Math.round(current.temperature_2m),
    temperatureUnit: forecast.current_units.temperature_2m,
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
        high: Math.round(daily.temperature_2m_max[index]),
        low: Math.round(daily.temperature_2m_min[index]),
      };
    }),
  };
}

async function loadWeather(cityName) {
  const city = cityName.trim();
  const currentRequestId = ++requestId;
  clearStatus();
  showStatus("Loading…");

  let matches;
  try {
    matches = await searchCity(city);
  } catch (error) {
    if (currentRequestId === requestId) {
      showStatus(error instanceof Error ? error.message : "Could not search for that city.", "error");
    }
    return;
  }

  if (currentRequestId !== requestId) {
    return;
  }
  if (matches.length === 0) {
    showStatus(`We couldn't find "${city}". Check the spelling and try another city.`, "error");
    return;
  }

  let forecast;
  try {
    forecast = await getForecast(matches[0].latitude, matches[0].longitude);
  } catch (error) {
    if (currentRequestId === requestId) {
      showStatus(error instanceof Error ? error.message : "Could not load the weather forecast.", "error");
    }
    return;
  }

  if (currentRequestId !== requestId) {
    return;
  }

  const weather = createWeatherModel(matches[0], forecast);
  currentTimezone = weather.timezone;
  renderWeather(weather);
  renderFavourites(favourites, weather.city);
  searchInput.value = weather.city;
  showStatus(`Current weather for ${weather.city} updated from Open-Meteo.`);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void loadWeather(searchInput.value);
});

favouritesList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-city]");
  if (button) {
    void loadWeather(button.dataset.city);
  }
});

manageFavouritesButton.addEventListener("click", () => {
  searchInput.focus();
  showStatus("Search for a city or choose one of your saved locations.");
});

renderFavourites(favourites, "");
void loadWeather("London");

window.setInterval(() => {
  updateLocalTime(currentTimezone);
}, 60_000);
