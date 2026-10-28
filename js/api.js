const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`Could not connect to the weather service${reason}`);
  }

  if (!response.ok) {
    throw new Error(`Weather service request failed (${response.status} ${response.statusText}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("The weather service returned an invalid response.");
  }
}

export async function searchCity(name) {
  const cityName = name.trim();
  if (!cityName) {
    return [];
  }

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=5`;
  let data;
  try {
    data = await fetchJson(url);
  } catch (error) {
    throw new Error(`City search failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return (data.results ?? []).map((city) => ({
    name: city.name,
    country: city.country ?? "",
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone ?? "UTC",
  }));
}

export async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });

  try {
    const data = await fetchJson(`${FORECAST_URL}?${params}`);
    if (data.error) {
      throw new Error(data.reason || "The weather service could not provide this forecast.");
    }
    if (!data.current || !data.daily || !Array.isArray(data.daily.time)) {
      throw new Error("The weather service returned incomplete forecast data.");
    }
    return data;
  } catch (error) {
    throw new Error(`Forecast request failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
