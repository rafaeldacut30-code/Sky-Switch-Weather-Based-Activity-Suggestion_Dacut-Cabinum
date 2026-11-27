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




// ==========================================
// 6. CLEAR PREVIOUS SEARCH RESULTS
// ==========================================

function clearPreviousResults() {
  // Clear previous location search results
  locationResults.replaceChildren();

  // Clear previous nearby places and weather category
  currentNearbyPlaces = [];
  currentWeatherType = "";

  // Clear previous recommendations
  recommendedActivities = [];
  currentActivityIndex = 0;

  // Clear the map marker
  clearLocationMarker();

  // Clear current weather information
  document.querySelector(".weather-information h3").textContent = "";
  document.querySelector(".temperature").textContent = "";
  document.querySelector(".weather-description").textContent = "";

  // Clear current weather icon
  document.querySelector(".weather-icon").replaceChildren();

  // Clear weather details
  document
    .querySelectorAll(".weather-details .weather-detail strong")
    .forEach(function (element) {
      element.textContent = "";
    });

  // Clear previous weather forecast
  document.getElementById("forecastDetails").replaceChildren();

  // Clear previous activity card
  document.getElementById("activityImageContainer").replaceChildren();

  document.getElementById("activityName").textContent = "";

  document.getElementById("activityDescription").textContent = "";

  document.getElementById("activityPlace").replaceChildren();

  document.getElementById("activityCounter").textContent = "0 of 0 activities";

  // Disable Next Activity button
  const nextActivityBtn = document.getElementById("nextActivityBtn");

  nextActivityBtn.disabled = true;
  nextActivityBtn.textContent = "Next Activity →";
}




// ==========================================
// 7. SEARCH LOCATION
// ==========================================

// Search button event listener
searchBtn.addEventListener("click", searchLocation);

// ==========================================
// LOCATION INPUT LISTENER
// ==========================================

// Detect changes in the location search input
locationInput.addEventListener("input", function () {
  // Remove old location suggestions when the search changes
  locationResults.replaceChildren();

  if (locationInput.value.trim() === "") {
    clearLocationMarker();

    locationMessage.textContent = "Search for a Philippine location.";
  }
});




