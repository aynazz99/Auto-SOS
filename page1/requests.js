// requests.js
// ВНИМАНИЕ: Предполагается, что firebase-config.js уже загружен
// и определил глобальные переменные 'db', 'userId'.

// ==== Элементы страницы: Заявки ====
const helpBtn = document.querySelector('.help-btn');
const popup = document.getElementById('helpPopup');
const requestsContainer = document.querySelector('.requests');

const problemInput = popup.querySelector('#problem');
const commentsInput = popup.querySelector('#comments');
let sendBtn = popup.querySelector('#sendBtn');
let closeBtn = popup.querySelector('#closeBtn');
const popupTitle = popup.querySelector('.request-status');

// ==== Элементы страницы: Профиль ====
const profileBtn = document.querySelector('.profile-btn');
const editProfilePopup = document.getElementById('edit-profile-popup');
const editProfileForm = document.getElementById('edit-profile-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');

const personEditInput = document.getElementById('person-input');
const phoneEditInput = document.getElementById('phone-input');

// =============================================================================
// I. Логика Заявок
// =============================================================================
if (typeof db === 'undefined' || typeof userId === 'undefined') {
    console.error("❌ Глобальные переменные db или userId не определены. Проверьте загрузку firebase-config.js.");
}

const userRef = db.ref('users/' + userId);
// Предполагается, что CHANNEL_ID определен в другом месте (например, firebase-config.js)
const CHANNEL_ID = 'название_вашего_канала'; // Замените на реальный ID или определите в firebase-config.js

// Время жизни заявки (10 минут)
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

// ==== Попап открытие/закрытие ====
helpBtn.addEventListener('click', () => {
    if (helpBtn.disabled) return;
    openPopup('new');
});

popup.onclick = (e) => {
    if (e.target === popup) closePopup();
};

function closePopup() {
    popup.classList.remove('show');
    // Пересоздание кнопок для очистки обработчиков (для режима "edit")
    sendBtn.replaceWith(sendBtn.cloneNode(true));
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    sendBtn = popup.querySelector('#sendBtn');
    closeBtn = popup.querySelector('#closeBtn');
}

// ==== Функция открытия попапа ====
let currentMode = null;
let editKey = null;

function openPopup(mode, key = null) {
    currentMode = mode;
    editKey = key;

    // Сброс полей для "Новой заявки"
    problemInput.value = '';
    commentsInput.value = '';
    // Сброс полей ближайших городов
    document.getElementById('nearbicity1').value = '';
    document.getElementById('nearbicity2').value = '';
    document.getElementById('nearbicity3').value = '';

    // Сброс обработчиков перед назначением новых
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
        const commentsDiv = card.querySelector('.comments');

        // Заполнение полей текущими значениями
        problemInput.value = requestStatusDiv.textContent.trim();
        commentsInput.value = commentsDiv.textContent.trim();

        popupTitle.textContent = 'Изменить данные';
        sendBtn.textContent = 'Сохранить';
        closeBtn.textContent = 'Отменить';

        sendBtn.onclick = async () => {
            const newProblem = problemInput.value.trim();
            const newComments = commentsInput.value.trim();

            if (!newProblem) {
                alert('Проблема обязательна!');
                return;
            }

            try {
                await db.ref('requests/' + key).update({
                    problem: newProblem,
                    comments: newComments
                });
                // Обновление карточки на экране
                requestStatusDiv.textContent = newProblem;
                commentsDiv.textContent = newComments;
                closePopup();
            } catch (error) {
                console.error('Ошибка сохранения изменений:', error);
                alert('Не удалось сохранить изменения.');
            }
        };
    }

    closeBtn.onclick = closePopup;
    popup.classList.add('show');
}

