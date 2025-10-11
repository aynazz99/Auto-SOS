// requests.js
// ВНИМАНИЕ: Этот код предполагает, что firebase-config.js уже загружен
// и определил глобальные переменные 'db' и 'userId'.

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

function handleNewRequest() {
    const problem = problemInput.value.trim();
    const address = addressInput.value.trim();
    const comments = commentsInput.value.trim();

    if (!problem || !address) {
        alert('Заполните хотя бы Проблему и Адрес!');
        return;
    }

    // Проверка активной заявки (логика 3-часового таймаута)
    db.ref('requests').orderByChild('userId').equalTo(userId).once('value')
        .then(snapshot => {
            const now = Date.now();
            let hasActive = false;
            snapshot.forEach(childSnap => {
                const request = childSnap.val();
                const createdTime = new Date(request.createdAt).getTime();
                // Активная заявка, если ей меньше 3 часов
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
        
        // Показ "Заявок пока нет"
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

// ==== Создание новой заявки ====
async function createRequestCard(userData, problem, address, comments, userId) {
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
        createdAt: new Date().toISOString()
    };

    await newRef.set(requestData);

    // Отображаем сразу
    displayRequestCard(requestData, key);
}

// ==== Подгрузка заявок при загрузке ====
function loadRequests() {
    requestsContainer.innerHTML = ''; // Очищаем контейнер перед загрузкой
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
        // Отображаем, начиная с самых новых (обратный порядок)
        Object.entries(data).reverse().forEach(([key, request]) => displayRequestCard(request, key));
        
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
// Вызываем загрузку при старте
loadRequests();


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
// II. Логика Редактирования Профиля (Profile)
// =============================================================================


// 1. Функции Валидации
function isPhoneEditValid() {
    if (!phoneEditInput) return false;
    const digits = phoneEditInput.value.replace(/\D/g, '');
    return digits.length === 11;
}

function isCarPlateEditValid() {
    if (!carPlateEditInput) return false;
    const value = carPlateEditInput.value;
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    return cleanValue.length >= 6; 
}

function validateEditForm() {
    const phoneValid = isPhoneEditValid();
    const carPlateValid = isCarPlateEditValid();

    if (phoneEditInput) {
        phoneEditInput.style.border = phoneValid ? '' : '1px solid red';
        phoneEditInput.title = phoneValid ? '' : 'Введите полный номер телефона (11 цифр).';
    }

    if (carPlateEditInput) {
        carPlateEditInput.style.border = carPlateValid ? '' : '1.2px solid red';
        carPlateEditInput.title = carPlateValid ? '' : 'Введите минимум 6 символов (например, А123ВВ) для номера.';
    }

    if (saveProfileBtn) {
        saveProfileBtn.disabled = !(phoneValid && carPlateValid);
    }
}


// 2. Функции Форматирования
const cyrillicToLatin = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
    'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X'
};

// Форматирование номера автомобиля
if (carPlateEditInput) {
    carPlateEditInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        value = value.replace(/[АВСЕКМНОРТХ]/g, match => cyrillicToLatin[match]);
        value = value.replace(/[^A-Z0-9]/g, '');

        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i === 0) {
                if (/[A-Z]/.test(value[i])) formatted += value[i];
            } else if (i >= 1 && i <= 3) {
                if (/[0-9]/.test(value[i])) formatted += value[i];
            } else if (i >= 4 && i <= 5) {
                if (/[A-Z]/.test(value[i])) formatted += value[i];
            } else if (i >= 6 && i <= 8) {
                if (/[0-9]/.test(value[i])) formatted += value[i];
            }
        }

        let spaced = '';
        if (formatted.length > 0) spaced += formatted[0]; 
        if (formatted.length > 1) spaced += ' ' + formatted.substr(1, 3); 
        if (formatted.length > 4) spaced += ' ' + formatted.substr(4, 2); 
        if (formatted.length > 6) spaced += ' | ' + formatted.substr(6, 3);

        e.target.value = spaced.trim();
        validateEditForm();
    });
}

