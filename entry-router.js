(() => {
  const params = new URLSearchParams(location.search);
  const reloading = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const mode = reloading ? null : params.get('mode');
  // A mode is a one-time entry choice, not a route to restore on refresh.
  if(params.has('mode')) {
    params.delete('mode');
    const query=params.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:'')+location.hash);
  }
  // Explicit assignment also prevents a browser restoring the previous iframe.
  document.querySelector('.phone-frame').src = mode === 'development' || mode === 'prototype'
    ? 'app.html?mode=' + mode
    : 'entry.html';
})();
