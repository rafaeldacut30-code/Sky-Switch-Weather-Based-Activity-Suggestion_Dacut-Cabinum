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




// ==========================================
// 15. DISPLAY WEATHER FORECAST
// ==========================================

async function showWeatherForecast(latitude, longitude) {
  // Get forecast data
  const data = await getWeatherForecast(latitude, longitude);

  // Get forecast container
  const forecastDetails = document.getElementById("forecastDetails");

  // Clear previous forecast
  forecastDetails.replaceChildren();

  // Store best forecast for each day
  const dailyForecasts = {};

  // Check every forecast entry
  data.list.forEach(function (item) {
    // Adjust time using location timezone
    const localDate = new Date((item.dt + data.city.timezone) * 1000);

    // Get local date
    const dateKey = localDate.toISOString().split("T")[0];

    // Get local hour
    const hour = localDate.getUTCHours();

    // Choose forecast closest to 12 noon
    const difference = Math.abs(hour - 12);

    if (
      !dailyForecasts[dateKey] ||
      difference < dailyForecasts[dateKey].difference
    ) {
      dailyForecasts[dateKey] = {
        item: item,
        date: localDate,
        difference: difference,
      };
    }
  });

  // Display up to five daily forecasts
  const days = Object.values(dailyForecasts).slice(0, 5);

  days.forEach(function (forecast) {
    const item = forecast.item;

    // Create forecast card
    const card = document.createElement("div");
    card.className = "forecast-card";

    // Display date
    const date = document.createElement("h4");

    date.textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(forecast.date);

    // Display weather icon
    const icon = document.createElement("img");

    icon.src = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;

    icon.alt = item.weather[0].description;
    icon.width = 55;

    // Display temperature
    const temperature = document.createElement("p");

    temperature.textContent = `${Math.round(item.main.temp)}°C`;

    // Display weather description
    const description = document.createElement("p");

    description.textContent = item.weather[0].description;

    // Add elements to forecast card
    card.append(date, icon, temperature, description);

    // Add card to webpage
    forecastDetails.appendChild(card);
  });
}




// ==========================================
// 16. ACTIVITY RECOMMENDATION DATABASE
// ==========================================

