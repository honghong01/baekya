import {
  db,
  collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc, getDoc,
  query, orderBy, limit, increment, serverTimestamp
} from "./firebase-config.js";

let boardName       = "";
let delDocId        = null;
let viewIncremented = false;
let allPosts        = [];   // Firestore에서 한 번 로드한 전체 목록
let filteredPosts   = [];   // 검색 필터 적용된 목록
let currentPage     = 1;

const PAGE_SIZE    = 10;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// ── 진입점 ───────────────────────────────────────────
export function initBoard(name) {
  boardName       = name;
  viewIncremented = false;

  window.reloadBoard = function () {
    const p = new URLSearchParams(location.search);
    if (p.get("mode") === "write" || p.get("mode") === "edit") return;
    if (p.get("id")) renderView(p.get("id"));
    else             loadList();
  };

  const p = new URLSearchParams(location.search);
  if      (p.get("mode") === "write")               renderWrite();
  else if (p.get("mode") === "edit" && p.get("id")) renderEdit(p.get("id"));
  else if (p.get("id"))                             renderView(p.get("id"));
  else                                              loadList();
}

// ── 띠배너 (최신 공지 3건) ────────────────────────────
export async function loadTicker(trackId) {
  const el = document.getElementById(trackId);
  if (!el) return;
  try {
    const snap = await getDocs(
      query(collection(db, "notice"), orderBy("createdAt", "desc"), limit(3))
    );
    if (!snap.docs.length) return;

    const singleHtml = snap.docs.map(d => {
      const p = d.data();
      return `<a href="board/notice?id=${d.id}">▸ ${esc(p.title)}</a>`;
    }).join("");

    el.style.animation = "none";
    el.innerHTML = singleHtml;

    setTimeout(() => {
      const singleW = el.scrollWidth;
      const viewW   = el.closest(".inner")?.offsetWidth || window.innerWidth;
      const copies  = Math.max(4, Math.ceil(viewW / singleW) + 2);
      el.innerHTML  = singleHtml.repeat(copies);
      el.style.setProperty("--ticker-end", `-${singleW}px`);
      const dur = Math.max(12, Math.round(singleW / 50));
      el.style.animation = `tickerRun ${dur}s linear infinite`;
    }, 0);
  } catch {}
}

// ── 홈 미리보기 ──────────────────────────────────────
export async function loadPreview(board, elId, tagCls, tagText) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const snap = await getDocs(
      query(collection(db, board), orderBy("createdAt", "desc"))
    );
    const docs = snap.docs.slice(0, 4);
    if (!docs.length) {
      el.innerHTML = '<li><span style="color:#aaa;font-size:12px">등록된 게시물이 없습니다.</span></li>';
      return;
    }
    el.innerHTML = docs.map(d => {
      const p  = d.data();
      const dt = p.createdAt
        ? p.createdAt.toDate().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(". ", ".")
        : "";
      const tag = tagText ? `<span class="tag ${tagCls}">${tagText}</span>` : "";
      return `<li><a href="board/${board}?id=${d.id}">${tag}${esc(p.title)}</a><span class="dt">${dt}</span></li>`;
    }).join("");
  } catch {}
}

// ── 목록 로드 (Firestore 1회 조회) ───────────────────
async function loadList() {
  const wrap = document.getElementById("boardWrap");
  if (!wrap) return;
  wrap.innerHTML = '<p style="padding:40px;text-align:center;color:#aaa">불러오는 중...</p>';

  try {
    const snap = await getDocs(
      query(collection(db, boardName), orderBy("createdAt", "desc"))
    );
    allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    wrap.innerHTML = `<p style="padding:30px;text-align:center;color:#c00">데이터를 불러오지 못했습니다.<br><small>${e.message}</small></p>`;
    return;
  }

  filteredPosts = allPosts;
  currentPage   = 1;

  const canWrite = boardName !== "notice" || window.__isAdmin;

  wrap.innerHTML = `
    <div class="board-ctrl">
      <div class="search-row">
        <input type="text" id="srchInput" placeholder="제목 또는 내용 검색..." style="width:200px">
        <button class="btn btn-navy btn-sm" onclick="doSearch()">검색</button>
        <button class="btn btn-gray btn-sm"  onclick="resetSearch()">초기화</button>
      </div>
      <div>
        ${canWrite
          ? `<button class="btn btn-yel btn-sm" onclick="goWrite()">✏ 글쓰기</button>`
          : `<span style="font-size:12px;color:#999">공지사항은 관리자만 작성합니다.</span>`}
      </div>
    </div>
    <table class="tbl">
      <thead><tr>
        <th style="width:48px">번호</th>
        <th>제목</th>
        <th style="width:88px">작성자</th>
        <th style="width:100px">날짜</th>
        <th style="width:52px">조회</th>
      </tr></thead>
      <tbody id="tblBody"></tbody>
    </table>
    <div id="pagingWrap"></div>`;

  renderTable();
}

