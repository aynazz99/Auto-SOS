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

// ==== Элементы для выбора городов с чекбоксами ====
// ⚠️ Предполагается, что в HTML есть <input id="nearbycity-input"> и <ul id="city-checkbox-list">
const nearbyCityInput = document.getElementById('nearbycity-input');
const cityCheckboxList = document.getElementById('city-checkbox-list');

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ГОРОДОВ
let ALL_CITIES = []; // Все города из базы
// Карта для отслеживания выбранных городов: { 'Город A': true, 'Город Б': true }
const selectedCitiesMap = new Map(); 
// =================================================

// ==== Элементы страницы: Профиль (оставлены для контекста) ====
const profileBtn = document.querySelector('.profile-btn');
const editProfilePopup = document.getElementById('edit-profile-popup');
const editProfileForm = document.getElementById('edit-profile-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');

const personEditInput = document.getElementById('person-input');
const phoneEditInput = document.getElementById('phone-input');

// =============================================================================
// I. Логика Заявок (Начало)
// =============================================================================

if (typeof db === 'undefined' || typeof userId === 'undefined') {
    console.error("❌ Глобальные переменные db или userId не определены.");
}

const userRef = db.ref('users/' + userId);
const CHANNEL_ID = 'название_вашего_канала'; 
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

// -----------------------------------------------------------------------------
// II. Логика Загрузки Городов и Поиска с Чекбоксами
// -----------------------------------------------------------------------------

/**
 * Загружает список всех городов из Firebase, используя путь 'location'.
 */
async function loadAllCities() {
    try {
        const snapshot = await db.ref('location').once('value'); 
        if (snapshot.exists()) {
            ALL_CITIES = Object.values(snapshot.val()); 
            
            console.log(`✅ Города загружены для заявок: ${ALL_CITIES.length}`);
        } else {
            console.warn("База городов 'location' пуста. Проверьте путь в Firebase.");
        }
    } catch (error) {
        console.error("Ошибка загрузки списка городов из Firebase:", error);
    }
}

/**
 * Обновляет список чекбоксов на основе поискового запроса.
 * @param {string} searchTerm Строка для поиска.
 */
function updateCityCheckboxList(searchTerm) {
    cityCheckboxList.innerHTML = '';
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // 1. Фильтруем города по поисковому запросу
    const matchingCities = ALL_CITIES.filter(city => city.toLowerCase().includes(lowerSearchTerm));
    
    // 2. Разделяем на выбранные и невыбранные
    const selectedMatchingCities = [];
    const unselectedMatchingCities = [];

    matchingCities.forEach(city => {
        if (selectedCitiesMap.has(city)) {
            selectedMatchingCities.push(city);
        } else {
            unselectedMatchingCities.push(city);
        }
    });

    // 3. Сортируем каждую группу по алфавиту
    selectedMatchingCities.sort();
    unselectedMatchingCities.sort();

    // 4. Объединяем: выбранные + невыбранные
    const finalCityList = selectedMatchingCities.concat(unselectedMatchingCities);

    // 5. Ограничиваем список для отображения
    const DISPLAY_LIMIT = 15; 
    const citiesToDisplay = finalCityList.slice(0, DISPLAY_LIMIT);


    if (citiesToDisplay.length === 0) {
        const noResults = document.createElement('li');
        noResults.classList.add('city-item', 'no-results');
        noResults.textContent = searchTerm 
            ? `Город "${searchTerm}" не найден. Проверьте написание.` 
            : 'Начните вводить название города...';
        cityCheckboxList.appendChild(noResults);
    }

    citiesToDisplay.forEach(city => {
        const item = document.createElement('li');
        item.classList.add('city-item'); 

        const isChecked = selectedCitiesMap.has(city);

        const safeId = city.replace(/\s/g, '_').replace(/[^\w-]/g, ''); 
        item.innerHTML = `
            <input type="checkbox" id="city-cb-${safeId}" value="${city}" ${isChecked ? 'checked' : ''}>
            <label for="city-cb-${safeId}">${city}</label>
        `;

        item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            handleCityCheckboxChange(e.target.value, e.target.checked, e.target);
        });
        
        cityCheckboxList.appendChild(item);
    });

    // Убеждаемся, что список виден после обновления
    cityCheckboxList.style.display = 'block'; 
}

/**
 * Обрабатывает изменение состояния чекбокса (выбор/снятие выбора).
 */
function handleCityCheckboxChange(cityValue, isChecked, checkbox) {
    if (isChecked) {
        // Проверка лимита (1-3 города)
        if (selectedCitiesMap.size >= 3) {
            alert('Можно выбрать не более 3 ближайших городов.');
            checkbox.checked = false; // Отменяем выбор
            return;
        }
        selectedCitiesMap.set(cityValue, true);
    } else {
        selectedCitiesMap.delete(cityValue);
    }
    
    // Очищаем поле ввода, чтобы пользователь мог начать новый поиск
    nearbyCityInput.value = ''; 
    
    // Вызов updateSelectedCityInput обновит плейсхолдер и список
    updateSelectedCityInput(); 
}

/**
 * Обновляет плейсхолдер, показывая выбранные города, и обновляет список чекбокса.
 */
function updateSelectedCityInput() {
    const selectedCities = Array.from(selectedCitiesMap.keys());
    
    // Обновляем плейсхолдер, показывая количество выбранных городов.
    if (selectedCities.length > 0) {
        // Отображаем выбранные города в плейсхолдере
        const selectedNames = selectedCities.join(', ');
        nearbyCityInput.placeholder = `Выбрано: ${selectedNames} (${selectedCities.length}/3)`;
    } else {
        nearbyCityInput.placeholder = "Введите и выберите ближайшие города (1-3)";
    }

    // Проверка состояния required (требуется, если ничего не выбрано)
    nearbyCityInput.required = selectedCities.length === 0;

    // Обновляем список, используя текущий поисковый термин (который может быть пустым после выбора)
    updateCityCheckboxList(getCurrentSearchTerm(nearbyCityInput.value)); 
}


