/* Trang quan tri: menu ben trai + noi dung theo tung muc (#dashboard, #venues, ...) */

const I = (d) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
const ICONS = {
  dashboard: I('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
  venues: I('<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>'),
  zones: I('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="18" height="8" rx="1"/>'),
  seats: I('<path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 10h16v5H4zM6 15v5M18 15v5"/>'),
  events: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  pricing: I('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  tickets: I('<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3z"/>'),
  orders: I('<path d="M6 2h12l2 4v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6z"/><path d="M4 6h16M9 11h6M9 15h6"/>'),
  customers: I('<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 4a4 4 0 0 1 0 8M22 21c-.5-2.5-2-4.3-4-5.2"/>'),
  checkin: I('<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10"/>'),
  reports: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
};

// Nhom menu theo so do: Admin Dashboard -> cac muc quan ly
// Moi muc: [ma, ten ngan tren menu, tieu de day du tren trang]
const MENU = [
  ["", [["dashboard", "Dashboard", "Dashboard"]]],
  ["Sự kiện & vé", [["events", "Sự kiện", "Quản lý sự kiện"], ["pricing", "Giá vé", "Quản lý giá vé"], ["tickets", "Vé", "Quản lý vé"]]],
  ["Khách & đơn", [["orders", "Đơn hàng", "Quản lý đơn hàng"], ["customers", "Khách hàng", "Quản lý khách hàng"]]],
  ["Địa điểm", [["venues", "Địa điểm", "Quản lý địa điểm"], ["zones", "Khu vực", "Quản lý khu vực"], ["seats", "Ghế", "Quản lý ghế"]]],
  ["Vận hành", [["checkin", "Soát vé", "Soát vé"], ["reports", "Báo cáo", "Báo cáo thống kê"]]],
];
const TITLES = Object.fromEntries(MENU.flatMap(([, items]) => items.map(([k, , full]) => [k, full])));

// Chuc nang tung muc theo dac ta; hien tam trong luc lam tung buoc
const TODO = {
  venues: ["Thêm, sửa, xoá địa điểm", "Quản lý địa chỉ và sức chứa"],
  zones: ["Thêm, sửa, xoá khu vực (zone) của từng địa điểm", "Quản lý sức chứa từng khu"],
  seats: ["Thêm, sửa, xoá ghế", "Quản lý hàng và số ghế trong từng khu"],
  events: ["Tạo sự kiện", "Chỉnh sửa thông tin", "Thiết lập thời gian mở bán", "Chọn địa điểm tổ chức"],
  pricing: ["Thiết lập giá theo khu cho từng sự kiện", "Theo dõi số vé còn lại"],
  tickets: ["Danh sách vé", "Mã QR", "Trạng thái: Còn trống (AVAILABLE), Đang giữ (RESERVED), Đã bán (SOLD)"],
  orders: ["Xem danh sách đơn", "Xem chi tiết đơn", "Theo dõi thanh toán"],
  customers: ["Xem thông tin khách hàng", "Tìm kiếm khách hàng"],
  checkin: ["Quét mã QR", "Xác thực vé", "Kiểm tra vé đã sử dụng"],
  reports: ["Doanh thu", "Số vé đã bán", "Số vé còn trống"],
};

const $ = (id) => document.getElementById(id);

function renderSide(active) {
  $("side").innerHTML = MENU.map(([group, items]) =>
    '<div class="adm__group">' + (group ? '<p class="adm__label">' + group + "</p>" : "") +
    items.map(([k, t]) =>
      '<a class="adm__link" href="#' + k + '"' + (k === active ? ' aria-current="page"' : "") + ">" +
      ICONS[k] + "<span>" + t + "</span></a>").join("") + "</div>").join("");
}

// ---------- Tong quan ----------
async function viewDashboard(box) {
  const events = await API.get("/events");
  const details = await Promise.all(events.map((e) => API.get("/events/" + e.event_id).catch(() => null)));
  const rows = events.map((e, i) => {
    const zones = (details[i] && details[i].zones) || [];
    const total = zones.reduce((s, z) => s + z.total_seats, 0);
    const left = zones.reduce((s, z) => s + z.available, 0);
    const sold = total - left;
    const revenue = zones.reduce((s, z) => s + (z.total_seats - z.available) * z.price, 0);
    return Object.assign({}, e, { total, left, sold, revenue, pct: total ? Math.round(100 * sold / total) : 0 });
  });

  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const onSale = rows.filter((r) => r.sale_status === "ON_SALE").length;
  const upcoming = rows.filter((r) => r.sale_status === "UPCOMING").length;
  const next = rows.filter((r) => r.sale_status !== "STARTED")
    .sort((a, b) => parseDt(a.start_time) - parseDt(b.start_time)).slice(0, 5);

  box.innerHTML =
    '<div class="adm-stats">' +
      stat("Sự kiện đang mở bán", onSale, upcoming + " sự kiện sắp mở bán") +
      stat("Vé đã bán", sum("sold").toLocaleString("vi-VN"), "trên " + sum("total").toLocaleString("vi-VN") + " ghế") +
      stat("Doanh thu ước tính", money(sum("revenue")), "tính theo giá khu × vé đã bán") +
      stat("Tổng số sự kiện", rows.length, rows.length - onSale - upcoming + " sự kiện đã diễn ra") +
    "</div>" +

    '<div class="adm-cols">' +
      '<section class="panel">' +
        '<div class="adm-head"><h2>Tình hình bán vé</h2><a href="#reports">Xem báo cáo</a></div>' +
        (rows.length ? '<div class="table-wrap adm-table"><table><thead><tr>' +
          '<th>Sự kiện</th><th>Trạng thái</th><th>Đã bán</th><th class="num">Doanh thu</th></tr></thead><tbody>' +
          rows.sort((a, b) => b.pct - a.pct).map((r) =>
            "<tr><td><a href=\"event.html?id=" + r.event_id + "\">" + esc(r.event_name) + "</a>" +
            '<small class="muted adm-sub">' + fmtDt(r.start_time) + "</small></td>" +
            "<td>" + pill(EVENT_STATUS, r.sale_status) + "</td>" +
            '<td><div class="bar"><span style="width:' + r.pct + '%"></span></div>' +
            '<small class="muted">' + r.sold + "/" + r.total + " (" + r.pct + "%)</small></td>" +
            '<td class="num">' + money(r.revenue) + "</td></tr>").join("") +
          "</tbody></table></div>"
          : '<p class="empty">Chưa có sự kiện nào. <a href="#events">Tạo sự kiện đầu tiên</a></p>') +
      "</section>" +

      '<section class="panel">' +
        '<div class="adm-head"><h2>Sắp diễn ra</h2><a href="#events">Tất cả</a></div>' +
        (next.length ? '<ol class="adm-next">' + next.map((r) => {
          const d = parseDt(r.start_time);
          return '<li><span class="adm-date"><b>' + pad(d.getDate()) + "</b>Th " + (d.getMonth() + 1) + "</span>" +
            "<span><strong>" + esc(r.event_name) + "</strong>" +
            '<small class="muted adm-sub">' + esc(r.venue_name) + "</small></span></li>";
        }).join("") + "</ol>" : '<p class="empty">Không có sự kiện sắp diễn ra.</p>') +
      "</section>" +
    "</div>";
}

function stat(label, value, note) {
  return '<div class="adm-stat"><p class="adm-stat__label">' + label + "</p>" +
    '<p class="adm-stat__value">' + value + "</p>" +
    '<p class="adm-stat__note">' + note + "</p></div>";
}

// ---------- Quan ly su kien ----------
// "2026-12-20 19:00:00" <-> "2026-12-20T19:00" (o nhap datetime-local)
const toInput = (s) => (s ? s.replace(" ", "T").slice(0, 16) : "");
const fromInput = (s) => (s ? s.replace("T", " ") + ":00" : "");

async function viewEvents(box) {
  const events = await API.get("/events");
  const details = await Promise.all(events.map((e) => API.get("/events/" + e.event_id).catch(() => null)));
  const rows = events.map((e, i) => {
    const d = details[i] || {};
    const zones = d.zones || [];
    const total = zones.reduce((s, z) => s + z.total_seats, 0);
    const left = zones.reduce((s, z) => s + z.available, 0);
    return Object.assign({}, e, { total, sold: total - left, zoneCount: zones.length });
  });
  // /api/events khong co venue_id; lay them tu API admin
  const { data: adminEvents } = await tryList("/admin/events");
  adminEvents.forEach((a) => {
    const r = rows.find((x) => x.event_id === a.event_id);
    if (r) r.venue_id = a.venue_id;
  });

  // Danh sach dia diem cho o chon: uu tien API admin, chua co thi lay tu cac su kien hien co
  let venues;
  try { venues = await API.get("/admin/venues"); }
  catch (err) {
    const seen = {};
    venues = rows.filter((r) => r.venue_id != null && !seen[r.venue_id] && (seen[r.venue_id] = 1))
      .map((r) => ({ venue_id: r.venue_id, venue_name: r.venue_name }));
  }

  let filter = "ALL";
  box.innerHTML =
    '<div class="adm-bar">' +
      '<input id="evQ" class="adm-search" type="search" placeholder="Tìm theo tên sự kiện hoặc địa điểm" aria-label="Tìm sự kiện">' +
      '<div class="chips" role="group" aria-label="Lọc theo trạng thái">' +
        [["ALL", "Tất cả"], ["ON_SALE", "Đang mở bán"], ["UPCOMING", "Sắp mở bán"], ["STARTED", "Đã diễn ra"]].map(([k, t]) =>
          '<button class="chip" type="button" data-f="' + k + '" aria-pressed="' + (k === filter) + '">' + t + "</button>").join("") +
      "</div>" +
      '<button class="btn adm-bar__new" type="button" id="evNew">+ Tạo sự kiện</button>' +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      "<th>Sự kiện</th><th>Thời gian diễn ra</th><th>Mở bán</th><th>Trạng thái</th><th>Đã bán</th><th></th>" +
    '</tr></thead><tbody id="evRows"></tbody></table></div></section>' +
    drawerHtml(venues);

  const q = $("evQ");
  function draw() {
    const text = q.value.trim().toLowerCase();
    const shown = rows.filter((r) => (filter === "ALL" || r.sale_status === filter) &&
      (!text || (r.event_name + " " + r.venue_name).toLowerCase().includes(text)));
    $("evRows").innerHTML = shown.length ? shown.map((r) => {
      const pct = r.total ? Math.round(100 * r.sold / r.total) : 0;
      return "<tr><td><strong>" + esc(r.event_name) + '</strong><small class="muted adm-sub">' + esc(r.venue_name) + "</small></td>" +
        "<td>" + fmtDt(r.start_time) + (r.end_time ? '<small class="muted adm-sub">đến ' + fmtDt(r.end_time) + "</small>" : "") + "</td>" +
        "<td>" + fmtDt(r.sale_start) + "</td>" +
        "<td>" + pill(EVENT_STATUS, r.sale_status) + "</td>" +
        "<td>" + (r.zoneCount
          ? '<div class="bar"><span style="width:' + pct + '%"></span></div><small class="muted">' + r.sold + "/" + r.total + "</small>"
          : '<small class="muted">Chưa đặt giá khu</small>') + "</td>" +
        '<td class="adm-actions"><button type="button" class="btn btn--ghost btn--small" data-edit="' + r.event_id + '">Sửa</button>' +
        '<button type="button" class="btn btn--ghost btn--small" data-look="' + r.event_id + '">Giao diện</button>' +
        '<a class="btn btn--ghost btn--small" href="event.html?id=' + r.event_id + '" target="_blank">Xem</a></td></tr>';
    }).join("") : '<tr><td colspan="6" class="empty">Không có sự kiện phù hợp.</td></tr>';
  }
  draw();
  q.addEventListener("input", draw);
  box.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    filter = c.dataset.f;
    box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    draw();
  }));
  $("evNew").addEventListener("click", () => openDrawer(null));
  $("evRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-edit]");
    if (b) openDrawer(rows.find((r) => String(r.event_id) === b.dataset.edit));
    const l = e.target.closest("[data-look]");
    if (l) openLook(rows.find((r) => String(r.event_id) === l.dataset.look));
  });
}

