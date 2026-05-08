# 백야전기인력 홈페이지 템플릿

멀티 HTML + Firestore + GitHub Pages 기반의 전기인력 알선 회사 홈페이지 템플릿입니다.

---

## 디자인 3종

| 테마 | 컨셉 | 색상 |
|------|------|------|
| **theme-a** | 산업 네이비/옐로우 — 중후한 산업 신뢰감 | 네이비 + 노랑 |
| **theme-b** | 올드스쿨 레트로 — 2000년대 포털 느낌 | 베이지 + 적갈색 |
| **theme-c** | 모노크롬 미니멀 — 신문·잡지 레이아웃 | 흰색 + 검정 + 오렌지 |

---

## 파일 구조 (테마별 동일)

```
theme-x/
├── index          # 홈
├── about          # 회사소개
├── services       # 사업분야
├── 404            # 없는 경로 처리
├── board/
│   ├── notice     # 공지사항 (관리자 전용 작성)
│   ├── hire       # 구인게시판
│   ├── seek       # 구직신청서
│   └── free       # 자유게시판
├── components/
│   ├── header     # 공통 헤더 (fetch로 삽입)
│   └── footer     # 공통 푸터 + 모달
├── css/
│   └── style.css       # 전체 스타일
└── js/
    ├── firebase-config.js  # ★ Firebase 설정 (반드시 수정)
    ├── components.js       # 헤더/푸터 주입 + 공통 기능
    └── board.js            # 게시판 CRUD 로직
```

---

## 1단계: Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com) 접속
2. **새 프로젝트 생성** → 이름 입력 (예: `baekya-site`)
3. **Firestore Database** → 테스트 모드로 생성
4. **Authentication** → 이메일/비밀번호 로그인 활성화
5. Authentication → Users → **사용자 추가** (관리자 이메일/비밀번호 설정)
6. **프로젝트 설정** → 웹 앱 추가 → Firebase SDK 설정값 복사

---

## 2단계: firebase-config.js 수정

각 테마의 `js/firebase-config.js`를 열어 Firebase 콘솔에서 복사한 값으로 교체합니다.

```js
const firebaseConfig = {
  apiKey:            "실제-API-KEY",
  authDomain:        "프로젝트ID.firebaseapp.com",
  projectId:         "실제-프로젝트ID",
  storageBucket:     "프로젝트ID.appspot.com",
  messagingSenderId: "실제-SENDER-ID",
  appId:             "실제-APP-ID"
};
```

---

## 3단계: Firestore 보안 규칙 설정

Firebase 콘솔 → Firestore → **규칙** 탭에 아래 붙여넣기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 공지사항: 읽기 누구나, 쓰기/삭제 로그인 사용자만
    match /notice/{docId} {
      allow read: if true;
      allow write, delete: if request.auth != null;
    }

    // 구인/구직/자유게시판: 읽기/쓰기 누구나, 삭제는 로그인 OR 비밀번호 일치
    match /hire/{docId} {
      allow read, create: if true;
      allow delete: if request.auth != null
                    || resource.data.password == request.resource.data.password;
    }
    match /seek/{docId} {
      allow read, create: if true;
      allow delete: if request.auth != null
                    || resource.data.password == request.resource.data.password;
    }
    match /free/{docId} {
      allow read, create: if true;
      allow delete: if request.auth != null
                    || resource.data.password == request.resource.data.password;
    }
  }
}
```

> **참고**: 비밀번호는 Firestore에 평문 저장됩니다. 실명·연락처 등 민감 정보가 아닌 단순 게시물 삭제 용도이므로 일반적으로 허용 범위입니다. 보안을 강화하려면 Cloud Functions에서 검증하세요.

---

## 4단계: GitHub Pages 배포

```bash
# 원하는 테마 폴더를 레포 루트에 복사
cp -r theme-a/* ./

# Git 초기화 및 push
git init
git add .
git commit -m "init"
git remote add origin https://github.com/USERNAME/USERNAME.github.io.git
git push -u origin main
```

GitHub 레포 → Settings → Pages → Branch: `main` / `/ (root)` → Save

배포 URL: `https://USERNAME.github.io`

---

## 5단계: 회사 정보 변경

각 테마에서 아래 항목을 실제 정보로 교체하세요:

| 항목 | 변경 위치 |
|------|-----------|
| 대표번호 | `components/header`, `components/footer`, `index` |
| 이메일 | 동일 |
| 회사명/대표자/주소 등 | `about`, `footer` |
| SEO 도메인 | 각 HTML의 `<link rel="canonical">`, `<meta property="og:url">` |
| 통계 수치 (15년/1200명 등) | `index` hero 섹션 |

---

## URL 구조

| 페이지 | URL |
|--------|-----|
| 홈 | `/index` 또는 `/` |
| 회사소개 | `/about` |
| 사업분야 | `/services` |
| 공지사항 | `/board/notice` |
| 구인게시판 | `/board/hire` |
| 구직신청서 | `/https://forms.gle/jNWDwzVnz3oYfKhf7` |
| 자유게시판 | `/board/free` |
| 게시물 상세 | `/board/hire?id=DOCID` |
| 글쓰기 | `/board/hire?mode=write` |

---

## 기능 요약

- **비회원 글쓰기**: 구인/구직/자유게시판 — 비밀번호 입력 후 작성, 삭제 시 비밀번호 확인
- **공지사항**: Firebase Authentication 로그인한 관리자만 작성 가능
- **관리자 로그인**: 헤더 상단 `관리자` 버튼 → 이메일/비밀번호 입력
- **반응형**: 모바일 640px 이하에서 햄버거 메뉴 전환
- **SEO**: 페이지별 title/description/og태그/canonical 독립 설정
- **게시물 검색**: 클라이언트 사이드 제목+내용 필터링

---

## 커스텀 도메인 연결 (선택)

1. 레포 루트에 `CNAME` 파일 생성 → 내용: `yourdomain.com`
2. 도메인 DNS에서 `CNAME` 레코드 → `USERNAME.github.io`
3. Firebase 콘솔 → Authentication → Authorized domains → 도메인 추가
