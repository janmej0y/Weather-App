// ===== Config =====
// You provided this key earlier. Replace anytime if you rotate it.
const API_KEY = "d90a870160364e8f847100835252408";

// ===== DOM =====
const searchForm  = document.getElementById("searchForm");
const cityInput   = document.getElementById("cityInput");
const searchBtn   = document.getElementById("searchBtn");
const locBtn      = document.getElementById("locBtn");

const loader      = document.getElementById("loader");
const statusBar   = document.getElementById("statusBar");

const card        = document.getElementById("weatherCard");
const cityNameEl  = document.getElementById("cityName");
const tempEl      = document.getElementById("temperature");
const condEl      = document.getElementById("condition");
const humEl       = document.getElementById("humidity");
const windEl      = document.getElementById("wind");
const iconEl      = document.getElementById("weatherIcon");

// ===== Helpers =====
const show = el => el.hidden = false;
const hide = el => el.hidden = true;

function setStatus(msg, type = "info"){
  statusBar.textContent = msg;
  statusBar.className = `status ${type}`;
  show(statusBar);
}

function clearStatus(){
  statusBar.textContent = "";
  hide(statusBar);
}

function startLoading(){
  show(loader);
  loader.setAttribute("aria-hidden", "false");
}

function stopLoading(){
  hide(loader);
  loader.setAttribute("aria-hidden", "true");
}

function kelvinToC(k){ return Math.round(k - 273.15); } // not used (we request metric)
function mpsToKmph(m){ return Math.round(m * 3.6); }

// ===== Render =====
function renderWeather(data){
  const { name } = data;
  const { temp, humidity } = data.main;
  const windSpeed = data.wind?.speed ?? 0;
  const weather0 = data.weather?.[0];

  cityNameEl.textContent = name;
  tempEl.textContent = `${Math.round(temp)}°C`;
  condEl.textContent = weather0?.description ?? "—";
  humEl.textContent = `${humidity}%`;
  windEl.textContent = `${mpsToKmph(windSpeed)} km/h`;

  if (weather0?.icon){
    iconEl.src = `https://openweathermap.org/img/wn/${weather0.icon}@2x.png`;
    iconEl.alt = weather0.description || "Weather icon";
  } else {
    iconEl.src = "";
    iconEl.alt = "";
  }

  show(card);
}

// Show a friendly UI error inside the app
function showError(message){
  cityNameEl.textContent = "Error";
  tempEl.textContent = "—°C";
  condEl.textContent = message;
  humEl.textContent = "—%";
  windEl.textContent = "— km/h";
  iconEl.src = "";
  iconEl.alt = "";
  show(card);
}

// ===== API Calls =====
async function fetchByCity(city){
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
  return fetch(url);
}

async function fetchByCoords(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  return fetch(url);
}

// Unified fetch with UI states
async function loadWeather(requestPromise, loadingMsg = "Fetching weather…"){
  try{
    clearStatus();
    startLoading();
    setStatus(loadingMsg);

    const res = await requestPromise;
    if (!res.ok){
      const problem = res.status === 404 ? "City not found." : `Request failed (${res.status})`;
      throw new Error(problem);
    }
    const data = await res.json();
    renderWeather(data);
    clearStatus();
  } catch (err){
    console.error(err);
    setStatus(`❌ ${err.message}`, "error");
    showError(err.message);
  } finally{
    stopLoading();
  }
}

// ===== Events =====
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city){
    setStatus("⚠️ Please enter a city name.", "warn");
    return;
  }
  loadWeather(fetchByCity(city), `Searching “${city}”…`);
});

locBtn.addEventListener("click", () => {
  if (!("geolocation" in navigator)){
    setStatus("❌ Geolocation not supported in this browser.", "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      loadWeather(fetchByCoords(latitude, longitude), "Getting weather by your location…");
    },
    () => {
      setStatus("⚠️ Location permission denied. You can still search by city.", "warn");
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
});

// ===== On Load: try geo, else fallback city =====
window.addEventListener("load", () => {
  if ("geolocation" in navigator){
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        loadWeather(fetchByCoords(latitude, longitude), "Detecting your location…");
      },
      () => loadWeather(fetchByCity("London"), "Loading London weather…")
    );
  } else {
    loadWeather(fetchByCity("London"), "Loading London weather…");
  }
});

// ===== Offline handling =====
window.addEventListener("offline", () => setStatus("📴 You are offline. Results may be outdated.", "warn"));
window.addEventListener("online", () => setStatus("✅ Back online.", "info"));