function drawerHtml(venues) {
  const opts = venues.length
    ? '<option value="">Chọn địa điểm</option>' + venues.map((v) => '<option value="' + v.venue_id + '">' + esc(v.venue_name) + "</option>").join("")
    : '<option value="">Chưa có địa điểm. Hãy tạo ở mục Địa điểm trước.</option>';
  return '<div class="adm-drawer" id="drawer" hidden>' +
    '<div class="adm-drawer__bg" data-close></div>' +
    '<form class="adm-drawer__box" id="evForm" novalidate aria-labelledby="drawerTitle">' +
      '<div class="adm-drawer__head"><h2 id="drawerTitle">Tạo sự kiện</h2>' +
        '<button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="adm-drawer__body">' +
        '<label class="field">Tên sự kiện<input id="fName" maxlength="150"><span class="field__err" id="fNameErr"></span></label>' +
        '<label class="field">Địa điểm tổ chức<select id="fVenue">' + opts + '</select><span class="field__err" id="fVenueErr"></span></label>' +
        // Moi o ngay gio 1 dong: Bat dau, ben duoi la Ket thuc
        '<label class="field">Bắt đầu<input id="fStart" type="datetime-local"><span class="field__err" id="fStartErr"></span></label>' +
        '<label class="field">Kết thúc<input id="fEnd" type="datetime-local"><span class="field__err" id="fEndErr"></span></label>' +
        '<label class="field">Thời điểm mở bán<input id="fSale" type="datetime-local"><span class="field__err" id="fSaleErr"></span></label>' +
        '<p class="muted adm-hint">Sau khi tạo, vào mục <a href="#pricing">Giá vé</a> để đặt giá cho từng khu. Sự kiện chỉ bán được khi đã có giá khu.</p>' +
        '<p id="fMsg" class="msg" role="alert" hidden></p>' +
      "</div>" +
      '<div class="adm-drawer__foot">' +
        '<button type="button" class="btn btn--ghost adm-danger" id="fDel" style="display:none">Xoá sự kiện</button>' +
        '<button type="button" class="btn btn--ghost" data-close>Huỷ</button>' +
        '<button type="submit" class="btn" id="fSave">Tạo sự kiện</button></div>' +
    "</form></div>";
}

let editing = null;
function openDrawer(ev) {
  editing = ev;
  const d = $("drawer");
  $("drawerTitle").textContent = ev ? "Sửa sự kiện" : "Tạo sự kiện";
  $("fSave").textContent = ev ? "Lưu thay đổi" : "Tạo sự kiện";
  $("fDel").style.display = ev ? "" : "none";   // chi hien nut Xoa khi dang sua
  $("fName").value = ev ? ev.event_name : "";
  $("fVenue").value = ev && ev.venue_id != null ? String(ev.venue_id) : "";
  $("fStart").value = ev ? toInput(ev.start_time) : "";
  $("fEnd").value = ev ? toInput(ev.end_time) : "";
  $("fSale").value = ev ? toInput(ev.sale_start) : "";
  ["fName", "fVenue", "fStart", "fEnd", "fSale"].forEach((id) => setFieldErr(id, ""));
  showMsg($("fMsg"), "");
  d.hidden = false;
  document.body.classList.add("am-lock");
  $("fName").focus();

  if (!d.dataset.bound) {
    d.dataset.bound = "1";
    d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDrawer(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !d.hidden) closeDrawer(); });
    $("evForm").addEventListener("submit", saveEvent);
    $("fDel").addEventListener("click", deleteEvent);
  }
}
function closeDrawer() {
  $("drawer").hidden = true;
  document.body.classList.remove("am-lock");
}
function setFieldErr(id, text) {
  $(id).setAttribute("aria-invalid", text ? "true" : "false");
  $(id + "Err").textContent = text || "";
  return !text;
}

