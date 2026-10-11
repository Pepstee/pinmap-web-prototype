// 콘텐츠 상세 화면 리디자인 (레퍼런스 시안 반영)
// 기존 기능(돌아가기 · 길찾기 · 원본 보기 · 분류·메모·장소 수정 · 장소 확인 필요 · 원본 삭제 · 모음 이동)은 그대로 쓰고 화면 모양만 바꿉니다.
// app.js의 detail()을 이 파일에서 다시 정의합니다. library.js 다음에 불러와야 해요(사진·아이콘을 같이 씁니다).

// 미니 지도 (예시 · 실제 위치와 다를 수 있어요)
const dtMap = `<svg viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="360" height="140" fill="#EAF0EC"/>
  <g stroke="#DCE4DF" stroke-width="1">${[30,60,90,120].map(y=>`<path d="M0 ${y}h360"/>`).join('')}${[40,80,120,160,200,240,280,320].map(x=>`<path d="M${x} 0v140"/>`).join('')}</g>
  <path d="M-10 92 370 48" stroke="#fff" stroke-width="16"/><path d="M228 -10 196 150" stroke="#fff" stroke-width="13"/>
  <circle cx="200" cy="74" r="20" style="fill:var(--pm-key)"/><path d="M200 84s-8-7-8-12a8 8 0 0 1 16 0c0 5-8 12-8 12z" fill="#fff"/>
</svg>`;

// 저장한 곳 로고 (출처 이름이나 링크 주소로 판단, 모르는 곳은 첫 글자)
function dtLogo(src){
  const s = String(src).toLowerCase();
  if (/instagram|instagr\.am/.test(s)) return 'img/logo-instagram.png';
  if (/youtube|youtu\.be/.test(s)) return 'img/logo-youtube.png';
  if (/tiktok/.test(s)) return 'img/logo-tiktok.png';
  if (/^x$|^x\.com|twitter/.test(s)) return 'img/logo-x.png';
  return '';
}

function dtSubline(x, ready){
  if (isPlace(x)) return ready ? [icon('pin'), x.address] : [icon('pin'), '위치 확인 필요'];
  if (x.type === '쇼핑' && x.price) return [icon('bookmark'), x.price];
  if (x.type === '레시피' && x.recipe) return [icon('clock'), x.recipe];
  return ['', x.desc];
}

