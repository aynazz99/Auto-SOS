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

// === Диагностический блок для вывода всех данных Telegram ===
document.addEventListener("DOMContentLoaded", () => {
  const outputDiv = document.createElement('div');
  outputDiv.id = 'tg-debug';
  outputDiv.style.cssText = `
    font-family: monospace;
    background: #111;
    color: #0f0;
    padding: 12px;
    margin: 10px;
    border-radius: 10px;
    white-space: pre-wrap;
    font-size: 13px;
  `;
  document.body.prepend(outputDiv);

  function showTelegramData() {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      outputDiv.textContent = '❌ Telegram WebApp не найден. Откройте мини-приложение через Telegram.';
      return;
    }

    // Формируем объект с основными ключами
    const webAppData = {
      version: tg.version,
      platform: tg.platform,
      isExpanded: tg.isExpanded,
      isClosingConfirmed: tg.isClosingConfirmed,
      initData: tg.initData,
      initDataUnsafe: tg.initDataUnsafe,
      MainButton: {
        isVisible: tg.MainButton.isVisible,
        text: tg.MainButton.text,
        color: tg.MainButton.color,
        textColor: tg.MainButton.textColor
      },
      BackButton: {
        isVisible: tg.BackButton.isVisible
      }
    };

    outputDiv.textContent = JSON.stringify(webAppData, null, 2);
  }

  // Показываем данные сразу при загрузке
  showTelegramData();

  // Обновляем данные каждые 500 мс на случай изменений (например, MainButton)
  setInterval(showTelegramData, 500);
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

