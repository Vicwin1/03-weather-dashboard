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

export function renderWeather(weather, unit, isFavourite) {
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
  updateFavouriteButton(isFavourite);
  renderHourlyForecast(weather.hourly, unit);
  renderForecast(weather.forecast, unit);
  updateLocalTime(weather.timezone);
  setActiveFavourite(weather.city, weather.country);
}

export function renderHourlyForecast(hours, unit) {
  const grid = document.querySelector("#hourly-grid");
  const cards = hours.map((hour, index) => {
    const localDate = new Date(`${hour.time}:00Z`);
    const hourLabel = index === 0
      ? "Now"
      : new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(localDate);
    const card = makeElement("article", "hourly-card");
    card.setAttribute(
      "aria-label",
      `${hourLabel}: ${hour.condition}, ${convertTemperature(hour.temperature, unit)} degrees`,
    );
    card.append(makeElement("span", "hourly-time", hourLabel));
    const icon = makeElement("span", "hourly-icon", hour.icon);
    icon.setAttribute("aria-hidden", "true");
    card.append(icon);
    card.append(makeElement("span", "hourly-temperature", `${convertTemperature(hour.temperature, unit)}°`));
    return card;
  });
  grid.replaceChildren(...cards);
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

export function renderFavourites(favourites, selectedLocation = {}) {
  const list = document.querySelector("#favourites-list");
  const items = favourites.map((city, index) => {
    const item = makeElement("li");
    const button = makeElement("button", "favourite-button");
    button.type = "button";
    button.dataset.favouriteIndex = String(index);
    button.setAttribute(
      "aria-current",
      String(city.name.toLowerCase() === (selectedLocation.name ?? "").toLowerCase()
        && city.country.toLowerCase() === (selectedLocation.country ?? "").toLowerCase()
        && city.latitude === selectedLocation.latitude
        && city.longitude === selectedLocation.longitude),
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
  document.querySelector("#favourites-empty").hidden = favourites.length > 0;
  list.hidden = favourites.length === 0;
}

export function updateFavouriteButton(isFavourite) {
  const button = document.querySelector("#favourite-toggle");
  button.textContent = isFavourite ? "★" : "☆";
  button.setAttribute("aria-pressed", String(isFavourite));
  button.setAttribute("aria-label", isFavourite ? "Remove city from favourites" : "Add city to favourites");
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

export function setWeatherLoading(isLoading) {
  const hero = document.querySelector("#current-weather");
  const grid = document.querySelector("#forecast-grid");

  hero.classList.toggle("is-loading", isLoading);
  hero.setAttribute("aria-busy", String(isLoading));
  const existingSkeleton = hero.querySelector(".weather-skeleton");
  if (isLoading && !existingSkeleton) {
    const skeleton = makeElement("div", "weather-skeleton");
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.append(
      makeElement("span", "skeleton-line skeleton-title"),
      makeElement("span", "skeleton-line skeleton-city"),
      makeElement("span", "skeleton-line skeleton-temperature"),
      makeElement("span", "skeleton-line skeleton-condition"),
      makeElement("span", "skeleton-line skeleton-details"),
    );
    hero.append(skeleton);
  } else if (!isLoading) {
    existingSkeleton?.remove();
  }

  if (isLoading) {
    const hourlyCards = Array.from({ length: 6 }, () => {
      const card = makeElement("div", "hourly-skeleton");
      card.setAttribute("aria-hidden", "true");
      card.append(
        makeElement("span", "skeleton-line skeleton-day"),
        makeElement("span", "skeleton-line skeleton-weather-icon"),
        makeElement("span", "skeleton-line skeleton-temperatures"),
      );
      return card;
    });
    document.querySelector("#hourly-grid").replaceChildren(...hourlyCards);

    const cards = Array.from({ length: 7 }, () => {
      const card = makeElement("div", "forecast-skeleton");
      card.setAttribute("aria-hidden", "true");
      card.append(
        makeElement("span", "skeleton-line skeleton-day"),
        makeElement("span", "skeleton-line skeleton-weather-icon"),
        makeElement("span", "skeleton-line skeleton-temperatures"),
      );
      return card;
    });
    grid.replaceChildren(...cards);
  }
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
    const name = button.querySelector(".favourite-location strong")?.textContent ?? "";
    const country = button.querySelector(".favourite-location span")?.textContent ?? "";
    button.setAttribute(
      "aria-current",
      String(name.toLowerCase() === cityName.toLowerCase()
        && country.toLowerCase() === (countryName ?? "").toLowerCase()),
    );
  });
}