const activities = [
  {
    name: "Beach Picnic",
    description:
      "Enjoy a relaxing picnic near the coast while appreciating the sea view.",
    image: "images/beach-picnic.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["beach"],
  },
  {
    name: "Nature Hiking",
    description: "Explore scenic trails and enjoy the natural surroundings.",
    image: "images/nature-hiking.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: [
      "natural.forest",
      "natural.mountain",
      "natural.protected_area",
      "leisure.park",
      "national_park",
    ],
  },
  {
    name: "Museum Visit",
    description: "Discover local history, culture, and interesting exhibits.",
    image: "images/museum.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.museum"],
  },
  {
    name: "Indoor Café Visit",
    description: "Relax at a local café and enjoy a warm drink or snack.",
    image: "images/cafe.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["catering.cafe"],
  },
  {
    name: "Coastal Sightseeing",
    description: "Explore the coastline and enjoy scenic ocean views.",
    image: "images/coastal-sightseeing.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: [
      "beach",
      "natural.coastal",
      "natural.water.sea",
      "tourism.attraction.viewpoint",
    ],
  },
  {
    name: "Fishing Village Tour",
    description:
      "Discover the daily life and local culture of a fishing community.",
    image: "images/fishing-village.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: [],
  },
  {
    name: "Mountain Viewpoint Visit",
    description:
      "Visit a scenic viewpoint and appreciate the surrounding landscape.",
    image: "images/mountain-viewpoint.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["tourism.attraction.viewpoint"],
  },
  {
    name: "Park Exploration",
    description: "Take a relaxing walk through a nearby public park.",
    image: "images/park-exploration.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["leisure.park"],
  },
  {
    name: "Local Food Trip",
    description:
      "Discover local dishes and enjoy the food culture of the area.",
    image: "images/food-trip.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["catering.restaurant", "catering.food_court"],
  },
  {
    name: "Art Gallery Visit",
    description: "Explore artworks and learn about local creativity.",
    image: "images/art-gallery.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: [
      "entertainment.culture.gallery",
      "entertainment.culture.arts_centre",
    ],
  },
  {
    name: "Library Visit",
    description: "Spend some quiet time reading or discovering new books.",
    image: "images/library.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["education.library"],
  },
  {
    name: "Covered Market Visit",
    description:
      "Explore a local market and discover fresh produce, goods, and local products.",
    image: "images/covered-market.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["commercial.marketplace"],
  },
  {
    name: "Indoor Photography",
    description: "Explore indoor spaces and practice creative photography.",
    image: "images/indoor-photography.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.museum"],
  },
  {
    name: "Local Cultural Center",
    description:
      "Learn about the traditions, heritage, and culture of the local community.",
    image: "images/cultural-center.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["activity.community_center"],
  },
  {
    name: "Indoor Board Games",
    description:
      "Enjoy a relaxing indoor session with fun and challenging board games.",
    image: "images/board-games.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["commercial.hobby.games"],
  },
  {
    name: "Cooking Workshop",
    description:
      "Learn simple cooking techniques and prepare delicious local dishes.",
    image: "images/cooking-workshop.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: [],
  },
  {
    name: "Indoor Craft Workshop",
    description:
      "Explore your creativity through hands-on arts and crafts activities.",
    image: "images/craft-workshop.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: [
      "entertainment.culture.arts_centre",
      "commercial.hobby.art",
    ],
  },
  {
    name: "Movie Afternoon",
    description:
      "Enjoy a relaxing afternoon watching a movie in a nearby cinema.",
    image: "images/movie-afternoon.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.cinema"],
  },
  {
    name: "Local History Tour",
    description:
      "Discover important historical places and learn about the area's past.",
    image: "images/history-tour.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: [
      "tourism.sights.archaeological_site",
      "tourism.sights.building",
      "tourism.sights.memorial",
    ],
  },
  {
    name: "Indoor Recreation",
    description:
      "Spend time enjoying relaxing recreational activities in an indoor facility.",
    image: "images/indoor-recreation.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: [
      "sport.sports_centre",
      "sport.sports_hall",
      "entertainment.bowling_alley",
    ],
  },
  {
    name: "Indoor Study Session",
    description:
      "Spend a productive and peaceful time studying or reading in a quiet indoor space.",
    image: "images/study-session.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["education.library"],
  },
  {
    name: "Botanical Garden Visit",
    description:
      "Explore beautiful gardens and appreciate different plant species and flowers.",
    image: "images/botanical-garden.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["leisure.park"],
  },
  {
    name: "Birdwatching Adventure",
    description:
      "Observe different bird species and appreciate the wildlife in natural surroundings.",
    image: "images/birdwatching.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["natural.forest"],
  },
  {
    name: "Nature Photography Walk",
    description:
      "Capture scenic landscapes, plants, and beautiful natural surroundings.",
    image: "images/nature-photography.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["leisure.park", "natural.mountain", "natural.forest"],
  },
  {
    name: "Scenic Viewpoint Exploration",
    description:
      "Discover scenic viewpoints and enjoy beautiful views of the surrounding landscape.",
    image: "images/scenic-viewpoint.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["tourism.attraction.viewpoint"],
  },
  {
    name: "Heritage Landmark Tour",
    description:
      "Explore historical landmarks and appreciate local architecture and heritage.",
    image: "images/heritage-landmark.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["tourism.sights.memorial"],
  },
  {
    name: "Local Market Shopping",
    description:
      "Discover local products, fresh goods, and interesting items from nearby markets.",
    image: "images/local-market.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["commercial.marketplace"],
  },
  {
    name: "Food Court Discovery",
    description:
      "Explore different food stalls and discover a variety of local dishes.",
    image: "images/food-court.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["catering.food_court"],
  },
  {
    name: "Café Study Break",
    description:
      "Enjoy refreshments and take a relaxing break in a nearby café.",
    image: "images/cafe-study.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["catering.cafe"],
  },
  {
    name: "Bowling Challenge",
    description:
      "Enjoy a friendly bowling game and practice your bowling skills.",
    image: "images/bowling.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.bowling_alley"],
  },
  {
    name: "Arcade Adventure",
    description:
      "Discover arcade games and enjoy an entertaining indoor gaming experience.",
    image: "images/arcade.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.amusement_arcade"],
  },
  {
    name: "Indoor Sports Session",
    description:
      "Enjoy recreational sports and physical activities in an indoor sports facility.",
    image: "images/indoor-sports.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["sport.sports_hall"],
  },
  {
    name: "Creative Art Session",
    description:
      "Explore your creativity through drawing, painting, and other artistic activities.",
    image: "images/creative-art.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["commercial.hobby.art"],
  },
  {
    name: "Community Center Visit",
    description:
      "Explore local community spaces and discover their available facilities.",
    image: "images/community-center.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["activity.community_center"],
  },
  {
    name: "Art Exhibition Exploration",
    description:
      "Appreciate paintings, creative displays, and artistic exhibitions.",
    image: "images/art-exhibition.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.culture.gallery"],
  },
  {
    name: "Cultural Arts Exploration",
    description:
      "Discover local arts, cultural displays, and creative traditions.",
    image: "images/cultural-arts.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["entertainment.culture.arts_centre"],
  },
  {
    name: "Archaeological Site Exploration",
    description:
      "Learn about historical places and explore archaeological landmarks.",
    image: "images/archaeological-site.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["tourism.sights.archaeological_site"],
  },
  {
    name: "National Park Exploration",
    description:
      "Discover protected natural areas and appreciate their scenic surroundings.",
    image: "images/national-park.jpg",
    weather: ["sunny", "cloudy"],
    placeCategories: ["national_park"],
  },
  {
    name: "Hobby and Games Discovery",
    description:
      "Explore hobby shops and discover different games and recreational interests.",
    image: "images/hobby-games.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["commercial.hobby.games"],
  },
  {
    name: "Recreation Center Visit",
    description:
      "Explore recreational facilities and discover available indoor sports activities.",
    image: "images/recreation-center.jpg",
    weather: ["sunny", "cloudy", "rainy"],
    placeCategories: ["sport.sports_centre"],
  },
];




