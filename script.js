// ================= 1. КАРТА =================
const map = L.map('map', {
  center: [62.046, 129.740],
  zoom: 16,
  zoomControl: true
});

// ================= 2. СТИЛИ ТАЙЛОВ =================
const TILE_STYLES = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap',
    maxZoom: 20
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap',
    maxZoom: 20
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap, © OpenStreetMap',
    maxZoom: 17
  }
};

// ================= 3. ТЕКУЩИЙ СЛОЙ ТАЙЛОВ =================
let currentTileLayer = null;

// Обычные стили
function setTileStyle(styleKey) {
  const cfg = TILE_STYLES[styleKey] || TILE_STYLES.osm;
  if (currentTileLayer) map.removeLayer(currentTileLayer);
  currentTileLayer = L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    subdomains: 'abc'
  }).addTo(map);
}

// Гибрид: спутник + подписи
function setSatelliteHybrid() {
  if (currentTileLayer) map.removeLayer(currentTileLayer);

  const sat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri', maxZoom: 19 }
  );

  const labels = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    { attribution: '© CARTO', maxZoom: 20, pane: 'overlayPane' }
  );

  currentTileLayer = L.layerGroup([sat, labels]).addTo(map);
}

// Стартовый стиль
setTileStyle('osm');

// Переключатель стилей
document.getElementById('styleSelect').addEventListener('change', e => {
  if (e.target.value === 'hybrid') setSatelliteHybrid();
  else setTileStyle(e.target.value);
});

// ================= 4. СЛОИ =================
const layers = {
  buildings: L.layerGroup().addTo(map),
  fields: L.layerGroup().addTo(map),
  pastures: L.layerGroup().addTo(map),
  greenhouses: L.layerGroup().addTo(map)
};

// ================= 5. ОТРИСОВКА ОБЪЕКТОВ =================
const markers = {};

