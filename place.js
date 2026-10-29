// 홈과 지도 상단 '내 동네' (최대 2개)
// 메인 동네는 검정 큰 글씨, 서브 동네는 회색 작은 글씨. 서브를 누르면 서로 자리가 바뀌어요.
// 메인 동네를 누르면 '내 동네 설정' 시트가 올라와 추가 · 삭제 · 수정할 수 있어요.
const MAX_PLACES = 2;
// 검색용 동네 목록 (예시)
const DONGS = (PM_ENV.development ? [] : [
  ['성수동','서울 성동구'],['성수1가1동','서울 성동구'],['성수2가3동','서울 성동구'],['행당동','서울 성동구'],['왕십리동','서울 성동구'],['금호동','서울 성동구'],['옥수동','서울 성동구'],
  ['자양동','서울 광진구'],['화양동','서울 광진구'],['구의동','서울 광진구'],
  ['청파동','서울 용산구'],['효창동','서울 용산구'],['남영동','서울 용산구'],['후암동','서울 용산구'],['이태원동','서울 용산구'],['한남동','서울 용산구'],['용산동','서울 용산구'],
  ['서교동','서울 마포구'],['합정동','서울 마포구'],['연남동','서울 마포구'],['망원동','서울 마포구'],['상수동','서울 마포구'],
  ['삼청동','서울 종로구'],['익선동','서울 종로구'],['혜화동','서울 종로구'],['을지로동','서울 중구'],['명동','서울 중구'],
  ['신사동','서울 강남구'],['압구정동','서울 강남구'],['역삼동','서울 강남구'],['잠실3동','서울 송파구'],['문정동','서울 송파구'],['가락2동','서울 송파구']
]).map(([name, gu]) => ({name, full:`${gu} ${name}`}));
const dongOf = name => DONGS.find(d => d.name === name) || {name, full:name};

const myPlaces = () => {
  if (!Array.isArray(settings.places)) settings.places = PM_ENV.development ? [] : ['성수동'];
  if (!PM_ENV.development && !settings.places.length) settings.places = ['성수동'];
  if (settings.places.length > MAX_PLACES) {
    settings.archivedPlaces = [...new Set([...(settings.archivedPlaces || []), ...settings.places.slice(MAX_PLACES)])];
    settings.places.length = MAX_PLACES;
    afterChange();
  }
  return settings.places;
};
const mainPlace = () => myPlaces()[0] || '';
// 저장 장소가 메인 동네에 있는지 (동 이름의 숫자·'가'를 빼고 주소와 비교)
const inMainPlace = x => !!mainPlace() && (x.address||'').includes(mainPlace().replace(/\d+가?\d*동$|동$/, ''));

let placeSwapped = false; // 위치를 바꿨을 때만 글자 애니메이션
function placebar(){
  if(PM_ENV.development&&!myPlaces().length)return `<div class="placebar"><button class="placemain" data-page="map">${icon('pin')}<b>위치를 아직 설정하지 않았어요</b></button></div>`;
  const [main, ...others] = myPlaces();
  const mainLabel = settings.placeLabels?.[main] || main;
  const swapped = placeSwapped; placeSwapped = false;
  return `<div class="placebar${swapped ? ' swapped' : ''}" role="group" aria-label="현재 위치">
    <button class="placemain" data-action="placesheet" aria-label="현재 위치 설정 · ${esc(mainLabel)} · ${esc(main)}">${icon('pin')}<b>${esc(mainLabel)}</b>${others.length ? '' : icon('chevron')}</button>
    ${others.map((name,index) => `<button class="placesub" data-place-swap="${index+1}" aria-label="${esc(settings.placeLabels?.[name] || name)} · ${esc(name)} 위치 선택">${esc(settings.placeLabels?.[name] || name)}</button>`).join('')}
  </div>`;
}
paths.chevron = 'm6 9 6 6 6-6';
paths.edit = 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4';

