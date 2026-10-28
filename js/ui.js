const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const forecastDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

export function renderWeather(weather) {
  document.querySelector("#city-name").textContent = weather.city;
  document.querySelector("#country-name").textContent = weather.country || "Country unavailable";
  document.querySelector("#temperature").textContent = weather.temperature;
  document.querySelector("#temperature-unit").textContent = weather.temperatureUnit;
  document.querySelector("#condition").textContent = weather.condition;
  document.querySelector("#weather-icon").textContent = weather.icon;
  document.querySelector("#weather-icon").setAttribute("aria-label", weather.condition);
  document.querySelector("#wind-speed").textContent = weather.windSpeed;
  document.querySelector("#wind-unit").textContent = weather.windUnit;
  document.querySelector("#humidity").textContent = weather.humidity;
  document.querySelector("#humidity-unit").textContent = weather.humidityUnit;
  renderForecast(weather.forecast);
  updateLocalTime(weather.timezone);
  setActiveFavourite(weather.city);
}

export function renderForecast(forecast) {
  const cards = forecast.map((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const dayLabel = index === 0 ? "Today" : forecastDayFormatter.format(date);

    return `
      <article class="forecast-card" aria-label="${dayLabel}: ${day.condition}, high ${day.high} degrees, low ${day.low} degrees">
        <span class="forecast-day">${dayLabel}</span>
        <span class="forecast-icon" aria-hidden="true">${day.icon}</span>
        <span class="forecast-temps"><span>${day.high}°</span><span>${day.low}°</span></span>
      </article>
    `;
  });

  document.querySelector("#forecast-grid").innerHTML = cards.join("");
}

export function renderFavourites(favourites, selectedCity) {
  const list = document.querySelector("#favourites-list");
  list.innerHTML = favourites.map((city) => `
    <li>
      <button
        class="favourite-button"
        type="button"
        data-city="${escapeAttribute(city.name)}"
        aria-current="${city.name.toLowerCase() === selectedCity.toLowerCase()}"
        aria-label="Show weather for ${escapeAttribute(city.name)}, ${escapeAttribute(city.country)}"
      >
        <span class="favourite-emoji" aria-hidden="true">⌖</span>
        <span class="favourite-location">
          <strong>${escapeHtml(city.name)}</strong>
          <span>${escapeHtml(city.country)}</span>
        </span>
      </button>
    </li>
  `).join("");
  document.querySelector("#favourite-count").textContent = String(favourites.length).padStart(2, "0");
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

function setActiveFavourite(cityName) {
  document.querySelectorAll(".favourite-button").forEach((button) => {
    button.setAttribute("aria-current", String(button.dataset.city.toLowerCase() === cityName.toLowerCase()));
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
