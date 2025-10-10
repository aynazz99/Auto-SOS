document.addEventListener('DOMContentLoaded', async () => {
  const preloader = document.getElementById('preloader');
  const loadingText = document.getElementById('loading-text');

  try {
    // === ШАГ 1. Ждём появления Telegram.WebApp ===
    loadingText.textContent = 'Подключаем Telegram...';

    await new Promise((resolve) => {
      const checkTelegram = () => {
        if (window.Telegram && Telegram.WebApp) resolve();
        else requestAnimationFrame(checkTelegram);
      };
      checkTelegram();
    });

    Telegram.WebApp.ready();

    // === ШАГ 2. Ждём данные пользователя ===
    loadingText.textContent = 'Получаем данные пользователя...';

    await new Promise((resolve) => {
      const checkUser = () => {
        if (Telegram.WebApp.initDataUnsafe?.user) resolve();
        else requestAnimationFrame(checkUser);
      };
      checkUser();
    });

    const tgUser = Telegram.WebApp.initDataUnsafe.user;
    const tgId = tgUser.id;
    console.log('✅ Telegram WebApp готов:', tgUser);

    // === ШАГ 3. Инициализация Firebase ===
    loadingText.textContent = 'Соединяемся с сервером...';

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

    const regPopup = document.getElementById('regPopup');
    const regForm = document.getElementById('regForm');

    // === ШАГ 4. Проверяем пользователя в Firebase ===
    loadingText.textContent = 'Проверяем регистрацию...';

    const snapshot = await db.ref('users/' + tgId).get();

    // === ШАГ 5. Скрываем прелоадер ===
    preloader.classList.add('hide');

    // === ШАГ 6. Показываем интерфейс ===
    if (snapshot.exists()) {
      console.log('✅ Пользователь найден:', snapshot.val());
      initApp(snapshot.val());
    } else {
      console.log('⚠️ Новый пользователь — открываем регистрацию.');
      regPopup.classList.add('show');
    }

    // === Форма регистрации ===
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(regForm);
      const data = {
        person: formData.get('person'),
        car: formData.get('car'),
        carPlate: formData.get('carPlate'),
        phone: formData.get('phone')
      };

      await db.ref('users/' + tgId).set(data);
      alert('✅ Регистрация успешна!');
      regPopup.classList.remove('show');
      initApp(data);
    });

    function initApp(userData) {
      console.log('Добро пожаловать,', userData.person);
      Telegram.WebApp.expand();
      window.location.href = '../page1/page1.html';
    }

  } catch (err) {
    console.error('Ошибка инициализации:', err);
    preloader.classList.add('hide');
    alert('Ошибка при подключении к Telegram. Попробуйте открыть приложение снова.');
  }
});












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