async function saveEvent(e) {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const start = v("fStart"), end = v("fEnd"), sale = v("fSale");
  const checks = [
    ["fName", v("fName") ? "" : "Nhập tên sự kiện"],
    ["fVenue", v("fVenue") ? "" : "Chọn địa điểm tổ chức"],
    ["fStart", start ? "" : "Chọn thời gian bắt đầu"],
    ["fEnd", !end ? "Chọn thời gian kết thúc" : start && end <= start ? "Kết thúc phải sau thời gian bắt đầu" : ""],
    ["fSale", !sale ? "Chọn thời điểm mở bán" : start && sale >= start ? "Mở bán phải trước thời gian bắt đầu" : ""],
  ];
  let first = null;
  checks.forEach(([id, msg]) => { if (!setFieldErr(id, msg) && !first) first = id; });
  if (first) { $(first).focus(); return; }

  const body = {
    event_name: v("fName"), venue_id: Number(v("fVenue")),
    start_time: fromInput(start), end_time: fromInput(end), sale_start: fromInput(sale),
  };
  const btn = $("fSave"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Đang lưu...";
  try {
    if (editing) await API.request("PUT", "/admin/events/" + editing.event_id, body);
    else await API.post("/admin/events", body);
    closeDrawer();
    route();
  } catch (err) {
    showMsg($("fMsg"), err.status === 404 || err.status === 405
      ? "Backend chưa có API lưu sự kiện. Phần này sẽ được thêm ở bước làm backend."
      : err.message);
  }
  btn.disabled = false; btn.textContent = label;
}

// =====================================================================
//  Giao dien su kien: anh poster, anh nen, noi dung gioi thieu
//  Luu thanh file tren may chay backend (event_look.py), khong dung database.
// =====================================================================
const LOOK_KINDS = [
  ["poster", "Ảnh poster", "Hiện ở khung lớn trên trang sự kiện, banner và thẻ sự kiện ở trang chủ. Nên dùng ảnh ngang tỉ lệ 16:9, ví dụ 1280×720."],
  ["background", "Ảnh nền", "Phủ mờ phía sau phần đầu trang sự kiện. Nếu để trống, trang dùng ảnh poster làm nền."],
];
const LOOK_MAX = 3 * 1024 * 1024;
const LOOK_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function openLook(ev) {
  if (!ev) return;
  let look = {};
  try { look = await API.get("/event-look/" + ev.event_id); }
  catch (err) { alert(apiMissing(err) ? "Backend chưa có API giao diện. Hãy cập nhật backend.py và event_look.py rồi chạy lại." : err.message); return; }

  // Trang thai tung anh: file moi chon / da bam xoa
  const pick = { poster: null, background: null };
  const drop = { poster: false, background: false };
  const urls = [];                         // URL xem truoc tam, giai phong khi dong

  let d = $("lookDrawer");
  if (!d) {
    d = document.createElement("div");
    d.id = "lookDrawer"; d.className = "adm-drawer"; d.hidden = true;
    document.body.appendChild(d);
  }
  const fallback = posterBg(ev.event_id);
  d.innerHTML = '<div class="adm-drawer__bg" data-close></div>' +
    '<form class="adm-drawer__box adm-drawer__box--wide" id="lookForm" novalidate aria-labelledby="lookTitle">' +
      '<div class="adm-drawer__head"><h2 id="lookTitle">Giao diện: ' + esc(ev.event_name) + "</h2>" +
        '<button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="adm-drawer__body">' +
        LOOK_KINDS.map(([k, label, hint]) =>
          '<div class="look-img">' +
            '<p class="look-img__label">' + label + "</p>" +
            '<div class="look-img__box" id="lk_' + k + '_box" style="' + fallback + '">' +
              '<span class="look-img__empty" id="lk_' + k + '_empty">Chưa có ảnh, đang dùng nền tự sinh</span></div>' +
            '<div class="look-img__row">' +
              '<label class="btn btn--ghost btn--small look-img__pick">Chọn ảnh' +
                '<input type="file" id="lk_' + k + '" accept="image/jpeg,image/png,image/webp" class="look-img__file"></label>' +
              '<button type="button" class="btn btn--ghost btn--small adm-danger look-img__del" id="lk_' + k + '_del">Xoá ảnh</button>' +
              '<small class="muted" id="lk_' + k + '_name"></small>' +
            "</div>" +
            '<small class="muted adm-hint">' + hint + " JPG, PNG hoặc WebP, tối đa 3 MB.</small>" +
            '<span class="field__err" id="lk_' + k + 'Err"></span>' +
          "</div>").join("") +
        '<label class="field">Nội dung giới thiệu' +
          '<textarea id="lkText" rows="9" maxlength="5000" placeholder="Viết giới thiệu về sự kiện: nghệ sĩ, chương trình, lưu ý cho khán giả..."></textarea>' +
          '<small class="muted adm-hint">Để trống thì trang dùng đoạn giới thiệu tự sinh. Xuống dòng 1 lần để ngắt dòng, cách 1 dòng trống để sang đoạn mới. ' +
            '<span id="lkCount"></span></small></label>' +
        '<p id="lkMsg" class="msg" role="alert" hidden></p>' +
      "</div>" +
      '<div class="adm-drawer__foot">' +
        '<a class="btn btn--ghost look-view" href="event.html?id=' + ev.event_id + '" target="_blank">Xem trang sự kiện</a>' +
        '<button type="button" class="btn btn--ghost" data-close>Huỷ</button>' +
        '<button type="submit" class="btn" id="lkSave">Lưu giao diện</button></div>' +
    "</form>";

  const close = () => {
    d.hidden = true;
    document.body.classList.remove("am-lock");
    urls.forEach((u) => URL.revokeObjectURL(u));
  };
  d.querySelectorAll("[data-close]").forEach((x) => x.addEventListener("click", close));
  d.onkeydown = (e) => { if (e.key === "Escape") close(); };

  // Ve lai khung xem truoc cua 1 anh
  function paint(k) {
    const box = $("lk_" + k + "_box");
    let src = null;
    if (pick[k]) src = pick[k].url;
    else if (!drop[k] && look[k]) src = look[k];
    box.style.backgroundImage = src ? 'url("' + src + '")' : "";
    box.classList.toggle("has-img", !!src);
    $("lk_" + k + "_empty").style.display = src ? "none" : "";
    $("lk_" + k + "_del").style.display = src ? "" : "none";
    $("lk_" + k + "_name").textContent = pick[k] ? pick[k].file.name + " (chưa lưu)" : drop[k] ? "Sẽ xoá khi lưu" : "";
  }

  LOOK_KINDS.forEach(([k]) => {
    $("lk_" + k).addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";                         // cho phep chon lai cung 1 file
      if (!file) return;
      let err = "";
      if (!LOOK_TYPES.includes(file.type)) err = "Chỉ nhận ảnh JPG, PNG hoặc WebP.";
      else if (file.size > LOOK_MAX) err = "Ảnh nặng " + (file.size / 1048576).toFixed(1) + " MB, tối đa 3 MB.";
      $("lk_" + k + "Err").textContent = err;
      if (err) return;
      const url = URL.createObjectURL(file);
      urls.push(url);
      pick[k] = { file, url };
      drop[k] = false;
      paint(k);
    });
    $("lk_" + k + "_del").addEventListener("click", () => {
      if (pick[k]) pick[k] = null;                 // bo anh vua chon, quay ve anh dang dung
      else drop[k] = true;                         // danh dau xoa anh dang dung
      $("lk_" + k + "Err").textContent = "";
      paint(k);
    });
    paint(k);
  });

  const text = $("lkText");
  const count = () => { $("lkCount").textContent = text.value.length + "/5000 ký tự."; };
  text.value = look.description || "";
  text.addEventListener("input", count);
  count();

  $("lookForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("lkSave");
    btn.disabled = true; btn.textContent = "Đang lưu...";
    showMsg($("lkMsg"), "");
    try {
      for (const [k] of LOOK_KINDS) {
        if (pick[k]) await uploadLook(ev.event_id, k, pick[k].file);
        else if (drop[k]) await API.request("DELETE", "/admin/event-look/" + ev.event_id + "/" + k);
      }
      if (text.value.trim() !== (look.description || "")) {
        await API.request("PUT", "/admin/event-look/" + ev.event_id, { description: text.value });
      }
      close();
      showMsg($("msg"), "Đã lưu giao diện cho “" + ev.event_name + "”.", "info");
    } catch (err) {
      showMsg($("lkMsg"), friendlySaveError(err));
    }
    btn.disabled = false; btn.textContent = "Lưu giao diện";
  });

  d.hidden = false;
  document.body.classList.add("am-lock");
  $("lkText").focus();
}

// Tai 1 anh len (form-data). API.request chi gui JSON nen goi fetch truc tiep.
async function uploadLook(eventId, kind, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/event-look/" + eventId + "/" + kind, {
    method: "POST", body: fd, credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* khong co JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || "Lỗi máy chủ (" + res.status + ")");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Mau nen tu sinh giong trang chu (dung khi su kien chua co anh)
function posterBg(id) {
  const c = [["#FF4D8D", "#6B2BD9"], ["#FFB547", "#E8466A"], ["#2EC4B6", "#3A47D5"],
             ["#8E44FF", "#FF4D8D"], ["#FF7A45", "#7A1FA2"], ["#2BD07F", "#1F6FEB"]][id % 6];
  return "--c1:" + c[0] + ";--c2:" + c[1];
}

