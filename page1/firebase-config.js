// firebase-config.js

// ==== Firebase Config ====
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


// ==== Инициализация Firebase и установка глобальных переменных ====
if (typeof firebase !== 'undefined') {
    
    // Инициализация приложения
    firebase.initializeApp(firebaseConfig);
    
    // --- БЕЗОПАСНОЕ ОПРЕДЕЛЕНИЕ ID ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM ---
    let tempUserId = null;
    
     // 1. Проверяем, загружен ли Telegram SDK (объект Telegram.WebApp)
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        
        // 2. Пытаемся получить user.id из initDataUnsafe
        const user = Telegram.WebApp.initDataUnsafe.user;
        
        if (user && user.id) {
            tempUserId = user.id.toString(); // ID пользователя Telegram (число, конвертируем в строку)
            console.log(`✅ ID пользователя Telegram успешно получен: ${tempUserId}`);
        }
    }

   // --- Заглушка для тестов вне Telegram ---
    if (!tempUserId) {
        tempUserId = "test_user"; // любой тестовый ID
        console.warn("⚠️ Telegram не обнаружен. Используется тестовый ID:", tempUserId);
    }

 /*
    // Если ID Telegram не получен (приложение запущено не в Telegram или ошибка), 
    // бросаем ошибку, чтобы НЕ использовать тестовый ID.
    if (!tempUserId) {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить ID пользователя Telegram. Приложение будет работать некорректно.");
        throw new Error("UserID Telegram не найден.");
    }*/
    // ------------------------------------------------
    
    // Получение ссылок на базу данных и ID пользователя
    const _db = firebase.database();
    const _userId = tempUserId; 
    
    // Делаем переменные явно глобальными
    window.db = _db; 
    window.userId = _userId; 

    console.log(`Firebase инициализирован. Глобальный userId установлен на: ${_userId}`);

    // === Города и Логика Инициализации (НОВАЯ ЛОГИКА) ===
    
    // Получаем кнопку "Новая заявка" из requests.js, чтобы управлять ее активностью
    const helpBtn = document.querySelector('.help-btn'); 
    const userRef = window.db.ref('users/' + window.userId);



} else {
    console.error("❌ Библиотека Firebase не загружена. Проверьте ваш HTML!");
}