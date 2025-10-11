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

// ==== Глобальные переменные для выбранного города (НОВЫЕ) ====
window.currentCity = null;
window.currentCityName = null;
window.cityDataMap = {}; // Объект для хранения ключей и названий городов

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

    /*// --- Заглушка для тестов вне Telegram ---
    if (!tempUserId) {
        tempUserId = "test_user_123"; // любой тестовый ID
        console.warn("⚠️ Telegram не обнаружен. Используется тестовый ID:", tempUserId);
    }*/


    // Если ID Telegram не получен (приложение запущено не в Telegram или ошибка), 
    // бросаем ошибку, чтобы НЕ использовать тестовый ID.
    if (!tempUserId) {
        console.error("❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить ID пользователя Telegram. Приложение будет работать некорректно.");
        throw new Error("UserID Telegram не найден.");
    }
    // ------------------------------------------------
    
    // Получение ссылок на базу данных и ID пользователя
    const _db = firebase.database();
    const _userId = tempUserId; 
    
    // Делаем переменные явно глобальными
    window.db = _db; 
    window.userId = _userId; 

    console.log(`Firebase инициализирован. Глобальный userId установлен на: ${_userId}`);

    // === Города и Логика Инициализации (НОВАЯ ЛОГИКА) ===
    
    const cityBtn = document.getElementById('cityBtn');
    const cityMenu = document.getElementById('cityMenu');
    // Получаем кнопку "Новая заявка" из requests.js, чтобы управлять ее активностью
    const helpBtn = document.querySelector('.help-btn'); 
    const userRef = window.db.ref('users/' + window.userId);

    /**
     * Выбирает город, обновляет UI, сохраняет в профиль и загружает заявки.
     */
    function selectCity(cityKey, cityName) {
        if (window.currentCity === cityKey) return; // Город уже выбран

        window.currentCity = cityKey;
        window.currentCityName = cityName;
        cityBtn.textContent = cityName;
        cityMenu.classList.remove('show');

        // Обновить атрибут location пользователя в Firebase
        userRef.update({ location: cityKey })
            .then(() => {
                console.log(`✅ Пользователю ${window.userId} присвоен город: ${cityName}`);
            })
            .catch(error => {
                console.error('Ошибка при обновлении location пользователя:', error);
            });

        // Активировать кнопку "Создать заявку"
        helpBtn.disabled = false;
        helpBtn.textContent = 'Новая заявка';

        // Загрузить заявки для выбранного города (функция из requests.js)
        if (window.loadRequestsByCity) {
            window.loadRequestsByCity(cityKey);
        }
    }

    /**
     * Загружает список городов и затем проверяет профиль.
     */
    function loadCities() {
        const locationRef = window.db.ref('location');
        
        locationRef.once('value').then(snapshot => {
            window.cityDataMap = snapshot.val() || {};
            cityMenu.innerHTML = ''; // очистка меню

            if (Object.keys(window.cityDataMap).length > 0) {
                for (const cityKey in window.cityDataMap) {
                    const cityName = window.cityDataMap[cityKey];
                    const cityDiv = document.createElement('div');
                    cityDiv.className = 'dropdown-item';
                    cityDiv.dataset.value = cityKey;
                    cityDiv.textContent = cityName;

                    // Добавляем обработчик для выбора города
                    cityDiv.addEventListener('click', () => {
                        selectCity(cityKey, cityName);
                    });

                    cityMenu.appendChild(cityDiv);
                }
            } else {
                cityMenu.innerHTML = '<div class="dropdown-item">Города не найдены</div>';
                helpBtn.disabled = true;
                helpBtn.textContent = 'Нет доступных городов';
            }

            // 3. После загрузки городов, загружаем профиль для автовыбора
            loadUserProfileAndInitialCity(); 
        }).catch(err => {
            console.error('Ошибка загрузки городов:', err);
            cityMenu.innerHTML = '<div class="dropdown-item">Ошибка загрузки</div>';
            // В случае ошибки показываем пустой список заявок
            if (window.loadRequestsByCity) window.loadRequestsByCity(null); 
        });
    }


    /**
     * Загружает профиль пользователя и автоматически выбирает сохраненный город.
     */
    function loadUserProfileAndInitialCity() {
        // Проверяем наличие userRef на случай, если Firebase не инициализировался (хотя тут он должен быть)
        if (!userRef) return; 

        userRef.once('value').then(snapshot => {
            const userData = snapshot.val();
            const savedCityKey = userData ? userData.location : null;

            if (savedCityKey && window.cityDataMap[savedCityKey]) {
                // Город найден и сохранен, выбираем его автоматически
                const cityName = window.cityDataMap[savedCityKey];
                selectCity(savedCityKey, cityName); 
                console.log(`Автоматически выбран сохраненный город: ${cityName}`);
            } else {
                // Город не выбран, инициализируем пустой список заявок
                cityBtn.textContent = 'Выберите город';
                helpBtn.disabled = true;
                helpBtn.textContent = 'Выберите город';
                if (window.loadRequestsByCity) {
                    window.loadRequestsByCity(null); // Загружаем "пустую" страницу заявок
                }
            }
        }).catch(err => {
            console.error('Ошибка загрузки профиля пользователя:', err);
            if (window.loadRequestsByCity) window.loadRequestsByCity(null);
        });
    }

    // Обработчик для открытия/закрытия выпадающего списка
    cityBtn.addEventListener('click', () => {
        cityMenu.classList.toggle('show'); // Используем .show из page1.css
    });

    // Обработчик для закрытия списка при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            cityMenu.classList.remove('show');
        }
    });


    // Запускаем процесс: сначала загрузка городов, потом проверка профиля
    loadCities();

} else {
    console.error("❌ Библиотека Firebase не загружена. Проверьте ваш HTML!");
}