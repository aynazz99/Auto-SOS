document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("getUserBtn");
  const info = document.getElementById("userInfo");

  btn.addEventListener("click", () => {
    // Получаем данные пользователя из Telegram
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe?.user;

    // Если данные пришли из Telegram
    if (user) {
      info.innerHTML = `
        <p><b>ID:</b> ${user.id}</p>
        <p><b>Имя:</b> ${user.first_name || '—'}</p>
        <p><b>Фамилия:</b> ${user.last_name || '—'}</p>
        <p><b>Username:</b> @${user.username || '—'}</p>
      `;
    } else {
      // Для тестов в браузере без Telegram
      info.innerHTML = `
        <p>Нет данных из Telegram. Запусти в Mini App.</p>
      `;
    }
  });
});
