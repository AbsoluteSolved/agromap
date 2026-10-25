// ================= 1. ИНИЦИАЛИЗАЦИЯ КАРТЫ =================
const map = L.map('map', { 
  center: [62.010346, 129.686212], // Координаты АГАТУ
  zoom: 16,
  zoomControl: true
});

// Добавляем слой карты (Схема)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
  attribution: '© OpenStreetMap' 
}).addTo(map);

// Переменные
let routeLine = null; 
let markers = {};
let editMode = false; // Глобальная переменная для режима редактирования

// Обработчик переключения стилей карты
document.getElementById('styleSelect').addEventListener('change', (e) => {
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) map.removeLayer(layer);
  });

  if (e.target.value === 'satellite') {
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri'
    }).addTo(map);
  } else {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      attribution: '© OpenStreetMap' 
    }).addTo(map);
  }
});

// ================= 2. ОТРИСОВКА МАРКЕРОВ =================
function renderObjects() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  OBJECTS.forEach(obj => {
    const marker = L.marker([obj.lat, obj.lng], {
      icon: L.divIcon({ 
        className: 'custom-icon', 
        html: `<div style="font-size:24px;">${obj.icon || '📍 '}</div>`, 
        iconSize: [32, 32], 
        iconAnchor: [16, 32] 
      })
    });
    
    marker.bindTooltip(obj.name);
    marker.on('click', () => showCard(obj));
    marker.addTo(map);
    markers[obj.id] = marker;
  });
}
renderObjects();

// ================= 3. ПОИСК ОБЪЕКТОВ =================
const searchInput = document.getElementById('search');
const resultList = document.getElementById('resultList');

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase().trim();
  resultList.innerHTML = '';
  if (!q) return;

  OBJECTS.filter(o => o.name.toLowerCase().includes(q)).forEach(o => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.textContent = `${o.icon} ${o.name}`;
    div.onclick = () => { 
      map.setView([o.lat, o.lng], 18); 
      showCard(o); 
    };
    resultList.appendChild(div);
  });
};

// ================= 4. КАРТОЧКА ОБЪЕКТА =================
const infoCard = document.getElementById('infoCard');
const showPlanBtn = document.getElementById('showPlan');
const editBtn = document.getElementById('editModeBtn');
let selected = null;

function showCard(obj) {
  selected = obj;
  document.getElementById('cardTitle').textContent = `${obj.icon || '📍 '} ${obj.name}`;
  document.getElementById('cardType').textContent = `Тип: ${obj.type}`;
  document.getElementById('cardDesc').textContent = obj.desc || '';
  infoCard.classList.remove('hidden');

  if (obj.floors && obj.floors.length > 0) {
    showPlanBtn.classList.remove('hidden');
    if (editBtn) editBtn.classList.remove('hidden');
  } else {
    showPlanBtn.classList.add('hidden');
    if (editBtn) editBtn.classList.add('hidden');
  }
}

document.getElementById('closeCard').onclick = () => infoCard.classList.add('hidden');

// Быстрый переход
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.onclick = () => {
    const obj = OBJECTS.find(o => o.id === btn.dataset.target);
    if (obj) { map.setView([obj.lat, obj.lng], 18); showCard(obj); }
  };
});

// ================= 5. 2D-КАРТА ЭТАЖЕЙ =================
const planModal = document.getElementById('planModal');
const floorButtons = document.getElementById('floorButtons');
let planMap = null;

function openPlan(obj) {
  document.getElementById('planTitle').textContent = `🌐  ${obj.name} (Внутренняя карта)`;
  planModal.classList.remove('hidden');
  floorButtons.innerHTML = '';

  if (obj.floors) {
    obj.floors.forEach((floor, index) => {
      const btn = document.createElement('button');
      btn.textContent = floor.name;
      btn.style.padding = '8px 15px';


btn.style.border = '1px solid #1b5e20';
      btn.style.borderRadius = '6px';
      btn.style.background = index === 0 ? '#1b5e20' : 'white';
      btn.style.color = index === 0 ? 'white' : '#1b5e20';
      btn.style.cursor = 'pointer';
      btn.style.whiteSpace = 'nowrap';

      btn.onclick = () => {
        loadFloorPlan(floor);
        Array.from(floorButtons.children).forEach(b => { b.style.background = 'white'; b.style.color = '#1b5e20'; });
        btn.style.background = '#1b5e20'; btn.style.color = 'white';
      };

      floorButtons.appendChild(btn);
      if (index === 0) loadFloorPlan(floor);
    });
  }
}

