# HANDSLab — A world of robotic hands

로봇핸드 100종을 **실제 제품 사진과 사양**으로 탐색하는 정적 웹사이트입니다.
HANDSLab 조사표(공개용 100건)를 그대로 옮겼고, 조사표에 없는 값은 채우지 않고 `미확인`으로 표시합니다.

- 사이트 주소: <https://gayeong1214-wq.github.io/ROBOT_HAND_-WEB_/> (공개)
- 빌드 도구 없이 `index.html`만 열면 동작합니다.

## 화면 구성

| 영역 | 내용 |
| --- | --- |
| 첫 화면 | 미드나이트 네이비(#050B20) 위 큰 제목과 제품 캐러셀. 전체 100개의 제품 사진을 마우스 드래그·터치·이전/다음 버튼·좌우 화살표 키로 넘깁니다. 현재 번호·모델명·제조사·상세 링크가 함께 바뀝니다. |
| About HANDSLab | 영남대학교 로봇공학과 HANDS Lab 소개와 다섯 연구 분야. 공식 연구실 홈페이지로 연결합니다. |
| 스크롤 | 진행에 따라 배경이 #050B20 → 남색 → 밝은 블루그레이 → 흰색으로 바뀌고, 글자색은 대비가 큰 쪽으로 함께 바뀝니다. |
| Explorer · 전체 목록 (기본) | 100개 전체를 담은 표입니다. 능동 DoF / 총 DoF / 표기 DoF / 관절 / 구동기, Tip force(N) / Grip force(N) / Payload(kg)를 서로 다른 열로 둡니다. 열 제목을 눌러 정렬합니다. |
| Graphical Explorer | 모델 100개의 제품 사진을 갤러리(4열/3열/2열)로 보여 줍니다. 사진을 누르면 제품 상세와 관련 연구를 열 수 있습니다. |
| 상세 / 비교 | `#/hand/<모델>` 주소로 직접 열 수 있는 상세 화면, 최대 4개 비교 화면(`#/compare`). |

두 가지 보기는 검색·필터·정렬·비교 상태를 함께 쓰며, 상태는 주소(`?v=cards&q=...&cmp=...`)에 남아 그대로 공유할 수 있습니다.
첫 화면의 `전체 100개 보기`는 전체 목록으로, `갤러리 보기 · 100종`은 Graphical Explorer로 이동합니다.

접근성: 키보드로 모든 사진·카드·표·비교에 도달할 수 있고 초점 표시가 보입니다. 터치 화면에서는 모델명이 항상 보입니다.
`움직임 줄이기` 설정이나 좁은 화면에서는 포인터를 따라 움직이는 효과(parallax)를 끕니다.

## 폴더

```
index.html              화면 뼈대
assets/css/styles.css   스타일
assets/js/app.js        동작(100개 캐러셀, 배경 전환, 탐색, 비교, 상세; 비활성 관계 그래프 코드 포함)
assets/data/hands.js    사이트용 데이터 (tools/build_data.py 가 생성)
assets/img/             로고, 제품 사진(webp)
assets/fonts/           Pretendard 글꼴 (SIL OFL 1.1)
data/source/            조사표 원본 JSON (공개용 100건)
data/photos.json        모델별 웹용 사진 경로와 공개 출처
data/research.json      노션 조사표에서 가져온 공개 연구 자료 주소
tools/                  데이터·사진 변환 스크립트 (Python)
.openai/hosting.json     사이트 식별자와 배포 경로(비밀키 없음)
dist/                   index.html과 assets를 복사한 배포용 파일
```

## 데이터 기준

- 원본: `data/source/handslab-public-data.json` (노션 조사표에서 추출한 공개용 100건). 내부 견적과 조사자 정보는 들어 있지 않습니다.
- 원본의 `activeDof`·`totalDof`·`fingers` 값은 그대로 쓰고, 사양 문장에 적힌 관절·구동기·힘·하중·무게 수치만 항목별로 나눠 옮겼습니다(`tools/build_data.py`의 `EXTRA`).
- 능동/총 구분 없이 적힌 자유도는 추측해 나누지 않고 `표기 DoF`로 따로 둡니다. 힘의 종류가 분명하지 않은 값은 `기타 힘 표기`로 둡니다.
- 같은 제조사의 서로 다른 표기(예: `Inspire Robots` / `INSPIRE ROBOTS`)는 필터와 관계 보기에서 하나로 묶습니다.
- 출처 주소 끝의 추적용 꼬리표(`?utm_source` 등)와 문장 안의 띄어쓰기 깨짐만 정리했습니다.
- 가격은 조사표에 공개가가 있는 3건만 표시하며 출처 링크를 함께 둡니다.

데이터를 고친 뒤에는 다음 명령으로 사이트용 파일을 다시 만듭니다.

```bash
python3 tools/build_data.py
```

## 사진 출처

HANDSLab 노션 조사표의 이미지 열을 모델명 기준으로 연결해 100개 웹용 사진을 저장했습니다. Sandia Hand는 조사표에 연결된 연구기관의 공개 제품 사진을 사용했습니다. 노션 첨부 파일의 다운로드 주소는 만료되므로 사이트 데이터에 포함하지 않습니다. 공개 원본 주소가 있는 사진은 상세 화면에서 출처를 열 수 있습니다.

조사표의 관련 연구 33건도 해당 모델의 상세 화면에서 열 수 있습니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
```

그다음 브라우저에서 `http://localhost:8000` 을 엽니다.

## 배포 (GitHub Pages)

저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch는 `main` / `/ (root)` 로 저장하면
몇 분 뒤 <https://gayeong1214-wq.github.io/ROBOT_HAND_-WEB_/> 에서 열립니다.
이 주소는 Pages를 별도로 활성화해야 하며, 위 사이트 주소와는 다릅니다.

## 연구실 소개 출처

[HANDSLab 공식 홈페이지](https://sites.google.com/view/handslab/home)의 현재 연구실 명칭·소속·연구 주제를 요약했습니다. 카탈로그 100종·51개 제조사·14개 국가는 연구실 실적이 아니므로 Explorer의 카탈로그 규모에 따로 표시합니다.

## 디자인 참고

| 참고 | 가져온 점 | 보완한 점 |
| --- | --- | --- |
| [DexHand Atlas](https://everloom-129.github.io/DexHandAtlas/index.html) | 사진으로 먼저 발견하는 탐색 | hover에만 의존하지 않도록 이름을 항상 표시하고 탭·키보드 초점으로 상세 이동 |
| [Dexhands](https://dexhands.org/hands) | 제품 비교, 출처 연결 | 정보가 많은 화면은 첫 화면이 아니라 Explorer 아래에 배치 |
| [Robo2u](https://data.robo2u.com/hands) | 간결한 비교표 | 능동 DoF와 총 DoF를 독립된 열로 분리 |
| [Yale OpenHand](https://www.eng.yale.edu/grablab/openhand/) | 모델 상세에서 자료로 이어지는 구조 | 모델마다 사양·가격·사진 출처 링크 |
| [Obsidian Graph view](https://obsidian.md/help/Plugins/Graph%2Bview) | 관계 탐색 | 연결 기준 선택, 공통 필터 적용, 좁은 화면용 목록 |
| [Apple MacBook Pro](https://www.apple.com/macbook-pro/) | 스크롤 진행과 제품 중심 연출 | 제품 이미지는 로봇핸드 실제 사진만 사용 |

## 진행 단계

| 단계 | 완료 조건 | 상태 |
| --- | --- | --- |
| 1. 데이터·설계 확정 | 100건 변환, 사진 확인, 화면 구조 결정 | 완료 |
| 2. 홈페이지·탐색 구현 | 첫 화면, Explorer 두 가지 보기, 상세·비교 | 완료 |
| 3. 화면 검증 | PC 1440 / 태블릿 768 / 모바일 390에서 동작·넘침·이미지·콘솔 오류 확인 | 완료 |
| 4. 저장·공유 주소 | GitHub 소스 저장과 Sites 배포 | 현재 저장소와 사이트 배포 이력에서 확인 |
| 5. 교수님 검토·데이터 확대 | 검토 의견 반영, 사진·사양 보강 | 예정 |

## 알려진 한계

- 조사표에 없는 사양은 `미확인`입니다. 제조사 최신 자료와 다를 수 있으니 구매·설계 전에는 원문을 확인해 주세요.
- 다크 배경용 로고(`handslab-logo-on-dark.png`)는 원본 로고에서 남색 글자 부분만 흰색으로 바꾼 것입니다. 도형과 비율은 원본과 같습니다.