// ==========================================
// 17. FILTER RECOMMENDED ACTIVITIES
// ==========================================
// Store recommended activities
let recommendedActivities = [];

// Track current activity
let currentActivityIndex = 0;

// Get recommended activities
function getRecommendedActivities() {
  // Keep only nearby places that have valid names
  const namedPlaces = filterNamedPlaces(currentNearbyPlaces);

  return (
    activities
      .map(function (activity) {
        // Check whether the current weather is suitable
        const weatherMatches =
          Array.isArray(activity.weather) &&
          activity.weather.includes(currentWeatherType);

        // Get the activity's required categories
        const requiredCategories = Array.isArray(activity.placeCategories)
          ? activity.placeCategories
          : [];

        // Exclude activities with unsuitable weather or no categories
        if (!weatherMatches || requiredCategories.length === 0) {
          return null;
        }

        // Find all named nearby places matching this activity
        const matchedPlaces = namedPlaces.filter(function (place) {
          const actualCategories = place?.properties?.categories;

          if (!Array.isArray(actualCategories)) {
            return false;
          }

          // Check whether an actual category matches a required category
          return requiredCategories.some(function (requiredCategory) {
            return actualCategories.some(function (actualCategory) {
              return (
                typeof actualCategory === "string" &&
                actualCategory === requiredCategory
              );
            });
          });
        });

        // Exclude activities without a matching named nearby place
        if (matchedPlaces.length === 0) {
          return null;
        }

        // Return the activity together with its matching nearby places
        return {
          ...activity,
          matchedPlaces: matchedPlaces,
        };
      })
      // Remove activities that did not pass the filters
      .filter(function (activity) {
        return activity !== null;
      })
  );
}




// ==========================================//
// 18. DISPLAY ACTIVITY RECOMMENDATIONS
// ==========================================//
// Display one activity at a time
function showActivityRecommendations() {
  const activityImageContainer = document.getElementById(
    "activityImageContainer",
  );

  const activityName = document.getElementById("activityName");

  const activityDescription = document.getElementById("activityDescription");

  const activityCounter = document.getElementById("activityCounter");

  const nextActivityBtn = document.getElementById("nextActivityBtn");

  // Get filtered activities
  recommendedActivities = getRecommendedActivities();

  // Reset activity index
  currentActivityIndex = 0;

  // Check if activities exist
  if (recommendedActivities.length === 0) {
    activityImageContainer.replaceChildren();
    document.getElementById("activityPlace").replaceChildren();
    activityName.textContent = "No Activities Found";

    activityDescription.textContent =
      "No activities match the current location and weather.";

    activityCounter.textContent = "0 of 0 activities";

    nextActivityBtn.disabled = true;

    return;
  }

  // Display first activity
  displayCurrentActivity();
}




//==========================================
// 19. DISPLAY CURRENT ACTIVITY
//==========================================
// Display current activity
function displayCurrentActivity() {
  const activityImageContainer = document.getElementById(
    "activityImageContainer",
  );

  const activityName = document.getElementById("activityName");

  const activityPlace = document.getElementById("activityPlace");

  const activityDescription = document.getElementById("activityDescription");

  const activityCounter = document.getElementById("activityCounter");

  const nextActivityBtn = document.getElementById("nextActivityBtn");

  // Get selected activity
  const activity = recommendedActivities[currentActivityIndex];

  // Create image
  const image = document.createElement("img");

  image.src = activity.image;
  image.alt = activity.name;

  // Replace image placeholder
  activityImageContainer.replaceChildren(image);

  // Display activity information
  activityName.textContent = activity.name;

  // Get all matching nearby places
  const matchedPlaces = activity.matchedPlaces || [];

  // Clear previous nearby place information
  activityPlace.replaceChildren();

  // Display all matching nearby places
  if (matchedPlaces.length > 0) {
    const placeTitle = document.createElement("p");
    placeTitle.textContent = "📍 Nearby places:";
    activityPlace.appendChild(placeTitle);

    const placeList = document.createElement("ul");

    matchedPlaces.forEach(function (place) {
      const listItem = document.createElement("li");

      const placeName = place.properties.name;
      const latitude = place.properties.lat;
      const longitude = place.properties.lon;

      // Create a link to the place on Google Maps//
      const placeLink = document.createElement("a");

      placeLink.textContent = placeName;
      placeLink.href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      placeLink.target = "_blank";
      placeLink.rel = "noopener noreferrer";

      listItem.appendChild(placeLink);

      placeList.appendChild(listItem);
    });

    activityPlace.appendChild(placeList);
  } else {
    activityPlace.textContent = "📍 No specific nearby place found.";
  }

  activityDescription.textContent = activity.description;

  // Update activity counter
  activityCounter.textContent = `${currentActivityIndex + 1} of ${recommendedActivities.length} activities`;

  // Update button
  nextActivityBtn.disabled = recommendedActivities.length <= 1;

  nextActivityBtn.textContent =
    currentActivityIndex === recommendedActivities.length - 1
      ? "Start Again ↻"
      : "Next Activity →";
}



