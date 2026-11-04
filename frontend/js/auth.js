/* MyTickets - cua so dang nhap / dang ky (popup kieu ticketbox).
 *
 * Them 1 dong vao trang can dung, SAU api.js:
 *     <script src="js/auth.js"></script>
 * Bam vao link "Dang nhap" tren thanh dieu huong la popup hien ra ngay tren trang dang xem.
 * login.html / register.html la trang rieng, tu mo popup khi vao (dung khi bi chuyen huong tu trang can dang nhap).
 */
(function () {
  "use strict";

  // Chi cho quay lai cac trang .html trong cung thu muc, tranh bi dua sang trang la
  const NEXT_OK = /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_\-=&%.]*)?$/;
  const onAuthPage = /(^|\/)(login|register)\.html$/.test(location.pathname);

  function safeNext() {
    const n = new URLSearchParams(location.search).get("next");
    return n && NEXT_OK.test(n) ? n : "index.html";
  }

  // ---------- Nap CSS (khong can sua <head> cua trang) ----------
  (function loadCss() {
    const base = document.currentScript ? document.currentScript.src : location.href;
    const href = new URL("../css/auth.css", base).href;
    if (![...document.styleSheets].some((s) => s.href === href)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  })();

  // ---------- Hinh ----------
  const EYE = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  // Nhan vat ve (tu ve, khong dung hinh co san): tam ve vang co mat, vay tay
  const MASCOT = `
<svg class="am__mascot" viewBox="0 0 110 96" aria-hidden="true">
  <g transform="rotate(-7 55 60)">
    <path d="M86 56c8-4 14-12 15-22" fill="none" stroke="#FFD25E" stroke-width="9" stroke-linecap="round"/>
    <circle cx="101" cy="32" r="7.5" fill="#FFD25E"/>
    <rect x="14" y="26" width="76" height="62" rx="12" fill="#FFD25E"/>
    <circle cx="14" cy="57" r="8" fill="currentColor"/>
    <circle cx="90" cy="57" r="8" fill="currentColor"/>
    <path d="M70 32v50" stroke="#E0A92B" stroke-width="2.5" stroke-dasharray="5 5" stroke-linecap="round"/>
    <circle cx="35" cy="52" r="4" fill="#2B2B2B"/>
    <circle cx="55" cy="52" r="4" fill="#2B2B2B"/>
    <circle cx="28" cy="62" r="5" fill="#FF9FB2" opacity=".75"/>
    <circle cx="62" cy="62" r="5" fill="#FF9FB2" opacity=".75"/>
    <path d="M38 62q7 8 14 0" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;

  const CLOSE = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function pwField(id, placeholder, autocomplete) {
    return `<div class="am__field">
      <span class="am__pw">
        <input id="${id}" type="password" placeholder="${placeholder}" aria-label="${placeholder}" autocomplete="${autocomplete}">
        <button type="button" class="am__eye" aria-label="Hiện mật khẩu" aria-pressed="false">${EYE}</button>
      </span>
      <span class="am__err" id="${id}Err"></span>
    </div>`;
  }
  function textField(id, placeholder, opts) {
    const o = opts || {};
    return `<div class="am__field">
      <input id="${id}" type="${o.type || "text"}" placeholder="${placeholder}" aria-label="${placeholder}"
             autocomplete="${o.ac || "off"}"${o.inputmode ? ` inputmode="${o.inputmode}"` : ""} autocapitalize="none" spellcheck="false">
      <span class="am__err" id="${id}Err"></span>
    </div>`;
  }

  function template() {
    return `
<div class="am__backdrop" data-close></div>
<div class="am__dialog" role="dialog" aria-modal="true" aria-labelledby="amTitle">
  <header class="am__head">
    <h2 class="am__title" id="amTitle">Đăng nhập</h2>
    ${MASCOT}
    <button type="button" class="am__close" aria-label="Đóng" data-close>${CLOSE}</button>
  </header>
  <div class="am__body">
    <p class="am__msg" id="amMsg" role="alert" hidden></p>

    <form id="amLogin" novalidate>
      ${textField("amLUser", "Nhập tên đăng nhập", { ac: "username" })}
      ${pwField("amLPass", "Nhập mật khẩu", "current-password")}
      <button type="submit" class="am__submit" id="amLSubmit" disabled>Tiếp tục</button>
      <p class="am__switch">Chưa có tài khoản?<br><a href="register.html" data-mode="register">Tạo tài khoản ngay</a></p>
    </form>

    <form id="amRegister" novalidate hidden>
      ${textField("amRName", "Họ và tên", { ac: "name" })}
      ${textField("amREmail", "Email", { type: "email", ac: "email" })}
      ${textField("amRPhone", "Số điện thoại", { type: "tel", ac: "tel", inputmode: "tel" })}
      ${textField("amRUser", "Tên đăng nhập", { ac: "username" })}
      ${pwField("amRPass", "Mật khẩu (ít nhất 6 ký tự)", "new-password")}
      ${pwField("amRConfirm", "Nhập lại mật khẩu", "new-password")}
      <button type="submit" class="am__submit" id="amRSubmit" disabled>Tạo tài khoản</button>
      <p class="am__switch">Đã có tài khoản?<br><a href="login.html" data-mode="login">Đăng nhập</a></p>
    </form>

    <p class="am__fine">Mỗi tài khoản mua tối đa 2 vé cho mỗi sự kiện. Vé được giữ chỗ 15 phút sau khi đặt.</p>
  </div>
</div>`;
  }

  // ---------- Trang thai ----------
  let root = null, mode = "login", lastFocus = null;
  const $ = (id) => document.getElementById(id);

  function setErr(input, text) {
    input.setAttribute("aria-invalid", text ? "true" : "false");
    const e = $(input.id + "Err");
    if (e) e.textContent = text || "";
    return !text;
  }
  function showMsg(text) {
    const m = $("amMsg");
    m.textContent = text || "";
    m.hidden = !text;
  }
  function setBusy(btn, busy, text) {
    if (busy) btn.dataset.label = btn.textContent;
    btn.classList.toggle("is-busy", busy);
    btn.disabled = busy;
    btn.textContent = busy ? text : (btn.dataset.label || btn.textContent);
  }

  // Quy tac kiem tra: tra ve thong bao loi ("" neu hop le)
  function rules() {
    return {
      login: [
        [$("amLUser"), (v) => v.trim() ? "" : "Vui lòng nhập tên đăng nhập"],
        [$("amLPass"), (v) => v ? "" : "Vui lòng nhập mật khẩu"],
      ],
      register: [
        [$("amRName"), (v) => v.trim() ? "" : "Vui lòng nhập họ và tên"],
        [$("amREmail"), (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Email chưa đúng định dạng"],
        [$("amRPhone"), (v) => /^\+?[0-9 ]{9,15}$/.test(v.trim()) ? "" : "Số điện thoại chưa hợp lệ"],
        [$("amRUser"), (v) => /^\S{3,50}$/.test(v.trim()) ? "" : "Tên đăng nhập 3 đến 50 ký tự, không có khoảng trắng"],
        [$("amRPass"), (v) => v.length >= 6 ? "" : "Mật khẩu cần ít nhất 6 ký tự"],
        [$("amRConfirm"), (v) => v === $("amRPass").value ? "" : "Mật khẩu nhập lại chưa khớp"],
      ],
    };
  }

  function build() {
    root = document.createElement("div");
    root.className = "am";
    root.id = "authModal";
    root.hidden = true;
    root.innerHTML = template();
    document.body.appendChild(root);

    const R = rules();

    // Nut "Tiep tuc" chi sang mau khi da dien du cac o
    function syncButtons() {
      $("amLSubmit").disabled = !R.login.every(([i]) => i.value.trim() !== "");
      $("amRSubmit").disabled = !R.register.every(([i]) => i.value.trim() !== "");
    }
    for (const key of ["login", "register"]) {
      R[key].forEach(([input, check]) => {
        input.addEventListener("input", () => {
          if (input.getAttribute("aria-invalid") === "true") setErr(input, check(input.value));
          syncButtons();
        });
        input.addEventListener("blur", () => { if (key === "register" && input.value) setErr(input, check(input.value)); });
      });
    }

    // Hien / an mat khau
    root.querySelectorAll(".am__pw").forEach((box) => {
      const input = box.querySelector("input"), btn = box.querySelector(".am__eye");
      btn.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.innerHTML = show ? EYE_OFF : EYE;
        btn.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        btn.setAttribute("aria-pressed", String(show));
      });
    });

    // Doi giua dang nhap va dang ky ngay trong popup
    root.querySelectorAll("[data-mode]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      setMode(a.dataset.mode);
    }));

    // Dong popup
    root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = [...root.querySelectorAll("input, button, a[href]")].filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Gui dang nhap
    $("amLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      showMsg("");
      let bad = null;
      R.login.forEach(([i, c]) => { if (!setErr(i, c(i.value)) && !bad) bad = i; });
      if (bad) { bad.focus(); return; }
      const btn = $("amLSubmit");
      setBusy(btn, true, "Đang đăng nhập...");
      try {
        await API.post("/login", { username: $("amLUser").value.trim(), password: $("amLPass").value });
        done();
      } catch (err) {
        showMsg(err.message);
        $("amLPass").select();
        setBusy(btn, false);
      }
    });

    // Gui dang ky (backend dang ky xong la dang nhap luon)
    $("amRegister").addEventListener("submit", async (e) => {
      e.preventDefault();
      showMsg("");
      let bad = null;
      R.register.forEach(([i, c]) => { if (!setErr(i, c(i.value)) && !bad) bad = i; });
      if (bad) { bad.focus(); return; }
      const btn = $("amRSubmit");
      setBusy(btn, true, "Đang tạo tài khoản...");
      try {
        await API.post("/register", {
          full_name: $("amRName").value.trim(),
          email: $("amREmail").value.trim(),
          phone: $("amRPhone").value.trim(),
          username: $("amRUser").value.trim(),
          password: $("amRPass").value,
        });
        done();
      } catch (err) {
        showMsg(err.message);
        setBusy(btn, false);
      }
    });
  }

  // Thanh cong: trang rieng thi di tiep, popup tren trang thi tai lai de thanh dieu huong cap nhat
  function done() {
    if (onAuthPage) location.href = safeNext();
    else location.reload();
  }

  function setMode(m) {
    mode = m;
    showMsg("");
    $("amLogin").hidden = m !== "login";
    $("amRegister").hidden = m !== "register";
    $("amTitle").textContent = m === "login" ? "Đăng nhập" : "Đăng ký";
    const first = m === "login" ? $("amLUser") : $("amRName");
    first.focus();
  }

  function open(m) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add("am-lock");
    setMode(m === "register" ? "register" : "login");
  }

  function close() {
    if (!root || root.hidden) return;
    if (onAuthPage) { location.href = "index.html"; return; }
    root.hidden = true;
    document.body.classList.remove("am-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Bam link login.html / register.html tren trang khac -> hien popup thay vi chuyen trang
  document.addEventListener("click", (e) => {
    if (onAuthPage || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = e.target.closest("a[href]");
    if (!a || a.closest(".am")) return;
    const m = (a.getAttribute("href") || "").match(/^(login|register)\.html(\?|$)/);
    if (!m) return;
    e.preventDefault();
    open(m[1]);
  });

  // ---------- Menu tai khoan tren thanh dieu huong (kieu ticketbox) ----------
  const ICON = (path) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  const ICONS = {
    ticket: ICON('<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3z"/><path d="M14 7v10" stroke-dasharray="2 2.5"/>'),
    user: ICON('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.2c1.3-2.2 3.3-3.2 5.8-3.2s4.5 1 5.8 3.2"/>'),
    gem: ICON('<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6"/>'),
    scan: ICON('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>'),
    logout: ICON('<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9"/>'),
    caret: '<svg class="acct__caret" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg>',
  };

  // Chu cai dau cua ten goi (chu cuoi trong ho ten)
  function initialOf(me) {
    const name = String(me.full_name || me.username || "?").trim();
    const last = name.split(/\s+/).pop() || "?";
    return [...last][0].toUpperCase();
  }

  function accountMenuHtml(me) {
    const items = me.role === "admin"
      ? '<a class="acct__item" role="menuitem" href="checkin.html">' + ICONS.scan + "Soát vé</a>"
      : '<a class="acct__item" role="menuitem" href="my-orders.html">' + ICONS.ticket + "Vé đã mua</a>" +
        '<a class="acct__item" role="menuitem" href="memberships.html">' + ICONS.gem + "Thẻ thành viên</a>" +
        '<a class="acct__item" role="menuitem" href="profile.html">' + ICONS.user + "Trang cá nhân</a>";
    return '<div class="acct">' +
      '<button type="button" class="acct__btn" aria-haspopup="menu" aria-expanded="false">' +
        '<span class="acct__avatar" aria-hidden="true">' + esc(initialOf(me)) + "</span>" +
        '<span class="acct__label">Tài khoản</span>' + ICONS.caret + "</button>" +
      '<div class="acct__menu" role="menu" aria-label="Tài khoản" hidden>' + items +
        '<button type="button" class="acct__item acct__item--out" role="menuitem" data-logout>' + ICONS.logout + "Đăng xuất</button>" +
      "</div></div>";
  }

  function bindAccountMenu(box) {
    const btn = box.querySelector(".acct__btn"), menu = box.querySelector(".acct__menu");
    const items = () => [...menu.querySelectorAll('[role="menuitem"]')];
    function setOpen(open, focusFirst) {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open && focusFirst) items()[0].focus();
    }
    btn.addEventListener("click", () => setOpen(menu.hidden));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true, true); }
    });
    menu.addEventListener("keydown", (e) => {
      const list = items(), i = list.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.focus(); }
      else if (e.key === "Tab") { setOpen(false); }
    });
    document.addEventListener("click", (e) => {
      if (document.contains(box) && !box.contains(e.target)) setOpen(false);
    });
    menu.querySelector("[data-logout]").addEventListener("click", async () => {
      try { await API.post("/logout"); } catch (e) { /* van ve trang chu */ }
      location.href = "index.html";
    });
  }

  // Bao renderNav cua api.js: ve xong thanh dieu huong thi thay phan ben phai bang menu tai khoan
  if (typeof window.renderNav === "function") {
    const baseRender = window.renderNav;
    window.renderNav = function (me) {
      baseRender(me);
      if (!me || !me.logged_in) return;
      const nav = document.getElementById("nav");
      const right = nav && nav.querySelector(".nav__right");
      if (!right) return;
      nav.querySelectorAll('a[href="my-orders.html"], a[href="checkin.html"]').forEach((a) => a.remove());
      right.innerHTML = accountMenuHtml(me);
      bindAccountMenu(right);
    };
  }

  window.AuthModal = { open, close, safeNext };
})();