// ==== Создание новой заявки ====
async function handleNewRequest() {
    
    // Получаем данные пользователя для проверки и получения userCityKey
    const userSnapshot = await db.ref('users/' + userId).once('value');
    const userData = userSnapshot.val();

    // Проверяем наличие поля location (вместо cityKey), person и phone
    if (!userSnapshot.exists() || !userData.person || !userData.phone || !userData.location) {
        alert('Необходимо полностью заполнить профиль (Имя, Телефон, Населенный пункт) перед созданием заявки.');
        profileBtn.click();
        return;
    }
    
    // Используем userData.location как ключ города
    const userCityKey = userData.location; 

    const problem = problemInput.value.trim();
    const comments = commentsInput.value.trim();

    const city1 = document.getElementById('nearbicity1').value.trim();
    const city2 = document.getElementById('nearbicity2').value.trim();
    const city3 = document.getElementById('nearbicity3').value.trim();
    
    const nearbyCities = [city1, city2, city3].filter(c => c); 
    
    // Проверка всех обязательных полей
    if (!problem || !city1 || !city2 || !city3) {
        alert('Заполните все обязательные поля (Проблема и 3 ближайших города)!');
        return;
    }

    // Проверка на активную заявку ОТ ПОЛЬЗОВАТЕЛЯ (фильтрация уже по userId)
    const snapshot = await db.ref('requests').orderByChild('userId').equalTo(userId).once('value');
    const now = Date.now();
    let hasActive = false;

    snapshot.forEach(childSnap => {
        const request = childSnap.val();
        // ⚠️ ИЗМЕНЕНИЕ: Не проверяем город, так как ищем активные заявки ОТ ЭТОГО пользователя
        const createdTime = new Date(request.createdAt).getTime();
        if (now - createdTime < REQUEST_TIMEOUT_MS) hasActive = true;
    });

    if (hasActive) {
        alert(`У вас уже есть активная заявка. Новую можно создать только через 10 минут.`);
        return;
    }

    // Создаем заявку
    createRequestCard(userData, problem, comments, userId, userCityKey, nearbyCities); 
    closePopup();
}

// Функции-обертки для использования в inline onclick
function editCard(key) { openPopup('edit', key); }

function deleteCard(key) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

    db.ref('requests/' + key).once('value')
        .then(snapshot => {
            const requestData = snapshot.val();
            // Проверка, что удаляется только своя заявка
            if (!requestData || requestData.userId !== userId) {
                alert('Вы не можете удалить чужую заявку или заявка не найдена.');
                return;
            }
            return db.ref('requests/' + key).remove();
        })
        .then(() => {
            const card = document.querySelector(`.request-card [onclick*="deleteCard('${key}')"]`)?.closest('.request-card');
            if (card) card.remove();
            checkAndAddEmptyCard();
        })
        .catch(console.error);
}

function checkAndAddEmptyCard() {
    if (!requestsContainer.querySelector('.request-card')) {
        const emptyCard = document.createElement('div');
        emptyCard.classList.add('request-card', 'empty');
        emptyCard.textContent = 'Заявок пока нет';
        requestsContainer.appendChild(emptyCard);
    }
}

// ==== Создание и отображение карточки ====
function displayRequestCard(requestData, key) {
    const createdTime = new Date(requestData.createdAt).getTime();
    const timeElapsed = Date.now() - createdTime;
    const remaining = Math.max(0, REQUEST_TIMEOUT_MS - timeElapsed);

    // Удаление просроченной заявки
    if (remaining === 0 && timeElapsed > REQUEST_TIMEOUT_MS) {
        if (requestData.userId === userId) db.ref('requests/' + key).remove().catch(console.error);
        return;
    }

    const card = document.createElement('div');
    card.classList.add('request-card');

    // Получение списка ближайших городов
    const nearbyCities = Array.isArray(requestData.nearbyCities) ? requestData.nearbyCities.join(', ') : '';

    card.innerHTML = `
        <div class="card-header">
            <div class="request-status">${requestData.problem}</div>
        </div>
        <hr class="divider">
        <div class="car-info">
            <div class="person-name">${requestData.person}</div>
            <div class="city-info">Ближайшие города: ${nearbyCities}</div>
        </div>
        <div class="phone">
            <span onclick="window.location.href = 'tel:${requestData.phone.replace(/[^0-9+]/g, '')}'"
                 style="color: blue; text-decoration: underline; cursor: pointer;">
                ${requestData.phone}
            </span>
        </div>
        <div class="comments">${requestData.comments || 'Нет комментариев'}</div>
        <div class="bottom-line">
            <div class="date-time">${new Date(requestData.createdAt).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
            <div class="request-status-btn">
                <button>Беседа</button>
            </div>
        </div>
    `;

    const chatBtn = card.querySelector('.request-status-btn button');
    chatBtn.onclick = () => {
        // Предполагается, что CHANNEL_ID определен
        const chatLink = `https://t.me/${CHANNEL_ID}?thread=${key}`;
        window.open(chatLink, "_blank");
    };

    // Кнопки редактирования/удаления только для своих заявок
    // Эта проверка остается актуальной, так как мы отображаем только свои заявки
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
        btn.onclick = e => { e.stopPropagation(); menu.style.display = menu.style.display==='flex'?'none':'flex'; };
        document.addEventListener('click', e => { if(!settingsWrapper.contains(e.target)) menu.style.display='none'; });
        cardHeader.appendChild(settingsWrapper);
    }

    requestsContainer.querySelectorAll('.request-card.empty').forEach(e => e.remove());
    requestsContainer.prepend(card);

    // Установка таймера на удаление заявки
    if (remaining > 0) {
        setTimeout(async () => {
            if (requestData.userId === userId) await db.ref('requests/' + key).remove().catch(console.error);
            card.remove();
            checkAndAddEmptyCard();
        }, remaining);
    }
}