function setMain(i){
  const p = myPlaces();
  if (i <= 0 || i >= p.length) return;
  const [picked] = p.splice(i, 1); p.unshift(picked); placeSwapped = true;
  afterChange(); render();
  window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name:picked}}));
  toast(`위치를 '${settings.placeLabels?.[picked] || picked}'(으)로 변경했어요.`);
}

/* ---------- 현재 위치 설정 시트 ---------- */
function placeSheet(){
  const p = myPlaces();
  const rows = p.map((name, i) => `<div class="prow">
      <button class="pradio ${i===0?'on':''}" data-place-pick="${i}" role="radio" aria-checked="${i===0}" aria-label="${esc(name)} 선택"></button>
      <button class="pname" data-place-pick="${i}"><b>${esc(settings.placeLabels?.[name] || name)}</b><small>${esc(dongOf(name).full)}${i===0?' · 현재 위치':''}</small></button><button class="picon plabel-edit" data-place-label="${i}" aria-label="${esc(name)} 이름 지정">이름</button>
      <button class="picon" data-place-edit="${i}" aria-label="${esc(name)} 수정">${icon('edit')}</button>
      <button class="picon" data-place-del="${i}" aria-label="${esc(name)} 삭제" ${p.length===1?'disabled':''}>${icon('close')}</button>
    </div>`).join('');
  modal('현재 위치 설정', `<p class="muted psub">최대 ${MAX_PLACES}개의 위치를 선택할 수 있어요.</p>
    <div class="plist" role="radiogroup" aria-label="현재 위치">${rows}</div>
    ${p.length < MAX_PLACES ? `<button class="padd" data-action="placeadd">${icon('plus')} 위치 추가</button>` : `<p class="hint pfull">위치를 바꾸려면 ✎ 수정을 누르거나, 하나를 삭제한 뒤 추가하세요.</p>`}
    ${p.length===1 ? '<p class="hint pfull">위치는 최소 1개가 필요해서 삭제할 수 없어요.</p>' : ''}`);
  $('#sheet').classList.add('bottomsheet');
}

/* ---------- 자주 가는 위치 이름 ---------- */
let labelPlaceIndex = -1;
function placeLabelSheet(index){
  const name=myPlaces()[index];if(!name)return;
  labelPlaceIndex=index;
  modal('위치 이름 지정', `<form id="place-label-form"><p class="muted psub">${esc(name)}에 표시할 이름을 입력하세요. 예: 집, 학교</p><label class="psearch"><input name="label" aria-label="위치 이름" maxlength="12" placeholder="집, 학교 등" value="${esc(settings.placeLabels?.[name] || '')}"></label><div class="dialogactions"><button type="submit" class="primary">저장</button></div></form>`);
  $('#sheet').classList.add('bottomsheet');
}

