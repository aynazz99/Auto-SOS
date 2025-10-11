  // Инициализация Firebase
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
    const tgUser = tg?.initDataUnsafe?.user;

    if (!tgUser) {
      alert("Открой приложение через Telegram Mini App.");
      return;
    }

    const tgId = tgUser.id;
    const regPopup = document.getElementById("regPopup");
    const regForm = document.getElementById("regForm");

    // Проверка пользователя в Firebase
    db.ref("users/" + tgId).get()
      .then(snapshot => {
        if (snapshot.exists()) {
          console.log("Пользователь найден:", snapshot.val());
          initApp(snapshot.val());
        } else {
          regPopup.classList.add("show");
        }
      })
      .catch(err => console.error("Ошибка Firebase:", err));

    // === Обработка регистрации ===
    regForm.addEventListener("submit", e => {
      e.preventDefault();
      const formData = new FormData(regForm);
      const data = {
        id: tgId,
        username: tgUser.username || "",
        first_name: tgUser.first_name || "",
        person: formData.get("person"),
        car: formData.get("car"),
        carPlate: formData.get("carPlate"),
        phone: formData.get("phone")
      };

      db.ref("users/" + tgId).set(data)
        .then(() => {
          alert("Регистрация успешна!");
          regPopup.classList.remove("show");
          initApp(data);
        })
        .catch(err => console.error("Ошибка записи в Firebase:", err));
    });
  });

  // === После успешной регистрации ===
  function initApp(userData) {
    console.log("Добро пожаловать,", userData.person);
    window.location.href = "../page1/page1.html";
  }

  // === Валидация полей ===
  const carPlateInput = document.querySelector(".car-plate");
  const cyrillicToLatin = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
    'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X'
  };

  carPlateInput.addEventListener("input", e => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[АВСЕКМНОРТХ]/g, m => cyrillicToLatin[m]);
    value = value.replace(/[^A-Z0-9]/g, "");
    let formatted = "";

    for (let i = 0; i < value.length; i++) {
      if (i === 0 && /[A-Z]/.test(value[i])) formatted += value[i];
      else if (i >= 1 && i <= 3 && /[0-9]/.test(value[i])) formatted += value[i];
      else if (i >= 4 && i <= 5 && /[A-Z]/.test(value[i])) formatted += value[i];
      else if (i >= 6 && i <= 8 && /[0-9]/.test(value[i])) formatted += value[i];
    }

    let spaced = "";
    if (formatted.length > 0) spaced += formatted[0];
    if (formatted.length > 1) spaced += " " + formatted.substr(1, 3);
    if (formatted.length > 4) spaced += " " + formatted.substr(4, 2);
    if (formatted.length > 6) spaced += " | " + formatted.substr(6, 3);
    e.target.value = spaced.trim();
  });

  const nameInput = document.querySelector(".person-name");
  nameInput.addEventListener("input", e => {
    let value = e.target.value;
    value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, "");
    value = value.substring(0, 25);
    value = value.split(/[\s-]+/).map(word =>
      word ? word[0].toUpperCase() + word.slice(1) : ""
    ).join(" ");
    e.target.value = value;
  });

  const phoneInput = document.querySelector(".phone");
  phoneInput.addEventListener("input", e => {
    let digits = e.target.value.replace(/\D/g, "");
    if (/^[0-9]/.test(digits)) digits = "8" + digits.substr(1);
    digits = digits.substring(0, 11);

    let formatted = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 0) formatted += digits[i];
      else if (i === 1) formatted += " (" + digits[i];
      else if (i === 2 || i === 3) formatted += digits[i];
      else if (i === 4) formatted += ") " + digits[i];
      else if (i === 5 || i === 6) formatted += digits[i];
      else if (i === 7) formatted += " " + digits[i];
      else if (i === 8) formatted += digits[i];
      else if (i === 9) formatted += " " + digits[i];
      else if (i === 10) formatted += digits[i];
    }

    e.target.value = formatted;
  });

  const carInput = document.querySelector(".car");
  carInput.addEventListener("input", e => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/[^A-ZА-Я0-9]/gi, "");
    value = value.substring(0, 25);
    e.target.value = value;
  });
