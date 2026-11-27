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




// ==========================================
// 8. DISPLAY LOCATION SEARCH RESULTS
// ==========================================

function displayLocationResults(results) {
  // Clear previous suggestions
  locationResults.replaceChildren();

  // Display a heading
  const heading = document.createElement("h4");
  heading.textContent = "Select a location:";
  locationResults.appendChild(heading);

  // Create a button for each matching location
  results.forEach(function (place) {
    const button = document.createElement("button");

    // Build the location details
    const details = [
      place.name,
      place.admin2,
      place.admin1,
      place.country,
    ].filter(Boolean);

    // Remove duplicate details
    const uniqueDetails = [...new Set(details)];

    // Display location name and administrative details
    button.textContent = uniqueDetails.join(", ");

    // Make the button select this location
    button.addEventListener("click", function () {
      selectLocation(place);
    });

    // Add the button to the results container
    locationResults.appendChild(button);
  });
}




// ==========================================
// 9. SELECT LOCATION
// ==========================================

async function selectLocation(place) {
  // Clear previous weather, map, and activity results
  clearPreviousResults();

  // Get the selected location's coordinates
  const latitude = place.latitude;
  const longitude = place.longitude;

  // Build the selected location's display name
  const details = [
    place.name,
    place.admin2,
    place.admin1,
    place.country,
  ].filter(Boolean);

  const locationName = [...new Set(details)].join(", ");

  try {
    locationMessage.textContent = `Loading ${locationName}...`;

    // Update the map to the selected location
    map.setView([latitude, longitude], 13);

    // Add a marker to the selected location
    locationMarker = L.marker([latitude, longitude]).addTo(map);
    locationMarker.bindPopup(locationName).openPopup();

    // Load current weather
    await showCurrentWeather(place.name, latitude, longitude);

    // Load weather forecast
    await showWeatherForecast(latitude, longitude);

    // Track whether nearby places loaded successfully
    let placesLoaded = true;

    try {
      // Retrieve nearby places from Geoapify
      const localPlaces = await getLocalPlaces(latitude, longitude);

      // Store the retrieved nearby places
      currentNearbyPlaces = Array.isArray(localPlaces) ? localPlaces : [];

      // Get nearby places with valid names
      const namedPlaces = filterNamedPlaces(currentNearbyPlaces);

      // Display retrieved places in the console
      console.table(
        namedPlaces.map(function (place) {
          const properties = place.properties;

          return {
            name: properties.name,
            category: properties.categories.join(", "),
            address: properties.address_line1 || "",
            city: properties.city || "",
            latitude: properties.lat,
            longitude: properties.lon,
          };
        }),
      );

      console.log("Geoapify places retrieved:", currentNearbyPlaces.length);
    } catch (error) {
      // Handle errors when retrieving nearby places
      placesLoaded = false;
      currentNearbyPlaces = [];

      console.error("Geoapify Error:", error.message);
    }

    // Display activity recommendations
    showActivityRecommendations();

    // Update the location message
    if (placesLoaded) {
      locationMessage.textContent = `Location found: ${locationName}`;
    } else {
      locationMessage.textContent = `Location found: ${locationName}, but nearby places could not be loaded. Check your Geoapify API key.`;
    }
  } catch (error) {
    // Handle location selection errors
    locationMessage.textContent = error.message;

    console.error("Location selection error:", error);
  }
}




// ==========================================
// 10. SEARCH LOCATION
// ==========================================

