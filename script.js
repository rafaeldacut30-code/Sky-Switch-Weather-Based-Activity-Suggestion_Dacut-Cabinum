"use strict";

// ==========================================
// 1. MAP INITIALIZATION
// ==========================================

// Initialize the map and center it on the Philippines
const map = L.map("map").setView([12.8797, 121.774], 6);

// Display OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);



// ==========================================
// 2. GET HTML ELEMENTS
// ==========================================

const locationInput = document.getElementById("locationInput");
const searchBtn = document.getElementById("searchBtn");
const locationMessage = document.getElementById("locationMessage");
const apiKeyInput = document.getElementById("apiKey");
const geoapifyKeyInput = document.getElementById("geoapifyKey");
const locationResults = document.getElementById("locationResults");

// Get and clean the Geoapify API key entered by the user
function getGeoapifyKey() {
  return geoapifyKeyInput.value.trim();
}



// ==========================================
// 3. GLOBAL VARIABLES
// ==========================================

let locationMarker = null;
let currentWeatherType = "";
let currentNearbyPlaces = [];



// ==========================================
// 4. CLEAR MAP MARKER
// ==========================================

function clearLocationMarker() {
  if (locationMarker !== null) {
    map.removeLayer(locationMarker);
    locationMarker = null;
  }
}



// ==========================================
// 5. DETECT WEATHER TYPE
// ==========================================

function detectWeatherType(weatherMain) {
  if (weatherMain === "Clear") {
    return "sunny";
  }

  if (weatherMain === "Clouds") {
    return "cloudy";
  }

  if (
    weatherMain === "Rain" ||
    weatherMain === "Drizzle" ||
    weatherMain === "Thunderstorm"
  ) {
    return "rainy";
  }

  return "cloudy";
}




