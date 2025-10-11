// ==== Элементы страницы ====
const helpBtn = document.querySelector('.help-btn');
const popup = document.getElementById('helpPopup');
const closeBtn = document.getElementById('closeBtn');
const sendBtn = document.getElementById('sendBtn');
const requestsContainer = document.querySelector('.requests');

// ==== Попап открытие/закрытие ====
helpBtn.addEventListener('click', () => popup.classList.add('show'));
closeBtn.addEventListener('click', () => popup.classList.remove('show'));
popup.addEventListener('click', e => { if (e.target === popup) popup.classList.remove('show'); });

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "AIzaSyDtpFytzqGoE8w1cK_uekt3nnNGN4vV2Y8",
  authDomain: "auto-sos-8446f.firebaseapp.com",
  databaseURL: "https://auto-sos-8446f-default-rtdb.firebaseio.com",
  projectId: "auto-sos-8446f",
  storageBucket: "auto-sos-8446f.firebasestorage.app",
  messagingSenderId: "326847407685",
  appId: "1:326847407685:web:bfc1434124e1feed3ce52c",
  measurementId: "G-0YL7B1NZT1"
};

// ==== Инициализация Firebase ====
firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// ==== Создание карточки на странице и автоудаление ====
function displayRequestCard(requestData, key) {
  const card = document.createElement('div');
  card.classList.add('request-card');
  card.innerHTML = `
    <div class="request-status">${requestData.problem}</div>
    <hr class="divider">
    <div class="car-info">
      <div class="person-name">${requestData.person}</div>
      <div class="car">${requestData.car}</div>
      <div class="car-plate">${requestData.carPlate}</div>
    </div>
    <div class="phone">
        <a href="tel:${requestData.phone.replace(/[^0-9+]/g, '')}">
            ${requestData.phone}
        </a>
        </div>
    <div class="address">Адрес: ${requestData.address}</div>
    <div class="comments">${requestData.comments}</div>
    <div class="bottom-line">
    <div class="date-time">${new Date(requestData.createdAt).toLocaleString('ru-RU')}</div>
    <div class="request-status-btn">
        <button>Помочь</button>
    </div>
    </div>
  `;

  const empty = requestsContainer.querySelectorAll('.request-card.empty');
  empty.forEach(e => e.remove());

  requestsContainer.prepend(card);

  // Автоудаление через оставшееся время до 3 часов
  const createdTime = new Date(requestData.createdAt).getTime();
  const now = Date.now();
  const remaining = Math.max(0, 3 * 60 * 60 * 1000 - (now - createdTime));

  setTimeout(async () => {
    await db.ref('requests/' + key).remove().catch(err => console.error(err));
    card.remove();

    if (requestsContainer.querySelectorAll('.request-card').length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.classList.add('request-card', 'empty');
      emptyCard.textContent = 'Заявок пока нет';
      requestsContainer.appendChild(emptyCard);
    }

    console.log('Карточка удалена и из базы, и с страницы');
  }, remaining);
}

// ==== Подгрузка заявок при загрузке страницы ====
function loadRequests() {
  db.ref('requests').once('value')
    .then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        const emptyCard = document.createElement('div');
        emptyCard.classList.add('request-card', 'empty');
        emptyCard.textContent = 'Заявок пока нет';
        requestsContainer.appendChild(emptyCard);
        return;
      }

      Object.entries(data).forEach(([key, request]) => {
        displayRequestCard(request, key);
      });
    })
    .catch(err => console.error(err));
}

loadRequests(); // вызываем при старте

// ==== Создание новой заявки ====
async function createRequestCard(userData, problem, address, comments, userId) {
  const newRef = db.ref('requests').push();
  const key = newRef.key;

  await newRef.set({
    userId,
    person: userData.person,
    car: userData.car,
    carPlate: userData.carPlate,
    phone: userData.phone,
    problem,
    address,
    comments,
    createdAt: new Date().toISOString()
  });

  console.log('Заявка сохранена в Realtime Database');
  displayRequestCard({ ...userData, problem, address, comments, createdAt: new Date().toISOString() }, key);
}

// ==== Получаем пользователя из Telegram ====
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

if (!tgUser || !tgUser.id) {
  alert('Ошибка: не удалось получить данные пользователя из Telegram. Перезапустите Mini App.');
  throw new Error('tgUser не найден');
}


// ==== Кнопка "Отправить" с проверкой активной заявки ====
sendBtn.addEventListener('click', () => {
  const problem = document.querySelector('#problem').value.trim();
  const address = document.querySelector('#address').value.trim();
  const comments = document.querySelector('#comments').value.trim();

  if (!problem || !address) {
    alert('Заполните хотя бы Проблему и Адрес!');
    return;
  }

  const userId = String(tgUser.id);
  const now = Date.now();

  db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
    .then(snapshot => {
      let hasActive = false;

      snapshot.forEach(childSnap => {
        const request = childSnap.val();
        const createdTime = new Date(request.createdAt).getTime();
        if (now - createdTime < 3 * 60 * 60 * 1000) hasActive = true;
      });

      if (hasActive) {
        alert('У вас уже есть активная заявка. Новую можно создать только через 3 часа.');
        return;
      }

      db.ref('users/' + userId).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            alert('Пользователь не найден в базе.');
            return;
          }
          const userData = snapshot.val();
          createRequestCard(userData, problem, address, comments, userId);

          document.querySelector('#problem').value = '';
          document.querySelector('#address').value = '';
          document.querySelector('#comments').value = '';
          popup.classList.remove('show');
        });
    })
    .catch(err => console.error(err));
});

function capitalizeFirstAndTrim(element) {
  element.addEventListener('input', () => {
    let value = element.value;
    if (!value) return;

    // Убираем пробелы в начале
    value = value.trimStart();

    // Делаем первую букву заглавной, остальные оставляем как есть
    element.value = value.charAt(0).toUpperCase() + value.slice(1);
  });
}

// Подключаем к каждому полю
capitalizeFirstAndTrim(document.getElementById('problem'));
capitalizeFirstAndTrim(document.getElementById('address'));
capitalizeFirstAndTrim(document.getElementById('comments'));
