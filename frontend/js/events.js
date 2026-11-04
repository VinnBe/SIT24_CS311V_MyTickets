/* Trang chu: banner noi bat, ban chay, sap mo ban, tat ca su kien (tim kiem + loc) */

// Cap mau poster tu sinh, chon theo event_id nen moi su kien co mau rieng
const POSTER_COLORS = [
  ["#FF4D8D", "#6B2BD9"], ["#FFB547", "#E8466A"], ["#2EC4B6", "#3A47D5"],
  ["#8E44FF", "#FF4D8D"], ["#FF7A45", "#7A1FA2"], ["#2BD07F", "#1F6FEB"],
];
const posterStyle = (id) => {
  const [c1, c2] = POSTER_COLORS[id % POSTER_COLORS.length];
  return "--c1:" + c1 + ";--c2:" + c2;
};
const ICON_CAL = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

function statusPill(e) {
  if (e.sale_status === "ON_SALE" && e.left === 0) return '<span class="pill pill--bad">Hết vé</span>';
  if (e.sale_status === "STARTED") return '<span class="pill pill--off">Đã diễn ra</span>';
  return pill(EVENT_STATUS, e.sale_status);
}

// "Mo ban sau 3 ngay 4 gio" tinh tu sale_start
function untilText(s) {
  const ms = parseDt(s) - new Date();
  if (ms <= 0) return "Đã mở bán";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  if (d > 0) return "Mở bán sau " + d + " ngày " + h + " giờ";
  return "Mở bán sau " + h + " giờ " + (m % 60) + " phút";
}

function banner(e) {
  return '<a class="banner poster" style="' + posterStyle(e.event_id) + '" href="event.html?id=' + e.event_id + '">' +
    "<div>" + statusPill(e) + "</div>" +
    '<h2 class="banner__title">' + esc(e.event_name) + "</h2>" +
    '<p class="banner__meta">' + fmtDt(e.start_time) + "<br>" + esc(e.venue_name) + "</p>" +
    '<span class="btn">' + (e.sale_status === "ON_SALE" ? "Mua vé ngay" : "Xem chi tiết") + "</span></a>";
}

function rankCard(e, i) {
  return '<a class="rank" href="event.html?id=' + e.event_id + '">' +
    '<span class="rank__no" aria-hidden="true">' + (i + 1) + "</span>" +
    '<div class="rank__card"><div class="poster" style="' + posterStyle(e.event_id) + '">' +
      '<h3 class="rank__name">' + esc(e.event_name) + "</h3></div>" +
    '<div class="rank__body"><div class="bar"><span style="width:' + e.sold_pct + '%"></span></div>' +
      '<p class="card__meta">Đã bán ' + e.sold_pct + "% vé</p></div></div></a>";
}

function card(e) {
  const extra = e.sale_status === "UPCOMING"
    ? '<span class="countdown-chip" data-until="' + esc(e.sale_start) + '">' + untilText(e.sale_start) + "</span>"
    : "";
  return '<a class="card" href="event.html?id=' + e.event_id + '">' +
    '<div class="poster" style="' + posterStyle(e.event_id) + '">' + statusPill(e) +
      '<span class="card__initials" aria-hidden="true">' + esc(e.event_name) + "</span></div>" +
    '<h3 class="card__title">' + esc(e.event_name) + "</h3>" +
    (e.min_price != null ? '<p class="card__price">Từ ' + money(e.min_price) + "</p>" : "") +
    '<p class="card__meta">' + ICON_CAL + fmtDt(e.start_time) + "</p>" + extra + "</a>";
}

(async () => {
  await initPage();
  const $ = (id) => document.getElementById(id);
  let filter = "ALL";
  let events = [];

  try {
    events = await API.get("/events");
    // Lay gia thap nhat, so ve con lai, ti le da ban cua tung su kien
    const details = await Promise.all(events.map((e) =>
      API.get("/events/" + e.event_id).catch(() => null)));
    events = events.map((e, i) => {
      const zones = (details[i] && details[i].zones) || [];
      const total = zones.reduce((s, z) => s + z.total_seats, 0);
      const left = zones.reduce((s, z) => s + z.available, 0);
      return Object.assign({}, e, {
        min_price: zones.length ? Math.min(...zones.map((z) => z.price)) : null,
        left: left,
        sold_pct: total ? Math.round(100 * (total - left) / total) : 0,
      });
    });
  } catch (err) {
    $("grid").innerHTML = "";
    showMsg($("msg"), err.message);
    return;
  }

  // 1. Noi bat: toi da 2 su kien dang mo ban con ve (neu khong co thi lay su kien bat ky)
  let featured = events.filter((e) => e.sale_status === "ON_SALE" && e.left > 0).slice(0, 2);
  if (!featured.length) featured = events.slice(0, 2);
  $("banners").innerHTML = featured.map(banner).join("");

  // 2. Ban chay: su kien dang mo ban, xep theo ti le da ban
  const ranks = events.filter((e) => e.sale_status === "ON_SALE" && e.sold_pct > 0)
    .sort((a, b) => b.sold_pct - a.sold_pct).slice(0, 4);
  if (ranks.length) { $("ranks").innerHTML = ranks.map(rankCard).join(""); $("ban-chay").hidden = false; }

  // 3. Sap mo ban, kem dem nguoc den gio mo ban
  const upcoming = events.filter((e) => e.sale_status === "UPCOMING");
  if (upcoming.length) { $("upcoming").innerHTML = upcoming.map(card).join(""); $("sap-mo-ban").hidden = false; }
  setInterval(() => document.querySelectorAll("[data-until]").forEach((el) => {
    el.textContent = untilText(el.dataset.until);
  }), 60000);

  // 4. Tat ca su kien: loc theo trang thai + tim kiem
  function render() {
    const q = $("search").value.trim().toLowerCase();
    $("main").classList.toggle("searching", q !== "");
    $("allTitle").textContent = q ? 'Kết quả cho "' + $("search").value.trim() + '"' : "Tất cả sự kiện";
    const shown = events.filter((e) =>
      (filter === "ALL" || e.sale_status === filter) &&
      (!q || (e.event_name + " " + e.venue_name).toLowerCase().includes(q)));
    $("grid").innerHTML = shown.length
      ? shown.map(card).join("")
      : '<p class="empty">Không có sự kiện phù hợp. Thử từ khoá khác hoặc chọn "Tất cả".</p>';
  }
  document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    render();
  }));
  $("search").addEventListener("input", render);
  render();
})();