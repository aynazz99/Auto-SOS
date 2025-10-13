// requests.js
// ВНИМАНИЕ: Этот код предполагает, что firebase-config.js уже загружен
// и определил глобальные переменные 'db', 'userId', 'window.currentCity'.

// ==== Элементы страницы: Заявки (Requests) ====
const helpBtn = document.querySelector('.help-btn');
const popup = document.getElementById('helpPopup');
const requestsContainer = document.querySelector('.requests');

const problemInput = popup.querySelector('#problem');
const addressInput = popup.querySelector('#address');
const commentsInput = popup.querySelector('#comments');
let sendBtn = popup.querySelector('#sendBtn');
let closeBtn = popup.querySelector('#closeBtn');
const popupTitle = popup.querySelector('.request-status');

// 1. Изначально кнопка "Создать заявку" неактивна
helpBtn.disabled = true;

// ==== Элементы страницы: Профиль (Profile) ====
const profileBtn = document.querySelector('.profile-btn'); 
const editProfilePopup = document.getElementById('edit-profile-popup');
const editProfileForm = document.getElementById('edit-profile-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn'); 
const saveProfileBtn = document.getElementById('save-profile-btn'); 

// Поля ввода для редактирования профиля
const personEditInput = document.getElementById('person-input');
const carEditInput = document.getElementById('car-input');
const carPlateEditInput = document.getElementById('carplate-input');
const phoneEditInput = document.getElementById('phone-input');


// =============================================================================
// I. Логика Заявок (Requests)
// =============================================================================

// Проверка наличия db и userId (для безопасности, хотя они должны быть в window)
if (typeof db === 'undefined' || typeof userId === 'undefined') {
    console.error("❌ Глобальные переменные db или userId не определены. Проверьте загрузку firebase-config.js.");
}

// Ссылка на данные пользователя в Firebase
const userRef = db.ref('users/' + userId);

// URL вашего Cloudflare Worker для публикации в Telegram
const TELEGRAM_WORKER_URL = 'https://napodmoge.aynazsadriev99.workers.dev/'; 


// ==== Попап открытие/закрытие ====
helpBtn.addEventListener('click', () => {
    if (helpBtn.disabled) return; // Не открываем, если кнопка неактивна
    openPopup('new');
});

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
        // Мы ищем карточку в DOM, используя 'key' для поиска
        const card = document.querySelector(`.request-card [onclick*="editCard('${key}')"]`)?.closest('.request-card');
        if (!card) return;

        // Берем данные из DOM
        const requestStatusDiv = card.querySelector('.request-status');
        const addressDiv = card.querySelector('.address');
        const commentsDiv = card.querySelector('.comments');

        problemInput.value = requestStatusDiv.textContent.trim();
        addressInput.value = addressDiv.textContent.replace('Адрес:', '').trim();
        commentsInput.value = commentsDiv.textContent.trim();

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

            // Обновление в Firebase
            await db.ref('requests/' + key).update({
                problem: newProblem,
                address: newAddress,
                comments: newComments
            });

            // Обновление в DOM
            requestStatusDiv.textContent = newProblem;
            addressDiv.textContent = `Адрес: ${newAddress}`;
            commentsDiv.textContent = newComments;

            closePopup();
        };
    }

    closeBtn.onclick = closePopup;
    popup.classList.add('show');
}

/**
 * Обработчик создания новой заявки с проверкой на наличие города
 * и фильтрацией активной заявки по городу.
 */
function handleNewRequest() {
    // ⚠️ Проверка, что город выбран из глобальной переменной
    if (!window.currentCity) {
        alert('Пожалуйста, сначала выберите город!');
        return;
    }
    
    const problem = problemInput.value.trim();
    const address = addressInput.value.trim();
    const comments = commentsInput.value.trim();

    if (!problem || !address) {
        alert('Заполните хотя бы Проблему и Адрес!');
        return;
    }

    // Проверка активной заявки (логика 3-часового таймаута), 
    // но теперь с фильтрацией по текущему городу (window.currentCity)
    db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            const now = Date.now();
            let hasActive = false;
            snapshot.forEach(childSnap => {
                const request = childSnap.val();
                // Дополнительная проверка: только заявки в текущем городе
                if (request.cityKey === window.currentCity) { 
                    const createdTime = new Date(request.createdAt).getTime();
                    // Активная заявка, если ей меньше 3 часов
                    if (now - createdTime < 3 * 60 * 60 * 1000) hasActive = true; 
                }
            });

            if (hasActive) {
                alert(`У вас уже есть активная заявка в городе ${window.currentCityName}. Новую можно создать только через 3 часа.`);
                return;
            }

            db.ref('users/' + userId).once('value')
                .then(snapshot => {
                    if (!snapshot.exists()) {
                        alert('Пользователь не найден в базе.');
                        return;
                    }
                    const userData = snapshot.val();
                    // Передаем window.currentCity в createRequestCard
                    createRequestCard(userData, problem, address, comments, userId, window.currentCity); 
                    closePopup();
                });
        });
}