// Xoa su kien: chi khi chua co ve nao duoc giu hoac da ban
let deletingEvent = false;            // chan gui lenh xoa 2 lan (bam lien tiep / bam OK 2 lan)
async function deleteEvent() {
  const ev = editing;
  if (!ev || deletingEvent) return;
  if (ev.sold) {   // sold = tong ve - ve con trong (gom ca ve dang giu)
    alert("Sự kiện “" + ev.event_name + "” đã có " + ev.sold + " vé được giữ hoặc đã bán nên không thể xoá.");
    return;
  }
  const note = ev.total ? " " + ev.total + " vé còn trống và giá các khu của sự kiện cũng sẽ bị xoá." : "";
  if (!confirm("Xoá sự kiện “" + ev.event_name + "”?" + note + " Thao tác này không thể hoàn tác.")) return;

  deletingEvent = true;
  const btn = $("fDel"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Đang xoá...";
  let ok = false;
  try {
    await API.request("DELETE", "/admin/events/" + ev.event_id);
    ok = true;
  } catch (err) {
    if (err.status === 404 && /Không tìm thấy sự kiện/.test(err.message)) ok = true;   // da bi xoa truoc do
    else if (err.status === 405) alert("Backend chưa có API xoá sự kiện. Hãy cập nhật admin_api_1.py và chạy lại backend.");
    else alert(err.message);
  }
  deletingEvent = false;
  btn.disabled = false; btn.textContent = label;
  if (ok) {
    closeDrawer();
    await route();                   // route() xoa thong bao cu, nen hien thong bao sau khi tai lai
    showMsg($("msg"), "Đã xoá sự kiện “" + ev.event_name + "”.", "info");
  }
}

// =====================================================================
//  Dung chung cho cac man hinh them / sua / xoa
// =====================================================================
const apiMissing = (err) => err.status === 404 || err.status === 405;

// Goi API danh sach; backend chua co API thi tra ve rong + co danh dau
async function tryList(path) {
  try { return { data: await API.get(path), missing: false }; }
  catch (err) { if (apiMissing(err)) return { data: [], missing: true }; throw err; }
}
function missingNote(path) {
  return '<p class="msg msg--info">Backend chưa có API <code>/api' + path + "</code>, nên danh sách đang trống và nút Lưu chưa hoạt động. Phần này sẽ được thêm ở bước làm backend.</p>";
}
function friendlySaveError(err) {
  return apiMissing(err) ? "Backend chưa có API cho thao tác này. Phần này sẽ được thêm ở bước làm backend." : err.message;
}
async function confirmDelete(text, path) {
  if (!confirm(text)) return false;
  try { await API.request("DELETE", path); return true; }
  catch (err) { alert(friendlySaveError(err)); return false; }
}

/* Khung nhap truot ben phai dung chung.
   fields: [{ id, label, type: "text"|"number"|"select", options: [[value, text]], required, min, max, half, hint }] */
function openForm(opt) {
  let d = $("fdrawer");
  if (!d) {
    d = document.createElement("div");
    d.id = "fdrawer"; d.className = "adm-drawer"; d.hidden = true;
    document.body.appendChild(d);
    d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeForm(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !d.hidden) closeForm(); });
  }
  const v = opt.values || {};
  const input = (f) => {
    const val = v[f.id] != null ? String(v[f.id]) : "";
    if (f.type === "select") {
      return '<select id="g_' + f.id + '"><option value="">' + (f.placeholder || "Chọn") + "</option>" +
        f.options.map(([k, t]) => '<option value="' + esc(k) + '"' + (String(k) === val ? " selected" : "") + ">" + esc(t) + "</option>").join("") + "</select>";
    }
    return '<input id="g_' + f.id + '" type="' + (f.type || "text") + '" value="' + esc(val) + '"' +
      (f.min != null ? ' min="' + f.min + '"' : "") + (f.max != null ? ' max="' + f.max + '"' : "") +
      (f.maxlength ? ' maxlength="' + f.maxlength + '"' : "") + ">";
  };
  let body = "", pair = [];
  opt.fields.forEach((f) => {
    const html = '<label class="field">' + f.label + input(f) + '<span class="field__err" id="g_' + f.id + 'Err"></span>' +
      (f.hint ? '<small class="muted adm-hint">' + f.hint + "</small>" : "") + "</label>";
    if (f.half) { pair.push(html); if (pair.length === 2) { body += '<div class="adm-2col">' + pair.join("") + "</div>"; pair = []; } }
    else { if (pair.length) { body += '<div class="adm-2col">' + pair.join("") + "</div>"; pair = []; } body += html; }
  });
  if (pair.length) body += '<div class="adm-2col">' + pair.join("") + "</div>";

  d.innerHTML = '<div class="adm-drawer__bg" data-close></div>' +
    '<form class="adm-drawer__box" id="gForm" novalidate aria-labelledby="gTitle">' +
      '<div class="adm-drawer__head"><h2 id="gTitle">' + esc(opt.title) + "</h2>" +
        '<button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="adm-drawer__body">' + (opt.intro ? '<p class="muted adm-hint">' + opt.intro + "</p>" : "") + body +
        '<p id="gMsg" class="msg" role="alert" hidden></p></div>' +
      '<div class="adm-drawer__foot">' +
        (opt.onDelete ? '<button type="button" class="btn btn--ghost adm-danger" id="gDel">Xoá</button>' : "") +
        '<button type="button" class="btn btn--ghost" data-close>Huỷ</button>' +
        '<button type="submit" class="btn" id="gSave">' + esc(opt.submit || "Lưu") + "</button></div>" +
    "</form>";
  d.hidden = false;
  document.body.classList.add("am-lock");
  const first = d.querySelector("input, select"); if (first) first.focus();

  if (opt.onDelete) $("gDel").addEventListener("click", async () => { if (await opt.onDelete()) { closeForm(); route(); } });

  $("gForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {}; let bad = null;
    opt.fields.forEach((f) => {
      const el = $("g_" + f.id), raw = el.value.trim();
      let msg = "";
      if (f.required && !raw) msg = f.type === "select" ? "Vui lòng chọn" : "Vui lòng nhập " + f.label.toLowerCase();
      else if (f.type === "number" && raw) {
        const n = Number(raw);
        if (!Number.isInteger(n)) msg = "Nhập số nguyên";
        else if (f.min != null && n < f.min) msg = "Tối thiểu " + f.min;
        else if (f.max != null && n > f.max) msg = "Tối đa " + f.max;
      }
      if (!msg && f.check) msg = f.check(raw, data) || "";
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      $("g_" + f.id + "Err").textContent = msg;
      if (msg && !bad) bad = el;
      data[f.id] = f.type === "number" || (f.type === "select" && f.numeric) ? (raw === "" ? null : Number(raw)) : raw;
    });
    if (bad) { bad.focus(); return; }
    const btn = $("gSave"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Đang lưu...";
    try { await opt.onSave(data); closeForm(); route(); }
    catch (err) { showMsg($("gMsg"), friendlySaveError(err)); }
    btn.disabled = false; btn.textContent = label;
  });
}
function closeForm() {
  const d = $("fdrawer"); if (d) d.hidden = true;
  document.body.classList.remove("am-lock");
}

// =====================================================================
//  2. Quan ly dia diem (VENUE)
//  API: GET/POST /admin/venues, PUT/DELETE /admin/venues/<id>
//  Moi dong: { venue_id, venue_name, address, zone_count, capacity }
// =====================================================================
async function viewVenues(box) {
  const { data: venues, missing } = await tryList("/admin/venues");
  box.innerHTML = (missing ? missingNote("/admin/venues") : "") +
    '<div class="adm-bar">' +
      '<input id="vQ" class="adm-search" type="search" placeholder="Tìm theo tên hoặc địa chỉ" aria-label="Tìm địa điểm">' +
      '<button class="btn adm-bar__new" type="button" id="vNew">+ Thêm địa điểm</button>' +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      '<th>Địa điểm</th><th>Địa chỉ</th><th class="num">Số khu</th><th class="num">Sức chứa</th><th></th>' +
    '</tr></thead><tbody id="vRows"></tbody></table></div></section>';

  const form = (row) => openForm({
    title: row ? "Sửa địa điểm" : "Thêm địa điểm",
    submit: row ? "Lưu thay đổi" : "Thêm địa điểm",
    values: row,
    intro: "Sức chứa của địa điểm được tính tự động bằng tổng sức chứa các khu bên trong.",
    fields: [
      { id: "venue_name", label: "Tên địa điểm", required: true, maxlength: 100 },
      { id: "address", label: "Địa chỉ", required: true, maxlength: 255 },
    ],
    onSave: (d) => row ? API.request("PUT", "/admin/venues/" + row.venue_id, d) : API.post("/admin/venues", d),
    onDelete: row ? () => confirmDelete("Xoá địa điểm “" + row.venue_name + "”? Chỉ xoá được khi địa điểm chưa có khu và chưa có sự kiện.", "/admin/venues/" + row.venue_id) : null,
  });

  function draw() {
    const q = $("vQ").value.trim().toLowerCase();
    const shown = venues.filter((r) => !q || (r.venue_name + " " + r.address).toLowerCase().includes(q));
    $("vRows").innerHTML = shown.length ? shown.map((r) =>
      "<tr><td><strong>" + esc(r.venue_name) + "</strong></td><td>" + esc(r.address) + "</td>" +
      '<td class="num">' + (r.zone_count || 0) + '</td><td class="num">' + Number(r.capacity || 0).toLocaleString("vi-VN") + "</td>" +
      '<td class="adm-actions"><a class="btn btn--ghost btn--small" href="#zones" data-venue="' + r.venue_id + '">Xem khu</a>' +
      '<button type="button" class="btn btn--ghost btn--small" data-edit="' + r.venue_id + '">Sửa</button></td></tr>').join("")
      : '<tr><td colspan="5" class="empty">' + (venues.length ? "Không có địa điểm phù hợp." : "Chưa có địa điểm nào. Bấm “Thêm địa điểm” để bắt đầu.") + "</td></tr>";
  }
  draw();
  $("vQ").addEventListener("input", draw);
  $("vNew").addEventListener("click", () => form(null));
  $("vRows").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]"), go = e.target.closest("[data-venue]");
    if (ed) form(venues.find((r) => String(r.venue_id) === ed.dataset.edit));
    if (go) PICK.venue = go.dataset.venue;
  });
}

// Nho dia diem / khu dang chon khi chuyen qua lai giua cac man hinh
const PICK = { venue: "", zone: "" };

