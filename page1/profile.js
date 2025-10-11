// Предполагается, что db и userId объявлены в firebase-config.js
// и доступны в глобальной области видимости.



// =============================================================================
// II. Логика Редактирования Профиля (Profile)
// =============================================================================


// 1. Функции Валидации
function isPhoneEditValid() {
    if (!phoneEditInput) return false;
    const digits = phoneEditInput.value.replace(/\D/g, '');
    return digits.length === 11;
}

function isCarPlateEditValid() {
    if (!carPlateEditInput) return false;
    const value = carPlateEditInput.value;
    const cleanValue = value.replace(/[^A-Z0-9]/g, '');
    return cleanValue.length >= 6; 
}

function validateEditForm() {
    const phoneValid = isPhoneEditValid();
    const carPlateValid = isCarPlateEditValid();

    if (phoneEditInput) {
        phoneEditInput.style.border = phoneValid ? '' : '1px solid red';
        phoneEditInput.title = phoneValid ? '' : 'Введите полный номер телефона (11 цифр).';
    }

    if (carPlateEditInput) {
        carPlateEditInput.style.border = carPlateValid ? '' : '1.2px solid red';
        carPlateEditInput.title = carPlateValid ? '' : 'Введите минимум 6 символов (например, А123ВВ) для номера.';
    }

    if (saveProfileBtn) {
        saveProfileBtn.disabled = !(phoneValid && carPlateValid);
    }
}


// 2. Функции Форматирования
const cyrillicToLatin = {
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E',
    'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X'
};

// Форматирование номера автомобиля
if (carPlateEditInput) {
    carPlateEditInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        value = value.replace(/[АВСЕКМНОРТХ]/g, match => cyrillicToLatin[match]);
        value = value.replace(/[^A-Z0-9]/g, '');

        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i === 0) {
                if (/[A-Z]/.test(value[i])) formatted += value[i];
            } else if (i >= 1 && i <= 3) {
                if (/[0-9]/.test(value[i])) formatted += value[i];
            } else if (i >= 4 && i <= 5) {
                if (/[A-Z]/.test(value[i])) formatted += value[i];
            } else if (i >= 6 && i <= 8) {
                if (/[0-9]/.test(value[i])) formatted += value[i];
            }
        }

        let spaced = '';
        if (formatted.length > 0) spaced += formatted[0]; 
        if (formatted.length > 1) spaced += ' ' + formatted.substr(1, 3); 
        if (formatted.length > 4) spaced += ' ' + formatted.substr(4, 2); 
        if (formatted.length > 6) spaced += ' | ' + formatted.substr(6, 3);

        e.target.value = spaced.trim();
        validateEditForm();
    });
}

// Форматирование имени
if (personEditInput) {
    personEditInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
        value = value.substring(0, 25);
        value = value.split(/[\s-]+/).map(word => {
            if (word.length === 0) return '';
            return word[0].toUpperCase() + word.slice(1);
        }).join(' ');
        e.target.value = value;
    });
}

// Формат телефона
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

// Форматирование марки машины
if (carEditInput) {
    carEditInput.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/^\s+/, '');
        value = value.replace(/[^A-ZА-Я0-9\s]/gi, '');
        value = value.toUpperCase();
        value = value.substring(0, 25);
        e.target.value = value;
    });
}


// 3. Основная логика попапа редактирования
function openEditProfilePopup() {
    editProfilePopup.classList.add('show');
}

function closeEditProfilePopup() {
    editProfilePopup.classList.remove('show');
}

function loadUserDataForEdit() {
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            // Устанавливаем значения и запускаем форматирование
            personEditInput.value = userData.person || '';
            carEditInput.value = userData.car || '';
            
            // Номер и телефон форматируются при вводе, поэтому просто устанавливаем их
            carPlateEditInput.value = userData.carPlate || '';
            phoneEditInput.value = userData.phone || '';
            
            // Чтобы применилось форматирование, мы можем вызвать событие 'input'
            if (carPlateEditInput.value) carPlateEditInput.dispatchEvent(new Event('input'));
            if (phoneEditInput.value) phoneEditInput.dispatchEvent(new Event('input'));
        }
        validateEditForm(); 
    }, (error) => {
        console.error("Ошибка при загрузке данных:", error);
        alert("Ошибка при загрузке данных профиля.");
    });
}

function saveUserData(event) {
    event.preventDefault();

    if (!isPhoneEditValid() || !isCarPlateEditValid()) {
        alert('Пожалуйста, заполните полностью номер телефона и номер автомобиля.');
        validateEditForm();
        return;
    }

    const updatedData = {
        person: personEditInput.value.trim(),
        car: carEditInput.value.trim(),
        carPlate: carPlateEditInput.value.trim(),
        phone: phoneEditInput.value.trim()
    };
    
    userRef.update(updatedData)
        .then(() => {
            alert('✅ Профиль успешно обновлен!');
            closeEditProfilePopup();
        })
        .catch((error) => {
            console.error("Ошибка при обновлении профиля:", error);
            alert('❌ Ошибка при сохранении: ' + error.message);
        });
}


// 4. Обработчики событий Профиля
if (profileBtn) { 
    profileBtn.addEventListener('click', () => {
        loadUserDataForEdit(); 
        openEditProfilePopup();
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', closeEditProfilePopup);
}

if (editProfileForm) {
    editProfileForm.addEventListener('submit', saveUserData);
}

if (editProfilePopup) {
    editProfilePopup.addEventListener('click', (e) => {
        if (e.target === editProfilePopup) {
            closeEditProfilePopup();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editProfilePopup.classList.contains('show')) {
            closeEditProfilePopup();
        }
    });
}