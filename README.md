# CANCAN — Korean Drinks Speed Match (3D)

숨겨진 정답 캔 배열을 추리하면서 **3-Box → 4-Box → 5-Box**를 연속으로 가장 빨리 클리어하는 1인용 웹 미니게임.
기존 단일 HTML MVP(`reference/nbox_speed_match_mvp.html`)의 규칙과 UX를 그대로 유지하고, 캔·진열대·이동·교환·가림판을
**React Three Fiber + Three.js의 실제 3D 오브젝트와 애니메이션**으로 옮겼습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

| 명령 | 설명 |
| --- | --- |
| `npm run build` | 타입 검사 + 정적 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm test` | 게임 엔진 단위 테스트 (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run test:e2e` | 빌드된 앱을 Chromium으로 3→4→5 전체 플레이 (Playwright 필요, `SHOTS=dir`로 스크린샷 저장) |

E2E는 Playwright가 설치되어 있어야 합니다: `npm i -D playwright && npx playwright install chromium`.

## 게임 규칙 (원본 MVP 유지)

- 3개 → 4개 → 5개 캔을 연속으로 맞힘. 3/4-Box는 5종 중 중복 없이, 5-Box는 5종 모두. 정답 순서는 라운드마다 무작위.
- 스톱워치는 `00:00.00`부터 증가(`performance.now()` 기준), 라운드 전환 중에도 계속, 마지막 5-Box 정답 순간 정지.
- **클릭 앤 클릭만 사용** (드래그 없음)
  - 트레이 캔 → 빈 슬롯: 배치 · 배치된 캔 → 빈 슬롯: 이동 · 캔 A → 캔 B: 교환 · 같은 캔 다시: 선택 취소
  - 첫 배치 중 트레이 캔을 이미 찬 슬롯에 놓으면 기존 캔은 트레이로 돌아감 (원본 동작)
- 모든 슬롯이 차면 CHECK 없이 자동 판정 → 게임판 중앙에 `N RIGHT!` 0.7초 (맞은 개수만, 어느 칸인지는 비공개).
- 정답 시 하단 가림판이 열려 실제 정답 캔 배열이 보이고, 짧은 홀드 후 다음 라운드.
- **RESET**: 현재 라운드 배치만 초기화(정답·누적 시간·이전 기록 유지). **RESTART**: 3-Box부터 새 정답으로 전체 재시작(진행 중엔 확인).
- 결과 화면: 이번 기록을 개인 최고 기록과 막대로 비교(최고 기록까지 남은 초 / 단축한 초)하고 `다시 도전`을 유도. 총 판정 횟수 표시.
- 시작 화면: `CANCAN`, 한 줄 설명, START 위에 MY BEST 카드. 왼쪽 위 `CANCAN` 로고를 누르면 시작 화면으로 돌아감(진행 중이면 확인).
- HUD: 상단 중앙 스톱워치만 표시(라운드 진행 표시·안내 문구 없음). RESTART/나가기 확인은 게임 디자인의 자체 대화상자.
  최고 기록은 원본과 같은 `localStorage` 키 `nbox_best_stopwatch`(ms)에 저장되어 기존 기록과 호환됩니다.

원본과의 작은 차이: 원본은 RESET 시 라운드 판정 횟수를 0으로 돌렸지만, 결과 화면의 "판정 횟수"가 정확하도록 RESET 후에도 횟수를 유지합니다.

## 3D 인터랙션

| 동작 | 구현 |
| --- | --- |
| 캔 선택 | 0.15초 동안 부드럽게 들림 + 약간의 확대 + 약한 발광 + 웜그레이 외곽선 (바운스 없음) |
| 트레이 → 슬롯 | 들어 올려 진열대 앞쪽으로 호를 그리며 이동한 뒤 슬롯 안으로 미끄러져 내려앉음 (0.44초) |
| A ↔ B 교환 | 두 캔이 실제로 이동. 슬롯 칸막이를 피하려 앞으로 나왔다가 옆으로 이동 후 다시 들어감. 오른쪽으로 가는 캔은 더 앞·위 레인, 왼쪽으로 가는 캔은 안쪽 레인이라 서로 겹치지 않음 (0.32초) |
| 정답 공개 | 하단 정답 칸의 가림판(윗변 경첩)이 앞·위로 들려 올라가며 정답 캔이 드러남. 1.5초 홀드 후 닫히고 다음 라운드 |
| 카메라 | 거의 정면(약 9° 내려다봄), 회전/줌 없음. 화면 비율과 박스 수에 맞춰 거리만 자동 조정 |

