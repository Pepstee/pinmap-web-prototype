// 이모지 → 검정 선 아이콘 (화면에 그려질 때 자동으로 바꿔요 · 맨 마지막에 불러와요)
// 데이터와 다른 코드의 이모지는 그대로 두고, 보이는 화면에서만 아이콘으로 바꿉니다.
const EMOJI_ICONS = {
  '📍': paths.pin, '✨': paths.spark, '☕': paths.coffee, '🔖': paths.bookmark, '🗓': paths.calendar,
  '⏰': paths.clock, '🖼': paths.image, '📁': paths.folder, '🔎': paths.search, '🔔': paths.bell,
  '🗺': paths.map, '🏠': paths.home,
  '💡': 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  '📲': 'M8 3h9v18H8z M11.5 18h2 M2 11h7 M6 8l3 3-3 3',
  '🛍': 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
  '✈': 'M3 13.5 21 6l-4 14-5-5-3 4v-6z M12 15l9-9',
  '🍳': 'M3 11a6 6 0 1 0 12 0 6 6 0 1 0-12 0 M14.5 14.5 21 21 M9 9.5a1.5 1.5 0 1 1 0 3',
  '💳': 'M3 6h18v12H3z M3 10h18 M7 15h4',
  '⏱': 'M12 9v4l3 2 M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M10 2h4 M12 2v4',
  '👆': 'M9 12V5a2 2 0 0 1 4 0v6 M13 10a2 2 0 0 1 4 0v3 M17 12a2 2 0 0 1 3 1.7V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4 15a2 2 0 0 1 3-2.6l2 1.6',
  '👋': 'M8 5l11 7-11 7z',
  'ℹ': 'M12 11v6 M12 7.5h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  '⚠': 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  '🍴': 'M7 3v8 M4.5 3v5a2.5 2.5 0 0 0 5 0V3 M7 11v10 M17 3c-2.5 2-2.5 8 0 9v9',
  '📚': 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z M4 20a2 2 0 0 0 2 1h13v-3',
  '📸': 'M4 7h4l2-3h4l2 3h4v13H4z M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  '🌳': 'M12 22v-7 M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z',
  '🌊': 'M2 10c3-3 5 3 8 0s5 3 8 0 2-1 4-1 M2 16c3-3 5 3 8 0s5 3 8 0 2-1 4-1',
  '▶': 'M8 5l11 7-11 7z',
  '🔗': paths.link
};
const EMOJI_RE = new RegExp(`(${Object.keys(EMOJI_ICONS).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\uFE0F?`, 'g');
const EMOJI_TEST = new RegExp(EMOJI_RE.source); // 검사용 (전역 플래그 없음)
const emojiIcon = e => `<svg class="icon emo" viewBox="0 0 24 24" aria-hidden="true"><path d="${EMOJI_ICONS[e]}"/></svg>`;
const SKIP = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION','TITLE','text','tspan']);
function swapEmoji(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n =>
    !n.parentElement?.closest('.lm-emoji,.lm-emoji-pin') && !SKIP.has(n.parentNode?.nodeName) && EMOJI_TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    EMOJI_RE.lastIndex = 0;
    const span = document.createElement('span');
    span.innerHTML = n.nodeValue.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(EMOJI_RE, (_, e) => emojiIcon(e));
    n.replaceWith(...span.childNodes);
  }
  EMOJI_RE.lastIndex = 0;
}
// 화면이 다시 그려질 때마다 새로 생긴 부분만 바꿔요
new MutationObserver(list => { for (const m of list) {
  if (m.type === 'characterData') { if (m.target.parentNode) swapEmoji(m.target.parentNode); }
  else m.addedNodes.forEach(n => { if (n.nodeType === 1) swapEmoji(n); else if (n.nodeType === 3 && n.parentNode) swapEmoji(n.parentNode); });
}}).observe(document.body, {childList:true, subtree:true, characterData:true});
swapEmoji(document.body);
