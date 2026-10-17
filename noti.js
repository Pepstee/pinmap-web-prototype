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
  const list = notifications(), isNew = n => !settings.readNoti.includes(n.id);
  const fresh = list.filter(isNew), seen = list.filter(n => !isNew(n));
  const allOff = !settings.notiDeadline && !settings.notiNearby && !settings.notiReminder;
  // 한 줄: 썸네일 · 제목(두 줄까지) · 내용 · 시간, 안 읽은 알림은 오른쪽 검정 점
  const row = n => {
    const x = notiItem(n), unread = isNew(n);
    return `<button type="button" class="ntrow ${unread ? 'unread' : ''}" data-noti="${esc(n.id)}" aria-label="${esc(n.title)}${unread ? ', 안 읽음' : ''}">
      <span class="ntthumb">${x ? libThumb(x) : `<span class="ntemoji">${icon(notiBadge(n))}</span>`}</span>
      <span class="nttext"><b>${esc(n.title)}</b><span class="ntbody">${esc(n.body)}</span><span class="nttime">${icon(notiBadge(n))}${esc(n.time)}</span></span>
      ${unread ? '<i class="ntdot" aria-hidden="true"></i>' : ''}
    </button>`;
  };
  const group = (label, arr) => arr.length ? `<section class="ntgroup"><h3>${label}</h3>${arr.map(row).join('')}</section>` : '';
  const body = list.length ? group('새 알림', fresh) + group('지난 알림', seen)
    : `<div class="ntempty">${icon('bell')}<b>${allOff ? '알림이 모두 꺼져 있어요' : '새 알림이 없어요'}</b><p>${allOff ? '알림 설정에서 필요한 알림을 켤 수 있어요.' : '마감 임박 · 주변 장소 소식이 생기면 알려드릴게요.'}</p></div>`;
  modal('', `<div class="esform ntform">
    <div class="nthead"><h2>알림${fresh.length ? ` <span>${fresh.length}</span>` : ''}</h2><button type="button" class="ntclose" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <div class="esbody ntlist">${body}</div>
    <div class="ntfoot ${fresh.length ? '' : 'one'}">${fresh.length ? '<button type="button" class="ntghost" data-action="readall">모두 읽음</button>' : ''}<button type="button" class="ntprimary" data-action="notisettings">${icon('gear')}알림 설정</button></div>
  </div>`);
  $('#sheet').classList.add('editsheet', 'cfsheet', 'ntsheet');
};
$('#sheet').addEventListener('close', () => $('#sheet').classList.remove('ntsheet'));
actions.noti = notiSheet;
paths.chevright = 'm9 5 7 7-7 7';
paths.gear = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';