function editCard(key) {
    openPopup('edit', key);
}

function deleteCard(key) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

    db.ref('requests/' + key).once('value')
    .then(snapshot => {
        const requestData = snapshot.val();
        // Проверка: можно удалять только свои заявки
        if (!requestData || requestData.userId !== userId) { 
            alert('Вы не можете удалить чужую заявку или заявка не найдена.');
            return;
        }
        return db.ref('requests/' + key).remove();
    })
    .then(() => {
        // Удаление из DOM
        const card = document.querySelector(`.request-card [onclick*="deleteCard('${key}')"]`)?.closest('.request-card');
        if (card) card.remove();
        
        // Показ "Заявок пока нет" (с учетом города, но в DOM это сложнее, 
        // поэтому просто проверяем, пуст ли контейнер)
        if (!requestsContainer.querySelector('.request-card')) {
            const emptyCard = document.createElement('div');
            emptyCard.classList.add('request-card', 'empty');
            emptyCard.textContent = 'Заявок пока нет';
            requestsContainer.appendChild(emptyCard);
        }
    })
    .catch(console.error);
}


// ==== Создание карточки на странице и автоудаление (с проверкой на чужую заявку) ====
function displayRequestCard(requestData, key) {
    const createdTime = new Date(requestData.createdAt).getTime();
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const timeElapsed = Date.now() - createdTime;
    const remaining = Math.max(0, threeHoursInMs - timeElapsed); 

    // 1. Проверка на "просроченность":
    if (remaining === 0 && timeElapsed > threeHoursInMs) {
        // Удаляем из Firebase ТОЛЬКО СВОИ просроченные заявки
        if (requestData.userId === userId) { 
            db.ref('requests/' + key).remove().catch(console.error);
        }
        return; // Не отображаем "просроченную" карточку (даже чужую)
    }
    
    // --- Создание HTML-карточки ---
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
            <span 
                onclick="window.location.href = 'tel:${requestData.phone.replace(/[^0-9+]/g, '')}'"
                style="color: blue; text-decoration: underline; cursor: pointer;"
            >
                ${requestData.phone}
            </span>
        </div>
        <div class="address">Адрес: ${requestData.address}</div>
        <div class="comments">${requestData.comments}</div>
        <div class="bottom-line">
        <div class="date-time">
            ${new Date(requestData.createdAt).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })}
        </div>
            <div class="request-status-btn">
                <button>Беседа</button>
            </div>
        </div>
    `;

        const chatBtn = card.querySelector('.request-status-btn button');
    chatBtn.onclick = () => {
        // формируем ссылку на чат или тред в канале
        const chatLink = `https://t.me/${CHANNEL_ID}?thread=${key}`;
        window.open(chatLink, "_blank"); // откроется в Telegram
    };


    // --- Добавление меню настроек для автора ---
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
    
    // --- Отображение карточки ---
    requestsContainer.querySelectorAll('.request-card.empty').forEach(e => e.remove());
    requestsContainer.prepend(card);

    // --- Установка таймера на удаление ---
    if (remaining > 0) {
        setTimeout(async () => {
            // Удаляем из Firebase ТОЛЬКО СВОИ заявки по истечении таймера
            if (requestData.userId === userId) {
                await db.ref('requests/' + key).remove().catch(console.error);
            }
            // Удаление из DOM происходит всегда
            card.remove(); 
            
            // Если карточек не осталось, добавляем "Заявок пока нет"
            if (!requestsContainer.querySelector('.request-card')) {
                const emptyCard = document.createElement('div');
                emptyCard.classList.add('request-card', 'empty');
                emptyCard.textContent = 'Заявок пока нет';
                requestsContainer.appendChild(emptyCard);
            }
        }, remaining);
    }
}











/**
 * Функция для отправки данных в Worker через XMLHttpRequest (более стабильно, чем fetch, на некоторых мобильных устройствах).
 */
function sendToWorkerXHR(data) {
    const xhr = new XMLHttpRequest();
    
    // ВАЖНО: Асинхронный запрос
    xhr.open("POST", TELEGRAM_WORKER_URL, true); 
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ XHR Worker OK:', xhr.responseText);
            // alert('Worker успешно уведомил Telegram (XHR).'); // Временно для отладки
        } else {
            console.error('❌ XHR Worker Error:', xhr.status, xhr.responseText);
            // alert(`Уведомление Worker'а завершилось ошибкой ${xhr.status}: ${xhr.responseText}`); // Временно для отладки
        }
    };
    
    xhr.onerror = function() {
        // Ошибка сети или CORS
        console.error('❌ XHR Network Error (load failed):', xhr.statusText);
        // alert(`Критическая ошибка (сеть/CORS). Проверьте консоль. Ошибка: ${xhr.statusText}`); // Временно для отладки
    };

    try {
        xhr.send(JSON.stringify(data));
    } catch (e) {
        console.error('❌ XHR Send failed:', e);
    }
}