안정성:
- 게임 상태(`src/game/engine.ts`)는 순수 리듀서이고 3D는 상태를 읽기만 합니다. 애니메이션은 항상 "현재 위치 → 새 목표"로 다시 시작하므로 중간에 끊겨도 배치/정답이 꼬이지 않습니다.
- 마지막 칸이 채워지면 `pendingJudge`가 설정되고 이동 애니메이션이 끝나는 시점에 판정합니다. 그동안 입력은 막히고, 지난 판정 요청은 시퀀스 번호로 무시됩니다.
- 라운드/런 ID로 지연 타이머(다음 라운드, 결과 표시)를 검증해 RESTART 직후 이전 타이머가 상태를 건드리지 않습니다.
- 가림판이 닫혀 있을 땐 정답 캔을 렌더링하지 않고, 새 라운드는 항상 닫힌 상태로 마운트됩니다.
- `prefers-reduced-motion`이면 이동이 즉시 끝나고 판정도 바로 일어납니다.
- WebGL을 쓸 수 없거나 렌더러가 실패하면 같은 엔진을 쓰는 2D 보드로 자동 전환됩니다.

## 프로젝트 구조

```
src/
  game/            # React·Three 비의존 순수 로직
    types.ts       # 상태/액션 타입
    drinks.ts      # 음료 5종 데이터 (+ 라벨 텍스처 경로)
    engine.ts      # 라운드 생성, 클릭 처리, 판정, 라운드 진행, 시간 계산
    records.ts     # 최고 기록 (localStorage, 기존 키 호환)
    engine.test.ts # 단위 테스트
  three/
    layout.ts      # 슬롯/트레이/정답 칸의 3D 좌표 (게임 데이터와 분리)
    motion.ts      # 애니메이션 시간·이징
    textures.ts    # 캔 라벨(placeholder/라이선스 이미지), 가림판·번호 텍스처
  components/
    GameScene.tsx  # R3F Canvas, 조명, 카메라, 히트 영역, 토스트 앵커
    Can3D.tsx      # 3D 캔 (원통 + 금속 상·하단 + 선택/이동/교환 트윈)
    Shelf3D.tsx    # 진열장(두께 있는 판재), 트레이, 정답 칸 + 가림판
    Hud.tsx        # 타이머, 라운드 표시, RESET/RESTART
    MatchToast.tsx # N RIGHT!
    Overlays.tsx   # 시작/결과 화면
    Fallback2D.tsx # WebGL 미지원 시 2D 보드
  themes/          # 테마 레지스트리 + BOOK/SNACK 목업 오브젝트·텍스처
  preview/         # ?preview 디자인 목업 화면
  App.tsx          # 리듀서 + 타임라인(판정, 공개, 다음 라운드, 기록 저장)
  fonts.ts         # 폰트 로딩
public/assets/drinks/  # 펼친 캔 라벨 텍스처 (생성물)
assets-src/drinks/     # 원본 제품 정면 사진
scripts/make_can_labels.py  # 사진 → 라벨 텍스처 변환
public/assets/fonts/   # (선택) 배달의민족 꾸불림체 파일을 두는 곳
reference/             # 원본 단일 HTML MVP
scripts/e2e.mjs        # Playwright 전체 플레이 테스트
docs/PRD.md            # 작업 지시서
```

## 캔 이미지와 크기

- **라벨:** 프로젝트 소유자가 제공한 제품 정면 사진(`assets-src/drinks/<id>.jpg`)을 `scripts/make_can_labels.py`로
  원통 라벨 텍스처(`public/assets/drinks/<id>.jpg`, 1024×512)로 펼쳐 씁니다. 정면 사진의 가장자리 압축을
  `x = cx + R·sin φ`로 되돌리고(±78°), 그 바깥(캔 뒷면)은 정면을 거울처럼 이어 붙입니다. 캔은 회전하지 않아 뒷면은 보이지 않습니다.
  사진을 바꾸면 `CROPS`(캔 몸통 좌우/위아래 픽셀)를 맞추고 `python3 scripts/make_can_labels.py`를 다시 실행하세요 (Pillow, numpy 필요).