// ── 테이블 + 페이징 렌더 (메모리 데이터 기반) ─────────
function renderTable() {
  const total      = filteredPosts.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  currentPage      = Math.max(1, Math.min(currentPage, totalPages));

  const start     = (currentPage - 1) * PAGE_SIZE;
  const pagePosts = filteredPosts.slice(start, start + PAGE_SIZE);

  const tbody      = document.getElementById("tblBody");
  const pagingWrap = document.getElementById("pagingWrap");
  if (!tbody || !pagingWrap) return;

  if (!total) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#aaa">게시물이 없습니다.</td></tr>`;
    pagingWrap.innerHTML = "";
    return;
  }

  const now = Date.now();
  tbody.innerHTML = pagePosts.map((p, i) => {
    const num = total - (start + i);
    let cls = "";
    if (boardName === "notice") {
      const ms = p.createdAt ? p.createdAt.toDate().getTime() : 0;
      if (now - ms < ONE_MONTH_MS) cls = ' class="notice-row"';
    }
    return `<tr${cls}>
      <td class="tdc">${num}</td>
      <td class="td-title"><a href="?id=${p.id}">${esc(p.title)}</a></td>
      <td class="tdc">${esc(p.author || "익명")}</td>
      <td class="tdc">${fmtDate(p.createdAt)}</td>
      <td class="tdc">${p.views || 0}</td>
    </tr>`;
  }).join("");

  pagingWrap.innerHTML = buildPaging(totalPages, currentPage);
}

// ── 페이징 HTML 생성 ──────────────────────────────────
function buildPaging(totalPages, current) {
  if (totalPages <= 1) return "";

  const WINDOW = 5;
  let s = Math.max(1, current - Math.floor(WINDOW / 2));
  let e = Math.min(totalPages, s + WINDOW - 1);
  if (e - s + 1 < WINDOW) s = Math.max(1, e - WINDOW + 1);

  let h = '<div class="paging">';
  if (current > 1)
    h += `<button onclick="goPage(${current - 1})">‹</button>`;
  if (s > 1) {
    h += `<button onclick="goPage(1)">1</button>`;
    if (s > 2) h += `<button class="paging-ellipsis" disabled>…</button>`;
  }
  for (let i = s; i <= e; i++)
    h += `<button class="${i === current ? "on" : ""}" onclick="goPage(${i})">${i}</button>`;
  if (e < totalPages) {
    if (e < totalPages - 1) h += `<button class="paging-ellipsis" disabled>…</button>`;
    h += `<button onclick="goPage(${totalPages})">${totalPages}</button>`;
  }
  if (current < totalPages)
    h += `<button onclick="goPage(${current + 1})">›</button>`;
  h += '</div>';
  return h;
}

