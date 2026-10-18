// 하단 메뉴: 아이콘만 (홈 · 지도 · 컬렉션 · 마이)
// 캘린더는 하단 메뉴에서 빼고, 홈 화면의 캘린더 위젯으로만 들어가요.
const NAV_LABELS = {home:'홈', map:'지도', library:'컬렉션', my:'마이'};
const calNav = NAV.findIndex(n => n[0] === 'calendar'); if (calNav >= 0) NAV.splice(calNav, 1);
NAV.forEach(n => { if (NAV_LABELS[n[0]]) n[2] = NAV_LABELS[n[0]]; });
document.documentElement.classList.add('nav-icononly');
render();
