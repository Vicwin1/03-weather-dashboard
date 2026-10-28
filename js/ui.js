const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const forecastDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
});

function convertTemperature(celsius, unit) {
  return Math.round(unit === "F" ? (celsius * 9) / 5 + 32 : celsius);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

export function renderWeather(weather, unit) {
  document.querySelector("#city-name").textContent = weather.city;
  document.querySelector("#country-name").textContent = weather.country || "Country unavailable";
  document.querySelector("#temperature").textContent = convertTemperature(weather.temperature, unit);
  document.querySelector("#temperature-unit").textContent = `°${unit}`;
  document.querySelector("#condition").textContent = weather.condition;
  document.querySelector("#weather-icon").textContent = weather.icon;
  document.querySelector("#weather-icon").setAttribute("aria-label", weather.condition);
  document.querySelector("#wind-speed").textContent = weather.windSpeed;
  document.querySelector("#wind-unit").textContent = weather.windUnit;
  document.querySelector("#humidity").textContent = weather.humidity;
  document.querySelector("#humidity-unit").textContent = weather.humidityUnit;
  renderForecast(weather.forecast, unit);
  updateLocalTime(weather.timezone);
  setActiveFavourite(weather.city, weather.country);
}

export function renderForecast(forecast, unit) {
  const grid = document.querySelector("#forecast-grid");
  const cards = forecast.map((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const dayLabel = index === 0 ? "Today" : forecastDayFormatter.format(date);
    const card = makeElement("article", "forecast-card");
    card.setAttribute(
      "aria-label",
      `${dayLabel}: ${day.condition}, high ${convertTemperature(day.high, unit)} degrees, low ${convertTemperature(day.low, unit)} degrees`,
    );

    card.append(
      makeElement("span", "forecast-day", dayLabel),
    );
    const icon = makeElement("span", "forecast-icon", day.icon);
    icon.setAttribute("aria-hidden", "true");
    card.append(icon);

    const temperatures = makeElement("span", "forecast-temps");
    temperatures.append(
      makeElement("span", "", `${convertTemperature(day.high, unit)}°`),
      makeElement("span", "", `${convertTemperature(day.low, unit)}°`),
    );
    card.append(temperatures);
    return card;
  });
  grid.replaceChildren(...cards);
}

export function renderFavourites(favourites, selectedCity, selectedCountry = "") {
  const list = document.querySelector("#favourites-list");
  const items = favourites.map((city) => {
    const item = makeElement("li");
    const button = makeElement("button", "favourite-button");
    button.type = "button";
    button.dataset.city = city.name;
    button.setAttribute(
      "aria-current",
      String(city.name.toLowerCase() === selectedCity.toLowerCase()
        && city.country.toLowerCase() === selectedCountry.toLowerCase()),
    );
    button.setAttribute("aria-label", `Show weather for ${city.name}, ${city.country}`);

    const icon = makeElement("span", "favourite-emoji", "⌖");
    icon.setAttribute("aria-hidden", "true");
    const location = makeElement("span", "favourite-location");
    location.append(
      makeElement("strong", "", city.name),
      makeElement("span", "", city.country),
    );
    button.append(icon, location);
    item.append(button);
    return item;
  });
  list.replaceChildren(...items);
  document.querySelector("#favourite-count").textContent = String(favourites.length).padStart(2, "0");
}

export function renderCityChoices(cities) {
  const results = document.querySelector("#city-results");
  const items = cities.map((city, index) => {
    const item = makeElement("li");
    const button = makeElement("button", "city-choice");
    button.type = "button";
    button.dataset.choiceIndex = String(index);
    const parts = [city.name, city.region, city.country].filter(Boolean);
    button.textContent = parts.join(", ");
    item.append(button);
    return item;
  });
  results.replaceChildren(...items);
  results.hidden = cities.length === 0;
  document.querySelector("#city-search").setAttribute("aria-expanded", String(cities.length > 0));
}

export function clearCityChoices() {
  renderCityChoices([]);
}

export function updateUnitButtons(unit) {
  for (const button of document.querySelectorAll("[data-unit]")) {
    button.setAttribute("aria-pressed", String(button.dataset.unit === unit));
  }
}

export function updateLocalTime(timezone) {
  const localTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date());
  document.querySelector("#local-time").textContent = localTime;
  document.querySelector("#header-date").textContent = dateFormatter.format(new Date());
}

export function showStatus(message, type = "status") {
  const status = document.querySelector("#status-message");
  status.textContent = message;
  status.hidden = false;
  status.setAttribute("role", type === "error" ? "alert" : "status");
}

export function clearStatus() {
  const status = document.querySelector("#status-message");
  status.hidden = true;
  status.textContent = "";
  status.setAttribute("role", "status");
}

function setActiveFavourite(cityName, countryName) {
  document.querySelectorAll(".favourite-button").forEach((button) => {
    const country = button.querySelector(".favourite-location span")?.textContent ?? "";
    button.setAttribute(
      "aria-current",
      String(button.dataset.city.toLowerCase() === cityName.toLowerCase()
        && country.toLowerCase() === countryName.toLowerCase()),
    );
  });
}
