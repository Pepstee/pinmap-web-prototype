(() => {
  const mode = new URLSearchParams(location.search).get('mode');
  if(mode === 'development' || mode === 'prototype') {
    document.querySelector('.phone-frame').src = 'app.html?mode=' + mode;
  }
})();
