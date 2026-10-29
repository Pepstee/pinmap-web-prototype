// Desktop prototype preview of the mobile keyboard. Touch devices use their native keyboard.
(() => {
  const isSearch = target => target?.matches?.('#lm-search input, .libpage #search');
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const keyboard = document.createElement('div');
  keyboard.id = 'pm-keyboard-preview';
  keyboard.setAttribute('aria-hidden', 'true');
  keyboard.innerHTML = `<div class="pm-keyboard-tools"><span>⌄</span><span>자동 완성</span><span>⋯</span></div>
    ${rows.map((row, index) => `<div class="pm-keyboard-row ${index === 2 ? 'pm-keyboard-third' : ''}">${index === 2 ? '<button type="button" data-key="shift" aria-label="대문자">⇧</button>' : ''}${[...row].map(letter => `<button type="button" data-key="${letter.toLowerCase()}">${letter}</button>`).join('')}${index === 2 ? '<button type="button" data-key="backspace" aria-label="지우기">⌫</button>' : ''}</div>`).join('')}
    <div class="pm-keyboard-row pm-keyboard-bottom"><button type="button" data-key="numbers">123</button><button type="button" data-key="space">space</button><button type="button" data-key="search">검색</button></div><div class="pm-keyboard-home" aria-hidden="true"></div>`;
  document.body.appendChild(keyboard);
  let field = null;
  const hide = () => {
    document.body.classList.remove('pm-keyboard-open');
    keyboard.setAttribute('aria-hidden', 'true');
    field = null;
  };
  document.addEventListener('focusin', event => {
    if (!isSearch(event.target)) return;
    field = event.target;
    keyboard.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pm-keyboard-open');
  });
  document.addEventListener('focusout', event => {
    if (event.target === field) setTimeout(() => { if (document.activeElement !== field) hide(); }, 0);
  });
  keyboard.addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
  keyboard.addEventListener('click', event => {
    const key = event.target.closest('[data-key]')?.dataset.key;
    if (!key || !field?.isConnected) return;
    if (key === 'search') {
      if (field.form) field.form.requestSubmit();
      else field.dispatchEvent(new Event('input', {bubbles:true}));
      field.blur();
      return;
    }
    if (key === 'numbers' || key === 'shift') return;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    if (key === 'backspace') field.setRangeText('', Math.max(0, start - (start === end ? 1 : 0)), end, 'end');
    else field.setRangeText(key === 'space' ? ' ' : key, start, end, 'end');
    field.dispatchEvent(new Event('input', {bubbles:true}));
    field.focus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && field) field.blur(); });
})();