// =====================================================================
//  3. Quan ly khu vuc (ZONE)
//  API: GET /admin/zones?venue_id=, POST /admin/zones, PUT/DELETE /admin/zones/<id>
//  Moi dong: { zone_id, zone_name, capacity, venue_id, venue_name, seat_count }
// =====================================================================
async function viewZones(box) {
  const [{ data: venues }, zr] = await Promise.all([
    tryList("/admin/venues"),
    tryList("/admin/zones" + (PICK.venue ? "?venue_id=" + PICK.venue : "")),
  ]);
  const zones = zr.data;
  const venueOpts = venues.map((v) => [v.venue_id, v.venue_name]);

  box.innerHTML = (zr.missing ? missingNote("/admin/zones") : "") +
    '<div class="adm-bar">' +
      '<select id="zVenue" class="adm-select" aria-label="Lọc theo địa điểm"><option value="">Tất cả địa điểm</option>' +
        venueOpts.map(([k, t]) => '<option value="' + k + '"' + (String(k) === String(PICK.venue) ? " selected" : "") + ">" + esc(t) + "</option>").join("") +
      "</select>" +
      '<button class="btn adm-bar__new" type="button" id="zNew">+ Thêm khu vực</button>' +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      "<th>Khu vực</th><th>Địa điểm</th><th class=\"num\">Sức chứa</th><th>Ghế đã tạo</th><th></th>" +
    '</tr></thead><tbody id="zRows">' +
    (zones.length ? zones.map((z) => {
      const pct = z.capacity ? Math.min(100, Math.round(100 * (z.seat_count || 0) / z.capacity)) : 0;
      return "<tr><td><strong>" + esc(z.zone_name) + "</strong></td><td>" + esc(z.venue_name) + "</td>" +
        '<td class="num">' + Number(z.capacity).toLocaleString("vi-VN") + "</td>" +
        '<td><div class="bar"><span style="width:' + pct + '%"></span></div><small class="muted">' + (z.seat_count || 0) + "/" + z.capacity + " ghế</small></td>" +
        '<td class="adm-actions"><a class="btn btn--ghost btn--small" href="#seats" data-zone="' + z.zone_id + '" data-zvenue="' + z.venue_id + '">Sơ đồ ghế</a>' +
        '<button type="button" class="btn btn--ghost btn--small" data-edit="' + z.zone_id + '">Sửa</button></td></tr>';
    }).join("") : '<tr><td colspan="5" class="empty">Chưa có khu vực nào' + (PICK.venue ? " ở địa điểm này" : "") + ".</td></tr>") +
    "</tbody></table></div></section>";

  const form = (z) => openForm({
    title: z ? "Sửa khu vực" : "Thêm khu vực",
    submit: z ? "Lưu thay đổi" : "Thêm khu vực",
    values: z || { venue_id: PICK.venue },
    fields: [
      { id: "venue_id", label: "Thuộc địa điểm", type: "select", numeric: true, required: true, options: venueOpts, placeholder: "Chọn địa điểm" },
      { id: "zone_name", label: "Tên khu", required: true, maxlength: 50, hint: "Ví dụ: VIP A, GA 1B, CAT 2" },
      { id: "capacity", label: "Sức chứa (số ghế tối đa)", type: "number", required: true, min: 1,
        check: (raw) => z && Number(raw) < (z.seat_count || 0) ? "Khu đã có " + z.seat_count + " ghế, sức chứa không được nhỏ hơn" : "" },
    ],
    onSave: (d) => z ? API.request("PUT", "/admin/zones/" + z.zone_id, d) : API.post("/admin/zones", d),
    onDelete: z ? () => confirmDelete("Xoá khu “" + z.zone_name + "”? Chỉ xoá được khi khu chưa có ghế và chưa được đặt giá trong sự kiện nào.", "/admin/zones/" + z.zone_id) : null,
  });

  $("zVenue").addEventListener("change", (e) => { PICK.venue = e.target.value; route(); });
  $("zNew").addEventListener("click", () => form(null));
  $("zRows").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]"), go = e.target.closest("[data-zone]");
    if (ed) form(zones.find((z) => String(z.zone_id) === ed.dataset.edit));
    if (go) { PICK.zone = go.dataset.zone; PICK.venue = go.dataset.zvenue; }
  });
}

// =====================================================================
//  4. Quan ly ghe (SEAT)
//  API: GET /admin/zones/<id>/seats, POST /admin/zones/<id>/seats (1 ghe),
//       POST /admin/zones/<id>/seats/bulk (hang loat), PUT/DELETE /admin/seats/<id>
//  Moi ghe: { seat_id, seat_row, seat_number, used }  (used = da co ve, khong xoa duoc)
// =====================================================================
async function viewSeats(box) {
  const [{ data: venues }, { data: allZones, missing }] = await Promise.all([tryList("/admin/venues"), tryList("/admin/zones")]);
  const zones = allZones.filter((z) => !PICK.venue || String(z.venue_id) === String(PICK.venue));
  if (PICK.zone && !zones.some((z) => String(z.zone_id) === String(PICK.zone))) PICK.zone = "";
  const zone = zones.find((z) => String(z.zone_id) === String(PICK.zone));

  box.innerHTML = (missing ? missingNote("/admin/zones") : "") +
    '<div class="adm-bar">' +
      '<select id="sVenue" class="adm-select" aria-label="Chọn địa điểm"><option value="">Tất cả địa điểm</option>' +
        venues.map((v) => '<option value="' + v.venue_id + '"' + (String(v.venue_id) === String(PICK.venue) ? " selected" : "") + ">" + esc(v.venue_name) + "</option>").join("") +
      "</select>" +
      '<select id="sZone" class="adm-select" aria-label="Chọn khu vực"><option value="">Chọn khu vực</option>' +
        zones.map((z) => '<option value="' + z.zone_id + '"' + (String(z.zone_id) === String(PICK.zone) ? " selected" : "") + ">" + esc(z.zone_name) + (PICK.venue ? "" : " · " + esc(z.venue_name)) + "</option>").join("") +
      "</select>" +
      (zone ? '<button class="btn btn--ghost" type="button" id="sOne">+ Thêm 1 ghế</button><button class="btn" type="button" id="sBulk">+ Tạo ghế hàng loạt</button>' : "") +
    '</div><div id="seatBox"></div>';

  $("sVenue").addEventListener("change", (e) => { PICK.venue = e.target.value; PICK.zone = ""; route(); });
  $("sZone").addEventListener("change", (e) => { PICK.zone = e.target.value; route(); });
  const sb = $("seatBox");
  if (!zone) { sb.innerHTML = '<section class="panel"><p class="empty">Chọn một khu vực để xem và chỉnh sơ đồ ghế.</p></section>'; return; }

  const { data: seats } = await tryList("/admin/zones/" + zone.zone_id + "/seats");
  const room = zone.capacity - seats.length;
  const rows = {};
  seats.forEach((s) => (rows[s.seat_row] = rows[s.seat_row] || []).push(s));
  const rowKeys = Object.keys(rows).sort((a, b) => a.length - b.length || a.localeCompare(b));

  sb.innerHTML = '<section class="panel">' +
    '<div class="adm-head"><h2>' + esc(zone.zone_name) + " · " + esc(zone.venue_name) + "</h2>" +
      '<span class="muted">' + seats.length + "/" + zone.capacity + " ghế" + (room > 0 ? ", còn tạo thêm được " + room : ", đã đủ sức chứa") + "</span></div>" +
    (seats.length
      ? '<div class="adm-seatwrap"><div class="adm-seatmap">' + rowKeys.map((r) =>
          '<div class="adm-seatrow"><span class="adm-rowlabel">' + esc(r) + "</span>" +
          rows[r].sort((a, b) => a.seat_number - b.seat_number).map((s) =>
            '<button type="button" class="adm-seat' + (s.used ? " is-used" : "") + '" data-seat="' + s.seat_id + '" ' +
            'aria-label="Hàng ' + esc(r) + " ghế " + s.seat_number + (s.used ? ", đã có vé" : "") + '">' + s.seat_number + "</button>").join("") +
          "</div>").join("") + "</div></div>" +
        '<div class="adm-legend"><span><i class="adm-seat"></i>Ghế trống</span><span><i class="adm-seat is-used"></i>Đã có vé (không xoá được)</span><span class="muted">Bấm vào ghế để sửa hoặc xoá</span></div>'
      : '<p class="empty">Khu này chưa có ghế. Dùng “Tạo ghế hàng loạt” để sinh nhanh nhiều hàng.</p>') +
  "</section>";

  const seatForm = (s) => openForm({
    title: s ? "Sửa ghế " + s.seat_row + s.seat_number : "Thêm 1 ghế",
    submit: s ? "Lưu thay đổi" : "Thêm ghế",
    values: s,
    intro: s && s.used ? "Ghế này đã có vé nên không thể xoá." : "",
    fields: [
      { id: "seat_row", label: "Hàng", required: true, maxlength: 5, half: true, hint: "Ví dụ: A" },
      { id: "seat_number", label: "Số ghế", type: "number", required: true, min: 1, half: true,
        check: (raw, d) => seats.some((x) => x !== s && x.seat_row.toUpperCase() === String(d.seat_row || $("g_seat_row").value).trim().toUpperCase() && x.seat_number === Number(raw)) ? "Ghế này đã tồn tại" : "" },
    ],
    onSave: (d) => {
      d.seat_row = d.seat_row.toUpperCase();
      if (!s && room <= 0) throw new Error("Khu đã đủ sức chứa. Tăng sức chứa ở mục Khu vực trước.");
      return s ? API.request("PUT", "/admin/seats/" + s.seat_id, d) : API.post("/admin/zones/" + zone.zone_id + "/seats", d);
    },
    onDelete: s && !s.used ? () => confirmDelete("Xoá ghế " + s.seat_row + s.seat_number + "?", "/admin/seats/" + s.seat_id) : null,
  });

  $("sOne").addEventListener("click", () => seatForm(null));
  $("sBulk").addEventListener("click", () => openForm({
    title: "Tạo ghế hàng loạt",
    submit: "Tạo ghế",
    intro: "Ví dụ: hàng bắt đầu A, 5 hàng, 10 ghế mỗi hàng sẽ tạo A1–A10 đến E1–E10. Ghế đã tồn tại sẽ được bỏ qua. Khu còn tạo thêm được " + room + " ghế.",
    values: { start_row: rowKeys.length ? String.fromCharCode(rowKeys[rowKeys.length - 1].charCodeAt(0) + 1) : "A", rows: 1, per_row: 10 },
    fields: [
      { id: "start_row", label: "Hàng bắt đầu", required: true, maxlength: 1, check: (raw) => /^[A-Za-z]$/.test(raw) ? "" : "Nhập 1 chữ cái từ A đến Z" },
      { id: "rows", label: "Số hàng", type: "number", required: true, min: 1, max: 26, half: true },
      { id: "per_row", label: "Ghế mỗi hàng", type: "number", required: true, min: 1, max: 200, half: true,
        check: (raw) => Number(raw) * Number($("g_rows").value) > room ? "Vượt sức chứa: chỉ tạo thêm được " + room + " ghế" : "" },
    ],
    onSave: (d) => {
      d.start_row = d.start_row.toUpperCase();
      if (d.start_row.charCodeAt(0) + d.rows - 1 > 90) throw new Error("Hàng cuối vượt quá Z. Giảm số hàng hoặc chọn hàng bắt đầu sớm hơn.");
      return API.post("/admin/zones/" + zone.zone_id + "/seats/bulk", d);
    },
  }));
  sb.addEventListener("click", (e) => {
    const b = e.target.closest("[data-seat]");
    if (b) seatForm(seats.find((s) => String(s.seat_id) === b.dataset.seat));
  });
}

