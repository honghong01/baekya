import {
  auth, db, doc, getDoc, setDoc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "./firebase-config.js";

const SEEK_FORM_FALLBACK = "https://forms.gle/CSUyQMa4xkFU2qcT7";

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
      if (href === cur || (cur.endsWith("/") && href === cur + "index"))
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

// ── 구직신청서 URL — Firestore 로드 및 적용 ──────────
function applySeekFormUrl(url) {
  document.querySelectorAll("[data-seek-form]").forEach(el => { el.href = url; });
}

async function initSeekFormUrl() {
  let url = SEEK_FORM_FALLBACK;
  try {
    const snap = await getDoc(doc(db, "settings", "config"));
    if (snap.exists() && snap.data().seekFormUrl) {
      url = snap.data().seekFormUrl;
    }
  } catch {}
  applySeekFormUrl(url);
  window.__seekFormUrl = url;
}

window.saveSeekFormUrl = async function () {
  const url = document.getElementById("seekFormInput")?.value.trim();
  if (!url) return;
  try {
    await setDoc(doc(db, "settings", "config"), { seekFormUrl: url }, { merge: true });
    window.__seekFormUrl = url;
    applySeekFormUrl(url);
    window.closeModal("modalSeekUrl");
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};

// ── 관리자 전용 UI 주입/제거 ─────────────────────────
function injectAdminUI() {
  // URL 설정 버튼
  if (!document.getElementById("seekUrlBtn")) {
    const btn = document.createElement("button");
    btn.id        = "seekUrlBtn";
    btn.className = "admin-btn logged";
    btn.style.cssText = "margin-left:6px";
    btn.textContent   = "URL 설정";
    btn.onclick = openSeekUrlModal;
    document.getElementById("adminBtn")?.insertAdjacentElement("afterend", btn);
  }

  // 구직폼 URL 설정 모달
  if (!document.getElementById("modalSeekUrl")) {
    const modal = document.createElement("div");
    modal.className = "modal-bg";
    modal.id        = "modalSeekUrl";
    modal.innerHTML = `
      <div class="modal">
        <h3>🔗 구직신청서 URL 설정</h3>
        <p style="font-size:12px;color:#888;margin-bottom:12px">저장하면 전체 사이트에 즉시 반영됩니다.</p>
        <div class="fr">
          <label>구글폼 URL</label>
          <input type="url" id="seekFormInput" placeholder="https://forms.gle/...">
        </div>
        <div class="form-btns">
          <button class="btn btn-navy" onclick="saveSeekFormUrl()">저장</button>
          <button class="btn btn-gray" onclick="closeModal('modalSeekUrl')">취소</button>
        </div>
      </div>`;
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
    document.body.appendChild(modal);
  }
}

function removeAdminUI() {
  document.getElementById("seekUrlBtn")?.remove();
  document.getElementById("modalSeekUrl")?.remove();
}

function openSeekUrlModal() {
  const input = document.getElementById("seekFormInput");
  if (input) input.value = window.__seekFormUrl || "";
  document.getElementById("modalSeekUrl")?.classList.add("open");
}

// ── 인증 상태 감지 ────────────────────────────────────
onAuthStateChanged(auth, user => {
  window.__isAdmin = !!user;
  updateAdminBtn(!!user);
  if (user) injectAdminUI(); else removeAdminUI();
  if (typeof window.reloadBoard === "function") window.reloadBoard();
});

// 페이지 로드 시 구직폼 URL 적용
initSeekFormUrl();
