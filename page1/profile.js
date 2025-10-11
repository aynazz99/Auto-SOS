// Предполагается, что db и userId объявлены в firebase-config.js
// и доступны в глобальной области видимости.

// === DOM Элементы для РЕДАКТИРОВАНИЯ ПРОФИЛЯ ===
const profileBtn = document.querySelector('.profile-btn');
const editProfilePopup = document.getElementById('edit-profile-popup');
const editProfileForm = document.getElementById('edit-profile-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn'); 
const saveProfileBtn = document.getElementById('save-profile-btn');

// Поля ввода для редактирования
const personEditInput = document.getElementById('person-input');
const carEditInput = document.getElementById('car-input');
const carPlateEditInput = document.getElementById('carplate-input');
const phoneEditInput = document.getElementById('phone-input');

// Ссылка на данные пользователя в Firebase
const userRef = db.ref('users/' + userId);


// =============================================================================
// I. Функции Валидации
// =============================================================================

/**
 * Проверяет полноту номера телефона.
 * @returns {boolean} True, если 11 цифр.
 */
function isPhoneEditValid() {
    if (!phoneEditInput) return false;
    const digits = phoneEditInput.value.replace(/\D/g, '');
    return digits.length === 11;
}

/**
 * Проверяет полноту номера автомобиля.
 * @returns {boolean} True, если номер соответствует минимальному формату (минимум 6 символов).
 */
function isCarPlateEditValid() {
    if (!carPlateEditInput) return false;
    const value = carPlateEditInput.value;
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    return cleanValue.length >= 6; 
}


/**
 * Блокирует/разблокирует кнопку "Сохранить" и отображает ошибки валидации.
 */
function validateEditForm() {
    const phoneValid = isPhoneEditValid();
    const carPlateValid = isCarPlateEditValid();

    // Визуальная обратная связь для телефона
    if (phoneEditInput) {
        phoneEditInput.style.border = phoneValid ? '' : '1px solid red';
        phoneEditInput.title = phoneValid ? '' : 'Введите полный номер телефона (11 цифр).';
    }

    // Визуальная обратная связь для номера автомобиля
    if (carPlateEditInput) {
        carPlateEditInput.style.border = carPlateValid ? '' : '1.2px solid red';
        carPlateEditInput.title = carPlateValid ? '' : 'Введите минимум 6 символов (например, А123ВВ) для номера.';
    }

    // Блокировка кнопки "Сохранить"
    if (saveProfileBtn) {
        const isValid = phoneValid && carPlateValid && personEditInput.value.trim().length > 0; // Добавим проверку имени
        saveProfileBtn.disabled = !isValid;
    }
}


// =============================================================================
// II. Функции Форматирования
// =============================================================================

// 1. Форматирование номера автомобиля
const cyrillicToLatin = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
    'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X'
};

if (carPlateEditInput) {
    carPlateEditInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();

        // Замена кириллицы на латиницу и удаление лишних символов
        value = value.replace(/[АВСЕКМНОРТХ]/g, match => cyrillicToLatin[match]);
        value = value.replace(/[^A-Z0-9]/g, '');

        let formatted = '';
        // Логика форматирования (X 123 YY | 123)
        if (value.length > 0 && /[A-Z]/.test(value[0])) formatted += value[0]; 
        if (value.length > 1 && /[0-9]{3}/.test(value.slice(1, 4))) formatted += ' ' + value.slice(1, 4); 
        if (value.length > 4 && /[A-Z]{2}/.test(value.slice(4, 6))) formatted += ' ' + value.slice(4, 6); 
        if (value.length > 6 && /[0-9]{2,3}/.test(value.slice(6, 9))) formatted += ' | ' + value.slice(6, 9);

        e.target.value = formatted.trim();
        validateEditForm(); 
    });
}


// 2. Форматирование имени
if (personEditInput) {
    personEditInput.addEventListener('input', (e) => {
        let value = e.target.value;

        value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
        value = value.substring(0, 25);

        // Первая буква каждого слова заглавная
        value = value.split(/[\s-]+/).map(word => {
            if (word.length === 0) return '';
            return word[0].toUpperCase() + word.slice(1).toLowerCase(); // LowerCase для остальных букв
        }).join(' ');

        e.target.value = value;
        validateEditForm(); 
    });
}

// 3. Формат телефона
if (phoneEditInput) {
    phoneEditInput.addEventListener('input', (e) => {
        let digits = e.target.value.replace(/\D/g, '');
        if (digits.length > 0) digits = '8' + digits.substr(1);
        digits = digits.substring(0, 11);

        let formatted = '';
        if (digits.length > 0) formatted += digits[0];
        if (digits.length > 1) formatted += ' (' + digits.substr(1, 3);
        if (digits.length > 4) formatted += ') ' + digits.substr(4, 3);
        if (digits.length > 7) formatted += ' ' + digits.substr(7, 2);
        if (digits.length > 9) formatted += ' ' + digits.substr(9, 2);
        
        e.target.value = formatted.trim();
        validateEditForm(); 
    });
}

// 4. Форматирование марки машины
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


// =============================================================================
// III. Основная логика попапа редактирования
// =============================================================================

/** Открывает попап редактирования профиля */
function openEditProfilePopup() {
    editProfilePopup.classList.add('show');
}

/** Закрывает попап редактирования профиля */
function closeEditProfilePopup() {
    editProfilePopup.classList.remove('show');
}

/** Загружает текущие данные пользователя и заполняет ими форму */
function loadUserDataForEdit() {
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Вызываем .trim() для уверенности
            personEditInput.value = (userData.person || '').trim();
            carEditInput.value = (userData.car || '').trim();
            carPlateEditInput.value = (userData.carPlate || '').trim();
            phoneEditInput.value = (userData.phone || '').trim();
        }
        validateEditForm(); 
    }, (error) => {
        console.error("Ошибка при загрузке данных:", error);
        alert("Ошибка при загрузке данных профиля.");
    });
}


/** Обрабатывает отправку формы и сохраняет данные в Firebase */
function saveUserData(event) {
    event.preventDefault();

    if (!isPhoneEditValid() || !isCarPlateEditValid() || personEditInput.value.trim() === '') {
        alert('Пожалуйста, заполните полностью ФИО, номер телефона и номер автомобиля.');
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


// =============================================================================
// IV. Обработчики событий
// =============================================================================

// 1. Нажатие на кнопку "Профиль"
if (profileBtn) { 
    profileBtn.addEventListener('click', () => {
        loadUserDataForEdit(); 
        openEditProfilePopup();
    });
}

// 2. Нажатие на кнопку "Отменить"
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', closeEditProfilePopup);
}

// 3. Отправка формы (кнопка "Сохранить")
if (editProfileForm) {
    editProfileForm.addEventListener('submit', saveUserData);
}

// 4. Закрытие попапа при клике вне его (на подложку)
if (editProfilePopup) {
    editProfilePopup.addEventListener('click', (e) => {
        if (e.target === editProfilePopup) {
            closeEditProfilePopup();
        }
    });

    // 5. Закрытие попапа по Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editProfilePopup.classList.contains('show')) {
            closeEditProfilePopup();
        }
    });
}