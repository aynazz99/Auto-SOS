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
    
    // Получение ссылок на базу данных и ID пользователя
    const _db = firebase.database();
    const _userId = 'test_user_123'; // Ваш фиксированный ID пользователя
    
    // Делаем переменные явно глобальными, прикрепляя их к window
    // Это гарантирует, что они будут доступны в других скриптах, 
    // загруженных после этого файла.
    
    /** @type {firebase.database.Database} Глобальная ссылка на базу данных */
    window.db = _db; 
    
    /** @type {string} Глобальный ID пользователя */
    window.userId = _userId; 

    console.log("Firebase инициализирован. Глобальные переменные db и userId установлены.");

} else {
    console.error("❌ Библиотека Firebase не загружена. Проверьте ваш HTML перед подключением firebase-config.js!");
}