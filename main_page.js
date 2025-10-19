// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDtpFytzqGoE8w1cK_uekt3nnNGN4vV2Y8",
    authDomain: "auto-sos-8446f.firebaseapp.com",
    projectId: "auto-sos-8446f",
    storageBucket: "auto-sos-8446f.firebasestorage.app",
    messagingSenderId: "326847407685",
    appId: "1:326847407685:web:bfc1434124e1feed3ce52c",
    measurementId: "G-0YL7B1NZT1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Заглушка для тестирования вне Telegram
if (typeof Telegram === 'undefined') {
    window.Telegram = {
        WebApp: {
            initDataUnsafe: {
                user: {
                    id: 'test_user_123', // любой уникальный id
                    first_name: 'Тест',
                    username: 'testuser'
                }
            }
        }
    };
}

// Получение данных пользователя Telegram
const tgUser = Telegram?.WebApp?.initDataUnsafe?.user;
if (!tgUser) {
    alert('Не удалось получить данные пользователя Telegram.');
}

// Используем заглушку, как было в вашем коде
const tgId = "test_user";

// Попап, форма и кнопка
const regPopup = document.getElementById('regPopup');
const regForm = document.getElementById('regForm');
const regSubmitBtn = regForm.querySelector('button[type="submit"]');

// Поля
const phoneInput = document.querySelector('.phone');
const nameInput = document.querySelector('.person-name');
const cityInput = document.querySelector('.person-city');
const cityList = document.querySelector('.city-list');

// ЭЛЕМЕНТ СТРЕЛКИ: ищем элемент с классом city-dropdown-icon внутри обертки
const cityDropdownIcon = document.querySelector('.city-wrapper .city-dropdown-icon');

// --- Переменные для работы с городами (ИЗМЕНЕНО) ---
// Массив только с названиями городов (для отображения в списке)
let cityNames = [];
// Карта для поиска кода по названию (Название (в нижнем регистре): Код)
let cityToCodeMap = {};
// --------------------------------------------------------


// --- Функции валидации ---

function isPhoneValid() {
    if (!phoneInput) return false;
    const digits = phoneInput.value.replace(/\D/g, '');
    return digits.length === 11;
}

function isNameValid() {
    const name = nameInput.value.trim();
    return name.length >= 2;
}

/**
 * Проверяет, что введенное название города есть в списке загруженных (cityToCodeMap).
 * (ИЗМЕНЕНО)
 */
function isCityValid() {
    const city = cityInput.value.trim();
    if (city.length === 0) return false;
    
    // Проверяем наличие введенного города (регистронезависимо) в нашей карте
    return city.toLowerCase() in cityToCodeMap;
}


/**
 * Главная функция валидации: устанавливает aria-invalid и блокирует кнопку.
 */
function validateForm() {
    const phoneValid = isPhoneValid();
    const nameValid = isNameValid();
    const cityValid = isCityValid();

    // 1. Валидация телефона - устанавливаем aria-invalid
    if (phoneInput) {
        phoneInput.setAttribute('aria-invalid', !phoneValid);
        phoneInput.title = phoneValid ? '' : 'Введите полный номер телефона (11 цифр).';
    }

    // 2. Валидация имени - устанавливаем aria-invalid
    if (nameInput) {
        nameInput.setAttribute('aria-invalid', !nameValid);
        nameInput.title = nameValid ? '' : 'Введите имя (минимум 2 символа).';
    }

    // 3. Валидация города - устанавливаем aria-invalid
    if (cityInput) {
        cityInput.setAttribute('aria-invalid', !cityValid);
        cityInput.title = cityValid ? '' : 'Выберите населенный пункт из списка или введите существующий.';
    }
    
    // 4. Блокировка кнопки
    if (regSubmitBtn) {
        const isValid = phoneValid && nameValid && cityValid;
        regSubmitBtn.disabled = !isValid;
    }
}


// Проверка регистрации в Firebase
db.ref('users/' + tgId).get().then(snapshot => {
    if (snapshot.exists()) {
        console.log('Пользователь зарегистрирован:', snapshot.val());
        initApp(snapshot.val());
    } else {
        // Показываем попап регистрации
        regPopup.classList.add('show');
        // Инициализируем валидацию при показе формы
        setTimeout(validateForm, 0); 
    }
}).catch(err => console.error(err));

