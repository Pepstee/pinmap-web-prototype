// 개발 모드 전용: og-fetch가 가져온 제목으로 Photon 장소를 찾고, 사용자가 확인하면
// 저장 항목에 붙일 장소 정보(이름·주소·위경도·osm_id)를 만들어요. 이 파일은 저장 흐름을
// 바꾸지 않아요 — 확인된 장소는 window.pmOgLast.place 에 남고, 실제 연결(issue #38 task 4)에서 쓰여요.
// 순수 로직(위)과 UI(아래)는 테스트 마커로 나눠요: tests/place-find.test.cjs는 위쪽만 실행해요.

/* ---------- 순수 로직 ---------- */

const PF_BIAS = { lat: 37.5445, lng: 127.043 }; // 성수동 기본 위치 (map-live와 같아요)
const PF_LIMIT = 3;

// 사이트 접미사 제거: '성수동 - 위키백과, …' → '성수동'
function pfCleanQuery(title) {
  let q = String(title || '').split(/\s+[-–|]\s+/)[0].trim();
  return q.slice(0, 80);
}

function pfComposeAddress(p) {
  return [p.street, p.city, p.county, p.state, p.country].filter(Boolean).join(', ');
}

// Photon 응답 → 후보 목록. Photon의 관련도(bias 포함)를 그대로 신뢰해요 — 정렬하지 않아요.
function pfParsePhoton(json, q) {
  const features = Array.isArray(json && json.features) ? json.features : [];
  return features
    .map(f => {
      const p = f.properties || {};
      const coord = (f.geometry && f.geometry.coordinates) || [];
      return {
        name: p.name || q,
        address: pfComposeAddress(p),
        lat: coord[1],
        lng: coord[0],
        osm_id: p.osm_id ?? null,
      };
    })
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .slice(0, PF_LIMIT);
}

async function pfFindPlaces(q, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const bias = opts.bias || PF_BIAS;
  const query = pfCleanQuery(q);
  if (query.length < 2) return { ok: false, error: 'short_query' };
  try {
    const response = await fetchImpl('https://photon.komoot.io/api/?q=' + encodeURIComponent(query) +
      '&lat=' + bias.lat + '&lon=' + bias.lng + '&limit=10', { signal: opts.signal });
    if (!response.ok) return { ok: false, error: 'unreachable' };
    return { ok: true, candidates: pfParsePhoton(await response.json(), query) };
  } catch (err) {
    if (err && err.name === 'AbortError') return { ok: false, error: 'aborted' };
    return { ok: false, error: 'unreachable' };
  }
}

/* ---------- UI (개발 모드에서만) ---------- */

if (PM_ENV.development) {
  const pfState = { map: null, marker: null, selected: null };
  let pfController = null;

  // 폼이 flex 레이아웃이라 지도 컨테이너가 눌리지 않도록 고정 높이를 보장해요
  const pfStyle = document.createElement('style');
  pfStyle.textContent = '#ogmap { flex: 0 0 200px !important; height: 200px !important; }';
  document.head.append(pfStyle);

  const pfSection = form => {
    let el = form.querySelector('#ogplace');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ogplace';
      el.style.marginTop = '8px';
      (form.querySelector('#oghint') || form.querySelector('input[name="url"]').closest('label')).after(el);
    }
    return el;
  };

  function pfShowMap(candidate) {
    const host = document.querySelector('#ogmap');
    if (!host || typeof L === 'undefined') return;
    if (pfState.map) { pfState.map.remove(); pfState.map = null; }
    pfState.map = L.map(host, { attributionControl: true, scrollWheelZoom: false }).setView([candidate.lat, candidate.lng], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(pfState.map);
    pfState.marker = L.circleMarker([candidate.lat, candidate.lng], { radius: 10, color: '#111111', fillOpacity: 0.5 }).addTo(pfState.map);
    setTimeout(() => pfState.map && pfState.map.invalidateSize(), 100);
  }

  function pfRenderCandidates(form, candidates) {
    const el = pfSection(form);
    if (!candidates.length) { el.innerHTML = '<p class="hint">장소를 찾지 못했어요. 저장 후 장소를 직접 확인할 수 있어요.</p>'; return; }
    el.innerHTML = '<div class="pm-label" style="font-weight:700;margin:6px 0 4px">장소 확인</div>' +
      candidates.map((c, i) => `<button type="button" class="textbtn" data-pf="${i}" style="display:block;text-align:left"><b>${esc(c.name)}</b><small style="display:block">${esc(c.address)}</small></button>`).join('');
    el.querySelectorAll('[data-pf]').forEach(btn => btn.addEventListener('click', () => {
      const c = candidates[Number(btn.getAttribute('data-pf'))];
      pfState.selected = c;
      window.pmOgLast.place = c;
      el.querySelectorAll('[data-pf]').forEach(b => b.style.fontWeight = '');
      btn.style.fontWeight = '700';
      if (!document.querySelector('#ogmap')) { const m = document.createElement('div'); m.id = 'ogmap'; m.style.cssText = 'height:200px;border-radius:12px;margin-top:6px'; el.after(m); }
      pfShowMap(c);
      document.querySelector('#ogmap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const ok = document.querySelector('#ogplaceok') || (() => { const p = document.createElement('p'); p.id = 'ogplaceok'; p.className = 'hint'; el.after(p); return p; })();
      ok.textContent = `장소 확인 · ${c.name}${c.address ? ' · ' + c.address : ''}`;
    }));
  }

  // og-fetch가 제목을 채운 뒤 사용자가 버튼으로 장소를 찾아요 (자동 검색 아님: 확인이 목적이에요)
  document.addEventListener('click', e => {
    if (e.target.closest('#ogfindplace')) {
      const form = e.target.closest('#saveform') || document.querySelector('#saveform');
      const el = pfSection(form);
      if (!window.pmOgLast || !window.pmOgLast.title) { el.innerHTML = '<p class="hint">먼저 링크를 넣어 제목을 가져와 주세요.</p>'; return; }
      el.innerHTML = '<p class="hint">장소를 찾는 중…</p>';
      pfController?.abort(); pfController = new AbortController();
      pfFindPlaces(window.pmOgLast.title, { signal: pfController.signal }).then(r => {
        pfRenderCandidates(form, r.ok ? r.candidates : []);
      });
    }
    if (e.target.closest('#ogclearplace')) {
      pfState.selected = null; window.pmOgLast && (window.pmOgLast.place = null);
      const mapEl = document.querySelector('#ogmap'); if (mapEl) mapEl.remove();
      if (pfState.map) { pfState.map.remove(); pfState.map = null; }
      const el = document.querySelector('#ogplace'); if (el) el.innerHTML = '<button type="button" class="textbtn" id="ogfindplace">장소 찾기</button>';
      const ok = document.querySelector('#ogplaceok'); if (ok) ok.remove();
    }
  });

  // og-fetch가 성공하면(pm-og 이벤트) '장소 찾기' 버튼을 노출하고, 링크가 지워지면 섹션도 정리해요
  document.addEventListener('pm-og', e => {
    const form = document.querySelector('#saveform');
    if (!form) return;
    const el = pfSection(form);
    if (e.detail && e.detail.title) {
      el.innerHTML = '<button type="button" class="textbtn" id="ogfindplace">장소 찾기</button>';
    } else {
      el.remove(); const m = document.querySelector('#ogmap'); if (m) m.remove(); const ok = document.querySelector('#ogplaceok'); if (ok) ok.remove(); if (pfState.map) { pfState.map.remove(); pfState.map = null; } pfState.selected = null;
      window.pmOgLast = null;
    }
  });
}
