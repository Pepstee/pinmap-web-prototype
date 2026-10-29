// 개발 모드에서만 동작: 저장 폼에 링크를 붙여넣으면 /api/og 로 제목을 자동으로 채워요.
// 저장 값은 만지지 않고 폼 채우기만 해요(저장 로직은 app.js 그대로). 커버 이미지는
// window.pmOgLast 에 남겨 두어, 나중에 저장 항목에 연결할 수 있어요.
if(PM_ENV.development) {
  const OG_DEBOUNCE = 600;
  let ogController = null, ogTimer = 0, ogFilledTitle = '';

  const ogHint = form => {
    let el = form.querySelector('#oghint');
    if(!el){el=document.createElement('p');el.id='oghint';el.className='hint';form.querySelector('input[name="url"]').closest('label').after(el);}
    return el;
  };

  async function ogFill(form, url){
    ogController?.abort(); ogController = new AbortController();
    ogHint(form).textContent = '링크 정보를 확인하는 중…';
    try {
      const res = await fetch('/api/og?url=' + encodeURIComponent(url), {signal: ogController.signal});
      if(res.status === 404){ ogHint(form).textContent = '링크 정보 API가 이 환경에는 없어요. Vercel 미리보기에서는 동작해요.'; return; }
      const data = await res.json();
      if(!data.ok){ogHint(form).textContent = '제목을 자동으로 가져오지 못했어요. 직접 입력해 주세요.';return;}
      const title = form.elements.namedItem('title');
      if(!title.value.trim() || title.value === ogFilledTitle) title.value = data.title.slice(0, 80);
      ogFilledTitle = data.title;
      window.pmOgLast = data; // 커버 이미지 · 설명 (저장 항목 연결은 다음 단계)
      document.dispatchEvent(new CustomEvent('pm-og', { detail: data }));
      ogHint(form).textContent = `링크에서 제목을 가져왔어요 · ${data.host}`;
    } catch(err) {
      if(err.name !== 'AbortError') ogHint(form).textContent = '링크 정보를 가져오지 못했어요. 직접 입력해 주세요.';
    }
  }

  document.addEventListener('input', e => {
    const input = e.target;
    if(input.name !== 'url' || !input.closest('#saveform'))return;
    const form = input.closest('#saveform');
    clearTimeout(ogTimer);
    const url = input.value.trim();
    if(!url){ogController?.abort();const h=form.querySelector('#oghint');if(h)h.remove();ogFilledTitle='';document.dispatchEvent(new CustomEvent('pm-og', { detail: null }));return;}
    // 체험용 예시 링크와 http 가 아닌 값은 확인하지 않아요
    if(!/^https?:\/\//i.test(url) || url.includes('sample-prototype'))return;
    ogTimer = setTimeout(() => ogFill(form, url), OG_DEBOUNCE);
  });
}
