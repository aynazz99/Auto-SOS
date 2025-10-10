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

let currentProfileId = null; // Глобальная переменная для хранения Telegram ID

document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  const regPopup = document.getElementById('regPopup');
  const regForm = document.getElementById('regForm');

  // --- 1. АВТОРИЗАЦИЯ TELEGRAM / ПРОВЕРКА FIREBASE ---

  async function initApp() {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Получаем данные пользователя из Telegram
    const tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser || !tgUser.id) {
      // Если данные Telegram недоступны, показываем ошибку и закрываем приложение
      alert("Ошибка: Данные пользователя Telegram недоступны. Пожалуйста, запустите приложение через бота.");
      if (tg) tg.close();
      return;
    }

    currentProfileId = tgUser.id.toString();
    const userRef = db.ref(`users/${currentProfileId}`);

    try {
      const snapshot = await userRef.get();

      if (snapshot.exists()) {
        // Пользователь найден: скрываем попап и показываем основной контент
        console.log("✅ Пользователь найден в базе.");
        regPopup.style.display = 'none';
        // Здесь можно вызвать функцию, которая загружает основные данные приложения
        // loadMainContent(snapshot.val()); 
      } else {
        // Пользователь не найден: показываем попап регистрации
        console.log("❌ Пользователь не найден. Показываем регистрацию.");
        regPopup.style.display = 'flex'; 
        // Если вы используете MainButton, его можно показать здесь:
        // if (tg) tg.MainButton.show();
      }

    } catch (error) {
      console.error("Ошибка при проверке Firebase:", error);
      // В случае ошибки Firebase показываем регистрацию как запасной вариант
      regPopup.style.display = 'flex';
      if (tg) tg.showAlert('Ошибка связи с базой данных. Попробуйте позже.');
    }
  }

  // --- 2. ОБРАБОТКА ФОРМЫ РЕГИСТРАЦИИ ---

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentProfileId) {
        if (tg) tg.showAlert("Ошибка авторизации. Попробуйте перезапустить приложение.");
        return;
      }
      
      const tgUser = tg?.initDataUnsafe?.user;
      const formData = new FormData(regForm);
      const phoneDigits = formData.get('phone').replace(/\D/g, ''); // Сохраняем только цифры

      const userData = {
        name: formData.get('person').trim(),
        car: formData.get('car').trim(),
        carPlate: formData.get('carPlate').trim(),
        phone: phoneDigits,
        telegramId: currentProfileId,
        username: tgUser.username || '',
        firstName: tgUser.first_name || '',
        registrationDate: new Date().toISOString()
      };

      const userRef = db.ref(`users/${currentProfileId}`);

      try {
        await userRef.set(userData);
        console.log("✅ Регистрация прошла успешно!");
        
        regPopup.style.display = 'none';
        if (tg) tg.showAlert('Регистрация завершена! Добро пожаловать.');
        
        // Здесь можно вызвать функцию, которая загружает основные данные приложения
        // loadMainContent(userData); 

      } catch (error) {
        console.error("Ошибка при сохранении в Firebase:", error);
        if (tg) tg.showAlert('Ошибка при регистрации. Попробуйте позже.');
      }
    });
  }

  // --- 3. КОД ФОРМАТИРОВАНИЯ ПОЛЕЙ (БЕЗ ИЗМЕНЕНИЙ) ---

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

  // Запуск инициализации приложения
  initApp();
});
