// =============================================================================
// I. Декларации DOM-элементов (profile.js)
// =============================================================================

// --- ЭЛЕМЕНТЫ ДЛЯ ГОРОДА ---
const cityEditInput = document.getElementById('city-edit-input');
const cityEditList = document.getElementById('city-edit-list');
const cityEditDropdownIcon = editProfilePopup ? editProfilePopup.querySelector('.city-dropdown-icon') : null;

// --- Карты и массивы городов ---
let cityNames = [];
let cityToCodeMap = {}; // Название -> Код
let codeToCityMap = {}; // Код -> Название


// =============================================================================
// II. Загрузка данных городов из Firebase
// =============================================================================

db.ref('location').get()
  .then(snapshot => {
    if (snapshot.exists()) {
      const citiesData = snapshot.val(); // { "4": "Азнакаево", "5": "Альметьевск", ... }

      for (const [code, name] of Object.entries(citiesData)) {
        cityToCodeMap[name.toLowerCase()] = code;
        codeToCityMap[code] = name;
      }

      cityNames = Object.values(citiesData).sort();
      console.log('✅ Города загружены для редактирования профиля:', cityNames.length);
    } else {
      console.warn('⚠️ Список городов пуст.');
    }
  })
  .catch(err => console.error('Ошибка загрузки городов из Firebase:', err));


// =============================================================================
// III. Логика Редактирования Профиля
// =============================================================================

// 1. Функции Валидации

function isPhoneEditValid() {
  if (!phoneEditInput) return false;
  const digits = phoneEditInput.value.replace(/\D/g, '');
  return digits.length === 11;
}

function isCityEditValid() {
  const city = cityEditInput ? cityEditInput.value.trim() : '';
  if (city.length === 0) return false;
  return city.toLowerCase() in cityToCodeMap;
}

function isNameEditValid() {
  const name = personEditInput ? personEditInput.value.trim() : '';
  return name.length >= 2;
}

function validateEditForm() {
  const phoneValid = isPhoneEditValid();
  const cityValid = isCityEditValid();
  const nameValid = isNameEditValid();

  if (phoneEditInput) {
    phoneEditInput.style.border = phoneValid ? '' : '1px solid red';
  }

  if (personEditInput) {
    personEditInput.style.border = nameValid ? '' : '1px solid red';
  }

  if (cityEditInput) {
    cityEditInput.style.border = cityValid ? '' : '1px solid red';
  }

  if (saveProfileBtn) {
    saveProfileBtn.disabled = !(phoneValid && cityValid && nameValid);
  }
}


// 2. Открытие / Закрытие

function openEditProfilePopup() {
  if (editProfilePopup) editProfilePopup.classList.add('show');
}

function closeEditProfilePopup() {
  if (editProfilePopup) editProfilePopup.classList.remove('show');
}


// 3. Загрузка данных пользователя

function loadUserDataForEdit() {
  if (typeof userRef === 'undefined') {
    console.error('userRef не определен');
    return;
  }

  userRef.once('value', (snapshot) => {
    const userData = snapshot.val();
    if (userData) {
      personEditInput.value = userData.person || '';
      phoneEditInput.value = userData.phone || '';

      const cityCode = userData.location;
      const cityName = codeToCityMap[cityCode];
      if (cityEditInput && cityName) {
        const formattedName = cityName.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        cityEditInput.value = formattedName;
      } else if (cityEditInput) {
        cityEditInput.value = '';
      }

      if (phoneEditInput && phoneEditInput.value)
        phoneEditInput.dispatchEvent(new Event('input'));
    }
    validateEditForm();
  });
}


// 4. Сохранение изменений

function saveUserData(event) {
  event.preventDefault();

  if (!isPhoneEditValid() || !isCityEditValid() || !isNameEditValid()) {
    alert('Пожалуйста, заполните все поля корректно.');
    validateEditForm();
    return;
  }

  const enteredCity = cityEditInput.value.trim();
  const cityCode = cityToCodeMap[enteredCity.toLowerCase()];

  if (!cityCode) {
    alert('Ошибка: не удалось найти код для города.');
    return;
  }

  const updatedData = {
    person: personEditInput.value.trim(),
    phone: phoneEditInput.value.trim(),
    location: cityCode
  };

  userRef.update(updatedData)
    .then(() => {
      alert('✅ Профиль обновлен!');
      closeEditProfilePopup();
    })
    .catch((err) => {
      console.error('Ошибка при сохранении профиля:', err);
      alert('Ошибка при сохранении: ' + err.message);
    });
}


// =============================================================================
// IV. Обработчики ввода
// =============================================================================

// Имя
if (personEditInput) {
  personEditInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
    value = value.substring(0, 25);
    value = value.split(/[\s-]+/).map(w =>
      w.length ? w[0].toUpperCase() + w.slice(1) : ''
    ).join(' ');
    e.target.value = value;
    validateEditForm();
  });
}

// Телефон
if (phoneEditInput) {
  phoneEditInput.addEventListener('input', (e) => {
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
    validateEditForm();
  });
}


// =============================================================================
// V. Автодополнение города
// =============================================================================

