/* Shared client-side localization for Money Flow Tracker pages. */
(function(){
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'ml', name: 'മലയാളം' }
  ];
  const available = languages.map(language => language.code);
  const cache = new Map();
  let currentLanguage = 'en';
  let loadRequest = 0;

  function getPreferredLanguage(){
    return 'en';
  }

  function getBasePath(){
    let script = document.currentScript;
    if(!script){
      script = Array.from(document.scripts).find(s=>s.src && s.src.includes('i18n.js'));
    }
    if(script && script.src){
      return script.src.replace(/\/i18n\.js$/, '');
    }
    return '.';
  }

  function merge(base, translated){
    if(!translated || typeof translated !== 'object' || Array.isArray(translated)) return translated;
    const result = {...base};
    Object.keys(translated).forEach(key=>{
      result[key] = translated[key] && typeof translated[key] === 'object' && !Array.isArray(translated[key])
        ? merge((base && base[key]) || {}, translated[key])
        : translated[key];
    });
    return result;
  }

  function fetchLanguage(base, lang){
    const key = `${base}:${lang}`;
    if(!cache.has(key)){
      cache.set(key, fetch(`${base}/lang/${lang}.json`).then(response=>{
        if(!response.ok) throw new Error(`Missing language file: ${lang}`);
        return response.json();
      }).catch(error=>{
        cache.delete(key);
        throw error;
      }));
    }
    return cache.get(key);
  }

  function setPickerState({loading = false, error = false, message = ''} = {}){
    const picker = document.querySelector('.language-picker');
    const select = document.getElementById('mft-lang-select');
    const status = document.getElementById('mft-lang-status');
    let visibleMessage = document.getElementById('mft-lang-message');
    if(picker && !visibleMessage){
      visibleMessage = document.createElement('span');
      visibleMessage.id = 'mft-lang-message';
      visibleMessage.className = 'language-picker__message';
      visibleMessage.setAttribute('aria-hidden', 'true');
      picker.appendChild(visibleMessage);
    }
    if(select){
      select.disabled = loading;
      select.setAttribute('aria-busy', String(loading));
    }
    if(picker) picker.classList.toggle('language-picker--error', error);
    if(status) status.textContent = message;
    if(visibleMessage) visibleMessage.textContent = error ? message : '';
  }

  function applyTranslations(data, lang){
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(element=>{
      const key = element.getAttribute('data-i18n');
      if(!key) return;
      const value = key.split('.').reduce(
        (result, part) => result && result[part] !== undefined ? result[part] : undefined,
        data
      );
      if(value === undefined) return;
      element.textContent = Array.isArray(value) ? value.join(' ') : value;
    });
  }

  async function load(lang){
    if(!available.includes(lang)) return false;
    const request = ++loadRequest;
    const select = document.getElementById('mft-lang-select');
    const previousLanguage = currentLanguage;
    setPickerState({loading: true, message: `Loading ${lang.toUpperCase()}…`});

    try{
      const base = getBasePath();
      const english = await fetchLanguage(base, 'en');
      const translated = lang === 'en' ? english : await fetchLanguage(base, lang);
      if(request !== loadRequest) return false;
      const data = merge(english, translated);
      applyTranslations(data, lang);
      currentLanguage = lang;
      if(select) select.value = lang;
      const name = languages.find(language => language.code === lang).name;
      setPickerState({message: `Language changed to ${name}.`});
      return true;
    }catch(error){
      if(request !== loadRequest) return false;
      if(select) select.value = previousLanguage;
      const fileHint = location.protocol === 'file:'
        ? ' Open this page through http://localhost because browsers block language files on file:// pages.'
        : '';
      setPickerState({
        error: true,
        message: `Language could not be loaded.${fileHint}`
      });
      console.error(`Language could not be loaded.${fileHint}`, error);
      return false;
    }
  }

  window.setMoneyFlowLang = function(lang){
    return load(lang);
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    try {
      localStorage.removeItem('mft_lang');
    } catch (error) {
      // Storage may be unavailable in private browsing or local file mode.
    }

    const select = document.getElementById('mft-lang-select');
    if(select){
      select.innerHTML = '';
      languages.forEach(language=>{
        const opt = document.createElement('option');
        opt.value = language.code;
        opt.lang = language.code;
        opt.textContent = `${language.name} (${language.code.toUpperCase()})`;
        select.appendChild(opt);
      });
      select.addEventListener('change', event=>setMoneyFlowLang(event.target.value));
    }
    currentLanguage = getPreferredLanguage();
    if(select) select.value = currentLanguage;
    load(currentLanguage);
  });
})();