// ==== Отправка и сохранение новой заявки ====
async function createRequestCard(userData, problem, comments, userId, userCityKey, nearbyCities) { 
    const newRef = db.ref('requests').push();
    const key = newRef.key;

    // Формируем объект данных заявки
    const requestData = {
        userId,
        person: userData.person,
        phone: userData.phone,
        problem,
        comments,
        cityKey: userCityKey,
        // Проверяем nearbyCities, чтобы не было undefined
        nearbyCities: nearbyCities ?? null,
        createdAt: new Date().toISOString()
    };

    sendBtn.disabled = true;

    try {
        // Сохраняем заявку в Firebase
        await newRef.set(requestData);
        console.log('✅ Заявка успешно сохранена в Firebase');
    } catch (error) {
        console.error('❌ Ошибка при сохранении заявки в Firebase:', error);
        alert(`Ошибка: ${error.message || error}`);
    } finally {
        displayRequestCard(requestData, key);
        sendBtn.disabled = false;
    }
}


// ==== ЗАГРУЗКА ЗАЯВОК ПОЛЬЗОВАТЕЛЯ (фильтр по userId) ====
/**
 * Загружает и отображает только заявки, созданные текущим пользователем.
 * (На основе логики requests.js)
 */
async function loadRequests() {
    
    // Проверка наличия userId
    if (!userId) {
        // Отображение сообщения об ошибке и отключение кнопки "Помощь"
        requestsContainer.innerHTML = '<div class="request-card empty">Ошибка: Пользователь не авторизован.</div>';
        // Предполагается, что helpBtn доступен
        if (typeof helpBtn !== 'undefined') helpBtn.disabled = true;
        return;
    }

    // Включение кнопки "Помощь" (если она была отключена)
    if (typeof helpBtn !== 'undefined') helpBtn.disabled = false; 

    // Индикатор загрузки
    requestsContainer.innerHTML = '<div class="request-card empty">Загрузка ваших заявок...</div>';
    
    // 🛑 Ключевой шаг: Запрос к Firebase с фильтрацией по текущему userId
    db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            requestsContainer.innerHTML = ''; // Очистка индикатора загрузки
            const data = snapshot.val();
            
            if (!data) {
                // Если нет данных, отображаем пустую карточку
                checkAndAddEmptyCard();
                return;
            }
            
            // Вывод в обратном порядке (самые новые сверху), как в requests.js
            Object.entries(data).reverse().forEach(([key, request]) => displayRequestCard(request, key));
            
            // Проверка и добавление пустой карточки, если все заявки, например, просрочены и удалены
            checkAndAddEmptyCard(); 
        })
        .catch(error => {
            console.error('Ошибка загрузки заявок:', error);
            requestsContainer.innerHTML = '<div class="request-card empty">Ошибка при загрузке заявок.</div>';
        });
}

// Вызов функции при загрузке
loadRequests();

// ⚠️ ОБНОВЛЕНИЕ: Перенаправляем глобальный вызов на новую функцию
window.loadRequests = loadUserRequests; 

// ==== Автокапитализация ====
function capitalizeFirstAndTrim(element) {
    element.addEventListener('input', () => {
        if (!element.value) return;
        element.value = element.value.trimStart();
        element.value = element.value.charAt(0).toUpperCase() + element.value.slice(1);
    });
}
capitalizeFirstAndTrim(problemInput);
capitalizeFirstAndTrim(commentsInput);