/**
 * Извлекает поисковый запрос из полного текста поля ввода (теперь это просто ввод).
 */
function getCurrentSearchTerm(fullValue) {
    // Просто возвращаем весь текст из поля ввода.
    return fullValue.trim();
}


// -----------------------------------------------------------------------------
// III. Логика Toggling списка городов
// -----------------------------------------------------------------------------

// 1. Обработчик для ПОИСКА
nearbyCityInput.addEventListener('input', (e) => {
    const searchTerm = getCurrentSearchTerm(e.target.value);
    updateCityCheckboxList(searchTerm);
});

// 2. Обработчик для TOGGLE (ОТКРЫТЬ/ЗАКРЫТЬ) по клику на поле ввода
nearbyCityInput.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (cityCheckboxList.style.display === 'block') {
        cityCheckboxList.style.display = 'none';
    } else {
        // Если список скрыт, открываем его и обновляем список городов
        const searchTerm = getCurrentSearchTerm(nearbyCityInput.value);
        updateCityCheckboxList(searchTerm);
        nearbyCityInput.focus();
    }
});


// 3. Закрытие выпадающего списка при клике вне его
document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.city-wrapper'); 
    
    if (!wrapper || !cityCheckboxList) return; 

    // Если клик был вне всего блока выбора города (wrapper) И список открыт, закрываем список
    if (!wrapper.contains(e.target) && cityCheckboxList.style.display === 'block') {
        cityCheckboxList.style.display = 'none';
        nearbyCityInput.blur(); // Убираем фокус с поля
    }
});

// -----------------------------------------------------------------------------
// IV. Обновленная Логика Попапа и Заявок
// -----------------------------------------------------------------------------

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
    
    // Скрываем список городов при закрытии попапа
    if (cityCheckboxList) {
        cityCheckboxList.style.display = 'none';
    }
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
    
    // Сброс выбранных городов и списка при открытии
    selectedCitiesMap.clear(); // Очищаем выбранные города
    if (nearbyCityInput) nearbyCityInput.value = ''; // Очищаем поле поиска
    updateSelectedCityInput(); // Обновит плейсхолдер
    if (cityCheckboxList) {
        cityCheckboxList.innerHTML = '';
        cityCheckboxList.style.display = 'none'; // Убеждаемся, что список изначально скрыт
    }


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
    
    const userSnapshot = await db.ref('users/' + userId).once('value');
    const userData = userSnapshot.val();

    if (!userSnapshot.exists() || !userData.person || !userData.phone || !userData.location) {
        alert('Необходимо полностью заполнить профиль (Имя, Телефон, Населенный пункт) перед созданием заявки.');
        profileBtn.click();
        return;
    }
    
    const userCityKey = userData.location; 

    const problem = problemInput.value.trim();
    const comments = commentsInput.value.trim();

    // Использование выбранных городов из Map
    const nearbyCities = Array.from(selectedCitiesMap.keys()); 
    
    // Проверка всех обязательных полей
    if (!problem || nearbyCities.length === 0) {
        alert('Заполните все обязательные поля (Проблема и выберите хотя бы 1 ближайший город)!');
        return;
    }
    
    const snapshot = await db.ref('requests').orderByChild('userId').equalTo(userId).once('value');
    const now = Date.now();
    let hasActive = false;

    snapshot.forEach(childSnap => {
        const request = childSnap.val();
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

    if (remaining === 0 && timeElapsed > REQUEST_TIMEOUT_MS) {
        if (requestData.userId === userId) db.ref('requests/' + key).remove().catch(console.error);
        return;
    }

    const card = document.createElement('div');
    card.classList.add('request-card');

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
        const chatLink = `https://t.me/${CHANNEL_ID}?thread=${key}`;
        window.open(chatLink, "_blank");
    };

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

    const requestData = {
        userId,
        person: userData.person,
        phone: userData.phone,
        problem,
        comments,
        cityKey: userCityKey,
        nearbyCities: nearbyCities ?? null,
        createdAt: new Date().toISOString()
    };

    sendBtn.disabled = true;

    try {
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


// ==== ЗАГРУЗКА ЗАЯВОК ПОЛЬЗОВАТЕЛЯ ====
async function loadRequests() {
    
    if (!userId) {
        requestsContainer.innerHTML = '<div class="request-card empty">Ошибка: Пользователь не авторизован.</div>';
        if (typeof helpBtn !== 'undefined') helpBtn.disabled = true;
        return;
    }

    if (typeof helpBtn !== 'undefined') helpBtn.disabled = false; 

    requestsContainer.innerHTML = '<div class="request-card empty">Загрузка ваших заявок...</div>';
    
    db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            requestsContainer.innerHTML = ''; 
            const data = snapshot.val();
            
            if (!data) {
                checkAndAddEmptyCard();
                return;
            }
            
            Object.entries(data).reverse().forEach(([key, request]) => displayRequestCard(request, key));
            checkAndAddEmptyCard(); 
        })
        .catch(error => {
            console.error('Ошибка загрузки заявок:', error);
            requestsContainer.innerHTML = '<div class="request-card empty">Ошибка при загрузке заявок.</div>';
        });
}


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

// =============================================================================
// V. Инициализация при загрузке
// =============================================================================

loadRequests();
loadAllCities(); // Загружаем список городов из Firebase
window.loadRequests = loadRequests;