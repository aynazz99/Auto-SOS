// ==== Дебаг-блок на весь экран ====
const debugDiv = document.createElement('div');
debugDiv.style.position = 'fixed';
debugDiv.style.top = '0';
debugDiv.style.left = '0';
debugDiv.style.width = '100%';
debugDiv.style.height = '100%';
debugDiv.style.overflowY = 'auto';
debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
debugDiv.style.color = 'white';
debugDiv.style.fontSize = '14px';
debugDiv.style.zIndex = '9999';
debugDiv.style.padding = '10px';
document.body.appendChild(debugDiv);

function debug(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  debugDiv.appendChild(p);
  debugDiv.scrollTop = debugDiv.scrollHeight; // авто-прокрутка
}

debug("✅ DOM полностью загружен");

// ==== Инициализация Firebase ====
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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
debug("✅ Firebase инициализирован");

// ==== Telegram Mini App ====
if (!window.Telegram || !Telegram.WebApp) {
  debug("⚠ Telegram WebApp недоступен");
}

// Ждём готовности Telegram WebApp
if (Telegram?.WebApp?.ready) {
  Telegram.WebApp.ready();
  debug("✅ Telegram WebApp готов");
}

// ==== Попытка получить пользователя Telegram ====
const tgUser = Telegram?.WebApp?.initDataUnsafe?.user;
debug("tgUser: " + (tgUser ? JSON.stringify(tgUser) : "undefined"));

if (!tgUser) {
  debug("⚠ Не удалось получить данные пользователя Telegram");
  alert("Ошибка: данные Telegram недоступны");
  throw new Error("Нет данных пользователя Telegram");
}

const tgId = tgUser.id;       
const tgName = tgUser.first_name;
const tgUsername = tgUser.username;
debug(`ID: ${tgId}, Имя: ${tgName}, Username: ${tgUsername}`);

// ==== Попап и форма регистрации ====
const regPopup = document.getElementById('regPopup');
const regForm = document.getElementById('regForm');

// ==== Проверка регистрации в Firebase ====
db.ref('users/' + tgId).get()
  .then(snapshot => {
    if (snapshot.exists()) {
      debug("✅ Пользователь зарегистрирован: " + JSON.stringify(snapshot.val()));
      initApp(snapshot.val());
    } else {
      debug("ℹ Пользователь не найден, показываем попап регистрации");
      regPopup.classList.add('show');
    }
  })
  .catch(err => debug("❌ Ошибка Firebase: " + err));

// ==== Обработка формы регистрации ====
regForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(regForm);
  const data = {
    person: formData.get('person'),
    car: formData.get('car'),
    carPlate: formData.get('carPlate'),
    phone: formData.get('phone')
  };

  db.ref('users/' + tgId).set(data)
    .then(() => {
      debug("✅ Регистрация успешна: " + JSON.stringify(data));
      regPopup.classList.remove('show');
      initApp(data);
    })
    .catch(err => debug("❌ Ошибка при записи в Firebase: " + err));
});

// ==== Функция инициализации приложения после регистрации ====
function initApp(userData) {
  debug("🎉 Добро пожаловать, " + userData.person);
  // Здесь можно редиректить на страницу заявок:
  window.location.href = '../page1/page1.html';
}









const carPlateInput = document.querySelector('.car-plate');

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
      if (/[A-Z]/.test(value[i])) formatted += value[i];        // первая буква
    } else if (i >= 1 && i <= 3) {
      if (/[0-9]/.test(value[i])) formatted += value[i];        // 3 цифры
    } else if (i >= 4 && i <= 5) {
      if (/[A-Z]/.test(value[i])) formatted += value[i];        // 2 буквы
    } else if (i >= 6 && i <= 8) {
      if (/[0-9]/.test(value[i])) formatted += value[i];        // 2-3 цифры (регион)
    }
  }

  // Форматирование с пробелами и разделителем
  let spaced = '';
  if (formatted.length > 0) spaced += formatted[0];                 // первая буква
  if (formatted.length > 1) spaced += ' ' + formatted.substr(1, 3); // три цифры
  if (formatted.length > 4) spaced += ' ' + formatted.substr(4, 2); // две буквы
  if (formatted.length > 6) spaced += ' | ' + formatted.substr(6, 3); // регион через |

  e.target.value = spaced.trim();
});


const nameInput = document.querySelector('.person-name');

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
});


const phoneInput = document.querySelector('.phone');

phoneInput.addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, ''); // оставляем только цифры

    // Приводим все цифры к 8
    if (/^[0-9]/.test(digits)) {
        digits = '8' + digits.substr(1);
    }


    digits = digits.substring(0, 11); // максимум 11 цифр

    // Форматирование
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

const carInput = document.querySelector('.car');

carInput.addEventListener('input', (e) => {
  let value = e.target.value.toUpperCase();

  // Оставляем только буквы и цифры (любая кириллица и латиница)
  value = value.replace(/[^A-ZА-Я0-9]/gi, '');

  // Ограничиваем длину до 25 символов
  value = value.substring(0, 25);

  e.target.value = value;
});