async function searchLocation() {
  const location = locationInput.value.trim();

  // Clear all previous results before validating the new search
  clearPreviousResults();

  // Check if location is empty
  if (location === "") {
    locationMessage.textContent = "Please enter a location.";

    return;
  }

  // Check API key
  const apiKey = apiKeyInput.value.trim();

  if (apiKey === "") {
    locationMessage.textContent =
      "Please enter your OpenWeather API key first.";

    return;
  }

  try {
    locationMessage.textContent = "Searching location...";

    // Create Geocoding API URL
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=10&language=en&format=json&countryCode=PH`;

    // Send request
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to search for location.");
    }

    // Convert response to JSON
    const data = await response.json();

    // Check if location exists
    if (!data.results || data.results.length === 0) {
      locationMessage.textContent = "Location not found. Try another place.";

      return;
    }

    // Display all matching Philippine locations
    displayLocationResults(data.results);

    // Ask the user to select a location
    locationMessage.textContent =
      "Please select the correct location from the results.";
  } catch (error) {
    locationMessage.textContent = error.message;

    console.error("Search error:", error);
  }
}




// ==========================================
// 11. GET CURRENT WEATHER
// ==========================================

async function getCurrentWeather(latitude, longitude) {
  const apiKey = apiKeyInput.value.trim();

  // Validate the OpenWeather API key
  if (apiKey === "") {
    throw new Error("Please enter your OpenWeather API key.");
  }

  // Create OpenWeather API URL
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  // Send request
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key or key not activated yet.");
    }

    throw new Error(`Weather request failed: ${response.status}`);
  }

  // Convert response to JSON
  const data = await response.json();

  return data;
}




// ==========================================
// 12. DISPLAY CURRENT WEATHER
// ==========================================

async function showCurrentWeather(cityName, latitude, longitude) {
  // Get weather information
  const data = await getCurrentWeather(latitude, longitude);

  // Detect weather category
  currentWeatherType = detectWeatherType(data.weather[0].main);

  console.log("Detected weather type:", currentWeatherType);

  // Get weather HTML elements
  const weatherIcon = document.querySelector(".weather-icon");
  const cityTitle = document.querySelector(".weather-information h3");
  const temperature = document.querySelector(".temperature");
  const description = document.querySelector(".weather-description");

  // Display city name
  cityTitle.textContent = cityName;

  // Display temperature
  temperature.textContent = `${data.main.temp.toFixed(1)}°C`;

  // Display weather description
  description.textContent = data.weather[0].description;

  // Display weather icon
  const iconCode = data.weather[0].icon;

  const iconImage = document.createElement("img");

  iconImage.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  iconImage.alt = data.weather[0].description;
  iconImage.style.width = "85px";

  weatherIcon.replaceChildren(iconImage);

  // Get weather detail elements
  const weatherValues = document.querySelectorAll(
    ".weather-details .weather-detail strong",
  );

  // Display feels-like temperature
  if (weatherValues[0]) {
    weatherValues[0].textContent = `${data.main.feels_like.toFixed(1)}°C`;
  }

  // Display humidity
  if (weatherValues[1]) {
    weatherValues[1].textContent = `${data.main.humidity}%`;
  }

  // Display wind speed
  if (weatherValues[2]) {
    weatherValues[2].textContent = `${data.wind.speed} m/s`;
  }
}




// ==========================================
// 13. GET WEATHER FORECAST
// ==========================================

async function getWeatherForecast(latitude, longitude) {
  const apiKey = apiKeyInput.value.trim();

  // Validate the OpenWeather API key
  if (apiKey === "") {
    throw new Error("Please enter your OpenWeather API key.");
  }

  // Create forecast API URL
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  // Send request
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid OpenWeather API key.");
    }

    throw new Error("Unable to retrieve weather forecast.");
  }

  // Convert response to JSON
  const data = await response.json();

  return data;
}




// ==========================================
// 14. GEOAPIFY PLACES API
// ==========================================

async function getLocalPlaces(latitude, longitude) {
  const apiKey = getGeoapifyKey();

  if (!apiKey) {
    throw new Error("Please enter your Geoapify API key.");
  }

  // Request categories used by the activity database
  const categories =
    "activity.community_center,catering.cafe,catering.restaurant,catering.food_court,commercial.marketplace,commercial.hobby.games,commercial.hobby.art,education.library,entertainment.museum,entertainment.culture,entertainment.cinema,entertainment.amusement_arcade,entertainment.bowling_alley,leisure.park,leisure.picnic,natural.coastal,natural.forest,natural.mountain,natural.protected_area,natural.water.sea,national_park,tourism.attraction,tourism.sights,sport.fishing,sport.sports_centre,sport.sports_hall,beach";

  // Create the Geoapify Places API URL
  const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${longitude},${latitude},10000&limit=500&apiKey=${apiKey}`;

  // Send the API request
  const response = await fetch(url);

  // Check if the request was successful
  if (!response.ok) {
    throw new Error(
      `Unable to retrieve local places. Geoapify returned status ${response.status}.`,
    );
  }

  // Convert the response into JSON
  const data = await response.json();

  // Get the retrieved places
  const places = Array.isArray(data.features) ? data.features : [];

  // Remove places explicitly marked as private or restricted
  const filteredPlaces = places.filter((place) => {
    const properties = place.properties || {};
    const placeCategories = Array.isArray(properties.categories)
      ? properties.categories
      : [];
    const access = properties.access;

    // Check restricted access categories
    const hasRestrictedCategory = placeCategories.some(
      (category) =>
        category === "access_limited" || category.startsWith("access_limited."),
    );

    // Check explicit access information
    const restrictedAccessValues = ["private", "no", "customers", "restricted"];

    const hasRestrictedAccess =
      typeof access === "string" &&
      restrictedAccessValues.includes(access.toLowerCase());

    // Keep only places without an explicit restriction
    return !hasRestrictedCategory && !hasRestrictedAccess;
  });

  // Display filtering results in the console
  console.log("Total places retrieved:", places.length);
  console.log("Places after access filtering:", filteredPlaces.length);
  console.log(
    "Restricted places removed:",
    places.length - filteredPlaces.length,
  );

  // Return the filtered places
  return filteredPlaces;
}

// ==========================================
// FILTER PLACES WITH VALID NAMES
// ==========================================
// Keep named places for readable console output
function filterNamedPlaces(places) {
  if (!Array.isArray(places)) {
    return [];
  }

  return places.filter(function (place) {
    const properties = place && place.properties;

    return (
      properties &&
      typeof properties.name === "string" &&
      properties.name.trim() !== "" &&
      Array.isArray(properties.categories)
    );
  });
}




