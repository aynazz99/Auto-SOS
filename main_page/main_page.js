// === Инициализация Firebase ===
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

// === Получение данных пользователя Telegram ===
document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;

  if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
    alert('Не удалось получить данные из Telegram. Открой мини-приложение внутри Telegram.');
    return;
  }

  const tgUser = tg.initDataUnsafe.user;
  const tgId = tgUser.id;

  // === Динамически показываем все данные Telegram на странице ===
  const infoDiv = document.createElement('div');
  infoDiv.id = 'tg-info';
  infoDiv.style.cssText = `
    background: #f1f1f1;
    padding: 10px;
    margin: 10px 0;
    border-radius: 8px;
    font-family: monospace;
    white-space: pre-wrap;
  `;
  infoDiv.textContent = "📦 Данные Telegram:\n" + JSON.stringify(tgUser, null, 2);
  document.body.prepend(infoDiv);

  // === Проверка регистрации ===
  db.ref('users/' + tgId).get().then(snapshot => {
    if (snapshot.exists()) {
      console.log('Пользователь зарегистрирован:', snapshot.val());
      initApp(snapshot.val());
    } else {
      // Показываем попап регистрации
      regPopup.classList.add('show');
    }
  }).catch(err => console.error(err));

  // === Обработка формы регистрации ===
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(regForm);
    const data = {
      person: formData.get('person'),
      car: formData.get('car'),
      carPlate: formData.get('carPlate'),
      phone: formData.get('phone'),
      tgUsername: tgUser.username || '',
      tgFirstName: tgUser.first_name || '',
      tgLastName: tgUser.last_name || '',
      tgLanguage: tgUser.language_code || '',
      tgId: tgId
    };

    db.ref('users/' + tgId).set(data)
      .then(() => {
        alert('Регистрация успешна!');
        regPopup.classList.remove('show');
        initApp(data);
      })
      .catch(err => console.error(err));
  });

  function initApp(userData) {
    console.log('Добро пожаловать,', userData.person);
    window.location.href = '../page1/page1.html';
  }
});

// === Остальной код форматирования полей ===

// --- Формат номера ---
const carPlateInput = document.querySelector('.car-plate');
if (carPlateInput) {
  const cyrillicToLatin = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
    'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X'
  };

  carPlateInput.addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[АВСЕКМНОРТХ]/g, match => cyrillicToLatin[match]);
    value = value.replace(/[^A-Z0-9]/g, '');
    let formatted = '';

    for (let i = 0; i < value.length; i++) {
      if (i === 0 && /[A-Z]/.test(value[i])) formatted += value[i];
      else if (i >= 1 && i <= 3 && /[0-9]/.test(value[i])) formatted += value[i];
      else if (i >= 4 && i <= 5 && /[A-Z]/.test(value[i])) formatted += value[i];
      else if (i >= 6 && i <= 8 && /[0-9]/.test(value[i])) formatted += value[i];
    }

    let spaced = '';
    if (formatted.length > 0) spaced += formatted[0];
    if (formatted.length > 1) spaced += ' ' + formatted.substr(1, 3);
    if (formatted.length > 4) spaced += ' ' + formatted.substr(4, 2);
    if (formatted.length > 6) spaced += ' | ' + formatted.substr(6, 3);
    e.target.value = spaced.trim();
  });
}

// --- Формат имени ---
const nameInput = document.querySelector('.person-name');
if (nameInput) {
  nameInput.addEventListener('input', (e) => {
    let value = e.target.value;
    value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
    value = value.substring(0, 25);
    value = value.split(/[\s-]+/).map(word => {
      if (!word) return '';
      return word[0].toUpperCase() + word.slice(1);
    }).join(' ');
    e.target.value = value;
  });
}

// --- Формат телефона ---
const phoneInput = document.querySelector('.phone');
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

// --- Формат марки машины ---
const carInput = document.querySelector('.car');
if (carInput) {
  carInput.addEventListener('input', (e) => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[^A-ZА-Я0-9]/gi, '');
    value = value.substring(0, 25);
    e.target.value = value;
  });
}