// Обработка формы регистрации
regForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!isPhoneValid() || !isNameValid() || !isCityValid()) {
        alert('Пожалуйста, заполните все поля корректно.');
        validateForm();
        return;
    }

    const formData = new FormData(regForm);
    const enteredCity = cityInput.value.trim();
    
    // *** ПОЛУЧАЕМ КОД ГОРОДА (ИЗМЕНЕНО) ***
    // Берем код из карты по названию (в нижнем регистре)
    const cityCode = cityToCodeMap[enteredCity.toLowerCase()]; 
    
    if (!cityCode) {
        alert('Ошибка: Не удалось найти код для выбранного населенного пункта.');
        validateForm(); 
        return;
    }

    // Формируем объект пользователя
    const data = {
        person: formData.get('person'),
        phone: formData.get('phone'),
        location: cityCode // 👈 СОХРАНЯЕМ КОД ГОРОДА
    };

    db.ref('users/' + tgId).set(data)
      .then(() => {
          alert('Регистрация успешна!');
          regPopup.classList.remove('show');
          initApp(data);
      })
      .catch(err => console.error('Ошибка регистрации:', err));
});


// Функция инициализации приложения после регистрации
function initApp(userData) {
    console.log('Добро пожаловать,', userData.person);
    // Здесь можно редиректить на страницу заявок:
    window.location.href = '../page1/page1.html'
}


// 2. Форматирование имени
nameInput.addEventListener('input', (e) => {
    let value = e.target.value;

    // Оставляем только буквы и пробелы
    value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
    value = value.substring(0, 25);

    // Делаем первую букву каждого слова заглавной
    value = value.split(/[\s-]+/).map(word => {
        if (word.length === 0) return '';
        return word[0].toUpperCase() + word.slice(1);
    }).join(' ');

    e.target.value = value;
    validateForm(); 
});


// Загрузка городов из Firebase (ИЗМЕНЕНО)
db.ref('location').get()
  .then(snapshot => {
    if (snapshot.exists()) {
        const citiesData = snapshot.val(); // Получаем { "4": "Азнакаево", ... }

        // 1. Создаем карту Название -> Код
        for (const [code, name] of Object.entries(citiesData)) {
            // Сохраняем в нижнем регистре для регистронезависимого поиска
            cityToCodeMap[name.toLowerCase()] = code; 
        }

        // 2. Получаем массив названий для списка автодополнения
        cityNames = Object.values(citiesData).sort(); 

        console.log('Города загружены:', cityNames);
    } else {
        console.warn('Список городов пуст.');
    }
  })
  .catch(err => console.error('Ошибка загрузки городов из Firebase:', err));


// Обработка ввода города
cityInput.addEventListener('input', (e) => {
    let value = e.target.value;

    // Разрешаем только буквы, пробелы и дефисы
    value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
    value = value.substring(0, 25);
    e.target.value = value;

    // Фильтрация списка (ИЗМЕНЕНО: используем cityNames)
    const filtered = cityNames.filter(city =>
        city.toLowerCase().startsWith(value.toLowerCase())
    ).slice(0, 10);

    showCityList(filtered);
    validateForm(); 
});

/**
 * Показывает список городов и управляет стрелкой.
 */
function showCityList(list) {
    cityList.innerHTML = '';

    if (list.length === 0) {
        cityList.style.display = 'none';
        if (cityDropdownIcon) {
            cityDropdownIcon.classList.remove('rotated');
        }
        return;
    }

    list.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city;
        li.addEventListener('click', () => {
            cityInput.value = city;
            cityList.style.display = 'none';
            if (cityDropdownIcon) {
                cityDropdownIcon.classList.remove('rotated');
            }
            validateForm();
        });
        cityList.appendChild(li);
    });

    cityList.style.display = 'block';
    if (cityDropdownIcon) {
        cityDropdownIcon.classList.add('rotated');
    }
}


// 💥 ОБРАБОТЧИК КЛИКА НА СТРЕЛКУ (делает стрелку кликабельной)
if (cityDropdownIcon) {
    cityDropdownIcon.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isListVisible = cityList.offsetParent !== null;

        if (isListVisible) {
            cityList.style.display = 'none';
            cityDropdownIcon.classList.remove('rotated');
        } else {
            let filtered;

            // Если клик по стрелке — всегда показываем первые 100 городов (ИЗМЕНЕНО: используем cityNames)
            filtered = cityNames.slice(0, 100);

            showCityList(filtered);
        }
    });
}


// Скрытие списка при клике вне поля/списка
document.addEventListener('click', (e) => {
    if (!e.target.closest('.city-wrapper')) {
        cityList.style.display = 'none';
        if (cityDropdownIcon) {
            cityDropdownIcon.classList.remove('rotated'); // ⬇️ Сброс стрелки
        }
        validateForm(); // Валидация при потере фокуса с поля города
    }
});


// --- Формат телефона ---
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
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
        validateForm(); 
    });
}


// --- Привязка к событиям для валидации ---
if (phoneInput) phoneInput.addEventListener('input', validateForm);
if (nameInput) nameInput.addEventListener('input', validateForm);
if (cityInput) cityInput.addEventListener('input', validateForm);
if (cityInput) cityInput.addEventListener('blur', validateForm);