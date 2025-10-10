document.addEventListener('DOMContentLoaded', async () => {
  //
  // === 🔧 ДИНАМИЧЕСКОЕ СОЗДАНИЕ СТИЛЕЙ ===
  //
  const style = document.createElement('style');
  style.textContent = `
    #preloader {
      position: fixed;
      inset: 0;
      background: #0e0e0e;
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      font-family: monospace;
      transition: opacity 0.6s ease, visibility 0.6s ease;
    }
    #preloader.hide { opacity: 0; visibility: hidden; }
    .loader {
      width: 60px; height: 60px;
      border: 6px solid rgba(255,255,255,0.2);
      border-top-color: #00aaff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading-text { font-size: 1.1em; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% {opacity:.5;} 50% {opacity:1;} }
    #debug-panel {
      width: 90%;
      max-width: 600px;
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px;
      text-align: left;
      overflow-y: auto;
      max-height: 55vh;
      color: #ddd;
      font-size: 0.85em;
    }
    #debug-panel h3 { margin: 0 0 5px 0; font-size: 1em; color: #00aaff; }
    #debug-output { white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; }
    #copy-debug {
      margin-top: 6px;
      background: #00aaff;
      border: none;
      border-radius: 5px;
      color: #fff;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 0.8em;
      transition: background 0.3s;
    }
    #copy-debug:hover { background: #0095dd; }
  `;
  document.head.appendChild(style);

  //
  // === 🔧 СОЗДАНИЕ ПРЕЛОАДЕРА И ДЕБАГ-ПАНЕЛИ ===
  //
  const preloader = document.createElement('div');
  preloader.id = 'preloader';
  preloader.innerHTML = `
    <div class="loader"></div>
    <p id="loading-text">Запуск приложения...</p>
    <div id="debug-panel">
      <h3>🔧 Debug Info</h3>
      <pre id="debug-output">Инициализация...</pre>
      <button id="copy-debug">📋 Копировать JSON</button>
    </div>
  `;
  document.body.appendChild(preloader);

  const loadingText = document.getElementById('loading-text');
  const debugOutput = document.getElementById('debug-output');
  const copyBtn = document.getElementById('copy-debug');

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(debugOutput.textContent)
      .then(() => copyBtn.textContent = '✅ Скопировано!')
      .catch(() => copyBtn.textContent = '⚠️ Ошибка копирования');
    setTimeout(() => copyBtn.textContent = '📋 Копировать JSON', 1500);
  });

  //
  // === 🔧 УТИЛИТЫ ===
  //
  const log = (msg, data = null) => {
    console.log(msg, data || '');
    debugOutput.textContent += `\n${msg}`;
    if (data) {
      try {
        debugOutput.textContent += `\n${JSON.stringify(data, null, 2)}\n`;
      } catch {
        debugOutput.textContent += `\n${data}\n`;
      }
    }
  };

  const updateStatus = (text) => {
    loadingText.textContent = text;
    log(`🌀 ${text}`);
  };

  //
  // === 🚀 ГЛАВНАЯ ЛОГИКА ===
  //
  try {
    updateStatus('Ожидание Telegram WebApp...');

    // Ждём Telegram.WebApp без ограничения по времени
    await new Promise((resolve) => {
      const checkTelegram = () => {
        if (window.Telegram && Telegram.WebApp) resolve();
        else requestAnimationFrame(checkTelegram);
      };
      checkTelegram();
    });

    Telegram.WebApp.ready();
    log('✅ Telegram.WebApp найден.');

    // Ждём initDataUnsafe
    updateStatus('Получаем данные от Telegram...');
    await new Promise((resolve) => {
      const checkUser = () => {
        if (Telegram.WebApp.initDataUnsafe) resolve();
        else requestAnimationFrame(checkUser);
      };
      checkUser();
    });

    const tg = Telegram.WebApp;
    const initData = tg.initData || '(пусто)';
    const initUnsafe = tg.initDataUnsafe || {};
    log('📦 initData:', initData);
    log('📦 initDataUnsafe:', initUnsafe);

    if (!initUnsafe.user) {
      updateStatus('❌ Нет данных пользователя!');
      log('⚠️ Telegram.WebApp.initDataUnsafe.user отсутствует.');
      return;
    }

    const tgUser = initUnsafe.user;
    const tgId = tgUser.id;
    log('👤 Пользователь:', tgUser);
    updateStatus('✅ Telegram данные получены.');

    // === Firebase ===
    updateStatus('Подключаем Firebase...');
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
    log('🔥 Firebase инициализирован.');

    updateStatus('Проверяем регистрацию в Firebase...');
    const snapshot = await db.ref('users/' + tgId).get();

    if (snapshot.exists()) {
      log('✅ Пользователь найден в Firebase:', snapshot.val());
      updateStatus('Добро пожаловать, ' + snapshot.val().person);
      await new Promise((r) => setTimeout(r, 800));
      preloader.classList.add('hide');
      initApp(snapshot.val());
    } else {
      log('⚠️ Новый пользователь — показываем форму регистрации.');
      updateStatus('Не зарегистрирован. Ожидание действий...');
      await new Promise((r) => setTimeout(r, 800));
      preloader.classList.add('hide');
      document.getElementById('regPopup')?.classList.add('show');
    }

    function initApp(userData) {
      log('🚀 Инициализация приложения с пользователем:', userData);
      Telegram.WebApp.expand();
      window.location.href = '../page1/page1.html';
    }

  } catch (err) {
    console.error('Ошибка инициализации:', err);
    debugOutput.textContent += `\n❌ Ошибка: ${err.message}`;
    preloader.classList.add('hide');
    alert('Ошибка при запуске. Проверьте консоль.');
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