detail = function(){
  const x = items.find(i => i.id === detailId);
  if (!x) { detailId = null; return pages[page](); }
  const t = typeOf(x.type), ready = t.place && x.address && !x.pending;
  const app = MAP_APPS[settings.mapApp] || MAP_APPS.naver;
  const mapHref = ready ? app.url(encodeURIComponent(x.mapQuery || x.address)) : '';
  const src = x.source || 'SNS';
  const [subIcon, subText] = dtSubline(x, ready);

  // 가운데 동작 줄: 길찾기 · 원본 보기 · 수정
  const acts = [];
  if (ready) acts.push(`<a class="dtact" href="${mapHref}" target="_blank" rel="noopener noreferrer">${icon('send')}길찾기</a>`);
  if (t.place && !ready) acts.push(`<button class="dtact" data-action="edit">${icon('pin')}장소 입력</button>`);
  if (!x.deleted) acts.push(`<button class="dtact" data-action="original">${icon('external')}원본 보기</button>`);
  acts.push(`<button class="dtact" data-action="edit">${icon('pen')}수정</button>`);

  // 유형별 정보
  let info = '';
  if (x.period) info += `<section class="dtsec"><h2>운영 기간</h2><div class="dtrow">${icon('calendar')}<span>${esc(x.period)}</span>${x.deadline ? `<b class="dtdue">마감 ${esc(x.deadline)}</b>` : ''}</div></section>`;
  if (t.place) info += ready
    ? `<section class="dtsec"><h2>${x.type === '여행' ? '여행지 정보' : '장소 정보'}</h2><a class="dtmap" href="${mapHref}" target="_blank" rel="noopener noreferrer" aria-label="${esc(app.name)}에서 위치 보기">${dtMap}<span class="dtmaptag">예시 지도</span></a><div class="dtrow">${icon('pin')}<span>${esc(x.address)}</span></div>${x.distance ? `<p class="dthint">${esc(x.distance)} · 방문 전 원본에서 정보를 확인하세요.</p>` : ''}</section>`
    : `<section class="dtsec"><h2>장소 정보</h2><div class="dtwarn"><b>장소 확인 필요</b><p>AI가 위치를 확정하지 못했어요. 원본에서 주소를 확인해 입력하면 지도에 표시돼요.</p><button class="dtsmall" data-action="edit">장소 직접 입력</button></div></section>`;
  if (x.type === '쇼핑') info += `<section class="dtsec"><h2>구매 정보</h2><div class="dtrow">${icon('bookmark')}<span>${esc(x.price || '가격 정보 없음')}</span></div><p class="dthint">${esc(x.shop || '판매처 정보 없음')} · 가격과 재고는 원본에서 다시 확인하세요.</p></section>`;
  if (x.type === '레시피') info += `<section class="dtsec"><h2>간단 정보</h2><div class="dtrow">${icon('clock')}<span>${esc(x.recipe || '정보 없음')}</span></div><p class="dthint">자세한 조리법은 원본 콘텐츠에서 확인해요.</p></section>`;
  if (x.deleted) info += `<section class="dtsec"><h2>원본 콘텐츠</h2><div class="dtgone"><b>삭제된 게시물입니다.</b><p>원본을 열 수 없지만 ${t.place ? '장소 정보와 ' : ''}내 메모는 그대로 남아 있어요.</p></div></section>`;

  // 아래 고정 버튼: 장소면 길찾기, 아니면 원본 보기
  const primary = ready
    ? `<a class="dtprimary" href="${mapHref}" target="_blank" rel="noopener noreferrer">${icon('send')}길찾기</a>`
    : !x.deleted ? `<button class="dtprimary" data-action="original">${icon('external')}원본 보기</button>`
    : `<button class="dtprimary" data-action="edit">${icon('pen')}정보 수정</button>`;

  return `<article class="dt">
    <div class="dthero">${libThumb(x)}<div class="dtshade" aria-hidden="true"></div>
      <div class="dttop"><button class="dtbtn" data-action="back" aria-label="돌아가기">${icon('chevleft')}</button>
        <div class="dttopr"><button class="dtbtn" data-action="dtshare" aria-label="공유">${icon('nodes')}</button><button class="dtbtn" data-action="edit" aria-label="저장 정보 수정">${icon('more')}</button></div></div>
      <div class="dtsrc"><span class="dtavatar" aria-hidden="true">${dtLogo(src) ? `<img src="${dtLogo(src)}" alt="">` : esc([...src.replace(/^SNS · /,'')][0].toUpperCase())}</span><div><b>${esc(src)}</b><small>${esc(x.ago)} 저장</small></div></div>
    </div>
    <div class="dtsheet">
      <div class="dthead">
        <div class="dtheadtext">
          <p class="dtcat"><span class="libpill">${esc(x.category || shortType(x.type))}</span></p>
          <h1>${esc(x.title)}</h1>
          <p class="dtsub ${isPlace(x) && !ready ? 'warn' : ''}">${subIcon}<span>${esc(subText)}</span></p>
        </div>
        <button class="dtfav ${x.favorite ? 'on' : ''}" data-action="fav" aria-pressed="${!!x.favorite}" aria-label="즐겨찾기">${icon('star')}</button>
      </div>
      <div class="dtacts">${acts.join('<i class="dtdiv" aria-hidden="true"></i>')}</div>
      <section class="dtsec"><h2>저장한 메모</h2><p class="dtmemo">${esc(x.memo || '아직 메모가 없어요.')}</p>${x.desc ? `<p class="dthint">원본 요약 · ${esc(x.desc)}</p>` : ''}</section>
      ${info}
      <section class="dtsec"><h2>컬렉션</h2>${itemCollections(x).length ? itemCollections(x).map(name=>`<button class="dtcol" data-collection="${esc(name)}">${icon('folder')}${esc(name)}${icon('arrow')}</button>`).join('') : `<button class="dtcol" data-action="edit">${icon('folder')}미분류 · 컬렉션 정하기${icon('arrow')}</button>`}</section>
      <p class="dthint dtfoot">원본 콘텐츠는 저장한 SNS에서 확인해요. 핀맵은 썸네일과 요약만 보여줘요. (예시 콘텐츠)</p>
    </div>
    <div class="dtbar"><button class="dtghost" data-page="home">${icon('home')}홈으로</button>${primary}</div>
  </article>`;
};

actions.dtshare = () => toast('프로토타입에서는 공유 기능을 제공하지 않아요.');

