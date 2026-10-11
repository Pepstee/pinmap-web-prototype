// 알림 창 리디자인 (흰 시트 · 콘텐츠 썸네일 카드)
// my.js의 알림 목록(notifications) · 읽음 처리 · 알림 설정 이동은 그대로 쓰고, 화면 모양만 바꿉니다.
// my.js · library.js · detail.js 다음에 불러와야 해요.

// 알림과 연결된 콘텐츠 (썸네일 · 카테고리 표시에 사용)
function notiItem(n){
  if (n.detail) return items.find(x => x.id === n.detail);
  if (n.id === 'near') return readyPlaces().filter(x => distanceOf(x) < 999).sort((a,b) => distanceOf(a) - distanceOf(b))[0];
  return null;
}
const notiBadge = n => n.id.startsWith('due') ? 'calendar' : (n.id === 'near' || n.id === 'pending') ? 'pin' : 'bookmark';

notiSheet = function(){
  const list = notifications(), unreadAny = list.some(n => !settings.readNoti.includes(n.id));
  const allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  const rows = list.map(n => {
    const x = notiItem(n), unread = !settings.readNoti.includes(n.id);
    return `<button class="ntcard ${unread ? 'unread' : ''}" data-noti="${esc(n.id)}">
      <span class="ntthumb">${x ? libThumb(x) : `<span class="ntemoji">${n.emoji}</span>`}<i class="ntbadge">${icon(notiBadge(n))}</i></span>
      <span class="nttext">
        <b>${esc(n.title)}</b>
        <span class="ntbody">${esc(n.body)}</span>
        <span class="nttime">${icon('clock')}${esc(n.time)}${unread ? ' · 새 알림' : ''}</span>
      </span>
      ${icon('chevright')}
    </button>`;
  }).join('');
  modal('', `<div class="esform">
    <div class="nthead"><div><h2>알림</h2><p>중요한 소식을 놓치지 마세요.</p></div><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody ntlist">${rows || `<div class="ntempty">${icon('bell')}<b>${allOff ? '알림이 모두 꺼져 있어요' : '새 알림이 없어요'}</b><p>${allOff ? '마이 › 설정에서 필요한 알림을 켤 수 있어요.' : '마감 임박 · 주변 장소 소식이 생기면 알려드릴게요.'}</p></div>`}</div>
    <div class="esfoot ntfoot">${unreadAny ? '<button type="button" class="escancel" data-action="readall">모두 읽음</button>' : '<span></span>'}<button type="button" class="essubmit ntset" data-action="notisettings">${icon('gear')}알림 설정</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet');
};
actions.noti = notiSheet;
paths.chevright = 'm9 5 7 7-7 7';
paths.gear = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';