// Chon su kien dung chung cho Gia ve va Ve
PICK.event = "";
async function eventPicker() {
  const { data: evs } = await tryList("/admin/events");
  const now = new Date();
  // Mac dinh chon su kien sap dien ra gan nhat
  if (!PICK.event && evs.length) {
    const next = evs.find((e) => parseDt(e.start_time) > now) || evs[evs.length - 1];
    PICK.event = String(next.event_id);
  }
  const html = '<select id="pEvent" class="adm-select adm-select--wide" aria-label="Chọn sự kiện">' +
    (evs.length ? "" : '<option value="">Chưa có sự kiện</option>') +
    evs.map((e) => '<option value="' + e.event_id + '"' + (String(e.event_id) === PICK.event ? " selected" : "") + ">" +
      esc(e.event_name) + " · " + fmtDt(e.start_time) + "</option>").join("") + "</select>";
  return { evs, html };
}
function bindEventPicker() {
  $("pEvent").addEventListener("change", (e) => { PICK.event = e.target.value; PICK.zone = ""; route(); });
}

// =====================================================================
//  6. Quan ly gia ve: dat gia tung khu cho 1 su kien (sinh ve cho moi ghe)
// =====================================================================
async function viewPricing(box) {
  const { evs, html } = await eventPicker();
  if (!evs.length) { box.innerHTML = '<section class="panel"><p class="empty">Chưa có sự kiện. <a href="#events">Tạo sự kiện</a> trước.</p></section>'; return; }
  const { event: ev, zones } = await API.get("/admin/pricing?event_id=" + PICK.event);
  const priced = zones.filter((z) => z.price != null);
  const sum = (k) => priced.reduce((s, z) => s + Number(z[k]), 0);

  box.innerHTML = '<div class="adm-bar">' + html + "</div>" +
    (ev.started ? '<p class="msg msg--info">Sự kiện đã bắt đầu nên không đổi giá được nữa. Bạn vẫn xem được số vé.</p>' : "") +
    '<div class="adm-stats">' +
      stat("Khu đang bán", priced.length + "/" + zones.length, "khu của " + esc(ev.venue_name)) +
      stat("Vé còn trống", sum("available").toLocaleString("vi-VN"), "trên " + sum("total").toLocaleString("vi-VN") + " vé") +
      stat("Đang giữ chỗ", sum("reserved").toLocaleString("vi-VN"), "chờ khách thanh toán") +
      stat("Đã bán", sum("sold").toLocaleString("vi-VN"), money(priced.reduce((s, z) => s + z.sold * z.price, 0))) +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      '<th>Khu</th><th class="num">Giá vé</th><th>Tình trạng vé</th><th></th>' +
    "</tr></thead><tbody id=\"prRows\">" +
    (zones.length ? zones.map((z) => {
      const on = z.price != null;
      const seg = (n, cls) => (z.total ? '<i class="' + cls + '" style="width:' + (100 * n / z.total) + '%"></i>' : "");
      return "<tr><td><strong>" + esc(z.zone_name) + '</strong><small class="muted adm-sub">' + z.seat_count + " ghế · sức chứa " + z.capacity + "</small></td>" +
        '<td class="num">' + (on ? "<strong>" + money(z.price) + "</strong>" : '<span class="muted">Chưa bán</span>') + "</td>" +
        "<td>" + (on
          ? '<div class="adm-stack">' + seg(z.sold, "s-sold") + seg(z.reserved, "s-res") + seg(z.available, "s-free") + "</div>" +
            '<small class="muted">Còn ' + z.available + " · Giữ " + z.reserved + " · Bán " + z.sold + "</small>"
          : z.seat_count ? '<small class="muted">Đặt giá để mở bán ' + z.seat_count + " vé</small>"
                         : '<small class="muted">Khu chưa có ghế. <a href="#seats" data-zone="' + z.zone_id + '">Tạo ghế</a></small>') + "</td>" +
        '<td class="adm-actions">' + (ev.started || !z.seat_count ? "" :
          '<button type="button" class="btn ' + (on ? "btn--ghost " : "") + 'btn--small" data-price="' + z.zone_id + '">' + (on ? "Sửa giá" : "Đặt giá") + "</button>") +
        "</td></tr>";
    }).join("") : '<tr><td colspan="4" class="empty">Địa điểm của sự kiện chưa có khu nào. <a href="#zones">Thêm khu</a></td></tr>') +
    "</tbody></table></div>" +
    '<div class="adm-legend"><span><i class="adm-dot s-sold"></i>Đã bán</span><span><i class="adm-dot s-res"></i>Đang giữ</span><span><i class="adm-dot s-free"></i>Còn trống</span></div>' +
    "</section>";

  bindEventPicker();
  $("prRows").addEventListener("click", (e) => {
    const go = e.target.closest("[data-zone]");
    if (go) { PICK.zone = go.dataset.zone; PICK.venue = String(ev.venue_id); return; }
    const b = e.target.closest("[data-price]");
    if (!b) return;
    const z = zones.find((x) => String(x.zone_id) === b.dataset.price);
    const on = z.price != null;
    openForm({
      title: (on ? "Sửa giá khu " : "Đặt giá khu ") + z.zone_name,
      submit: on ? "Lưu giá mới" : "Mở bán khu này",
      values: { price: on ? z.price : "" },
      intro: on
        ? "Giá mới áp dụng cho " + z.available + " vé còn trống. Vé đã giữ hoặc đã bán giữ nguyên giá lúc mua."
        : "Hệ thống sẽ tạo " + z.seat_count + " vé (mỗi ghế một vé) ở trạng thái Còn trống để khách có thể mua.",
      fields: [{ id: "price", label: "Giá vé (đồng)", type: "number", required: true, min: 0, hint: "Ví dụ: 1500000. Nhập 0 nếu vé miễn phí." }],
      onSave: (d) => API.request("PUT", "/admin/pricing/" + ev.event_id + "/" + z.zone_id, d),
      onDelete: on ? () => {
        if (z.reserved + z.sold) { alert("Khu đã có " + (z.reserved + z.sold) + " vé được giữ hoặc đã bán nên không thể ngừng bán."); return false; }
        return confirmDelete("Ngừng bán khu " + z.zone_name + "? " + z.total + " vé còn trống của khu sẽ bị xoá.",
          "/admin/pricing/" + ev.event_id + "/" + z.zone_id);
      } : null,
    });
    const del = $("gDel"); if (del) del.textContent = "Ngừng bán";
  });
}

// =====================================================================
//  7. Quan ly ve
// =====================================================================
const TICKET_STATUS = { AVAILABLE: ["Còn trống", "off"], RESERVED: ["Đang giữ", "soon"], SOLD: ["Đã bán", "on"] };