/* ---------- 위치 검색 (추가 · 수정) ---------- */
let placeMode = {type:'add', index:-1};
function placeSearch(mode){
  placeMode = mode;
  modal('', `<div class="psearchtop"><label class="psearch">${icon('search')}<input id="placeq" placeholder="동, 읍, 면으로 검색" aria-label="위치 검색" autocomplete="off"></label><button class="pclose" data-action="placesheet">닫기</button></div>
    <div id="placeresults">${placeResults('')}</div>`);
  $('#sheet').classList.add('placesearch', 'bottomsheet');
  setTimeout(() => $('#placeq')?.focus(), 50);
}
function placeResults(q){
  if(PM_ENV.development)return '<p class="muted pempty">동네 검색은 아직 연결하지 않았어요. 지도에서는 실제 장소 검색과 현재 위치 기능을 사용할 수 있어요.</p>';
  const mine = myPlaces();
  const row = d => `<button class="pres ${mine.includes(d.name)?'mine':''}" data-place-choose="${esc(d.name)}">${esc(d.full)}${mine.includes(d.name)?'<span>설정됨</span>':''}</button>`;
  if (q.trim()) {
    const list = DONGS.filter(d => d.full.includes(q.trim()));
    return list.length ? `<div class="presults">${list.map(row).join('')}</div>` : `<p class="muted pempty">‘${esc(q)}’ 검색 결과가 없어요.</p>`;
  }
  const recent = (settings.recentPlaces||[]).filter(n => !mine.includes(n)).slice(0,5);
  // 지금 있는 동네: 예시 현재 위치(성동구) 주변
  const near = DONGS.filter(d => /성동구|광진구/.test(d.full));
  return `${recent.length ? `<h3 class="plabel">최근 설정한 위치</h3><div class="pchips">${recent.map(n => `<button class="pchip" data-place-choose="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    <h3 class="plabel">지금 있는 위치 <small>예시 위치 기준</small></h3><div class="presults">${near.map(row).join('')}</div>`;
}
function choosePlace(name){
  const p = myPlaces();
  if (p.includes(name)) { toast('이미 설정한 위치예요.'); return; }
  const before = placeMode.type === 'edit' ? p[placeMode.index] : null;
  if (placeMode.type === 'edit' && placeMode.index >= 0) { p[placeMode.index] = name; if(before && settings.placeLabels?.[before]){settings.placeLabels={...settings.placeLabels,[name]:settings.placeLabels[before]};delete settings.placeLabels[before];} }
  else { if (p.length >= MAX_PLACES) { toast(`위치는 최대 ${MAX_PLACES}개까지 설정할 수 있어요.`); return; } p.unshift(name); }
  settings.recentPlaces = [...new Set([before, ...(settings.recentPlaces||[])].filter(n => n && !p.includes(n)))].slice(0,5);
  afterChange(); $('#sheet').close(); render();
  if(placeMode.type==='add'||placeMode.index===0)window.dispatchEvent(new CustomEvent('pinmap:place-changed',{detail:{name:myPlaces()[0]}}));
  toast(placeMode.type === 'edit' ? `'${before}'을(를) '${name}'(으)로 수정했어요.` : `위치를 '${name}'(으)로 변경했어요.`);
}

Object.assign(actions, {
  placesheet: () => { $('#sheet').classList.remove('placesearch'); placeSheet(); },
  placeadd: () => placeSearch({type:'add', index:-1})
});
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('placesearch', 'bottomsheet'));
document.addEventListener('click', e => {
  const swap=e.target.closest('[data-place-swap]'); if (swap) { setMain(Number(swap.dataset.placeSwap)); return; }
  const pick = e.target.closest('[data-place-pick]');
  if (pick) { const i = Number(pick.dataset.placePick); if (i > 0) { setMain(i); placeSheet(); } return; }
  const named=e.target.closest('[data-place-label]'); if(named){placeLabelSheet(Number(named.dataset.placeLabel));return;}
  const ed = e.target.closest('[data-place-edit]');
  if (ed) { placeSearch({type:'edit', index:Number(ed.dataset.placeEdit)}); return; }
  const del = e.target.closest('[data-place-del]');
  if (del) {
    const p = myPlaces(); if (p.length === 1) return;
    const [gone] = p.splice(Number(del.dataset.placeDel), 1);
    if(settings.placeLabels)delete settings.placeLabels[gone];
    settings.recentPlaces = [gone, ...(settings.recentPlaces||[]).filter(n => n !== gone)].slice(0,5);
    afterChange(); render(); placeSheet(); toast(`'${gone}'을(를) 위치 목록에서 삭제했어요.`);
    return;
  }
  const ch = e.target.closest('[data-place-choose]');
  if (ch) choosePlace(ch.dataset.placeChoose);
});
document.addEventListener('input', e => { if (e.target.id === 'placeq') $('#placeresults').innerHTML = placeResults(e.target.value); });

document.addEventListener('submit',e=>{
  if(e.target.id!=='place-label-form')return;
  e.preventDefault();
  const name=myPlaces()[labelPlaceIndex];if(!name)return;
  const label=new FormData(e.target).get('label').trim().slice(0,12);
  settings.placeLabels={...settings.placeLabels};
  if(label)settings.placeLabels[name]=label;
  else delete settings.placeLabels[name];
  afterChange();$('#sheet').close();render();toast(label?`'${name}' 위치 이름을 '${label}'(으)로 저장했어요.`:`'${name}' 위치 이름을 지웠어요.`);
});