window.goPage = function (page) {
  currentPage = page;
  renderTable();
  document.querySelector(".board-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── 검색 (메모리 필터) ────────────────────────────────
window.doSearch = function () {
  const q = (document.getElementById("srchInput")?.value || "").trim().toLowerCase();
  filteredPosts = !q
    ? allPosts
    : allPosts.filter(p =>
        (p.title   || "").toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q)
      );
  currentPage = 1;
  renderTable();
};

window.resetSearch = function () {
  const input = document.getElementById("srchInput");
  if (input) input.value = "";
  filteredPosts = allPosts;
  currentPage   = 1;
  renderTable();
};

// ── 상세 보기 ─────────────────────────────────────────
async function renderView(postId) {
  if (boardName === "seek" && !window.__isAdmin) {
    renderSeekGate(postId);
    return;
  }
  await _loadAndRenderPost(postId);
}

function renderSeekGate(postId) {
  const wrap = document.getElementById("boardWrap");
  wrap.innerHTML = `
    <div class="write-box">
      <p style="font-size:14px;color:#555;margin-bottom:18px">
        구직게시판 상세는 작성자 본인 또는 관리자만 조회할 수 있습니다.<br>
        게시물 등록 시 입력한 비밀번호를 입력해주세요.
      </p>
      <div class="fr">
        <label>비밀번호</label>
        <input type="password" id="seekViewPw" placeholder="게시물 비밀번호" style="max-width:200px">
      </div>
      <p class="err-msg" id="seekViewErr" style="display:none">비밀번호가 틀렸습니다.</p>
      <div class="form-btns">
        <button class="btn btn-navy" onclick="confirmSeekView('${postId}')">확인</button>
        <button class="btn btn-gray" onclick="location.href=location.pathname">목록으로</button>
      </div>
    </div>`;
  setTimeout(() => {
    document.getElementById("seekViewPw")?.addEventListener("keydown", e => {
      if (e.key === "Enter") window.confirmSeekView(postId);
    });
  }, 0);
}

window.confirmSeekView = async function (postId) {
  const pw    = document.getElementById("seekViewPw")?.value || "";
  const errEl = document.getElementById("seekViewErr");
  if (errEl) errEl.style.display = "none";
  try {
    const ref  = doc(db, boardName, postId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().password !== pw) {
      if (errEl) errEl.style.display = "block";
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    if (!viewIncremented) {
      viewIncremented = true;
      updateDoc(ref, { views: increment(1) }).catch(() => {});
    }
    _renderPostContent(p);
  } catch (e) {
    alert("오류: " + e.message);
  }
};

async function _loadAndRenderPost(postId) {
  const wrap = document.getElementById("boardWrap");
  wrap.innerHTML = '<p style="padding:40px;text-align:center;color:#aaa">불러오는 중...</p>';
  try {
    const ref  = doc(db, boardName, postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      wrap.innerHTML = "<p style='padding:30px;color:#c00'>게시물을 찾을 수 없습니다.</p>";
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    if (!viewIncremented) {
      viewIncremented = true;
      updateDoc(ref, { views: increment(1) }).catch(() => {});
    }
    _renderPostContent(p);
  } catch (e) {
    wrap.innerHTML = `<p style="padding:30px;color:#c00">불러오기 실패: ${e.message}</p>`;
  }
}

function _renderPostContent(p) {
  const wrap     = document.getElementById("boardWrap");
  const isAdmin  = window.__isAdmin;
  const canDel   = isAdmin || boardName !== "notice";
  const canEdit  = isAdmin && boardName === "notice";
  const canWrite = boardName !== "notice" || isAdmin;

  wrap.innerHTML = `
    <div class="post-box">
      <div class="post-hd">
        <h2>${esc(p.title)}</h2>
        <div class="post-meta">
          <span>작성자: ${esc(p.author || "익명")}</span>
          <span>날짜: ${fmtDate(p.createdAt)}</span>
          <span>조회: ${(p.views || 0) + 1}</span>
        </div>
      </div>
      <div class="post-body">${esc(p.content)}</div>
      <div class="post-ft">
        <button class="btn btn-gray btn-sm" onclick="location.href=location.pathname">목록</button>
        ${canEdit  ? `<button class="btn btn-yel  btn-sm" onclick="goEdit('${p.id}')">수정</button>` : ""}
        ${canDel   ? `<button class="btn btn-red  btn-sm" onclick="openDelModal('${p.id}')">삭제</button>` : ""}
        ${canWrite ? `<button class="btn btn-navy btn-sm" onclick="goWrite()">글쓰기</button>` : ""}
      </div>
    </div>`;
}

// ── 수정 폼 (공지 관리자 전용) ────────────────────────
async function renderEdit(postId) {
  const wrap = document.getElementById("boardWrap");
  wrap.innerHTML = '<p style="padding:40px;text-align:center;color:#aaa">불러오는 중...</p>';

  try {
    const snap = await getDoc(doc(db, boardName, postId));
    if (!snap.exists()) {
      wrap.innerHTML = "<p style='padding:30px;color:#c00'>게시물을 찾을 수 없습니다.</p>";
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    wrap.innerHTML = `
      <div class="write-box">
        <div class="fr">
          <label>제목 <span style="color:red">*</span></label>
          <input type="text" id="wTitle" value="${esc(p.title)}">
        </div>
        <div class="fr">
          <label>작성자</label>
          <input type="text" id="wAuthor" value="${esc(p.author || "")}" style="max-width:200px">
        </div>
        <div class="fr">
          <label>내용 <span style="color:red">*</span></label>
          <textarea id="wContent">${esc(p.content)}</textarea>
        </div>
        <div class="form-btns">
          <button class="btn btn-yel"  onclick="submitEdit('${postId}')">수정 완료</button>
          <button class="btn btn-gray" onclick="location.href='?id=${postId}'">취소</button>
        </div>
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<p style="padding:30px;color:#c00">불러오기 실패: ${e.message}</p>`;
  }
}

// ── 글쓰기 폼 ─────────────────────────────────────────
function renderWrite() {
  const wrap = document.getElementById("boardWrap");
  wrap.innerHTML = `
    <div class="write-box">
      <div class="fr">
        <label>제목 <span style="color:red">*</span></label>
        <input type="text" id="wTitle" placeholder="제목을 입력하세요">
      </div>
      <div class="fr">
        <label>작성자</label>
        <input type="text" id="wAuthor" placeholder="닉네임 또는 이름" style="max-width:200px">
      </div>
      ${boardName !== "notice" ? `
      <div class="fr">
        <label>비밀번호 <span style="color:red">*</span></label>
        <input type="password" id="wPw" placeholder="삭제 시 필요한 비밀번호" style="max-width:200px">
        <div class="hint">게시물 삭제 시 이 비밀번호가 필요합니다.</div>
      </div>` : ""}
      <div class="fr">
        <label>내용 <span style="color:red">*</span></label>
        <textarea id="wContent" placeholder="내용을 입력하세요..."></textarea>
      </div>
      <div class="form-btns">
        <button class="btn btn-yel"  onclick="submitPost()">등록</button>
        <button class="btn btn-gray" onclick="location.href=location.pathname">취소</button>
      </div>
    </div>`;
}

// ── 등록 ─────────────────────────────────────────────
window.submitPost = async function () {
  const title   = document.getElementById("wTitle")?.value.trim();
  const author  = document.getElementById("wAuthor")?.value.trim() || "익명";
  const content = document.getElementById("wContent")?.value.trim();
  const pw      = document.getElementById("wPw")?.value || "";

  if (!title)   { alert("제목을 입력해주세요."); return; }
  if (!content) { alert("내용을 입력해주세요."); return; }
  if (boardName !== "notice" && !pw) { alert("비밀번호를 입력해주세요."); return; }

  try {
    await addDoc(collection(db, boardName), {
      title, author, content, password: pw,
      createdAt: serverTimestamp(), views: 0,
    });
    alert("등록되었습니다.");
    location.href = location.pathname;
  } catch (e) {
    alert("등록 실패: " + e.message);
  }
};

// ── 수정 (공지 관리자 전용) ───────────────────────────
window.submitEdit = async function (postId) {
  const title   = document.getElementById("wTitle")?.value.trim();
  const author  = document.getElementById("wAuthor")?.value.trim() || "익명";
  const content = document.getElementById("wContent")?.value.trim();

  if (!title)   { alert("제목을 입력해주세요."); return; }
  if (!content) { alert("내용을 입력해주세요."); return; }

  try {
    await updateDoc(doc(db, boardName, postId), { title, author, content });
    alert("수정되었습니다.");
    location.href = `?id=${postId}`;
  } catch (e) {
    alert("수정 실패: " + e.message);
  }
};

// ── 삭제 모달 ─────────────────────────────────────────
window.openDelModal = function (id) {
  delDocId = id;
  const pwInput = document.getElementById("delPwInput");
  const errEl   = document.getElementById("delErr");
  if (pwInput) pwInput.value = "";
  if (errEl)   errEl.style.display = "none";
  document.getElementById("modalDel")?.classList.add("open");
};

window.confirmDelete = async function () {
  const input = document.getElementById("delPwInput")?.value || "";
  const errEl = document.getElementById("delErr");
  try {
    if (window.__isAdmin) {
      await deleteDoc(doc(db, boardName, delDocId));
    } else {
      const snap = await getDoc(doc(db, boardName, delDocId));
      if (!snap.exists() || snap.data().password !== input) {
        if (errEl) errEl.style.display = "block";
        return;
      }
      await deleteDoc(doc(db, boardName, delDocId));
    }
    window.closeModal("modalDel");
    alert("삭제되었습니다.");
    location.href = location.pathname;
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
};

window.goWrite = function () { location.href = "?mode=write"; };
window.goEdit  = function (id) { location.href = `?mode=edit&id=${id}`; };

// ── 유틸 ─────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return "";
  const d = val.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".").replace(/\.$/, "");
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