if (cityEditInput) {
  cityEditInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
    value = value.substring(0, 25);
    e.target.value = value;

    const filtered = cityNames.filter(city =>
      city.toLowerCase().startsWith(value.toLowerCase())
    ).slice(0, 10);

    showEditCityList(filtered);
    validateEditForm();
  });
}

function showEditCityList(list) {
  if (!cityEditList) return;
  cityEditList.innerHTML = '';

  if (list.length === 0) {
    cityEditList.style.display = 'none';
    if (cityEditDropdownIcon) cityEditDropdownIcon.classList.remove('rotated');
    return;
  }

  list.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      cityEditInput.value = city;
      cityEditList.style.display = 'none';
      if (cityEditDropdownIcon) cityEditDropdownIcon.classList.remove('rotated');
      validateEditForm();
    });
    cityEditList.appendChild(li);
  });

  cityEditList.style.display = 'block';
  if (cityEditDropdownIcon) cityEditDropdownIcon.classList.add('rotated');
}

// Клик по стрелке
if (cityEditDropdownIcon) {
  cityEditDropdownIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = cityEditList && cityEditList.offsetParent !== null;

    if (isVisible) {
      cityEditList.style.display = 'none';
      cityEditDropdownIcon.classList.remove('rotated');
    } else {
      const firstCities = cityNames.slice(0, 100);
      showEditCityList(firstCities);
    }
  });
}


// =============================================================================
// VI. Прочие обработчики
// =============================================================================

if (profileBtn) {
  profileBtn.addEventListener('click', () => {
    loadUserDataForEdit();
    openEditProfilePopup();
  });
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditProfilePopup);
if (editProfileForm) editProfileForm.addEventListener('submit', saveUserData);

if (cityEditInput) {
  cityEditInput.addEventListener('blur', validateEditForm);
  cityEditInput.addEventListener('input', validateEditForm);
}

document.addEventListener('click', (e) => {
  if (cityEditList && !e.target.closest('#edit-profile-popup .city-wrapper')) {
    cityEditList.style.display = 'none';
    if (cityEditDropdownIcon) cityEditDropdownIcon.classList.remove('rotated');
    validateEditForm();
  }
});

if (editProfilePopup) {
  editProfilePopup.addEventListener('click', (e) => {
    if (e.target === editProfilePopup) closeEditProfilePopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editProfilePopup.classList.contains('show')) {
      closeEditProfilePopup();
    }
  });
}

// === Элементы городов ===
const cityInputs = [
  { input: document.getElementById('nearbicity1'), list: document.getElementById('city-list-1') },
  { input: document.getElementById('nearbicity2'), list: document.getElementById('city-list-2') },
  { input: document.getElementById('nearbicity3'), list: document.getElementById('city-list-3') }
];


// === Загрузка городов из Firebase ===
db.ref('location').get()
  .then(snapshot => {
    if (snapshot.exists()) {
      const citiesData = snapshot.val(); // { "4": "Азнакаево", ... }
      for (const [code, name] of Object.entries(citiesData)) {
        cityToCodeMap[name.toLowerCase()] = code;
        codeToCityMap[code] = name;
      }
      cityNames = Object.values(citiesData).sort();
      console.log('✅ Города загружены для заявок:', cityNames.length);
    } else {
      console.warn('⚠️ Список городов пуст.');
    }
  })
  .catch(err => console.error('Ошибка загрузки городов из Firebase:', err));

// === Универсальная функция автодополнения ===
function setupCityAutocomplete(inputEl, listEl) {
  if (!inputEl || !listEl) return;

  const dropdownIcon = inputEl.parentElement.querySelector('.city-dropdown-icon');

  // Показываем/скрываем список
  function showCityList(filtered) {
    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.style.display = 'none';
      dropdownIcon?.classList.remove('rotated');
      return;
    }

    filtered.forEach(city => {
      const li = document.createElement('li');
      li.textContent = city;
      li.addEventListener('click', () => {
        inputEl.value = city;
        listEl.style.display = 'none';
        dropdownIcon?.classList.remove('rotated');
      });
      listEl.appendChild(li);
    });

    listEl.style.display = 'block';
    dropdownIcon?.classList.add('rotated');
  }

  // Ввод текста
  inputEl.addEventListener('input', () => {
    let value = inputEl.value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '').substring(0, 25);
    inputEl.value = value;

    const filtered = cityNames.filter(c => c.toLowerCase().startsWith(value.toLowerCase())).slice(0, 10);
    showCityList(filtered);
  });

  // Клик по стрелке
  dropdownIcon?.addEventListener('click', e => {
    e.stopPropagation();
    const isVisible = listEl.offsetParent !== null;
    if (isVisible) {
      listEl.style.display = 'none';
      dropdownIcon.classList.remove('rotated');
    } else {
      showCityList(cityNames.slice(0, 100));
    }
  });

  // Закрытие при клике вне поля
  document.addEventListener('click', e => {
    if (!e.target.closest('.city-wrapper')) {
      listEl.style.display = 'none';
      dropdownIcon?.classList.remove('rotated');
    }
  });
}

// === Инициализация автодополнения для всех трёх полей ===
cityInputs.forEach(({ input, list }) => setupCityAutocomplete(input, list));


