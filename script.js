// ====== CONFIG ======
const apiKey = "e7863f79cf634b92af5205928251911"; // Replace with your key if needed
const daysForcast = 5;

// ====== DOM ======
const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const weatherCard = document.getElementById('weatherCard');
const errorMessage = document.getElementById('errorMessage');
const loader = document.getElementById('loader');
const themeToggle = document.getElementById('themeToggle');
const locBtn = document.getElementById('locBtn');
const voiceBtn = document.getElementById('voiceBtn');
const offlineMsg = document.getElementById('offlineMsg');
const lastUpdated = document.getElementById('lastUpdated');

// ====== Events ======
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
});
cityInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchBtn.click(); });

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    const q = `${pos.coords.latitude},${pos.coords.longitude}`;
    fetchWeather(q);
  }, ()=>alert('Location permission denied'));
});

// Voice search
if (window.webkitSpeechRecognition || window.SpeechRecognition) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.continuous = false; rec.lang = 'en-IN';
  voiceBtn.addEventListener('click', ()=>{
    rec.start(); voiceBtn.classList.add('listening');
  });
  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    cityInput.value = text.replace(/weather in /i,'').trim();
    fetchWeather(cityInput.value);
  };
  rec.onerror = ()=> voiceBtn.classList.remove('listening');
  rec.onend = ()=> voiceBtn.classList.remove('listening');
} else { voiceBtn.style.display='none'; }

// Theme toggle
themeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('dark'); document.body.classList.toggle('light');
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// ====== Offline / Cache helpers ======
function saveCache(city, data) {
  const payload = { ts: Date.now(), city, data };
  try { localStorage.setItem('weather_cache', JSON.stringify(payload)); localStorage.setItem('last_city', city); } catch(e){}
}
function getCache(){ try{ return JSON.parse(localStorage.getItem('weather_cache')); }catch(e){return null} }

