// ==== Элементы страницы ====
const helpBtn = document.querySelector('.help-btn');
const popup = document.getElementById('helpPopup');
const requestsContainer = document.querySelector('.requests');

const problemInput = popup.querySelector('#problem');
const addressInput = popup.querySelector('#address');
const commentsInput = popup.querySelector('#comments');
let sendBtn = popup.querySelector('#sendBtn');
let closeBtn = popup.querySelector('#closeBtn');
const popupTitle = popup.querySelector('.request-status');

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

// ==== Пользователь ====
const userId = 'test_user_123';

// ==== Попап открытие/закрытие ====
helpBtn.addEventListener('click', () => openPopup('new'));

popup.onclick = (e) => {
    if (e.target === popup) closePopup();
};

function closePopup() {
    popup.classList.remove('show');
    // Убираем временные обработчики, если есть
    sendBtn.replaceWith(sendBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    sendBtn = popup.querySelector('#sendBtn');
    closeBtn = popup.querySelector('#closeBtn');
}

// ==== Функция открытия попапа ====
let currentMode = null; // 'new' или 'edit'
let editKey = null;

function openPopup(mode, key = null) {
    currentMode = mode;
    editKey = key;

    // Сбрасываем поля
    problemInput.value = '';
    addressInput.value = '';
    commentsInput.value = '';

    // Очистка старых обработчиков
    sendBtn.onclick = null;
    closeBtn.onclick = null;

    if (mode === 'new') {
        popupTitle.textContent = 'Новая заявка на помощь';
        sendBtn.textContent = 'Отправить';
        closeBtn.textContent = 'Закрыть';

        sendBtn.onclick = handleNewRequest;
    } else if (mode === 'edit' && key) {
        const card = document.querySelector(`.request-card [onclick*="editCard('${key}')"]`)?.closest('.request-card');
        if (!card) return;

        const requestStatusDiv = card.querySelector('.request-status');
        const addressDiv = card.querySelector('.address');
        const commentsDiv = card.querySelector('.comments');

        problemInput.value = requestStatusDiv.textContent;
        addressInput.value = addressDiv.textContent.replace('Адрес: ', '');
        commentsInput.value = commentsDiv.textContent;

        popupTitle.textContent = 'Изменить данные';
        sendBtn.textContent = 'Сохранить';
        closeBtn.textContent = 'Отменить';

        sendBtn.onclick = async () => {
            const newProblem = problemInput.value.trim();
            const newAddress = addressInput.value.trim();
            const newComments = commentsInput.value.trim();

            if (!newProblem || !newAddress) {
                alert('Проблема и адрес обязательны!');
                return;
            }

            await db.ref('requests/' + key).update({
                problem: newProblem,
                address: newAddress,
                comments: newComments
            });

            requestStatusDiv.textContent = newProblem;
            addressDiv.textContent = `Адрес: ${newAddress}`;
            commentsDiv.textContent = newComments;

            closePopup();
        };
    }

    closeBtn.onclick = closePopup;
    popup.classList.add('show');
}

function handleNewRequest() {
    const problem = problemInput.value.trim();
    const address = addressInput.value.trim();
    const comments = commentsInput.value.trim();

    if (!problem || !address) {
        alert('Заполните хотя бы Проблему и Адрес!');
        return;
    }

    // Проверка активной заявки
    db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            const now = Date.now();
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
                    closePopup();
                });
        });
}

function editCard(key) {
    openPopup('edit', key);
}


// ==== Создание карточки на странице и автоудаление ====
function displayRequestCard(requestData, key) {
    const card = document.createElement('div');
    card.classList.add('request-card');
    card.innerHTML = `
        <div class="card-header">
            <div class="request-status">${requestData.problem}</div>
        </div>
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

    // Настройки для автора
    if (requestData.userId === userId) {
        const cardHeader = card.querySelector('.card-header');
        const settingsWrapper = document.createElement('div');
        settingsWrapper.classList.add('card-settings');

        settingsWrapper.innerHTML = `
            <button class="settings-btn">&#8942;</button>
            <div class="settings-menu" style="display:none;">
                <button onclick="editCard('${key}')">Редактировать</button>
                <button onclick="deleteCard('${key}')">Удалить</button>
            </div>
        `;

        const btn = settingsWrapper.querySelector('.settings-btn');
        const menu = settingsWrapper.querySelector('.settings-menu');

        btn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        };

        document.addEventListener('click', (e) => {
            if (!settingsWrapper.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        cardHeader.appendChild(settingsWrapper);
    }

    requestsContainer.querySelectorAll('.request-card.empty').forEach(e => e.remove());
    requestsContainer.prepend(card);

    // Автоудаление через 3 часа
    const createdTime = new Date(requestData.createdAt).getTime();
    const remaining = Math.max(0, 3 * 60 * 60 * 1000 - (Date.now() - createdTime));
    if (remaining > 0) {
        setTimeout(async () => {
            await db.ref('requests/' + key).remove().catch(console.error);
            card.remove();
            if (!requestsContainer.querySelector('.request-card')) {
                const emptyCard = document.createElement('div');
                emptyCard.classList.add('request-card', 'empty');
                emptyCard.textContent = 'Заявок пока нет';
                requestsContainer.appendChild(emptyCard);
            }
        }, remaining);
    }
}

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

    displayRequestCard({ ...userData, userId, problem, address, comments, createdAt: new Date().toISOString() }, key);
}

// ==== Удаление карточки ====
function deleteCard(key) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

    db.ref('requests/' + key).once('value')
    .then(snapshot => {
        const requestData = snapshot.val();
        if (!requestData || requestData.userId !== userId) {
            alert('Вы не можете удалить чужую заявку или заявка не найдена.');
            return;
        }
        return db.ref('requests/' + key).remove();
    })
    .then(() => {
        const card = document.querySelector(`.request-card [onclick*="deleteCard('${key}')"]`)?.closest('.request-card');
        if (card) card.remove();
        if (!requestsContainer.querySelector('.request-card')) {
            const emptyCard = document.createElement('div');
            emptyCard.classList.add('request-card', 'empty');
            emptyCard.textContent = 'Заявок пока нет';
            requestsContainer.appendChild(emptyCard);
        }
    })
    .catch(console.error);
}

// ==== Подгрузка заявок при загрузке ====
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
        Object.entries(data).forEach(([key, request]) => displayRequestCard(request, key));
    })
    .catch(console.error);
}
loadRequests();

// ==== Поля с автокапитализацией ====
function capitalizeFirstAndTrim(element) {
    element.addEventListener('input', () => {
        if (!element.value) return;
        element.value = element.value.trimStart();
        element.value = element.value.charAt(0).toUpperCase() + element.value.slice(1);
    });
}
capitalizeFirstAndTrim(problemInput);
capitalizeFirstAndTrim(addressInput);
capitalizeFirstAndTrim(commentsInput);
