# 🏛️ GovDoc AI — Vercel 배포 가이드

Claude AI 기반 정부사업 문서 자동생성 시스템 (사업계획서 + 사업결과보고서)

---

## 📁 폴더 구조

```
govdoc-vercel/
├── api/
│   └── generate-content.js   ← Serverless API (Claude 호출)
├── public/
│   └── index.html            ← 프론트엔드 전체
├── package.json
├── vercel.json               ← 라우팅 설정
└── README.md
```

---

## 🚀 배포 방법 (5분 완성)

### 1단계 — GitHub에 업로드

1. [github.com](https://github.com) 접속 → **New repository** 클릭
2. 저장소 이름: `govdoc-ai` (Public 또는 Private 모두 가능)
3. 이 폴더의 파일 전체를 업로드

```bash
# 또는 Git CLI 사용
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_ID/govdoc-ai.git
git push -u origin main
```

### 2단계 — Vercel에 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. **Add New → Project** 클릭
3. `govdoc-ai` 저장소 선택 → **Import**
4. 설정은 그대로 두고 **Deploy** 클릭
5. 약 1~2분 후 배포 완료 → `https://govdoc-ai-xxxx.vercel.app` URL 생성

### 3단계 — API 키 설정 (필수!)

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings → Environment Variables**
3. 아래 환경변수 추가:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (Anthropic 콘솔에서 발급) |

4. **Save** 후 **Redeploy** (Deployments 탭에서 최신 배포 → ⋯ → Redeploy)

---

## 🔑 Anthropic API 키 발급

1. [console.anthropic.com](https://console.anthropic.com) 접속
2. 로그인 → **API Keys** → **Create Key**
3. 생성된 키(`sk-ant-...`)를 Vercel 환경변수에 입력

---

## ✅ 완료 후 확인

배포된 URL에 접속하면:
- 사업 정보 입력 폼
- AI 생성 버튼 클릭 → Claude가 내용 자동 작성
- 사업계획서 + 사업결과보고서 DOCX 2종 다운로드

---

## 🔧 로컬 테스트 방법

```bash
npm install -g vercel
vercel dev
# → http://localhost:3000
```

환경변수는 `.env.local` 파일 생성:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## 📄 생성 문서 규격

- 용지: A4 (맑은 고딕)
- 네이비/블루 공식 정부 양식
- 표지 → 목차 → 본문 (Ⅰ~Ⅷ 섹션)
- KPI 표 · 예산 표 · 추진단계 표 · 성과 요약 박스
- 헤더(문서명+기관) / 푸터(사업명+날짜)