// Форматирование имени
if (personEditInput) {
    personEditInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
        value = value.substring(0, 25);
        value = value.split(/[\s-]+/).map(word => {
            if (word.length === 0) return '';
            return word[0].toUpperCase() + word.slice(1);
        }).join(' ');
        e.target.value = value;
    });
}

// Формат телефона
if (phoneEditInput) {
    phoneEditInput.addEventListener('input', (e) => {
        let digits = e.target.value.replace(/\D/g, '');
        if (digits.length > 0) digits = '8' + digits.substr(1);
        digits = digits.substring(0, 11);
        let formatted = '';
        for (let i = 0; i < digits.length; i++) {
            if (i === 0) formatted += digits[i];
            else if (i === 1) formatted += ' (' + digits[i];
            else if (i === 2 || i === 3) formatted += digits[i];
            else if (i === 4) formatted += ') ' + digits[i];
            else if (i === 5 || i === 6) formatted += digits[i];
            else if (i === 7) formatted += ' ' + digits[i];
            else if (i === 8) formatted += digits[i];
            else if (i === 9) formatted += ' ' + digits[i];
            else if (i === 10) formatted += digits[i];
        }
        e.target.value = formatted;
        validateEditForm();
    });
}

// Форматирование марки машины
if (carEditInput) {
    carEditInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/^\s+/, '');
        value = value.replace(/[^A-ZА-Я0-9\s]/gi, '');
        value = value.toUpperCase();
        value = value.substring(0, 25);
        e.target.value = value;
    });
}


// 3. Основная логика попапа редактирования
function openEditProfilePopup() {
    editProfilePopup.classList.add('show');
}

function closeEditProfilePopup() {
    editProfilePopup.classList.remove('show');
}

function loadUserDataForEdit() {
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Устанавливаем значения и запускаем форматирование
            personEditInput.value = userData.person || '';
            carEditInput.value = userData.car || '';
            
            // Номер и телефон форматируются при вводе, поэтому просто устанавливаем их
            carPlateEditInput.value = userData.carPlate || '';
            phoneEditInput.value = userData.phone || '';
            
            // Чтобы применилось форматирование, мы можем вызвать событие 'input'
            if (carPlateEditInput.value) carPlateEditInput.dispatchEvent(new Event('input'));
            if (phoneEditInput.value) phoneEditInput.dispatchEvent(new Event('input'));
        }
        validateEditForm(); 
    }, (error) => {
        console.error("Ошибка при загрузке данных:", error);
        alert("Ошибка при загрузке данных профиля.");
    });
}

function saveUserData(event) {
    event.preventDefault();

    if (!isPhoneEditValid() || !isCarPlateEditValid()) {
        alert('Пожалуйста, заполните полностью номер телефона и номер автомобиля.');
        validateEditForm();
        return;
    }

    const updatedData = {
        person: personEditInput.value.trim(),
        car: carEditInput.value.trim(),
        carPlate: carPlateEditInput.value.trim(),
        phone: phoneEditInput.value.trim()
    };
    
    userRef.update(updatedData)
        .then(() => {
            alert('✅ Профиль успешно обновлен!');
            closeEditProfilePopup();
        })
        .catch((error) => {
            console.error("Ошибка при обновлении профиля:", error);
            alert('❌ Ошибка при сохранении: ' + error.message);
        });
}


// 4. Обработчики событий Профиля
if (profileBtn) { 
    profileBtn.addEventListener('click', () => {
        loadUserDataForEdit(); 
        openEditProfilePopup();
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', closeEditProfilePopup);
}

if (editProfileForm) {
    editProfileForm.addEventListener('submit', saveUserData);
}

if (editProfilePopup) {
    editProfilePopup.addEventListener('click', (e) => {
        if (e.target === editProfilePopup) {
            closeEditProfilePopup();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editProfilePopup.classList.contains('show')) {
            closeEditProfilePopup();
        }
    });
}