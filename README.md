# 핀맵 웹 프로토타입

사용자경험디자인II (26-2) 팀의 모바일 웹 프로토타입입니다. 현재 `main` 브랜치는 [Vercel 공개 화면](https://pinmap-prototype.vercel.app/)으로 자동 배포됩니다.

## 실행

별도 빌드 없이 이 폴더에서 `python3 -m http.server 8080`을 실행하고 `http://localhost:8080/`을 여세요. `index.html`은 402×874 화면 프레임을 제공하고, 실제 앱은 `app.html`에서 실행됩니다.

## 현재 화면

- 온보딩과 로그인 체험 화면, 홈, 저장 목록·컬렉션, 장소 상세, 마이페이지
- OpenStreetMap 지도와 Photon 장소 검색, 장소 마커, 성수동 기본 위치
- 지도 핀을 누르면 지도 위에서 저장된 콘텐츠 사진·장소명·분류·주소를 펼쳐 확인
- 지도 → 저장한 코스 목록 → 새 코스 만들기·저장, 저장한 코스 다시 편집
- 날짜 탭 없는 단일 코스 편집: 기존 여러 날짜의 장소는 순서를 유지해 하나로 합치고 중복 장소는 한 번만 표시
- 모든 주요 페이지에서 공유하는 하단 내비게이션

이 웹 프로토타입의 로그인, SNS 저장, 알림 등은 체험용 화면입니다. 코스와 저장 내용은 방문자별 브라우저 저장소에 보관되며 팀원 사이에 자동 동기화되지 않습니다. 지도와 장소 검색에는 외부 지도 서비스를 사용합니다.

`integration.css`와 `integration.js`는 팀 화면을 합치는 스타일과 동작을 담고 있습니다. `map-live.*`, `course.*`, `collection.*`은 각각 지도, 코스, 저장 목록 화면의 코드입니다. `vendor/`에는 지도 표시용 Leaflet 파일이 포함되어 있습니다. `home.*`은 홈 화면, `mypages.*`는 마이 하위 페이지(현재 위치 · 관심 키워드 · 알림 설정 · 저장하는 방법 · 계정 설정), `coach.js`는 홈 튜토리얼입니다. 수정 내역은 [CHANGELOG.md](CHANGELOG.md)에 있습니다.

협업 방법은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 검증

`node --test tests/course.test.cjs`로 코스 저장·재편집·새로고침 유지, 기존 데이터 이전, 저장 실패 처리를 확인합니다.


## 실제 콘텐츠 실험 브랜치

`experiment/real-content`는 운영 `main`과 분리된 개발 환경입니다. 루트 주소에서 온보딩 전에 시작 환경을 선택합니다.

- `index.html?mode=development`: 콘텐츠·계정·프로필 사진·위치·알림·코스를 예시값 없이 시작합니다. 입력한 실제 URL과 제목을 저장합니다. SNS 인증, 자동 수집, AI 추출, 푸시는 아직 연결하지 않았습니다.
- `index.html?mode=prototype`: 기존 13개 콘텐츠와 SNS 저장 체험 등 현재 프로토타입의 흐름을 유지합니다.
- 개발 저장 공간: `pinmap.dev.v1`, `pinmap.dev.courses.v1`, `pinmap.dev.course-draft.v1`. 기존 체험 저장 공간과 이전 버전 데이터를 불러오거나 지우지 않습니다.
- 개발 모드에는 예시 링크 채우기, 가짜 SNS 계정 연동/새로고침, 가짜 알림 생성이 없습니다. 사진 없는 콘텐츠에는 중립적인 자리표시자를 사용합니다.
- 브라우저 저장은 동일한 출처(도메인·포트)의 두 모드 사이에서 분리됩니다. 온보딩은 기존처럼 진입 시 표시됩니다.

실행: `python3 -m http.server 8092 --bind 127.0.0.1` 후 `http://localhost:8092/`.
검증: `node --test tests/environment.test.cjs`.
