# Atmos Weather Dashboard

A responsive weather dashboard built with plain HTML, CSS, and JavaScript ES modules. No framework or API key is required.

## Features

- Current conditions and a seven-day forecast.
- Search with a location picker when multiple cities match.
- Save and remove favourite locations with the star button. Favourites persist in `localStorage`.
- Select a saved favourite to load its forecast.
- Use the browser's location permission to load nearby weather.
- Restore the last viewed city on the next visit. If there is no saved city, the app uses location only when the browser has already granted permission; otherwise it starts with London.
- Switch between Celsius and Fahrenheit. The unit preference persists in `localStorage`.
- Skeleton loading cards while requests are in progress.
- Responsive glassmorphism-inspired layout and accessible status/error messages.

## API

Weather data is provided by Open-Meteo:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

The app requests city matches, then loads current weather and daily high/low data for the selected coordinates. No API key is needed. Browser geolocation requires the user to grant permission and may require a secure context (HTTPS or localhost).

## Run locally

Open `index.html` in a browser. If ES modules or location permissions are restricted for local files, serve the folder from localhost using any static web server.

## Screenshots

<!-- Add a screenshot of the dashboard here. -->

## What I learned

- How to compose independent ES modules and use Open-Meteo's geocoding and forecast APIs.
- How to handle asynchronous requests, cancellation, loading states, and location permission errors.
- How to build dynamic UI with DOM methods and `textContent` rather than inserting untrusted strings as HTML.
- How to persist preferences and saved locations with `localStorage`.
- How to format dates and temperatures for a responsive, accessible interface.
