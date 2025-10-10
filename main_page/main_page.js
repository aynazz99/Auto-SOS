document.addEventListener('DOMContentLoaded', async () => {
  //
  // === 🔧 СТИЛИ И ПАНЕЛЬ ===
  //
  const style = document.createElement('style');
  style.textContent = `
    #preloader {
      position: fixed; inset: 0;
      background: #0e0e0e;
      color: #fff;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      font-family: monospace;
      z-index: 9999;
    }
    .loader {
      width: 60px; height: 60px;
      border: 6px solid rgba(255,255,255,0.1);
      border-top-color: #00aaff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #debug-panel {
      width: 90%; max-width: 600px; margin-top: 10px;
      text-align: left; font-size: 0.85em;
      color: #ddd; background: rgba(255,255,255,0.08);
      border-radius: 10px; padding: 10px;
      max-height: 60vh; overflow-y: auto;
    }
    .log-entry { margin: 4px 0; }
    .ok { color: #00ff99; }
    .warn { color: #ffaa00; }
    .err { color: #ff5555; }
    .info { color: #00aaff; }
  `;
  document.head.appendChild(style);

  const preloader = document.createElement('div');
  preloader.id = 'preloader';
  preloader.innerHTML = `
    <div class="loader"></div>
    <div id="debug-panel"></div>
  `;
  document.body.appendChild(preloader);
  const debug = document.getElementById('debug-panel');

  //
  // === УТИЛИТЫ ===
  //
  const log = (msg, cls = 'info') => {
    const el = document.createElement('div');
    el.className = `log-entry ${cls}`;
    el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    debug.appendChild(el);
    console.log(msg);
  };

  const waitFor = async (desc, checkFn, warnAfter = 5000) => {
    const start = Date.now();
    while (!checkFn()) {
      await new Promise(r => setTimeout(r, 100));
      if (Date.now() - start > warnAfter && Date.now() - start < warnAfter + 200) {
        log(`⏳ ${desc} ещё не инициализировался (${warnAfter / 1000}s)`, 'warn');
      }
    }
    log(`✅ ${desc} найден.`, 'ok');
  };

  //
  // === ГЛАВНЫЙ ЦИКЛ ===
  //
  try {
    log('🚀 Инициализация WebApp...');

    await waitFor('window.Telegram', () => !!window.Telegram);
    await waitFor('Telegram.WebApp', () => !!Telegram.WebApp);
    Telegram.WebApp.ready();

    await waitFor('Telegram.WebApp.initDataUnsafe', () => !!Telegram.WebApp.initDataUnsafe);

    const tg = Telegram.WebApp;
    const unsafe = tg.initDataUnsafe || {};

    // === Вывод сырых данных ===
    log('📦 RAW initData:', 'info');
    log(JSON.stringify(tg.initData || '(пусто)', null, 2), 'info');

    log('📦 RAW initDataUnsafe:', 'info');
    log(JSON.stringify(unsafe, null, 2), 'info');

    // === Анализ контекста ===
    let contextType = 'неизвестен';
    if (unsafe.user) contextType = 'приватный чат';
    else if (unsafe.chat_type === 'group' || unsafe.chat?.type === 'group') contextType = 'группа';
    else if (unsafe.chat_type === 'channel' || unsafe.chat?.type === 'channel') contextType = 'канал';
    else if (unsafe.inline_query_id) contextType = 'inline';
    else if (unsafe.chat_instance) contextType = 'chat_instance';

    log(`🌐 Контекст запуска: ${contextType}`, 'ok');

    const tgContext = unsafe.user || unsafe.chat;
    if (!tgContext?.id) {
      log('⚠️ Нет user/chat ID. Вероятно, WebApp открыт вне приватного чата.', 'warn');
      return;
    }

    log(`🆔 Telegram ID: ${tgContext.id}`, 'ok');
    log(`👤 Имя: ${tgContext.first_name || tgContext.title || '—'}`);

    // === Firebase ===
    log('🔥 Инициализация Firebase...');
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
    log('✅ Firebase готов.', 'ok');

    // === Проверка регистрации ===
    log('🔎 Проверяем регистрацию...');
    const snapshot = await db.ref('users/' + tgContext.id).get();

    if (snapshot.exists()) {
      log('✅ Пользователь найден: ' + JSON.stringify(snapshot.val()), 'ok');
      setTimeout(() => preloader.remove(), 1000);
      window.location.href = '../page1/page1.html';
    } else {
      log('⚠️ Новый пользователь, показываем форму регистрации.', 'warn');
      setTimeout(() => preloader.remove(), 1000);
      document.getElementById('regPopup')?.classList.add('show');
    }

  } catch (e) {
    log('💥 Ошибка: ' + e.message, 'err');
    console.error(e);
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












