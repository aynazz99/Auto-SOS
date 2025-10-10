document.addEventListener("DOMContentLoaded", async () => {
  const out = document.getElementById("output");

  try {
    const tg = window.Telegram?.WebApp;
    tg?.ready();

    // ждём немного, Telegram иногда отдаёт данные с задержкой
    await new Promise(r => setTimeout(r, 200));

    const data = {
      initData: tg?.initData || null,
      initDataUnsafe: tg?.initDataUnsafe || null,
      version: tg?.version,
      platform: tg?.platform,
      colorScheme: tg?.colorScheme,
      themeParams: tg?.themeParams,
      viewportHeight: tg?.viewportHeight,
      viewportStableHeight: tg?.viewportStableHeight,
      headerColor: tg?.headerColor,
      backgroundColor: tg?.backgroundColor,
      isExpanded: tg?.isExpanded,
      MainButton: tg?.MainButton,
      BackButton: tg?.BackButton,
      HapticFeedback: tg?.HapticFeedback,
      CloudStorage: tg?.CloudStorage,
    };

    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "Ошибка: " + err.message;
  }
});