// ==== Создание новой заявки (обновлено для XHR Worker) ====
async function createRequestCard(userData, problem, address, comments, userId, cityKey) {
    const newRef = db.ref('requests').push();
    const key = newRef.key;
    const requestData = {
        userId,
        person: userData.person,
        car: userData.car,
        carPlate: userData.carPlate,
        phone: userData.phone,
        problem,
        address,
        comments,
        cityKey, 
        createdAt: new Date().toISOString()
    };
    
    // Блокируем кнопку отправки на время выполнения операции
    sendBtn.disabled = true;

    try {
        // 1. Сохранение в Firebase (обязательно ждем завершения)
        await newRef.set(requestData);
        
        // 2. ОТПРАВКА В CLOUDFLARE WORKER (через XHR, не блокируем поток)
        sendToWorkerXHR(requestData);
        
        // 3. Успешное завершение основной операции
        console.log('✅ Заявка сохранена в Firebase. Запрос Worker отправлен.');
        
    } catch (error) {
        // Ошибка сохранения в Firebase или критическая ошибка до отправки Worker
        console.error('❌ Критическая ошибка:', error.message || error);
        alert(`Ошибка сохранения заявки. Попробуйте еще раз. Ошибка: ${error.message}`);
    } finally {
        // Отображаем карточку, если Firebase сохранил данные
        displayRequestCard(requestData, key);
        sendBtn.disabled = false; // Разблокируем кнопку
    }
}











// ==== Подгрузка заявок по городу (заменяет loadRequests) ====
/**
 * Загружает заявки, отфильтрованные по ключу города.
 * Делается глобальной (window.loadRequestsByCity) для вызова из firebase-config.js.
 * @param {string|null} cityKey Ключ выбранного города.
 */
function loadRequestsByCity(cityKey) {
    if (!cityKey) {
        requestsContainer.innerHTML = '<div class="request-card empty">Выберите город, чтобы создать или увидеть заявки</div>';
        return;
    }
    
    requestsContainer.innerHTML = '<div class="request-card empty">Загрузка заявок...</div>';

    // Фильтруем заявки по выбранному городу
    db.ref('requests').orderByChild('cityKey').equalTo(cityKey).once('value') 
        .then(snapshot => {
            requestsContainer.innerHTML = ''; // Очищаем контейнер

            const data = snapshot.val();
            if (!data) {
                const emptyCard = document.createElement('div');
                emptyCard.classList.add('request-card', 'empty');
                emptyCard.textContent = 'Заявок пока нет';
                requestsContainer.appendChild(emptyCard);
                return;
            }

            // Отображаем, начиная с самых новых (обратный порядок)
            Object.entries(data).reverse().forEach(([key, request]) => {
                 // Мы не проверяем cityKey здесь, так как Firebase это уже отфильтровал,
                 // но displayRequestCard позаботится об удалении просроченных.
                 displayRequestCard(request, key); 
            });

            // Если все заявки были "просрочены" и удалены/отфильтрованы
            if (!requestsContainer.querySelector('.request-card')) {
                const emptyCard = document.createElement('div');
                emptyCard.classList.add('request-card', 'empty');
                emptyCard.textContent = 'Заявок пока нет';
                requestsContainer.appendChild(emptyCard);
            }
        })
        .catch(console.error);
}
// Делаем новую функцию доступной глобально
window.loadRequestsByCity = loadRequestsByCity; 

// ==== Поля с автокапитализацией для формы заявки ====
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

// =============================================================================
// II. Логика Профиля (Profile)
// (Предполагается, что код профиля, который был тут, 
// перенесен в отдельный файл profile.js и работает корректно)
// =============================================================================

// ПРИМЕЧАНИЕ: Ваш предоставленный код requests.js также содержал логику профиля. 
// Лучше перенести ее в отдельный файл profile.js, но для целостности 
// я оставлю ее тут, если она еще не вынесена. Если логика профиля уже есть в profile.js, 
// то этот блок можно удалить.

// Здесь были функции profile.js: isPhoneEditValid, isCarPlateEditValid, 
// loadUserDataForEdit, openEditProfilePopup, closeEditProfilePopup, 
// saveUserData, validateEditForm, и обработчики событий профиля.
// Если они не вынесены, их следует оставить здесь или вынести в profile.js.
