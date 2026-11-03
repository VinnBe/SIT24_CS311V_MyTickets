const API = "/api";

async function apiCall(path, method = "GET", body = null) {
  const opts = { method, headers: {}, credentials: "same-origin" };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API + path, opts);
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

async function currentUser() {
  try { return await apiCall("/me"); } catch (e) { return null; }
}

function requireAuth(redirectIfAdmin) {
  currentUser().then((u) => {
    if (!u) { window.location.href = "/login.html"; return; }
    if (redirectIfAdmin === true && !u.is_admin) window.location.href = "/events.html";
    if (redirectIfAdmin === false && u.is_admin) window.location.href = "/admin.html";
  });
}

function renderHeader(activePage) {
  const el = document.getElementById("app-header");
  if (!el) return;
  currentUser().then((u) => {
    const links = u
      ? `<a href="/events.html">Sự kiện</a>
         ${u.is_admin ? '<a href="/admin.html">Admin</a>' : '<a href="/my-tickets.html">Vé của tôi</a>'}
         <a class="cta" href="#" onclick="doLogout(event)">Đăng xuất (${u.username})</a>`
      : `<a href="/register.html">Đăng ký</a><a class="cta" href="/login.html">Đăng nhập</a>`;
    el.innerHTML = `<a class="logo" href="/events.html">
        <span class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 0 3v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1.5 1.5 0 0 0 0-3V9Z" fill="#fff"/><path d="M12 7.5v9" stroke="#FF5C8A" stroke-width="1.6" stroke-dasharray="2 2"/></svg></span>
        MyTickets</a><nav>${links}</nav>`;
  });
}

async function doLogout(e) {
  e.preventDefault();
  await apiCall("/logout", "POST");
  window.location.href = "/login.html";
}

function fmtMoney(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "Z");
  return d.toLocaleString("vi-VN");
}

const STATUS_LABEL = {
  UPCOMING: ["upcoming", "Sắp mở bán"],
  ON_SALE: ["onsale", "Đang bán"],
  SOLD_OUT: ["soldout", "Hết vé"],
  CLOSED: ["closed", "Đã đóng"],
  PENDING: ["pending", "Chờ thanh toán"],
  PAID: ["paid", "Đã thanh toán"],
  FAILED: ["failed", "Thất bại"],
};

function statusBadge(status) {
  const [cls, label] = STATUS_LABEL[status] || ["", status];
  return `<span class="badge ${cls}">${label}</span>`;
}
