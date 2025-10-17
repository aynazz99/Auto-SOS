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

const tgId = tgUser.id;;
// Попап, форма и кнопка
const regPopup = document.getElementById('regPopup');
const regForm = document.getElementById('regForm');
const regSubmitBtn = regForm.querySelector('button[type="submit"]'); // Предполагается, что кнопка внутри формы

// Поля
const carPlateInput = document.querySelector('.car-plate');
const phoneInput = document.querySelector('.phone');
const nameInput = document.querySelector('.person-name'); // для полноты
const carInput = document.querySelector('.car'); // для полноты

// --- Функции валидации ---

/**
 * Проверяет полноту номера телефона.
 * @returns {boolean} True, если 11 цифр.
 */
function isPhoneValid() {
    const digits = phoneInput.value.replace(/\D/g, '');
    // Проверка на 11 цифр (например, 79001234567)
    return digits.length === 11;
}

/**
 * Проверяет полноту номера автомобиля.
 * @returns {boolean} True, если номер соответствует минимальному формату.
 */
function isCarPlateValid() {
    const value = carPlateInput.value;
    // Ожидаемый минимальный формат: 1 буква + 3 цифры + 2 буквы. Длина форматированной строки: X 123 YY (8 символов).
    // Полный формат с регионом: X 123 YY | 123. Длина: 12 символов.
    // Проверим на минимально необходимый набор символов без учета региона: X123YY
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    return cleanValue.length >= 6; // Минимум 1 буква, 3 цифры, 2 буквы
}


/**
 * Блокирует/разблокирует кнопку регистрации.
 */
function validateForm() {
    const isValid = isPhoneValid() && isCarPlateValid();

    if (regSubmitBtn) {
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
    validateForm();
  }
}).catch(err => console.error(err));

// Обработка формы регистрации
regForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Дополнительная проверка перед отправкой на случай, если кнопка была активирована
  if (!isPhoneValid() || !isCarPlateValid()) {
      alert('Пожалуйста, заполните полностью номер телефона и номер автомобиля.');
      return;
  }

  const formData = new FormData(regForm);
  const data = {
    person: formData.get('person'),
    car: formData.get('car'),
    carPlate: formData.get('carPlate'),
    phone: formData.get('phone')
  };

  db.ref('users/' + tgId).set(data)
    .then(() => {
      alert('Регистрация успешна!');
      regPopup.classList.remove('show');
      initApp(data);
    })
    .catch(err => console.error(err));
});

// Функция инициализации приложения после регистрации
function initApp(userData) {
  console.log('Добро пожаловать,', userData.person);
  // Здесь можно редиректить на страницу заявок:
  window.location.href = '../page1/page1.html'
}


// --- Логика форматирования полей (без изменений, кроме добавления validateForm) ---

// 1. Форматирование номера автомобиля
const cyrillicToLatin = {
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
  'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
  'Р': 'P', 'Т': 'T', 'Х': 'X'
};

carPlateInput.addEventListener('input', (e) => {
  let value = e.target.value.toUpperCase();

  // Заменяем кириллицу на латиницу
  value = value.replace(/[АВСЕКМНОРТХ]/g, match => cyrillicToLatin[match]);

  // Убираем все лишние символы (оставляем только латиницу и цифры)
  value = value.replace(/[^A-Z0-9]/g, '');

  let formatted = '';

  for (let i = 0; i < value.length; i++) {
    if (i === 0) {
      if (/[A-Z]/.test(value[i])) formatted += value[i]; // первая буква
    } else if (i >= 1 && i <= 3) {
      if (/[0-9]/.test(value[i])) formatted += value[i]; // 3 цифры
    } else if (i >= 4 && i <= 5) {
      if (/[A-Z]/.test(value[i])) formatted += value[i]; // 2 буквы
    } else if (i >= 6 && i <= 8) {
      if (/[0-9]/.test(value[i])) formatted += value[i]; // 2-3 цифры (регион)
    }
  }

  // Форматирование с пробелами и разделителем
  let spaced = '';
  if (formatted.length > 0) spaced += formatted[0]; // первая буква
  if (formatted.length > 1) spaced += ' ' + formatted.substr(1, 3); // три цифры
  if (formatted.length > 4) spaced += ' ' + formatted.substr(4, 2); // две буквы
  if (formatted.length > 6) spaced += ' | ' + formatted.substr(6, 3); // регион через |

  e.target.value = spaced.trim();

  validateForm(); // <-- Вызов валидации после форматирования
});


// 2. Форматирование имени
nameInput.addEventListener('input', (e) => {
    let value = e.target.value;

    // Оставляем только буквы и пробелы
    value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');

    // Ограничиваем длину до 25 символов
    value = value.substring(0, 25);

    // Делаем первую букву каждого слова заглавной
    value = value.split(/[\s-]+/).map(word => {
        if (word.length === 0) return '';
        return word[0].toUpperCase() + word.slice(1);
    }).join(' ');

    e.target.value = value;
    // validateForm(); // Необязательно для кнопки
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
  });
}


// 4. Форматирование марки машины
carInput.addEventListener('input', (e) => {
  let value = e.target.value;

  // Запрещаем пробел только в начале
  value = value.replace(/^\s+/, '');

  // Оставляем только буквы, цифры и пробелы (латиница и кириллица)
  value = value.replace(/[^A-ZА-Я0-9\s]/gi, '');

  // Все буквы в верхний регистр
  value = value.toUpperCase();

  // Ограничиваем длину до 25 символов
  value = value.substring(0, 25);

  e.target.value = value;
  // validateForm(); // Необязательно для кнопки
});




// --- Функции валидации (оставлены как заглушки, используются ваши) ---

function isPhoneValid() {
    if (!phoneInput) return false;
    const digits = phoneInput.value.replace(/\D/g, '');
    return digits.length === 11;
}

function isCarPlateValid() {
    if (!carPlateInput) return false;
    const value = carPlateInput.value;
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    // Минимум X123YY
    return cleanValue.length >= 6;
}


// --- Главная функция валидации и отображения ошибок (УПРОЩЕННАЯ) ---

/**
 * Блокирует кнопку и использует встроенные стили/атрибуты title для ошибок.
 */
function validateForm() {
    const phoneValid = isPhoneValid();
    const carPlateValid = isCarPlateValid();

    // 1. Валидация телефона
    if (!phoneValid) {
        // Подсветка и системное сообщение
        phoneInput.style.border = '1px solid red';
        phoneInput.title = 'Введите полный номер телефона (11 цифр).';
    } else {
        // Сброс
        phoneInput.style.border = '';
        phoneInput.title = '';
    }

    // 2. Валидация номера автомобиля
    if (!carPlateValid) {
        // Подсветка и системное сообщение
        carPlateInput.style.border = '1.2px solid red';
        carPlateInput.title = 'Введите минимум 6 символов (например, А123ВВ) для номера.';
    } else {
        // Сброс
        carPlateInput.style.border = '';
        carPlateInput.title = '';
    }

    // 3. Блокировка кнопки
    if (regSubmitBtn) {
        const isValid = phoneValid && carPlateValid;
        regSubmitBtn.disabled = !isValid;
    }
}


// --- Привязка к событиям ---

// Вызов валидации при изменении полей
if (carPlateInput) carPlateInput.addEventListener('input', validateForm);
if (phoneInput) phoneInput.addEventListener('input', validateForm);



