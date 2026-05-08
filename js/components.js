// js/components.js — 헤더/푸터 직접 임베드 방식
// fetch 불필요 → CORS/경로 문제 없음
// 루트 페이지:  <script type="module" src="js/components.js">
// board/ 하위: <script type="module" src="../js/components.js">

import {
  auth,
  adminLogin  as fbLogin,
  adminLogout as fbLogout,
  onAuthStateChanged
} from "./firebase-config.js";

// ── 깊이 계산 ─────────────────────────────────────
// board/ 하위면 "../", 루트면 "./"
export const depth = location.pathname.includes("/board/") ? "../" : "./";

// ── 경로 보정 ─────────────────────────────────────
function fixPaths(html) {
  if (depth === "./") return html;
  return html
    .replace(/href="board\//g,  `href="${depth}board/`)
    .replace(/href="((?!https?:|#|\.\.\/)([\w-]+\(?:#[\w-]*)?))">/g,
             `href="${depth}$1">`)
    .replace(/href="((?!https?:|#|\.\.\/)([\w-]+\(?:#[\w-]*)?))"/g,
             `href="${depth}$1"`);
}

// ── 헤더 HTML ─────────────────────────────────────
const HEADER_HTML = `<div id="topbar">
  <div class="inner">
    <div class="contacts">
      <span>대표번호: 02-2212-1470</span>
      <span>휴대폰: 010-4496-1470</span>
      <span>이메일: baekya@example.com</span>
      <span>24시간 상담가능</span>
    </div>
    <button class="admin-btn" id="adminBtn" onclick="handleAdminBtn()">관리자</button>
  </div>
</div>

<div id="gnb">
  <div class="gnb-inner">
    <a href="index" class="gnb-logo">
      <div class="gnb-logo-icon">⚡</div>
      <div>
        <div class="gnb-logo-name">백야전기인력</div>
        <div class="gnb-logo-sub">BAEKYA ELECTRIC MANPOWER SERVICE</div>
      </div>
    </a>
    <nav class="gnb-nav">
      <div class="gnb-item"><a href="index">홈</a></div>
      <div class="gnb-item">
        <a href="about">회사소개</a>
        <div class="gnb-drop">
          <a href="about#intro">회사소개</a>
          <a href="about#map">찾아오시는 길</a>
        </div>
      </div>
      <div class="gnb-item">
        <a href="services">사업분야</a>
        <div class="gnb-drop">
          <a href="services#elec">전기공사 인력</a>
          <a href="services#maint">설비 유지보수</a>
          <a href="services#fire">소방·약전</a>
          <a href="services#daily">일용 인력</a>
        </div>
      </div>
      <div class="gnb-item"><a href="board/notice">공지사항</a></div>
      <div class="gnb-item">
        <a href="board/hire">게시판</a>
        <div class="gnb-drop">
          <a href="board/hire">구인게시판</a>
          <a href="https://forms.gle/jNWDwzVnz3oYfKhf7">구직신청서</a>
          <a href="board/free">자유게시판</a>
        </div>
      </div>
    </nav>
    <div class="gnb-ham" onclick="toggleMobileNav()">
      <span></span><span></span><span></span>
    </div>
  </div>
  <div class="gnb-mobile-nav" id="mobileNav">
    <a href="index">홈</a>
    <a href="about">회사소개</a>
    <a href="services">사업분야</a>
    <a href="board/notice">공지사항</a>
    <a href="board/hire">구인게시판</a>
    <a href="https://forms.gle/jNWDwzVnz3oYfKhf7">구직신청서</a>
    <a href="board/free">자유게시판</a>
  </div>
</div>`;

// ── 푸터 HTML ─────────────────────────────────────
const FOOTER_HTML = `<footer>
  <div class="wrap">
    <div>
      <div class="ft-name">백야전기인력</div>
      <div class="ft-sub">BAEKYA ELECTRIC MANPOWER SERVICE</div>
      <p>
        사업자등록번호: 000-00-00000<br>
        직업소개등록번호: 2026-3030135-14-5-00002호<br>
        주소: 서울특별시 OO구 OO로 00<br>
        대표번호: 02-2212-1470<br>
        이메일: baekya@example.com
      </p>
    </div>
    <div>
      <h4>바로가기</h4>
      <ul>
        <li><a href="index">홈</a></li>
        <li><a href="about">회사소개</a></li>
        <li><a href="services">사업분야</a></li>
        <li><a href="board/notice">공지사항</a></li>
        <li><a href="board/hire">구인게시판</a></li>
        <li><a href="https://forms.gle/jNWDwzVnz3oYfKhf7">구직신청서</a></li>
        <li><a href="board/free">자유게시판</a></li>
      </ul>
    </div>
    <div>
      <h4>이용안내</h4>
      <ul>
        <li>24시간 상담가능</li>
        <li>게시판 비회원 작성 가능</li>
        <li>공지사항은 관리자 전용</li>
      </ul>
    </div>
  </div>
</footer>
<div class="ft-copy">Copyright © 2025 백야전기인력. All rights reserved.</div>


<div class="modal-bg" id="modalAdmin">
  <div class="modal">
    <h3>🔐 관리자 로그인</h3>
    <div class="fr"><label>이메일</label><input type="email" id="adminEmail" placeholder="관리자 이메일"></div>
    <div class="fr"><label>비밀번호</label><input type="password" id="adminPw" placeholder="비밀번호"></div>
    <p class="err-msg" id="adminErr">이메일 또는 비밀번호가 틀렸습니다.</p>
    <div class="form-btns">
      <button class="btn btn-navy" onclick="doAdminLogin()">로그인</button>
      <button class="btn btn-gray" onclick="closeModal('modalAdmin')">취소</button>
    </div>
  </div>
</div>


<div class="modal-bg" id="modalDel">
  <div class="modal">
    <h3>🗑 게시물 삭제</h3>
    <p style="font-size:13px;color:#666;margin-bottom:14px">작성 시 입력한 비밀번호를 입력하세요.</p>
    <div class="fr"><label>비밀번호</label><input type="password" id="delPwInput" placeholder="비밀번호"></div>
    <p class="err-msg" id="delErr">비밀번호가 틀렸습니다.</p>
    <div class="form-btns">
      <button class="btn btn-red" onclick="confirmDelete()">삭제</button>
      <button class="btn btn-gray" onclick="closeModal('modalDel')">취소</button>
    </div>
  </div>
</div>`;

// ── 주입 ─────────────────────────────────────────
function inject(selector, html) {
  const el = document.querySelector(selector);
  if (el) el.innerHTML = fixPaths(html);
}

// ── nav 강조 ──────────────────────────────────────
function highlightNav() {
  const cur = location.pathname;
  document.querySelectorAll("nav .nav-item > a, .mobile-nav a").forEach(a => {
    try {
      const href = new URL(a.getAttribute("href") || "", location.href).pathname;
      if (href === cur || (cur.endsWith("/") && href === cur + "index"))
        a.classList.add("on");
    } catch {}
  });
}

// ── 관리자 버튼 갱신 ─────────────────────────────
function updateAdminBtn() {
  const btn = document.getElementById("adminBtn");
  if (!btn) return;
  if (window.__adminLoggedIn) {
    btn.textContent = "관리자 ✓";
    btn.classList.add("logged");
  } else {
    btn.textContent = "관리자";
    btn.classList.remove("logged");
  }
}

// ── 모바일 메뉴 ──────────────────────────────────
window.toggleMobileNav = function () {
  document.getElementById("mobileNav")?.classList.toggle("open");
};

// ── 관리자 로그인/로그아웃 ───────────────────────
window.handleAdminBtn = function () {
  if (window.__adminLoggedIn) {
    if (confirm("관리자 로그아웃 하시겠습니까?")) fbLogout();
  } else {
    document.getElementById("adminEmail").value = "";
    document.getElementById("adminPw").value    = "";
    document.getElementById("adminErr").style.display = "none";
    document.getElementById("modalAdmin").classList.add("open");
  }
};

window.doAdminLogin = async function () {
  const email = document.getElementById("adminEmail")?.value.trim();
  const pw    = document.getElementById("adminPw")?.value;
  try {
    await fbLogin(email, pw);
    closeModal("modalAdmin");
  } catch {
    document.getElementById("adminErr").style.display = "block";
  }
};

// 로그인 상태 감지
onAuthStateChanged(auth, user => {
  window.__adminLoggedIn = !!user;
  updateAdminBtn();
  if (typeof window.reloadBoard === "function") window.reloadBoard();
});

// ── 모달 닫기 ─────────────────────────────────────
window.closeModal = function (id) {
  document.getElementById(id)?.classList.remove("open");
};

function setupModals() {
  document.querySelectorAll(".modal-bg").forEach(bg => {
    bg.addEventListener("click", e => {
      if (e.target === bg) bg.classList.remove("open");
    });
  });
}

// ── 티커 무한루프 ─────────────────────────────────
function setupTicker() {
  const track = document.getElementById("tickerTrack");
  if (!track) return;
  track.innerHTML += track.innerHTML;
}

// ── 진입점 ────────────────────────────────────────
// DOMContentLoaded 보장 (type="module"은 defer와 동일하지만 명시적으로 보장)
function init() {
  inject("#header-placeholder", HEADER_HTML);
  inject("#footer-placeholder", FOOTER_HTML);
  highlightNav();
  setupModals();
  setupTicker();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
