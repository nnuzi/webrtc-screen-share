const SUPPORTED = ['zh', 'en'];
const DEFAULT_LANG = 'zh';

function getLang() {
  for (const lang of navigator.languages) {
    const match = SUPPORTED.find(s => lang.startsWith(s));
    if (match) return match;
  }
  return DEFAULT_LANG;
}

async function loadLang(lang) {
  if (window.__i18n__?.lang === lang) return;
  const mod = await import(`./i18n/${lang}.js`);
  window.__i18n__ = { lang, dict: mod.default };
}

function t(key, params) {
  let str = window.__i18n__?.dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

function applyI18n() {
  document.documentElement.lang = window.__i18n__.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

export { getLang, loadLang, t, applyI18n };
