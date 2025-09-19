const apiKey = "3711c6cfff0c4fbcb84192432251909";
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherCard = document.getElementById("weatherCard");
const errorMessage = document.getElementById("errorMessage");
const loader = document.getElementById("loader");
const themeToggle = document.getElementById("themeToggle");

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city !== "") {
    fetchWeather(city);
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

async function fetchWeather(city) {
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`;

  loader.classList.add("active");
  weatherCard.classList.add("hidden");
  errorMessage.classList.add("hidden");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");

    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    showError();
  } finally {
    loader.classList.remove("active");
  }
}

function displayWeather(data) {
  errorMessage.classList.add("hidden");
  weatherCard.classList.remove("hidden");

  document.getElementById("cityName").textContent = `${data.location.name}, ${data.location.country}`;
  document.getElementById("date").textContent = new Date().toLocaleString();
  document.getElementById("weatherIcon").src = `https:${data.current.condition.icon}`;
  document.getElementById("temperature").textContent = `${data.current.temp_c}°C`;
  document.getElementById("description").textContent = data.current.condition.text;
  document.getElementById("feelsLike").textContent = `${data.current.feelslike_c}°C`;
  document.getElementById("humidity").textContent = `${data.current.humidity}%`;
  document.getElementById("wind").textContent = `${data.current.wind_kph} kph`;

  // Weather Grid
  document.getElementById("gridWind").textContent = `${data.current.wind_kph} km/h`;
  document.getElementById("gridHumidity").textContent = `${data.current.humidity}%`;
  document.getElementById("gridPressure").textContent = `${data.current.pressure_mb} hPa`;

  // Change background dynamically
  setWeatherBackground(data.current.condition.text.toLowerCase());
}

function showError() {
  weatherCard.classList.add("hidden");
  errorMessage.classList.remove("hidden");
}

// Theme Toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

// Weather-based backgrounds
function setWeatherBackground(weather) {
  document.body.classList.remove("sunny", "rainy", "snowy");

  if (weather.includes("sun")) {
    document.body.classList.add("sunny");
  } else if (weather.includes("rain")) {
    document.body.classList.add("rainy");
  } else if (weather.includes("snow")) {
    document.body.classList.add("snowy");
  }
}
