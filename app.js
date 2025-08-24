const apiKey = "d90a870160364e8f847100835252408";
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherCard = document.getElementById("weatherCard");
const errorMessage = document.getElementById("errorMessage");

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
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");
    
    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    showError();
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
}

function showError() {
  weatherCard.classList.add("hidden");
  errorMessage.classList.remove("hidden");
}