function renderObjects() {
  Object.values(layers).forEach(l => l.clearLayers());
  Object.keys(markers).forEach(k => delete markers[k]);

  OBJECTS.forEach(obj => {
    const marker = L.marker([obj.lat, obj.lng], {
      title: obj.name,
      icon: L.divIcon({
        className: 'custom-icon',
        html: `<div style="font-size:24px;">${obj.icon || '📍 '}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    });
    marker.bindTooltip(obj.name);
    marker.on('click', () => showCard(obj));

    let layerKey = 'buildings';
    if (obj.type === 'field') layerKey = 'fields';
    if (obj.type === 'pasture') layerKey = 'pastures';
    if (obj.type === 'greenhouse') layerKey = 'greenhouses';
    if (obj.type === 'route') layerKey = 'fields';

    layers[layerKey].addLayer(marker);
    markers[obj.id] = marker;
  });
}
renderObjects();

// ================= 6. ПЕРЕКЛЮЧЕНИЕ СЛОЁВ =================
document.querySelectorAll('.layer-toggle').forEach(t => {
  t.onchange = e => {
    const l = layers[e.target.dataset.layer];
    e.target.checked ? map.addLayer(l) : map.removeLayer(l);
  };
});

// ================= 7. ПОИСК =================
const searchInput = document.getElementById('search');
const resultList = document.getElementById('resultList');

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase().trim();
  resultList.innerHTML = '';
  if (!q) return;

  OBJECTS.filter(o =>
    o.name.toLowerCase().includes(q) ||

(o.desc || '').toLowerCase().includes(q)
  ).forEach(o => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.textContent = `${o.icon || '📍 '} ${o.name}`;
    div.onclick = () => {
      map.setView([o.lat, o.lng], 18);
      showCard(o);
    };
    resultList.appendChild(div);
  });
};

// ================= 8. КАРТОЧКА ОБЪЕКТА =================
const infoCard = document.getElementById('infoCard');
const cardTitle = document.getElementById('cardTitle');
const cardType = document.getElementById('cardType');
const cardDesc = document.getElementById('cardDesc');
const showPlanBtn = document.getElementById('showPlan');
let selected = null;

function showCard(obj) {
  selected = obj;
  cardTitle.textContent = `${obj.icon || '📍 '} ${obj.name}`;
  cardType.textContent = `Тип: ${obj.type}`;
  cardDesc.textContent = obj.desc || '';
  infoCard.classList.remove('hidden');

  if (obj.plan) {
    showPlanBtn.classList.remove('hidden');
    showPlanBtn.onclick = () => openPlan(obj);
  } else {
    showPlanBtn.classList.add('hidden');
  }
}

document.getElementById('closeCard').onclick = () => {
  infoCard.classList.add('hidden');
  selected = null;
};

// ================= 9. БЫСТРЫЙ ПЕРЕХОД =================
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.onclick = () => {
    const obj = OBJECTS.find(o => o.id === btn.dataset.target);
    if (obj) { map.setView([obj.lat, obj.lng], 18); showCard(obj); }
  };
});

// ================= 10. ПЛАН ЗДАНИЯ =================
const planModal = document.getElementById('planModal');
const planTitle = document.getElementById('planTitle');
const planImage = document.getElementById('planImage');

function openPlan(obj) {
  planTitle.textContent = `🏢  План: ${obj.name}`;
  planImage.src = obj.plan || 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="45%" text-anchor="middle" font-size="18" fill="#1b5e20">${obj.name}</text>
      <text x="50%" y="60%" text-anchor="middle" font-size="14" fill="#666">План здания (заглушка)</text>
    </svg>`);
  planModal.classList.remove('hidden');
}

document.getElementById('closePlan').onclick = () => planModal.classList.add('hidden');
planModal.onclick = e => { if (e.target === planModal) planModal.classList.add('hidden'); };

// ================= 11. МАРШРУТ (OSRM) =================
let routeLine = null, userMarker = null;
const routeInfo = document.getElementById('routeInfo');

async function buildRoute(to) {
  if (!navigator.geolocation) return alert('Геолокация не поддерживается');

  navigator.geolocation.getCurrentPosition(async pos => {
    const from = [pos.coords.latitude, pos.coords.longitude];

    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(from, { title: 'Вы здесь' })
      .addTo(map).bindPopup('Вы здесь').openPopup();

    if (routeLine) map.removeLayer(routeLine);

    const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        routeLine = L.polyline(coords, { color:'#1b5e20', weight:5 }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding:[40,40] });

        const dist = (route.distance / 1000).toFixed(2);
        const time = Math.round(route.duration / 60);
        routeInfo.textContent = `📏  ${dist} км · ⏱ ~${time} мин (пешком)`;
        routeInfo.classList.remove('hidden');
      } else throw new Error('Маршрут не найден');
    } catch (e) {
      routeLine = L.polyline([from, [to.lat, to.lng]], {
        color:'#1b5e20', weight:4, dashArray:'8,8'
      }).addTo(map);
map.fitBounds(routeLine.getBounds(), { padding:[40,40] });
      routeInfo.textContent = `⚠ Прямая линия (${e.message})`;
      routeInfo.classList.remove('hidden');
    }
  }, () => alert('Не удалось определить местоположение'));
}

document.getElementById('routeToCard').onclick = () => selected && buildRoute(selected);
document.getElementById('routeBtn').onclick = () => {
  if (selected) buildRoute(selected);
  else alert('Сначала выберите объект');
};
document.getElementById('clearRouteBtn').onclick = () => {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
  routeInfo.classList.add('hidden');
};

// ================= 12. ГЕОЛОКАЦИЯ =================
document.getElementById('locateBtn').onclick = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const loc = [pos.coords.latitude, pos.coords.longitude];
    map.setView(loc, 18);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(loc).addTo(map).bindPopup('Вы здесь').openPopup();
  });
};

// ================= 13. ДОБАВЛЕНИЕ ОБЪЕКТА =================
const addModal = document.getElementById('addModal');
const addForm = document.getElementById('addForm');

document.getElementById('addBtn').onclick = () => {
  addModal.classList.remove('hidden');
  const c = map.getCenter();
  addForm.lat.value = c.lat.toFixed(6);
  addForm.lng.value = c.lng.toFixed(6);
};

document.getElementById('closeAdd').onclick = () => addModal.classList.add('hidden');
addModal.onclick = e => { if (e.target === addModal) addModal.classList.add('hidden'); };

addForm.onsubmit = e => {
  e.preventDefault();
  const fd = new FormData(addForm);
  const newObj = {
    id: 'user_' + Date.now(),
    name: fd.get('name'),
    type: fd.get('type'),
    desc: fd.get('desc'),
    lat: parseFloat(fd.get('lat')),
    lng: parseFloat(fd.get('lng')),
    icon: fd.get('type') === 'building' ? '🏢 ' :
          fd.get('type') === 'field' ? '🌾 ' :
          fd.get('type') === 'pasture' ? '🐄 ' : '🌱 '
  };

  const userObjs = loadUserObjects();
  userObjs.push(newObj);
  saveUserObjects(userObjs);

  OBJECTS = [...BASE_OBJECTS, ...loadUserObjects()];
  renderObjects();

  addForm.reset();
  addModal.classList.add('hidden');
  map.setView([newObj.lat, newObj.lng], 18);
  showCard(newObj);
};