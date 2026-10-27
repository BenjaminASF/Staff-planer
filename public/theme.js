// Light/dark theme. Loaded in <head> so the saved theme is applied before the page is drawn.
// The choice belongs to the user's account and is saved on the server (app.js). This browser
// keeps a copy of the last one used only to draw the page in that theme before the user is known.
(function () {
  const STORAGE_KEY = "staff-planner-theme";
  const THEMES = ["light", "dark"];
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  // style.css uses light-dark(); browsers without it always get the light theme.
  const supported = Boolean(window.CSS && CSS.supports && CSS.supports("color", "light-dark(#000, #fff)"));

  function getPreference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(saved) ? saved : "system";
    } catch (error) {
      return "system";
    }
  }

  function resolveTheme(preference) {
    if (!supported) return "light";
    if (THEMES.includes(preference)) return preference;
    return darkQuery && darkQuery.matches ? "dark" : "light";
  }

  function applyTheme() {
    const theme = resolveTheme(getPreference());
    document.documentElement.dataset.theme = theme;
    document.dispatchEvent(new CustomEvent("staff-themechange", { detail: { theme } }));
    return theme;
  }

  function setPreference(preference) {
    try {
      if (THEMES.includes(preference)) localStorage.setItem(STORAGE_KEY, preference);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Could not save the theme:", error);
    }
    return applyTheme();
  }

  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener("change", () => {
      if (getPreference() === "system") applyTheme();
    });
  }
  // Keep other open tabs in sync.
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) applyTheme();
  });

  window.staffTheme = {
    supported,
    getPreference,
    setPreference,
    current: () => document.documentElement.dataset.theme || "light"
  };
  applyTheme();
})();