async function viewTickets(box) {
  const { evs, html } = await eventPicker();
  if (!evs.length) { box.innerHTML = '<section class="panel"><p class="empty">Chưa có sự kiện.</p></section>'; return; }
  const tickets = await API.get("/admin/tickets?event_id=" + PICK.event);
  const zones = [];
  tickets.forEach((t) => { if (!zones.some((z) => z[0] === t.zone_id)) zones.push([t.zone_id, t.zone_name]); });
  const count = (s) => tickets.filter((t) => t.ticket_status === s).length;
  let status = "ALL";

  box.innerHTML = '<div class="adm-bar">' + html +
      '<select id="tZone" class="adm-select" aria-label="Lọc theo khu"><option value="">Tất cả khu</option>' +
        zones.map(([k, n]) => '<option value="' + k + '"' + (String(k) === String(PICK.zone) ? " selected" : "") + ">" + esc(n) + "</option>").join("") + "</select>" +
    "</div>" +
    '<div class="adm-bar">' +
      '<input id="tQ" class="adm-search" type="search" placeholder="Tìm ghế (A5), mã QR, tên hoặc email khách, mã đơn" aria-label="Tìm vé">' +
      '<div class="chips" role="group" aria-label="Lọc theo trạng thái">' +
        [["ALL", "Tất cả", tickets.length], ["AVAILABLE", "Còn trống", count("AVAILABLE")], ["RESERVED", "Đang giữ", count("RESERVED")], ["SOLD", "Đã bán", count("SOLD")]]
          .map(([k, t, n]) => '<button class="chip" type="button" data-s="' + k + '" aria-pressed="' + (k === status) + '">' + t + " (" + n + ")</button>").join("") +
      "</div>" +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      '<th>Vé</th><th>Khu · Ghế</th><th class="num">Giá</th><th>Trạng thái</th><th>Khách</th><th>Vào cổng</th><th></th>' +
    '</tr></thead><tbody id="tRows"></tbody></table></div><p class="muted adm-count" id="tCount"></p></section>';

  const LIMIT = 300;
  function draw() {
    const q = $("tQ").value.trim().toLowerCase();
    const zone = $("tZone").value;
    const shown = tickets.filter((t) =>
      (status === "ALL" || t.ticket_status === status) &&
      (!zone || String(t.zone_id) === zone) &&
      (!q || [t.seat_row + t.seat_number, t.qrcode, t.full_name, t.email, t.order_id ? "#" + t.order_id : "", String(t.order_id || "")]
        .some((x) => x && String(x).toLowerCase().includes(q))));
    $("tRows").innerHTML = shown.length ? shown.slice(0, LIMIT).map((t) =>
      '<tr><td><strong>#' + t.ticket_no + "</strong></td>" +
      "<td>" + esc(t.zone_name) + " · " + esc(t.seat_row) + t.seat_number + "</td>" +
      '<td class="num">' + money(t.ticket_price) + "</td>" +
      "<td>" + pill(TICKET_STATUS, t.ticket_status) + "</td>" +
      "<td>" + (t.full_name ? esc(t.full_name) + '<small class="muted adm-sub">Đơn #' + t.order_id + "</small>" : '<span class="muted">—</span>') + "</td>" +
      "<td>" + (t.checkin_at ? '<span class="pill pill--on">' + fmtDt(t.checkin_at) + "</span>" : '<span class="muted">Chưa</span>') + "</td>" +
      '<td class="adm-actions"><button type="button" class="btn btn--ghost btn--small" data-qr="' + t.ticket_no + '">Mã QR</button></td></tr>').join("")
      : '<tr><td colspan="7" class="empty">' + (tickets.length ? "Không có vé phù hợp." : 'Sự kiện chưa có vé. Vào <a href="#pricing">Giá vé</a> để đặt giá và mở bán.') + "</td></tr>";
    $("tCount").textContent = shown.length > LIMIT ? "Đang hiện " + LIMIT + "/" + shown.length + " vé. Dùng ô tìm kiếm hoặc bộ lọc để thu hẹp." : shown.length + " vé";
  }
  draw();
  bindEventPicker();
  $("tZone").addEventListener("change", (e) => { PICK.zone = e.target.value; draw(); });
  $("tQ").addEventListener("input", draw);
  box.querySelectorAll("[data-s]").forEach((c) => c.addEventListener("click", () => {
    status = c.dataset.s;
    box.querySelectorAll("[data-s]").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    draw();
  }));
  $("tRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qr]");
    if (b) showQR(tickets.find((t) => String(t.ticket_no) === b.dataset.qr));
  });
}

// Khung xem ma QR cua 1 ve
function showQR(t) {
  let d = $("qrModal");
  if (!d) {
    d = document.createElement("div");
    d.id = "qrModal"; d.className = "adm-drawer"; d.hidden = true;
    document.body.appendChild(d);
    d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) { d.hidden = true; document.body.classList.remove("am-lock"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !d.hidden) { d.hidden = true; document.body.classList.remove("am-lock"); } });
  }
  d.innerHTML = '<div class="adm-drawer__bg" data-close></div>' +
    '<div class="adm-drawer__box" role="dialog" aria-labelledby="qrTitle">' +
      '<div class="adm-drawer__head"><h2 id="qrTitle">Vé #' + t.ticket_no + "</h2>" +
        '<button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="adm-drawer__body adm-qr">' +
        '<div class="qr" data-code="' + esc(t.qrcode) + '"></div>' +
        '<code class="ticket__code">' + esc(t.qrcode) + "</code>" +
        '<dl class="adm-dl"><dt>Khu · Ghế</dt><dd>' + esc(t.zone_name) + " · hàng " + esc(t.seat_row) + ", ghế " + t.seat_number + "</dd>" +
        "<dt>Giá</dt><dd>" + money(t.ticket_price) + "</dd>" +
        "<dt>Trạng thái</dt><dd>" + pill(TICKET_STATUS, t.ticket_status) + "</dd>" +
        (t.full_name ? "<dt>Khách</dt><dd>" + esc(t.full_name) + '<small class="muted adm-sub">' + esc(t.email) + "</small></dd><dt>Đơn hàng</dt><dd>#" + t.order_id + "</dd>" : "") +
        "<dt>Vào cổng</dt><dd>" + (t.checkin_at ? fmtDt(t.checkin_at) : "Chưa") + "</dd></dl>" +
        (t.ticket_status !== "SOLD" ? '<p class="muted adm-hint">Mã QR chỉ dùng được để vào cổng khi vé ở trạng thái Đã bán.</p>' : "") +
      "</div></div>";
  d.hidden = false;
  document.body.classList.add("am-lock");
  drawQRs(d);
}

// Khung xem chi tiet truot ben phai (chi doc), dung chung
function openPanel(title, html) {
  let d = $("vPanel");
  if (!d) {
    d = document.createElement("div");
    d.id = "vPanel"; d.className = "adm-drawer"; d.hidden = true;
    document.body.appendChild(d);
    const close = () => { d.hidden = true; document.body.classList.remove("am-lock"); };
    d.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !d.hidden) close(); });
  }
  d.innerHTML = '<div class="adm-drawer__bg" data-close></div>' +
    '<div class="adm-drawer__box adm-drawer__box--wide" role="dialog" aria-labelledby="vpTitle">' +
      '<div class="adm-drawer__head"><h2 id="vpTitle">' + title + "</h2>" +
        '<button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="adm-drawer__body" id="vpBody">' + html + "</div></div>";
  d.hidden = false;
  document.body.classList.add("am-lock");
  return $("vpBody");
}

// =====================================================================
//  8. Quan ly don hang
// =====================================================================
const minsLeft = (s) => Math.ceil(Number(s || 0) / 60);
const METHOD_NAME = { MOMO: "Ví MoMo", VNPAY: "VNPAY-QR", CARD: "Thẻ" };

function orderStatusCell(o) {
  const p = pill(ORDER_STATUS, o.order_status);
  if (o.order_status === "PENDING") return p + '<small class="muted adm-sub">' + (o.seconds_left > 0 ? "còn " + minsLeft(o.seconds_left) + " phút" : "đã quá hạn") + "</small>";
  return p;
}

async function showOrder(id) {
  const body = openPanel("Đơn #" + id, '<p class="empty">Đang tải...</p>');
  try {
    const o = await API.get("/admin/orders/" + id);
    body.innerHTML =
      '<dl class="adm-dl adm-dl--top">' +
        "<dt>Trạng thái</dt><dd>" + orderStatusCell(o) + "</dd>" +
        "<dt>Khách</dt><dd>" + esc(o.full_name) + '<small class="muted adm-sub">' + esc(o.email) + " · " + esc(o.phone) + "</small></dd>" +
        "<dt>Sự kiện</dt><dd>" + (o.event_name ? esc(o.event_name) + '<small class="muted adm-sub">Khu ' + esc(o.zone_name || "") + "</small>" : '<span class="muted">Không còn liên kết vé</span>') + "</dd>" +
        "<dt>Số vé</dt><dd>" + o.ticket_quantity + "</dd>" +
        "<dt>Tổng tiền</dt><dd>" + money(o.ticket_amount) + "</dd>" +
        "<dt>Tạo lúc</dt><dd>" + fmtDt(o.create_at) + "</dd>" +
        "<dt>Thanh toán</dt><dd>" + (o.pay_at ? (METHOD_NAME[o.method] || esc(o.method)) + " lúc " + fmtDt(o.pay_at) : '<span class="muted">Chưa thanh toán</span>') + "</dd>" +
      "</dl>" +
      "<h3 class=\"adm-h3\">Vé trong đơn</h3>" +
      (o.tickets.length ? renderTickets(o)
        : '<p class="muted">' + (o.order_status === "FAILED" ? "Đơn đã huỷ hoặc quá hạn nên vé đã được trả lại." : "Không có vé.") + "</p>");
    body.style.setProperty("--notch", "var(--surface)");
    drawQRs(body);
  } catch (err) { body.innerHTML = '<p class="msg msg--error">' + esc(err.message) + "</p>"; }
}