// ====== Fetch Weather ======
async function fetchWeather(query) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=${daysForcast}&aqi=yes&alerts=yes`;
  showLoader(true); hideError();
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('not found');
    const data = await resp.json();
    displayWeather(data);
    saveCache(query, data);
    showOffline(false);
  } catch (err) {
    console.warn('Fetch failed', err);
    const cached = getCache();
    if (cached && cached.city && cached.data) {
      displayWeather(cached.data, true); showOffline(true); lastUpdated.textContent = 'Cached: ' + new Date(cached.ts).toLocaleString();
    } else showError();
  } finally { showLoader(false); }
}

// On load: try to load last city
window.addEventListener('load', ()=>{
  const last = localStorage.getItem('last_city');
  if (last) { cityInput.value = last; fetchWeather(last); }
});

// ====== Display =====n
function displayWeather(data, fromCache=false) {
  weatherCard.classList.remove('hidden');
  document.getElementById('cityName').textContent = `${data.location.name}, ${data.location.country}`;
  document.getElementById('date').textContent = new Date().toLocaleString();

  // icon: prefer Lottie if available
  const iconWrap = document.getElementById('iconWrap'); iconWrap.innerHTML='';
  const cond = data.current.condition.text.toLowerCase();
  const lottieMap = getLottieForCondition(cond);
  if (lottieMap) {
    const player = document.createElement('lottie-player');
    player.setAttribute('src', lottieMap);
    player.setAttribute('background','transparent'); player.setAttribute('speed','1'); player.setAttribute('loop',''); player.setAttribute('autoplay','');
    iconWrap.appendChild(player);
  } else {
    const img = document.createElement('img'); img.src = 'https:' + data.current.condition.icon; img.alt='icon'; iconWrap.appendChild(img);
  }

  animateValue(document.getElementById('temperature'), 0, data.current.temp_c, '°C');
  document.getElementById('description').textContent = data.current.condition.text;
  animateValue(document.getElementById('feelsLike'), 0, data.current.feelslike_c, '°C');
  animateValue(document.getElementById('humidity'), 0, data.current.humidity, '%');
  animateValue(document.getElementById('wind'), 0, data.current.wind_kph, ' kph');

  document.getElementById('gridPressure').textContent = data.current.pressure_mb + ' hPa';
  document.getElementById('gridCloud').textContent = data.current.cloud + '%';
  document.getElementById('gridUV').textContent = data.current.uv;

  // Sunrise / Sunset
  document.getElementById('sunrise').textContent = data.forecast.forecastday[0].astro.sunrise;
  document.getElementById('sunset').textContent = data.forecast.forecastday[0].astro.sunset;

  // Alerts
  const alerts = (data.alerts && data.alerts.alert && data.alerts.alert.length) ? data.alerts.alert.map(a=>a.headline).join('; ') : 'None';
  document.getElementById('alerts').textContent = alerts;

  // AQI
  if (data.current.air_quality) {
    const aq = Math.round(data.current.air_quality['us-epa-index'] || -1);
    const pm25 = Math.round(data.current.air_quality['pm2_5']);
    const pm10 = Math.round(data.current.air_quality['pm10']);
    document.getElementById('aqiVal').textContent = aq>=0?aq:'—';
    document.getElementById('aqiCategory').textContent = aqiCategoryFromIndex(aq);
    document.getElementById('pm25').textContent = pm25||'—';
    document.getElementById('pm10').textContent = pm10||'—';
  }

  // Forecast
  renderForecast(data.forecast.forecastday);

  // set background
  setWeatherBackground(data.current.condition.text.toLowerCase());

  lastUpdated.textContent = (fromCache? 'Cached: ':'Updated: ') + new Date().toLocaleString();
}

function renderForecast(days){
  const cont = document.getElementById('forecastScroll'); cont.innerHTML='';
  days.forEach(d => {
    const item = document.createElement('div'); item.className='forecast-item';
    item.innerHTML = `<small>${new Date(d.date).toLocaleDateString(undefined,{weekday:'short'})}</small>
      <div class='f-icon'><img src='https:${d.day.condition.icon}' alt='cond' width='64'></div>
      <h5>${Math.round(d.day.avgtemp_c)}°C</h5>
      <p>${d.day.condition.text}</p>`;
    cont.appendChild(item);
  });
}

// ====== Small utilities ======
function showLoader(s){ loader.classList.toggle('active', s); }
function showError(){ errorMessage.classList.remove('hidden'); weatherCard.classList.add('hidden'); }
function hideError(){ errorMessage.classList.add('hidden'); }
function showOffline(flag){ offlineMsg.classList.toggle('hidden', !flag); }

function animateValue(el, start, end, suffix=''){
  if(!el) return; const duration=900; const startTime=performance.now();
  function tick(now){ const progress=Math.min((now-startTime)/duration,1); const value=Math.round(start + (end-start)*progress); el.textContent = value + suffix; if(progress<1) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
}

function aqiCategoryFromIndex(i){ if(i<=1) return 'Good'; if(i==2) return 'Moderate'; if(i==3) return 'Unhealthy'; if(i>=4) return 'Very Unhealthy'; return '—'; }

function getLottieForCondition(cond){
  // Return Lottie animation URLs for some conditions (public Lottie files)
  if(cond.includes('sun')||cond.includes('clear')) return 'https://assets8.lottiefiles.com/packages/lf20_j1adxtyb.json';
  if(cond.includes('cloud')) return 'https://assets8.lottiefiles.com/packages/lf20_ydo1amjm.json';
  if(cond.includes('rain')) return 'https://assets8.lottiefiles.com/packages/lf20_jmgekfqg.json';
  if(cond.includes('snow')) return 'https://assets2.lottiefiles.com/packages/lf20_Stdaec.json';
  return null;
}

// Weather-background simple
function setWeatherBackground(weather){ document.body.classList.remove('sunny','rainy','snowy');
  if(weather.includes('sun')||weather.includes('clear')) document.body.classList.add('sunny');
  else if(weather.includes('rain')||weather.includes('drizzle')) document.body.classList.add('rainy');
  else if(weather.includes('snow')) document.body.classList.add('snowy');
}

// Try loading cached data on offline
if(!navigator.onLine){ const cached = getCache(); if(cached) displayWeather(cached.data, true); showOffline(true); }

// Accessibility: keyboard focus for voice
voiceBtn.addEventListener('keydown', (e)=>{ if(e.key==='Enter') voiceBtn.click(); });


/* FILE: sw.js */
const CACHE_NAME = 'weatherapp-v1';
const ASSETS = [ '/', '/index.html', '/styles.css', '/script.js', 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js' ];
self.addEventListener('install', evt =>{ evt.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', evt =>{ evt.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', evt =>{
  if(evt.request.method !== 'GET') return;
  evt.respondWith(caches.match(evt.request).then(cached=> cached || fetch(evt.request).then(resp=>{ const resClone = resp.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(evt.request, resClone)); return resp; }).catch(()=>caches.match('/index.html'))));
});
