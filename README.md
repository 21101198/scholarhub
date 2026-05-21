# ScholarHub 🎓

논문 아이디어 공유 & 피드백 커뮤니티 플랫폼

## 기술 스택
- **Frontend**: React 18 + Vite
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI 리뷰**: Anthropic Claude API
- **배포**: Vercel (무료)

---

## 🚀 시작하기 (Step by Step)

### Step 1 — Supabase 설정

1. https://supabase.com 에서 무료 계정 생성
2. "New Project" 클릭 → 프로젝트 이름 입력 (예: scholarhub)
3. 프로젝트가 생성되면 **Settings → API** 에서:
   - `Project URL` 복사
   - `anon public key` 복사
4. **SQL Editor** 탭 클릭 → `supabase/schema.sql` 내용 전체 붙여넣기 → **Run**

### Step 2 — 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 채워넣으세요:

```
VITE_SUPABASE_URL=https://여기에붙여넣기.supabase.co
VITE_SUPABASE_ANON_KEY=여기에붙여넣기
VITE_ANTHROPIC_API_KEY=sk-ant-여기에붙여넣기
```

> Anthropic API Key는 https://console.anthropic.com 에서 발급받으세요.

### Step 3 — 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 열기

---

## 🌐 Vercel 배포

1. 이 프로젝트를 GitHub에 올리기
2. https://vercel.com 에서 GitHub 연결 → 이 repo import
3. Environment Variables에 `.env` 값들 똑같이 입력
4. Deploy 클릭 → 자동으로 URL 발급!

---

## 📁 파일 구조

```
scholarhub/
├── supabase/
│   └── schema.sql          ← DB 테이블 & 권한 설정
├── src/
│   ├── lib/
│   │   └── supabase.js     ← Supabase 클라이언트
│   ├── components/
│   │   └── PaperCard.jsx   ← 논문 카드 컴포넌트
│   ├── pages/
│   │   ├── AuthPage.jsx    ← 로그인/회원가입
│   │   ├── HomePage.jsx    ← 메인 페이지
│   │   ├── CommunityPage.jsx
│   │   ├── MyResearchPage.jsx
│   │   ├── PaperDetailPage.jsx  ← 논문 상세 + 피드백
│   │   ├── NewPaperPage.jsx
│   │   ├── EditPaperPage.jsx
│   │   └── ProfilePage.jsx
│   ├── App.jsx             ← 라우팅 + Auth Context
│   ├── main.jsx
│   └── index.css
├── .env.example
├── package.json
└── vite.config.js
```

---

## 🛠 주요 기능

| 기능 | 설명 |
|------|------|
| 회원가입/로그인 | 이메일 기반 인증 (Supabase Auth) |
| 논문 게시 | 제목, 초록, 수식, 태그 |
| 수식 지원 | Mathematical Formulations 섹션 |
| 버전 히스토리 | v0.1, v1.0 등 업데이트 추적 |
| 피드백 | 커뮤니티 댓글 시스템 |
| AI 리뷰 | Claude API로 자동 학술 리뷰 생성 |
| 검색 & 필터 | 제목, 태그 검색 + 타입 필터 |
| 프로필 | 이름, 소속, 바이오 |
