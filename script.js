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



