# 🧀 CheezeFilm Fan Site

치즈필름(@CheezeFilmz)의 비공식 팬 사이트. 채널 소개·대표작 진열, 오디션 지원·팬 응원 메시지 접수, 그리고 관리자가 그 모든 응답을 확인할 수 있는 작은 풀스택 웹사이트입니다.

## 핵심 특징

- **메인 페이지** — 채널 스토리, 대표작 3편(다중인격 소녀, 남자무리 여사친, 달고나), 최근 업로드 6편(YouTube에서 자동 페치), 제작진 소개, 통계 스트립
- **영상 페이지** (`/videos`) — 채널의 모든 영상을 그리드로 표시. 제목 검색 + 페이지네이션(더보기). 카드 클릭 시 사이트 안에서 YouTube 임베드로 바로 재생(모달). 1시간 ISR 캐시
- **지원하기 페이지** (`/support`) — `오디션 지원` / `응원 메시지` 두 탭으로 분리. URL에 `?tab=audition` 또는 `?tab=fan` 으로 직접 진입 가능
- **관리자 페이지** (`/admin`) — 로그인 후 대시보드에서 모든 지원 내역 확인. 오디션은 `대기 / 검토중 / 합격 / 불합격` 상태로 변경 가능, 응원은 읽음/안읽음 토글 가능. 양쪽 모두 삭제 지원
- **로컬 SQLite 저장소** — `data/cheezefilm.db` 에 모든 응답이 보관됩니다. 추가 인프라가 필요 없습니다

## 디자인 컨셉

“AI스럽지 않은” 디자인을 목표로, 클래식 영화 포스터·필름 슬레이트·낡은 종이 무드를 잡았습니다.

- **메인 컬러**: 치즈 옐로우 `#F4C235`
- **잉크 블랙**: `#161310` (필름 검정)
- **크림 베이지**: `#F6ECD6` (오래된 종이)
- **벽돌 레드**: `#B13A2C` (포인트)
- **폰트**: Black Han Sans (디스플레이) + Gowun Dodum (본문)
- **장식**: 손그림 곡선 밑줄, 도장 스탬프, 필름 천공, 마퀴 티커, 거친 노이즈 텍스처 (전부 순수 CSS·SVG 인라인)

## 실행 방법

```bash
# 1) 패키지 설치 (최초 1회)
npm install

# 2) 개발 서버
npm run dev
# → http://localhost:3000

# 3) 프로덕션 빌드 / 실행
npm run build
npm start
```

## YouTube 영상 가져오기

영상은 두 가지 경로로 자동 페치됩니다 ([lib/youtube.ts](lib/youtube.ts)):

| 모드 | 조건 | 결과 |
|---|---|---|
| **Data API** | `.env.local`에 `YOUTUBE_API_KEY` 설정 | 채널의 **503편+ 전부** 가져옴 (페이지네이션) |
| **RSS 폴백** | 키 없음 또는 API 실패 | YouTube 공식 RSS로 **최근 15편** |

키 없이도 즉시 동작합니다 (RSS). 전체 영상을 띄우고 싶다면:

1. [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com) → 새 프로젝트 → YouTube Data API v3 사용 설정
2. **사용자 인증 정보 → API 키 만들기**
3. `.env.local`의 `# YOUTUBE_API_KEY=` 줄에서 `#`을 지우고 키 붙여넣기
4. dev 서버 재시작

quota는 페이지 1회 로드에 약 12 단위, 일일 무료 할당량 10,000 단위 → 사실상 무료입니다. 또한 모든 fetch는 1시간 ISR 캐시(`revalidate: 3600`) 적용으로 트래픽 부담 거의 없습니다.

## 관리자 계정

기본 계정은 `.env.local` 에 정의되어 있습니다:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cheeze2017!
SESSION_SECRET=...
```

운영 환경에서는 반드시 `ADMIN_PASSWORD`와 `SESSION_SECRET`을 새 값으로 바꿔주세요.

관리자 페이지 진입은 푸터 우측 하단의 “관리자” 링크 또는 `http://localhost:3000/admin/login` 으로 가능합니다.

## 디렉터리 구조

```
app/
  page.tsx                  — 메인 페이지
  videos/
    page.tsx                — 전체 영상 목록 (RSS / Data API)
    VideoGrid.tsx           — 그리드 + 검색 + 임베드 모달
  members/
    page.tsx                — 멤버 폴라로이드 게시판
  support/
    page.tsx                — 지원하기 (탭 컨테이너)
    SupportTabs.tsx         — 오디션/응원 탭 전환
    AuditionForm.tsx        — 오디션 폼
    FanForm.tsx             — 응원 메시지 폼
  admin/
    login/page.tsx          — 관리자 로그인
    page.tsx                — 대시보드
    AdminActions.tsx        — 상태 변경/삭제 버튼
    LogoutButton.tsx        — 로그아웃
  api/
    auditions/              — 공개 오디션 접수 POST
    fan-messages/           — 공개 응원 접수 POST
    admin/login             — 로그인 POST
    admin/logout            — 로그아웃 POST
    admin/auditions/[id]    — 상태변경 PATCH / 삭제 DELETE (인증 필요)
    admin/fan-messages/[id] — 읽음토글 PATCH / 삭제 DELETE (인증 필요)
components/
  SiteHeader.tsx            — 공통 헤더
  SiteFooter.tsx            — 공통 푸터
lib/
  db.ts                     — SQLite 연결 + 스키마
  auth.ts                   — JWT 세션 쿠키 헬퍼
  youtube.ts                — YT Data API / RSS 페치 + 1h ISR
  members.ts                — 멤버 데이터 + 액센트 컬러 매핑
data/                       — SQLite 파일 저장소 (gitignore)
```

## API 요약

| Method | Path                              | 인증 | 설명 |
|--------|-----------------------------------|------|------|
| POST   | `/api/auditions`                  | ✗    | 오디션 지원 접수 |
| POST   | `/api/fan-messages`               | ✗    | 응원 메시지 접수 |
| POST   | `/api/admin/login`                | ✗    | 로그인 |
| POST   | `/api/admin/logout`               | ✓    | 로그아웃 |
| PATCH  | `/api/admin/auditions/[id]`       | ✓    | 상태 변경 (`pending`/`reviewing`/`accepted`/`rejected`) |
| DELETE | `/api/admin/auditions/[id]`       | ✓    | 오디션 삭제 |
| PATCH  | `/api/admin/fan-messages/[id]`    | ✓    | 읽음 토글 (`{is_read: boolean}`) |
| DELETE | `/api/admin/fan-messages/[id]`    | ✓    | 응원 삭제 |

## 데이터 모델

```sql
auditions(
  id, name, age, gender, phone, email, experience,
  role_preference, intro, portfolio_url, status, created_at
)

fan_messages(
  id, nickname, email, favorite_work, message, is_read, created_at
)
```

## Disclaimer

본 사이트는 치즈필름 채널을 좋아하는 팬 프로젝트로 만든 데모이며, 공식 제작사 (주)스튜디오 치즈와 무관합니다. 채널의 모든 권리는 원 제작자에게 있습니다.