function loadFloorPlan(floor) {
  if (planMap) planMap.remove();

  // Создаем карту Leaflet. Если editMode = true, карту нельзя двигать
  planMap = L.map('planMap', { 
    crs: L.CRS.Simple, 
    minZoom: -1, 
    maxZoom: 2, 
    dragging: !editMode, 
    touchZoom: !editMode 
  });

  const w = 1000; 
  const h = 800;
  const bounds = [[0, 0], [h, w]];
  
  L.imageOverlay(floor.img, bounds).addTo(planMap);
  planMap.fitBounds(bounds);

  // Проверяем, есть ли вообще кабинеты на этом этаже
if (floor.rooms && floor.rooms.length > 0) {
  floor.rooms.forEach(room => {
    
    // 1. Создаем маркер
    // Создаем обычный маркер (он умеет перетаскиваться), но стилизуем его как кружок
const marker = L.marker([room.y, room.x], {
  draggable: editMode, // Включаем перетаскивание, если нажат режим редактирования
  icon: L.divIcon({
    className: 'custom-room-marker',
    html: `<div style="width: 16px; height: 16px; background-color: white; border: 2px solid #1b5e20; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })
}).addTo(planMap);

    // 2. Привязываем всплывающее окно
    marker.bindPopup(`
      <div style="font-family: sans-serif; text-align: center;">
        <b style="color: #1b5e20; font-size: 14px;">${room.name}</b><br>
        <span style="font-size: 12px;">${room.desc}</span>
      </div>
    `);

    // 3. Включаем перетаскивание, ТОЛЬКО если включен режим редактирования
    if (editMode) {
      marker.dragging.enable();
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const nameMatch = marker.getPopup().getContent().match(/<b>(.*?)<\/b>/);
        const roomName = nameMatch ? nameMatch[1] : 'Кабинет';
        console.log(`Координаты для "${roomName}": x: ${Math.round(pos.lng)}, y: ${Math.round(pos.lat)}`);
      });
    }
    
  });
} // Конец проверки if (floor.rooms)
}

showPlanBtn.onclick = () => { if (selected) openPlan(selected); };

document.getElementById('closePlan').onclick = () => {
  planModal.classList.add('hidden');
  if (planMap) { planMap.remove(); planMap = null; }
};

// ================= 6. РЕЖИМ РЕДАКТИРОВАНИЯ =================
if (editBtn) {
  editBtn.onclick = () => {
    editMode = !editMode;
    
    if (editMode) {
      editBtn.style.background = '#4caf50';
      editBtn.textContent = '✅ Режим ВКЛ (тащите маркеры)';
      alert('Режим редактирования ВКЛЮЧЕН.\nТеперь карта зафиксирована. Перетаскивайте кружочки!');
    } else {
      editBtn.style.background = '#ff9800';
      editBtn.textContent = '🛠 Режим редактирования';
    }

    // Перерисовываем текущий этаж с новыми настройками
    if (selected && planMap) {
      const activeFloorBtn = Array.from(floorButtons.children).find(b => b.style.background === '#1b5e20' || b.style.background === 'rgb(27, 94, 32)');
      if (activeFloorBtn) {
        const floorName = activeFloorBtn.textContent;
        const floorData = selected.floors.find(f => f.name === floorName);
        if (floorData) loadFloorPlan(floorData); 
      }
    }
  };
}

// ================= 7. ИИ-АССИСТЕНТ =================
const aiBtn = document.getElementById('aiBtn');
const aiChat = document.getElementById('aiChat');

if (aiBtn && aiChat) {
  const aiMessages = document.getElementById('aiMessages');
  const aiInput = document.getElementById('aiInput');
  const closeAi = document.getElementById('closeAi');
  const sendAi = document.getElementById('sendAi');

  aiBtn.onclick = () => { aiChat.style.display = aiChat.style.display === 'flex' ? 'none' : 'flex'; };
  closeAi.onclick = () => { aiChat.style.display = 'none'; };

window.askAI = function(text) {
  if (!text) return;
  
  // Добавляем сообщение пользователя в чат
  const userDiv = document.createElement('div');
  userDiv.textContent = text;
  userDiv.style.cssText = 'padding: 10px; border-radius: 8px; max-width: 80%; font-size: 14px; background: #1b5e20; color: white; align-self: flex-end;';
  aiMessages.appendChild(userDiv);
  
  setTimeout(() => {
    let response = "Я не нашел такой кабинет. Убедитесь, что он есть в data.js.";
    const q = text.toLowerCase().trim();
    
    let foundFloor = null;
    let foundRoom = null;

    if (selected && selected.floors) {
      
      // 1. Ищем номер аудитории в тексте (например, 1.102 или 2.302)
      const roomNumberMatch = q.match(/\d+\.\d+/); 
      const roomNumber = roomNumberMatch ? roomNumberMatch[0] : null;

      if (roomNumber) {
        // Определяем, какой корпус просят (старый или новый)
        const isNewBuilding = q.includes('нов');
        const isOldBuilding = q.includes('стар');

        // Перебираем все этажи
        for (let floor of selected.floors) {
          const floorName = floor.name.toLowerCase();
          
          // Если просят "новый", но этаж "старый" - пропускаем (и наоборот)
          if (isNewBuilding && !floorName.includes('новый')) continue;
          if (isOldBuilding && !floorName.includes('старый')) continue;

          if (floor.rooms) {
            // Ищем кабинет с таким номером
            const room = floor.rooms.find(r => r.name.includes(roomNumber));
            
            if (room) {
              foundFloor = floor;
              foundRoom = room;
              break;
            }
          }
        }
      } else {
        // Если номер не указан, говорим, как спрашивать
        response = "Пожалуйста, укажите номер аудитории (например: «где 1.102» или «где 2.302 в новом»).";
      }
    }

    // Если нашли - строим маршрут
    if (foundRoom && foundFloor) {
      response = `Нашел кабинет ${foundRoom.name} (${foundRoom.desc}). Строю маршрут на этаже: ${foundFloor.name}.`;
      drawIndoorRoute(foundFloor, foundRoom);
    }

    // Выводим ответ
    const aiDiv = document.createElement('div');
    aiDiv.textContent = response;
    aiDiv.style.cssText = 'padding: 10px; border-radius: 8px; max-width: 80%; font-size: 14px; background: #e8f5e9; align-self: flex-start;';
    aiMessages.appendChild(aiDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    
  }, 600);
  
  aiMessages.scrollTop = aiMessages.scrollHeight;
};

// Обработчик кнопки отправки (зеленая стрелочка)
sendAi.onclick = () => {
  const val = aiInput.value.trim();
  if (val) { 
    window.askAI(val); 
    aiInput.value = ''; 
  }
};

// Обработчик нажатия клавиши Enter
aiInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    const val = aiInput.value.trim();
    if (val) { 
      window.askAI(val); 
      aiInput.value = ''; 
    }
  }
};
// ================= 8. МАРШРУТ ДО ОКТЁМСКОГО =================
async function drawAgrotropaRoute() {
  const startPoint = OBJECTS.find(o => o.id === 'agatu');
  const endPoint = OBJECTS.find(o => o.id === 'oktemskiy');

  if (!startPoint || !endPoint) {
    alert('Ошибка: не найдены координаты в data.js');
    return;
  }

  if (routeLine) map.removeLayer(routeLine);

  const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;

  try {
    document.getElementById('routeInfo').classList.remove('hidden');
    document.getElementById('routeInfo').innerHTML = '⏳ Строим маршрут...';

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      routeLine = L.polyline(coords, { color: '#1b5e20', weight: 6, opacity: 0.8, dashArray: '10, 10' }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
      document.getElementById('routeInfo').innerHTML = `<b>Маршрут:</b><br>📏  ${(route.distance / 1000).toFixed(1)} км<br>⏱ ~${Math.round(route.duration / 60)} мин.`;
    }
  } catch (error) {
    document.getElementById('routeInfo').innerHTML = '❌ Не удалось построить маршрут.';
  }
}

document.getElementById('routeBtn').onclick = drawAgrotropaRoute;

document.getElementById('clearRouteBtn').onclick = () => {
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  document.getElementById('routeInfo').classList.add('hidden');
};
// ================= 9. МАРШРУТ ВНУТРИ ЗДАНИЯ =================

// Функция для отрисовки линии на плане этажа
function drawIndoorRoute(floor, targetRoom, startX = 50, startY = 700) {
  // Если карта этажа еще не открыта, открываем её
  if (!planModal || planModal.classList.contains('hidden')) {
    openPlan(selected); // Открываем модальное окно
  }

  // Ждем миллисекунду, чтобы карта успела прогрузиться
  setTimeout(() => {
    if (!planMap) return;

    // 1. Находим нужную кнопку этажа и нажимаем её
    const floorBtns = Array.from(floorButtons.children);
    const targetBtn = floorBtns.find(b => b.textContent === floor.name);
    if (targetBtn) targetBtn.click(); // Переключаем на нужный этаж

    // 2. Ждем, пока перерисуется этаж, и рисуем линию
    setTimeout(() => {
      // Координаты входа (начальная точка маршрута)
      // Вы можете поменять 50 и 700 на координаты главного входа в здание
      const startPoint = [startY, startX]; 
      const endPoint = [targetRoom.y, targetRoom.x];

      // Удаляем старую линию, если она была
      if (window.indoorRouteLine) {
        planMap.removeLayer(window.indoorRouteLine);
      }

      // Рисуем линию маршрута
      window.indoorRouteLine = L.polyline([startPoint, endPoint], {
        color: '#ff0000', // Ярко-красный цвет
        weight: 4,
        dashArray: '5, 10', // Пунктирная линия
        opacity: 0.8
      }).addTo(planMap);

      // Добавляем кружочек на финиш (в сам кабинет)
      L.circleMarker(endPoint, {
        radius: 10,
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.5
      }).addTo(planMap);

      // Автоматически центрируем карту, чтобы было видно маршрут
      planMap.fitBounds(window.indoorRouteLine.getBounds(), { padding: [50, 50] });

    }, 100); // Задержка для перерисовки этажа
  }, 100); // Задержка для открытия окна
}
}