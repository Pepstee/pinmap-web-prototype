# 핀맵 웹 프로토타입

사용자경험디자인II (26-2) 팀의 모바일 웹 프로토타입입니다. 현재 `main` 브랜치는 [Vercel 공개 화면](https://pinmap-prototype.vercel.app/)으로 자동 배포됩니다.

## 실행

별도 빌드 없이 이 폴더에서 `python3 -m http.server 8080`을 실행하고 `http://localhost:8080/`을 여세요. `index.html`은 402×874 화면 프레임을 제공하고, 실제 앱은 `app.html`에서 실행됩니다.

## 현재 화면

- 온보딩과 로그인 체험 화면, 홈, 저장 목록·컬렉션, 장소 상세, 마이페이지
- OpenStreetMap 지도와 Photon 장소 검색, 장소 마커, 성수동 기본 위치
- 장소를 추가하고 순서를 편집할 수 있는 코스 화면
- 모든 주요 페이지에서 공유하는 하단 내비게이션

이 웹 프로토타입의 로그인, SNS 저장, 알림 등은 체험용 화면입니다. 코스와 저장 내용은 방문자별 브라우저 저장소에 보관되며 팀원 사이에 자동 동기화되지 않습니다. 지도와 장소 검색에는 외부 지도 서비스를 사용합니다.

`integration.css`와 `integration.js`는 팀 화면을 합치는 스타일과 동작을 담고 있습니다. `map-live.*`, `course.*`, `collection.*`은 각각 지도, 코스, 저장 목록 화면의 코드입니다. `vendor/`에는 지도 표시용 Leaflet 파일이 포함되어 있습니다. `home.*`은 홈 화면, `mypages.*`는 마이 하위 페이지(현재 위치 · 관심 키워드 · 알림 설정 · 저장하는 방법 · 계정 설정), `coach.js`는 홈 튜토리얼입니다. 수정 내역은 [CHANGELOG.md](CHANGELOG.md)에 있습니다.

협업 방법은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