async function viewOrders(box) {
  const orders = await API.get("/admin/orders");
  const by = (s) => orders.filter((o) => o.order_status === s);
  const paid = by("PAID");
  let status = "ALL";
  const events = [];
  orders.forEach((o) => { if (o.event_id && !events.some((e) => e[0] === o.event_id)) events.push([o.event_id, o.event_name]); });

  box.innerHTML =
    '<div class="adm-stats">' +
      stat("Tổng số đơn", orders.length, orders.reduce((s, o) => s + o.ticket_quantity, 0) + " vé được đặt") +
      stat("Đã thanh toán", paid.length, money(paid.reduce((s, o) => s + Number(o.ticket_amount), 0))) +
      stat("Chờ thanh toán", by("PENDING").length, "đang giữ chỗ") +
      stat("Đã huỷ", by("FAILED").length, "huỷ hoặc quá hạn") +
    "</div>" +
    '<div class="adm-bar">' +
      '<input id="oQ" class="adm-search" type="search" placeholder="Tìm mã đơn, tên, email, số điện thoại" aria-label="Tìm đơn hàng">' +
      '<select id="oEv" class="adm-select" aria-label="Lọc theo sự kiện"><option value="">Tất cả sự kiện</option>' +
        events.map(([k, n]) => '<option value="' + k + '">' + esc(n) + "</option>").join("") + "</select>" +
      '<div class="chips" role="group" aria-label="Lọc theo trạng thái">' +
        [["ALL", "Tất cả"], ["PAID", "Đã thanh toán"], ["PENDING", "Chờ thanh toán"], ["FAILED", "Đã huỷ"]].map(([k, t]) =>
          '<button class="chip" type="button" data-s="' + k + '" aria-pressed="' + (k === status) + '">' + t + "</button>").join("") +
      "</div>" +
    "</div>" +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      '<th>Đơn</th><th>Khách hàng</th><th>Sự kiện · Khu</th><th class="num">Vé</th><th class="num">Tổng tiền</th><th>Trạng thái</th><th>Thanh toán</th><th></th>' +
    '</tr></thead><tbody id="oRows"></tbody></table></div><p class="muted adm-count" id="oCount"></p></section>';

  function draw() {
    const q = $("oQ").value.trim().toLowerCase().replace(/^#/, "");
    const ev = $("oEv").value;
    const shown = orders.filter((o) =>
      (status === "ALL" || o.order_status === status) &&
      (!ev || String(o.event_id) === ev) &&
      (!q || [String(o.order_id), o.full_name, o.email, o.phone].some((x) => x && String(x).toLowerCase().includes(q))));
    $("oRows").innerHTML = shown.length ? shown.map((o) =>
      "<tr><td><strong>#" + o.order_id + '</strong><small class="muted adm-sub">' + fmtDt(o.create_at) + "</small></td>" +
      "<td>" + esc(o.full_name) + '<small class="muted adm-sub">' + esc(o.email) + "</small></td>" +
      "<td>" + (o.event_name ? esc(o.event_name) + '<small class="muted adm-sub">' + esc(o.zone_name || "") + "</small>" : '<span class="muted">—</span>') + "</td>" +
      '<td class="num">' + o.ticket_quantity + "</td>" +
      '<td class="num">' + money(o.ticket_amount) + "</td>" +
      "<td>" + orderStatusCell(o) + "</td>" +
      "<td>" + (o.pay_at ? (METHOD_NAME[o.method] || esc(o.method)) + '<small class="muted adm-sub">' + fmtDt(o.pay_at) + "</small>" : '<span class="muted">—</span>') + "</td>" +
      '<td class="adm-actions"><button type="button" class="btn btn--ghost btn--small" data-order="' + o.order_id + '">Chi tiết</button></td></tr>').join("")
      : '<tr><td colspan="8" class="empty">' + (orders.length ? "Không có đơn phù hợp." : "Chưa có đơn hàng nào.") + "</td></tr>";
    $("oCount").textContent = shown.length + " đơn";
  }
  draw();
  $("oQ").addEventListener("input", draw);
  $("oEv").addEventListener("change", draw);
  box.querySelectorAll("[data-s]").forEach((c) => c.addEventListener("click", () => {
    status = c.dataset.s;
    box.querySelectorAll("[data-s]").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    draw();
  }));
  $("oRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-order]");
    if (b) showOrder(b.dataset.order);
  });
}

// =====================================================================
//  9. Quan ly khach hang
// =====================================================================
async function showCustomer(c) {
  const body = openPanel(esc(c.full_name),
    '<div class="adm-who"><span class="as__avatar" aria-hidden="true">' + esc([...(c.full_name.trim().split(/\s+/).pop() || "?")][0].toUpperCase()) + "</span>" +
      "<div><strong>" + esc(c.full_name) + '</strong><small class="muted adm-sub">@' + esc(c.username) + " · mã KH " + c.customer_id + "</small></div></div>" +
    '<dl class="adm-dl adm-dl--top"><dt>Email</dt><dd>' + esc(c.email) + "</dd><dt>Điện thoại</dt><dd>" + esc(c.phone) + "</dd>" +
      "<dt>Đã mua</dt><dd>" + c.tickets + " vé trong " + c.paid_count + " đơn</dd><dt>Tổng chi tiêu</dt><dd>" + money(c.spent) + "</dd></dl>" +
    '<h3 class="adm-h3">Lịch sử đơn hàng</h3><div id="cOrders"><p class="empty">Đang tải...</p></div>');
  try {
    const orders = await API.get("/admin/orders?customer_id=" + c.customer_id);
    $("cOrders").innerHTML = orders.length ? '<ul class="adm-olist">' + orders.map((o) =>
      '<li><button type="button" data-order="' + o.order_id + '"><span><strong>#' + o.order_id + " · " + esc(o.event_name || "—") + "</strong>" +
      '<small class="muted adm-sub">' + fmtDt(o.create_at) + " · " + o.ticket_quantity + " vé · " + money(o.ticket_amount) + "</small></span>" +
      pill(ORDER_STATUS, o.order_status) + "</button></li>").join("") + "</ul>"
      : '<p class="muted">Khách chưa có đơn hàng nào.</p>';
    body.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => showOrder(b.dataset.order)));
  } catch (err) { $("cOrders").innerHTML = '<p class="msg msg--error">' + esc(err.message) + "</p>"; }
}

async function viewCustomers(box) {
  const list = await API.get("/admin/customers");
  const buyers = list.filter((c) => c.paid_count > 0);
  box.innerHTML =
    '<div class="adm-stats">' +
      stat("Khách hàng", list.length, "tài khoản đã đăng ký") +
      stat("Đã mua vé", buyers.length, list.length ? Math.round(100 * buyers.length / list.length) + "% số khách" : "") +
      stat("Vé đã bán", list.reduce((s, c) => s + Number(c.tickets), 0), "qua các đơn đã thanh toán") +
      stat("Chi tiêu trung bình", money(buyers.length ? Math.round(buyers.reduce((s, c) => s + Number(c.spent), 0) / buyers.length) : 0), "mỗi khách đã mua") +
    "</div>" +
    '<div class="adm-bar"><input id="cQ" class="adm-search" type="search" placeholder="Tìm theo tên, email, số điện thoại, tên đăng nhập" aria-label="Tìm khách hàng"></div>' +
    '<section class="panel"><div class="table-wrap adm-table"><table><thead><tr>' +
      '<th>Khách hàng</th><th>Liên hệ</th><th class="num">Đơn</th><th class="num">Vé</th><th class="num">Chi tiêu</th><th>Đơn gần nhất</th><th></th>' +
    '</tr></thead><tbody id="cRows"></tbody></table></div><p class="muted adm-count" id="cCount"></p></section>';

  function draw() {
    const q = $("cQ").value.trim().toLowerCase();
    const shown = list.filter((c) => !q || [c.full_name, c.email, c.phone, c.username].some((x) => x && String(x).toLowerCase().includes(q)));
    $("cRows").innerHTML = shown.length ? shown.map((c) =>
      "<tr><td><strong>" + esc(c.full_name) + '</strong><small class="muted adm-sub">@' + esc(c.username) + "</small></td>" +
      "<td>" + esc(c.email) + '<small class="muted adm-sub">' + esc(c.phone) + "</small></td>" +
      '<td class="num">' + c.paid_count + '<small class="muted">/' + c.order_count + "</small></td>" +
      '<td class="num">' + c.tickets + "</td>" +
      '<td class="num">' + money(c.spent) + "</td>" +
      "<td>" + (c.last_order ? fmtDt(c.last_order) : '<span class="muted">Chưa mua</span>') + "</td>" +
      '<td class="adm-actions"><button type="button" class="btn btn--ghost btn--small" data-cust="' + c.customer_id + '">Xem</button></td></tr>').join("")
      : '<tr><td colspan="7" class="empty">' + (list.length ? "Không tìm thấy khách hàng phù hợp." : "Chưa có khách hàng nào đăng ký.") + "</td></tr>";
    $("cCount").textContent = shown.length + " khách hàng · cột Đơn = đã thanh toán/tổng số đơn";
  }
  draw();
  $("cQ").addEventListener("input", draw);
  $("cRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cust]");
    if (b) showCustomer(list.find((c) => String(c.customer_id) === b.dataset.cust));
  });
}

// ---------- Muc chua lam ----------
function viewTodo(box, key) {
  box.innerHTML = '<section class="panel adm-todo">' + ICONS[key] +
    "<h2>" + TITLES[key] + "</h2><ul>" + TODO[key].map((t) => "<li>" + t + "</li>").join("") + "</ul>" +
    '<p class="muted">Mục này sẽ được làm ở các bước tiếp theo.</p></section>';
}

// ---------- Dieu huong ----------
async function route() {
  const key = (location.hash.slice(1) || "dashboard");
  const k = TITLES[key] ? key : "dashboard";
  renderSide(k);
  $("title").textContent = TITLES[k];
  document.title = TITLES[k] + " | Quản trị MyTickets";
  showMsg($("msg"), "");
  const box = $("view");
  box.innerHTML = '<p class="empty">Đang tải...</p>';
  try {
    if (k === "dashboard") await viewDashboard(box);
    else if (k === "events") await viewEvents(box);
    else if (k === "venues") await viewVenues(box);
    else if (k === "zones") await viewZones(box);
    else if (k === "seats") await viewSeats(box);
    else if (k === "pricing") await viewPricing(box);
    else if (k === "tickets") await viewTickets(box);
    else if (k === "orders") await viewOrders(box);
    else if (k === "customers") await viewCustomers(box);
    else viewTodo(box, k);
  } catch (err) {
    box.innerHTML = "";
    showMsg($("msg"), err.message);
  }
  window.scrollTo({ top: 0 });
}

(async () => {
  const me = await initPage("admin");   // khong phai admin thi chuyen sang trang dang nhap
  if (!me) return;
  window.addEventListener("hashchange", route);
  route();
})();