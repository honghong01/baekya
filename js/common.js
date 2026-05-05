import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase-config.js";

// ── 모바일 메뉴 ───────────────────────────────────────
window.toggleMobileNav = function () {
  document.getElementById("mobileNav")?.classList.toggle("open");
};

// ── 모달 닫기 ─────────────────────────────────────────
window.closeModal = function (id) {
  document.getElementById(id)?.classList.remove("open");
};
document.querySelectorAll(".modal-bg").forEach(bg => {
  bg.addEventListener("click", e => { if (e.target === bg) bg.classList.remove("open"); });
});

// ── GNB 현재 페이지 강조 ──────────────────────────────
(function () {
  const cur = location.pathname;
  document.querySelectorAll(".gnb-nav .gnb-item > a").forEach(a => {
    try {
      const href = new URL(a.getAttribute("href") || "", location.href).pathname;
      if (href === cur || (cur.endsWith("/") && href === cur + "index.html"))
        a.classList.add("on");
    } catch {}
  });
})();

// ── 티커 무한루프 ─────────────────────────────────────
const tickerTrack = document.getElementById("tickerTrack");
if (tickerTrack) tickerTrack.innerHTML += tickerTrack.innerHTML;

// ── 관리자 버튼 상태 갱신 ────────────────────────────
function updateAdminBtn(isAdmin) {
  const btn = document.getElementById("adminBtn");
  if (!btn) return;
  btn.textContent = isAdmin ? "관리자 ✓" : "관리자";
  isAdmin ? btn.classList.add("logged") : btn.classList.remove("logged");
}

// ── 관리자 로그인/로그아웃 ───────────────────────────
window.handleAdminBtn = function () {
  if (window.__isAdmin) {
    if (confirm("관리자 로그아웃 하시겠습니까?")) signOut(auth);
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
    await signInWithEmailAndPassword(auth, email, pw);
    window.closeModal("modalAdmin");
  } catch {
    document.getElementById("adminErr").style.display = "block";
  }
};

// ── 인증 상태 감지 ────────────────────────────────────
// window.__isAdmin 을 전역으로 공유해 board.js에서 참조
onAuthStateChanged(auth, user => {
  window.__isAdmin = !!user;
  updateAdminBtn(!!user);
  if (typeof window.reloadBoard === "function") window.reloadBoard();
});