- **크기:** `can_dimensions.csv`의 추정치를 `drinks.ts`의 `diameterMm`/`heightMm`로 옮겨 실제 비율과 상대 너비를 반영합니다
  (`MM = 0.0076` 월드 단위/mm). 실측으로 검증되지 않은 추정값입니다.

  | 음료 | 용량 | 지름 × 높이 (mm) |
  | --- | --- | --- |
  | 아침햇살 · 초록매실 | 180 ml | 53 × 104 |
  | 갈아만든배 · 비락식혜 | 238 ml | 66 × 92 |
  | 솔의눈 | 240 ml | 53 × 134 |

- 이미지가 없거나 로딩에 실패하면 음료 색과 이름으로 만든 `PLACEHOLDER LABEL`이 자동으로 쓰입니다.

## 폰트 / 이미지 라이선스 확인 사항

- **요청 폰트: 배달의민족 꾸불림체.** 공식 배포처는 우아한형제들(https://www.woowahan.com/fonts)입니다.
  이 빌드 환경에서는 공식 사이트에 접근할 수 없었고, 원본 MVP가 쓰던 jsDelivr(GitHub 미러) 경로는 공식 배포처가 아니어서 **번들하지 않았습니다.**
  공식 사이트에서 직접 받아 라이선스를 확인한 뒤 `public/assets/fonts/BMKkubulim.woff2`에 두고
  `src/fonts.ts`의 `KKUBULIM_FONT_FILE`을 설정하면 타이머·`N RIGHT!`·제목에 우선 적용됩니다.
- **현재 폴백: 배달의민족 주아체(BM JUA)** — npm `@fontsource/jua`, **SIL Open Font License 1.1**. 같은 배민 폰트 계열의 둥근 분위기라 선택했고, Vite가 로컬 에셋으로 번들합니다(외부 CDN 없음).
- **제품명·로고·패키지 이미지**(아침햇살, 초록매실, 갈아만든배, 비락식혜, 솔의눈)는 각 제조사의 상표/저작물입니다.
  현재 라벨은 프로젝트 소유자가 제공한 제품 사진으로 만든 것이며, 사진의 출처와 사용 권한은 이 저장소에서 검증되지 않았습니다.
  공개 배포 전에 사진 사용 권한과 상표 사용 범위를 반드시 확인하세요.
- Three.js, React Three Fiber, drei: MIT.

## 테마 확장 디자인 목업 (Preview)

게임 로직 없이 화면 디자인만 확인하는 목업입니다. 쿼리 문자열로 열리고(정적 호스팅에서 리라이트 불필요), 별도 청크로 지연 로딩되어 CAN 게임 번들·로직에는 영향이 없습니다.

| 경로 | 내용 |
| --- | --- |
| `/?preview` | 목업 목록 |
| `/?preview=themes` | 테마 선택 화면 (CAN = PLAY → 실제 게임, BOOK / SNACK = COMING SOON) |
| `/?preview=book&box=4` | BOOK 게임 화면 (`box=3·4·5`, `toast=0`이면 `2 RIGHT!` 숨김) |
| `/?preview=snack&box=4` | SNACK 게임 화면 |
| `/?preview=can&box=4` | 같은 정지 상태의 CAN 화면 (디자인 일관성 비교용) |

- 테마 목록은 `src/themes/themes.ts` 한 곳에서 관리합니다. 항목을 추가하면 선택 화면 카드가 자동으로 늘어납니다(auto-fit 그리드).
- 진열장·트레이·가림판·조명·카메라는 CAN 게임 컴포넌트를 그대로 재사용하고, 테마별로 슬롯 너비(`slotW`)만 다릅니다 (CAN 0.68 / BOOK 0.8 / SNACK 0.86).
- 책(`Book3D`): 하드커버(덮개 돌출·힌지 홈·둥근 책등)와 페이퍼백, 종이 단면 질감, 두께가 다른 5권.
- 과자(`Snack3D`): 부풀어 오른 봉지(위아래 실링 주름, 유광 필름) 3종 + 무광 종이 상자 2종.
- **BOOK·SNACK의 제목·제품명·패키지는 모두 가상의 SAMPLE 디자인**이며 오브젝트마다 `SAMPLE` 표기가 있습니다. 실제 제품/도서가 아닙니다.
  출시 전에 사용권이 확인된 실제 아트워크로 교체해야 합니다 (`src/themes/mockItems.ts`, `src/themes/mockTextures.ts`).

## 배포

서버가 필요 없는 정적 사이트입니다. `vite.config.ts`의 `base: './'` 덕분에 하위 경로에서도 동작합니다.

```bash
npm run build
```

`dist/`를 GitHub Pages, Netlify, Vercel, S3 등 아무 정적 호스팅에 올리면 됩니다.
