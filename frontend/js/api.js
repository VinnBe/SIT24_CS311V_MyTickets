/* MyTickets - ham dung chung cho moi trang */

// Goi REST API cua backend Flask (cung dia chi voi trang web)
const API = {
  async request(method, path, body) {
    const opts = { method, credentials: "same-origin", headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch("/api" + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* khong co JSON */ }
    if (!res.ok) {
      const err = new Error(friendly((data && data.error) || "Lỗi máy chủ (" + res.status + ")"));
      err.status = res.status;
      throw err;
    }
    return data;
  },
  get(path) { return this.request("GET", path); },
  post(path, body) { return this.request("POST", path, body || {}); },
};

// Doi thong bao loi khong dau tu database thanh cau tieng Viet de doc
const FRIENDLY = {
  "Vuot gioi han 2 ve moi tai khoan moi su kien": "Bạn đã có đủ 2 vé cho sự kiện này.",
  "Ngoai thoi gian mo ban cua su kien": "Sự kiện chưa mở bán hoặc đã ngừng bán.",
  "Khong du ve trong zone": "Khu vực này không còn đủ vé.",
  "Zone chua co gia trong su kien nay": "Khu vực này chưa được bán trong sự kiện.",
  "Order da qua han thanh toan": "Đơn đã quá hạn thanh toán.",
  "Order khong o trang thai PENDING": "Đơn không còn ở trạng thái chờ thanh toán.",
  "Chi huy duoc order dang PENDING": "Chỉ huỷ được đơn đang chờ thanh toán.",
  "Order khong ton tai": "Không tìm thấy đơn này.",
  "Ve da duoc soat": "Vé này đã được soát trước đó.",
  "Ve chua duoc thanh toan": "Vé chưa được thanh toán.",
  "Ma QR khong ton tai": "Không tìm thấy vé với mã này.",
  "Sai ten dang nhap hoac mat khau": "Sai tên đăng nhập hoặc mật khẩu.",
  "Username hoac email da ton tai": "Tên đăng nhập hoặc email đã được dùng.",
  "Mat khau phai co it nhat 6 ky tu": "Mật khẩu cần ít nhất 6 ký tự.",
  "Ban can dang nhap": "Bạn cần đăng nhập.",
  "Su kien khong ton tai": "Không tìm thấy sự kiện này.",
};
function friendly(msg) { return FRIENDLY[msg] || msg; }

// ---------- Dinh dang ----------
const pad = (n) => String(n).padStart(2, "0");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(v) { return Number(v || 0).toLocaleString("vi-VN") + " ₫"; }

// Backend tra ngay gio dang "2026-12-20 19:00:00"
function parseDt(s) {
  if (!s) return null;
  const [d, t = "00:00:00"] = s.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, ss || 0);
}

function fmtDt(s) {
  const d = parseDt(s);
  if (!d) return "";
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ", " +
         pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
}

function param(name) { return new URLSearchParams(location.search).get(name); }

// ---------- Trang thai ----------
const EVENT_STATUS = {
  UPCOMING: ["Sắp mở bán", "soon"],
  ON_SALE: ["Đang mở bán", "on"],
  STARTED: ["Đã bắt đầu", "off"],
};
const ORDER_STATUS = {
  PENDING: ["Chờ thanh toán", "soon"],
  PAID: ["Đã thanh toán", "on"],
  FAILED: ["Đã huỷ", "bad"],
};
function pill(map, key) {
  const [text, kind] = map[key] || [key, "off"];
  return '<span class="pill pill--' + kind + '">' + esc(text) + "</span>";
}

function showMsg(el, text, kind) {
  el.textContent = text || "";
  el.className = "msg msg--" + (kind || "error");
  el.hidden = !text;
}

// ---------- Dang nhap / thanh dieu huong ----------
async function getMe() {
  try { return await API.get("/me"); }
  catch (e) { return { logged_in: false }; }
}

function currentPage() {
  const p = location.pathname.split("/").pop();
  return p || "index.html";
}

function renderNav(me) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const links = [["index.html", "Sự kiện"]];
  if (me.logged_in && me.role === "customer") links.push(["my-orders.html", "Vé của tôi"]);
  if (me.logged_in && me.role === "admin") links.push(["checkin.html", "Soát vé"]);

  const here = currentPage();
  let html = links.map(([href, text]) =>
    '<a href="' + href + '"' + (href === here ? ' aria-current="page"' : "") + ">" + text + "</a>"
  ).join("");

  if (me.logged_in) {
    html += '<span class="nav__right"><span class="nav__user">' +
            esc(me.full_name || me.username) + "</span>" +
            '<button type="button" class="linkbtn" id="logoutBtn">Đăng xuất</button></span>';
  } else {
    const next = encodeURIComponent(here + location.search);
    html += '<span class="nav__right"><a href="login.html?next=' + next + '">Đăng nhập</a></span>';
  }
  nav.innerHTML = html;

  const out = document.getElementById("logoutBtn");
  if (out) out.addEventListener("click", async () => {
    await API.post("/logout");
    location.href = "index.html";
  });
}

// Goi o dau moi trang. role = "customer" | "admin" de bat buoc dang nhap.
async function initPage(role) {
  const me = await getMe();
  renderNav(me);
  if (role && !(me.logged_in && me.role === role)) {
    location.href = "login.html?next=" + encodeURIComponent(currentPage() + location.search);
    return null;
  }
  return me;
}

// ---------- Ve co ma QR ----------
function renderTickets(order) {
  return '<div class="tickets">' + order.tickets.map((t) => {
    const seat = esc(order.zone_name) + ", hàng " + esc(t.seat_row) + ", ghế " + esc(t.seat_number);
    const note = t.checkin_at ? "Đã vào cổng lúc " + fmtDt(t.checkin_at) : money(t.ticket_price);
    const qr = t.qrcode
      ? '<div class="ticket__qr"><div class="qr" data-code="' + esc(t.qrcode) + '"></div>' +
        '<code class="ticket__code">' + esc(t.qrcode) + "</code></div>"
      : '<div class="ticket__qr"><span class="muted">Đang giữ chỗ</span></div>';
    return '<article class="ticket"><div class="ticket__info">' +
           '<p class="ticket__event">' + esc(order.event_name) + "</p>" +
           "<p>" + seat + "</p>" +
           '<p class="muted">' + note + "</p></div>" + qr + "</article>";
  }).join("") + "</div>";
}

// Ve anh QR (can thu vien qrcode.js; khong co mang thi van hien ma dang chu)
function drawQRs(root) {
  root.querySelectorAll(".qr[data-code]").forEach((el) => {
    if (!window.QRCode) { el.remove(); return; }
    if (el.dataset.drawn) return;
    new QRCode(el, { text: el.dataset.code, width: 112, height: 112 });
    el.dataset.drawn = "1";
  });
}