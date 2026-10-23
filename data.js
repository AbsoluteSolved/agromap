// ===== Базовые объекты =====
const BASE_OBJECTS = [
  { id:'agatu', name:'Главный корпус АГАТУ', type:'building', lat:62.010346, lng:129.686212,
    desc:'Учебный корпус, аудитории, администрация.', icon:'🏫 ', plan:'plans/agatu.svg' },
  { id:'manezh', name:'Манеж', type:'building', lat:62.010310, lng:129.689780,
    desc:'Крытый манеж для занятий.', icon:'🏟️ ', plan:'plans/manezh.svg' },
  { id:'teplica', name:'Теплица', type:'greenhouse', lat:62.008365, lng:129.688659,
    desc:'Учебно-опытная теплица.', icon:'🌱 ' },
  { id:'field1', name:'Поле №1', type:'field', lat:62.0480, lng:129.7420,
    desc:'Учебное поле, зерновые культуры.', icon:'🌾 ' },
  { id:'pasture1', name:'Пастбище', type:'pasture', lat:62.0445, lng:129.7385,
    desc:'Пастбище для сельхозживотных.', icon:'🐄 ' },
  { id:'agrotropa', name:'Агротропа (Карапатцы)', type:'route', lat:62.0420, lng:129.7350,
    desc:'Экологическая тропа Октёмского филиала.', icon:'🥾 ' }
];

// ===== Загрузка/сохранение пользовательских объектов =====
function loadUserObjects() {
  const raw = localStorage.getItem('agromap_objects');
  return raw ? JSON.parse(raw) : [];
}

function saveUserObjects(list) {
  localStorage.setItem('agromap_objects', JSON.stringify(list));
}

// ===== Объединённый список =====
let OBJECTS = [...BASE_OBJECTS, ...loadUserObjects()];