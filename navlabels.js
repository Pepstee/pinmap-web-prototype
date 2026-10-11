// 하단 메뉴 아이콘 아래 문구 (모든 스크립트 다음에 불러와요)
const NAV_LABELS = {home:'홈', map:'지도', library:'저장목록', calendar:'계획', my:'마이'};
NAV.forEach(n => { if (NAV_LABELS[n[0]]) n[2] = NAV_LABELS[n[0]]; });
render();