// 즐겨찾기 (별표) · 브라우저에 함께 저장돼요
actions.fav = () => {
  const x = items.find(i => i.id === detailId); if (!x) return;
  x.favorite = !x.favorite; afterChange();
  const y = scrollY; render(); scrollTo(0, y);
  toast(x.favorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 뺐어요.');
};

/* ---------- 저장 정보 수정 (흰 시트) ---------- */
// app.js의 수정 처리(#editform 제출)를 그대로 쓰도록 입력 이름(type · title · address · memo · collection)을 유지해요.
function editSheet(){
  const x = items.find(i => i.id === detailId); if (!x) return;
  const cols = collectionNames(), custom = x.collection && !cols.includes(x.collection);
  const label = (ic, text, extra='') => `<div class="eslabel">${icon(ic)}<span>${text}</span>${extra}</div>`;
  const colChip = (name, text) => `<button type="button" class="eschip ${(x.collection||'')===name?'on':''}" data-escol="${esc(name)}" aria-pressed="${(x.collection||'')===name}">${esc(text)}</button>`;
  modal('', `<form id="editform" class="esform">
    <div class="eshead"><span class="esicon" aria-hidden="true">${icon('bookmark')}</span><div><h2>저장 정보 수정</h2><p>저장한 콘텐츠의 정보를 수정할 수 있어요.</p></div><button type="button" class="esclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody">
      <label class="esfield">${label('grid','카테고리')}
        <span class="esselect"><span class="esemoji" aria-hidden="true">${typeOf(x.type).emoji}</span><select name="type" id="es-type">${TYPES.map(t => `<option value="${t.id}" ${t.id===x.type?'selected':''}>${t.id}</option>`).join('')}</select>${icon('chevron')}</span>
      </label>
      <label class="esfield">${label('text','제목')}
        <span class="esinput"><input name="title" id="es-title" value="${esc(x.title)}" required maxlength="50"><small class="escount" data-for="es-title"></small></span>
      </label>
      <label class="esfield" id="es-addrwrap" ${typeOf(x.type).place?'':'hidden'}>${label('pin','주소')}
        <span class="esinput withicon">${icon('pin')}<input name="address" id="es-address" value="${esc(x.address||'')}" maxlength="200" placeholder="원본에서 확인한 주소"></span>
      </label>
      <label class="esfield">${label('note','메모')}
        <span class="esinput area"><textarea name="memo" id="es-memo" rows="3" maxlength="200" placeholder="어떤 순간에 다시 보고 싶나요?">${esc(x.memo||'')}</textarea><small class="escount" data-for="es-memo"></small></span>
      </label>
      <div class="esfield">${label('folder','컬렉션')}
        <input type="hidden" name="collection" id="es-col" value="${esc(x.collection||'')}">
        <div class="eschips">${colChip('', '미분류')}${cols.map(c => colChip(c, c)).join('')}${custom ? colChip(x.collection, x.collection) : ''}<button type="button" class="eschip add" data-esnew>${icon('plus')}새 컬렉션</button></div>
        <input class="esnewcol" id="es-newcol" maxlength="30" placeholder="새 컬렉션 이름 (예: 10월 데이트)" hidden>
      </div>
      <p class="eshint">카테고리를 직접 바꾸면 ‘직접 분류’로 표시돼요.</p>
    </div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">수정 완료</button></div>
  </form>`);
  $('#sheet').classList.add('editsheet');
  esCounts();
}
actions.edit = editSheet;
paths.star = 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z';
paths.grid = 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z';
paths.text = 'M5 6V4h14v2 M12 4v16 M9 20h6';
const esCounts = () => document.querySelectorAll('.esform .escount').forEach(c => {
  const el = document.getElementById(c.dataset.for); if (el) c.textContent = `${el.value.length}/${el.maxLength}`;
});
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('editsheet'));
document.addEventListener('input', e => {
  if (!e.target.closest?.('.esform')) return;
  esCounts();
  const err = $('#saveerror'); if (err) err.textContent = '';
  if (e.target.id === 'es-newcol') { $('#es-col').value = e.target.value.trim(); document.querySelectorAll('[data-escol]').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed','false'); }); }
});
document.addEventListener('change', e => {
  if (e.target.id !== 'es-type') return;
  const ai = e.target.value === 'ai', t = typeOf(e.target.value);
  $('.esform .esemoji').textContent = ai ? '✨' : t.emoji;
  const addr = $('#es-addrwrap'); if (addr) addr.hidden = !t.place;
});
document.addEventListener('click', e => {
  const c = e.target.closest('[data-escol]');
  if (c) {
    $('#es-col').value = c.dataset.escol; $('#es-newcol').hidden = true; $('#es-newcol').value = '';
    document.querySelectorAll('[data-escol]').forEach(b => { const on = b === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    return;
  }
  if (e.target.closest('[data-esnew]')) { const n = $('#es-newcol'); n.hidden = false; n.focus(); }
});

/* ---------- 새로 저장 (흰 시트) ---------- */
// app.js의 저장 처리(#saveform 제출)를 그대로 쓰도록 입력 이름(url · title · type · collection · memo)과 #saveerror를 유지해요.
function saveSheet(){
  const label = (ic, text, extra='') => `<div class="eslabel">${icon(ic)}<span>${text}</span>${extra}</div>`;
  const colChip = (name, text) => `<button type="button" class="eschip ${name===''?'on':''}" data-escol="${esc(name)}" aria-pressed="${name===''}">${esc(text)}</button>`;
  modal('', `<form id="saveform" class="esform" novalidate>
    <div class="eshead"><span class="esicon" aria-hidden="true">${icon('plus')}</span><div><h2>새 콘텐츠 추가</h2><p>장소·영상·상품 등 저장하고 싶은 콘텐츠 링크를 추가해요.</p></div><button type="button" class="esclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody">
      <button type="button" class="esshare" data-action="snsdemo"><span class="esshareicon" aria-hidden="true">${icon('share')}</span><div><b>SNS에서 공유로 저장하기</b><small>게시물에서 공유 → 핀맵, 저장 과정을 체험해요</small></div>${icon('arrow')}</button>
      <div class="esdivider"><span>또는 링크로 저장</span></div>
      <label class="esfield">${label('link','링크', `<button type="button" class="essample" data-action="sample">예시 링크로 채우기</button>`)}
        <span class="esinput withicon">${icon('link')}<input type="url" name="url" id="es-url" placeholder="https://" required inputmode="url"></span>
      </label>
      <label class="esfield">${label('text','제목')}
        <span class="esinput"><input name="title" id="es-title" placeholder="다시 찾기 쉬운 이름" required maxlength="50"><small class="escount" data-for="es-title"></small></span>
      </label>
      <label class="esfield">${label('grid','카테고리')}
        <span class="esselect"><span class="esemoji" aria-hidden="true">${settings.aiDefault ? '✨' : typeOf('기타').emoji}</span><select name="type" id="es-type"><option value="ai" ${settings.aiDefault?'selected':''}>자동 분류 체험</option>${TYPES.map(t => `<option value="${t.id}" ${!settings.aiDefault&&t.id==='기타'?'selected':''}>${t.id}</option>`).join('')}</select>${icon('chevron')}</span>
      </label>
      <div class="esfield">${label('folder','컬렉션', '<small class="esopt">선택</small>')}
        <input type="hidden" name="collection" id="es-col" value="">
        <div class="eschips">${colChip('', '나중에 정리')}${collectionNames().map(c => colChip(c, c)).join('')}<button type="button" class="eschip add" data-esnew>${icon('plus')}새 컬렉션</button></div>
        <input class="esnewcol" id="es-newcol" maxlength="30" placeholder="새 컬렉션 이름 (예: 10월 데이트)" hidden>
      </div>
      <label class="esfield">${label('note','저장한 이유', '<small class="esopt">선택</small>')}
        <span class="esinput area"><textarea name="memo" id="es-memo" rows="2" maxlength="200" placeholder="어떤 순간에 다시 보고 싶나요?"></textarea><small class="escount" data-for="es-memo"></small></span>
      </label>
      <p class="eshint">이 브라우저에 저장돼요. 지금은 입력한 제목과 링크로 간단히 분류하며, 게시물 본문 자동 변환은 연결 전이에요.</p>
      <p class="eserror" id="saveerror" role="alert"></p>
    </div>
    <div class="esfoot"><button type="button" class="escancel" data-action="close">취소</button><button class="essubmit" type="submit">저장하기</button></div>
  </form>`);
  $('#sheet').classList.add('editsheet');
  esCounts();
}
actions.save = () => {if(mapMenuOpen){mapMenuOpen=false;render();}saveSheet();};
// 예시 링크로 채우기: 기존 동작 후 화면(글자 수 · 카테고리 · 모음 칩)도 맞춰요
const fillSample = actions.sample;
actions.sample = () => {
  fillSample();
  esCounts(); $('#saveerror').textContent = '';
  $('.esform .esemoji').textContent = '✨';
  const v = $('#es-col').value;
  document.querySelectorAll('[data-escol]').forEach(b => { const on = b.dataset.escol === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
};
// 제목 · 링크를 비워둔 채 저장하면 안내 (app.js는 링크 형식만 확인해요)
document.addEventListener('submit', e => {
  if (e.target.id !== 'saveform') return;
  const f = e.target, err = $('#saveerror');
  if (!f.url.value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); err.textContent = '저장할 콘텐츠 링크를 붙여넣어 주세요.'; f.url.focus(); return; }
  if (!f.elements.namedItem('title').value.trim()) { e.preventDefault(); e.stopImmediatePropagation(); err.textContent = '제목을 입력해 주세요.'; f.elements.namedItem('title').focus(); }
}, true);
paths.link = paths.link || 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1';
