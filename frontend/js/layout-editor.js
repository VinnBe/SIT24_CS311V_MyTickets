/* layout-editor.js - Muc "Tao so do su kien" trong trang quan tri (admin.html, #layout)

   Phuong phap 1: Tai so do co san (PDF / PNG / JPG / SVG) lam nen tham chieu, ve Zone de len tren.
   Phuong phap 2: Tu thiet ke: keo tha san khau, khu ghe ngoi, khu dung, da giac, chu.

   Sau khi ve xong: "Luu nhap" chi luu hinh ve; "Luu & tao ghe" xem truoc thay doi roi
   tao / cap nhat khu (zone) va ghe (seat) trong database (backend/venue_layout.py).
   Dung chung: API, esc, showMsg, money (api.js); $, PICK, tryList, apiMissing (admin.js); SeatMap (seatmap.js) */

const LO_I = (d, extra) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + d + "</svg>";
const LO_ICONS = {
  upload: LO_I('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'),
  design: LO_I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  select: LO_I('<path d="M5 3l13 7-6 1.5L9.5 18z"/>'),
  stage: LO_I('<path d="M3 5h18v6H3zM6 11v8M18 11v8"/>'),
  seats: LO_I('<circle cx="6" cy="7" r="1.6"/><circle cx="12" cy="7" r="1.6"/><circle cx="18" cy="7" r="1.6"/><circle cx="6" cy="13" r="1.6"/><circle cx="12" cy="13" r="1.6"/><circle cx="18" cy="13" r="1.6"/><path d="M3 19h18"/>'),
  standing: LO_I('<circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><path d="M5 20v-6a3 3 0 0 1 6 0v6M13 20v-6a3 3 0 0 1 6 0v6"/>'),
  poly: LO_I('<path d="M5 18L3 8l8-5 9 6-3 10z"/><circle cx="3" cy="8" r="1.4" fill="currentColor"/><circle cx="11" cy="3" r="1.4" fill="currentColor"/><circle cx="20" cy="9" r="1.4" fill="currentColor"/>'),
  text: LO_I('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  undo: LO_I('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: LO_I('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  plus: LO_I('<path d="M12 5v14M5 12h14"/>'),
  minus: LO_I('<path d="M5 12h14"/>'),
  fit: LO_I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  grid: LO_I('<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
  eye: LO_I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  copy: LO_I('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  trash: LO_I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  front: LO_I('<rect x="8" y="8" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".25"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>'),
  back: LO_I('<rect x="4" y="4" width="12" height="12" rx="1"/><path d="M20 8v11a1 1 0 0 1-1 1H8"/>'),
  check: LO_I('<path d="M5 12l5 5 9-10"/>'),
  file: LO_I('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>'),
  link: LO_I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
};

const LO_TOOLS = [
  ["select", "Chọn", "V", LO_ICONS.select, "Chọn, kéo để di chuyển. Kéo nền trống để cuộn sơ đồ."],
  ["stage", "Sân khấu", "S", LO_ICONS.stage, "Bấm hoặc kéo trên sơ đồ để đặt sân khấu."],
  ["zone", "Khu ghế", "R", LO_ICONS.seats, "Kéo để vẽ khu ghế ngồi. Số hàng, số ghế tự gợi ý theo kích thước."],
  ["standing", "Khu đứng", "G", LO_ICONS.standing, "Kéo để vẽ khu đứng (GA), nhập sức chứa ở bảng bên phải."],
  ["poly", "Đa giác", "P", LO_ICONS.poly, "Bấm từng góc của khu. Bấm lại điểm đầu, nhấp đúp hoặc Enter để xong. Esc để huỷ."],
  ["text", "Chữ", "T", LO_ICONS.text, "Bấm để thêm chữ: lối vào, FOH, khu vệ sinh..."],
];
const LO_SEAT = 20;              // khoang cach 2 ghe (don vi so do) dung de goi y so hang / so ghe
const LO_MAX_FILE = 20 * 1024 * 1024;
const LO_PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

let LO = null;                   // trang thai trinh thiet ke dang mo

// =====================================================================
//  Vao muc: chon dia diem, chua co so do -> man chon phuong phap
// =====================================================================
async function viewLayout(box) {
  const { data: venues, missing } = await tryList("/admin/venues");
  if (!venues.length) {
    box.innerHTML = missing ? missingNote("/admin/venues")
      : '<section class="panel"><p class="empty">Chưa có địa điểm nào. <a href="#venues">Thêm địa điểm</a> trước, rồi quay lại đây để tạo sơ đồ.</p></section>';
    return;
  }
  if (!venues.some((v) => String(v.venue_id) === String(PICK.venue))) PICK.venue = String(venues[0].venue_id);
  const venue = venues.find((v) => String(v.venue_id) === String(PICK.venue));

  let data;
  try { data = await API.get("/admin/venue-layout/" + venue.venue_id); }
  catch (err) {
    if (apiMissing(err)) {
      box.innerHTML = '<p class="msg msg--info">Backend chưa có API sơ đồ. Hãy thêm file <code>backend/venue_layout.py</code> và chạy lại backend.</p>';
      return;
    }
    throw err;
  }

  LO = {
    venue, events: data.events || [], dbZones: data.zones || [],
    layout: data.layout, saved: !!data.layout,
    sel: null, tool: "select", view: { x: 0, y: 0, k: 1 }, grid: true, bgHidden: false,
    undo: [], redo: [], dirty: false, poly: null, drag: null, space: false,
    ac: new AbortController(), box,
  };

  box.innerHTML =
    '<div class="lo-bar">' +
      '<label class="lo-venue"><span class="muted">Địa điểm</span><select id="loVenue" class="adm-select">' +
        venues.map((v) => '<option value="' + v.venue_id + '"' + (v === venue ? " selected" : "") + ">" + esc(v.venue_name) + "</option>").join("") +
      "</select></label>" +
      '<p class="lo-bar__note muted">' + (LO.events.length
        ? "Dùng chung cho " + LO.events.length + " sự kiện tại đây: " + LO.events.slice(0, 2).map((e) => esc(e.event_name)).join(", ") + (LO.events.length > 2 ? "..." : "")
        : "Chưa có sự kiện nào tại địa điểm này") + "</p>" +
    '</div><div id="loBody"></div>';

  $("loVenue").addEventListener("change", (e) => {
    if (!loGuard()) { e.target.value = PICK.venue; return; }
    PICK.venue = e.target.value;
    route();
  });
  window.addEventListener("beforeunload", (e) => { if (LO && LO.dirty) { e.preventDefault(); e.returnValue = ""; } }, { signal: LO.ac.signal });

  if (LO.layout) openEditor(); else showChooser();
}

// Goi tu route() truoc khi chuyen trang: hoi neu con thay doi chua luu
function loGuard() {
  if (!LO) return true;
  if (LO.dirty && !confirm("Sơ đồ có thay đổi chưa lưu. Rời khỏi đây và bỏ các thay đổi?")) {
    if (location.hash !== "#layout") history.replaceState(null, "", "#layout");
    return false;
  }
  LO.ac.abort();
  LO = null;
  return true;
}

// =====================================================================
//  Man chon phuong phap (giong Ticketbox: 2 the lon)
// =====================================================================
function showChooser() {
  const body = $("loBody");
  const hasZones = LO.dbZones.length > 0;
  const tpls = [["blank", "Trống", "Chỉ có sân khấu"], ["concert", "Concert", "GA, VIP và 3 hạng CAT"], ["theater", "Nhà hát", "3 khối ghế và ban công"]];
  if (hasZones) tpls.push(["db", "Từ khu đã có", LO.dbZones.length + " khu trong hệ thống"]);

  body.innerHTML =
    '<div class="lo-choose">' +
      '<div class="lo-choose__head">' +
        "<h2>Chọn cách tạo sơ đồ</h2>" +
        '<p class="muted">Chọn một cách để bắt đầu. Bạn vẫn chỉnh được mọi thứ sau đó, và có thể kết hợp: tải bản vẽ lên rồi dùng các công cụ thiết kế để vẽ khu.</p>' +
        (LO.saved ? '<button type="button" class="btn btn--ghost btn--small" id="loBackEd">← Quay lại sơ đồ đang có</button>' : "") +
      "</div>" +
      '<div class="lo-methods">' +

        '<section class="lo-method" id="loM1">' +
          '<div class="lo-method__top"><span class="lo-method__icon">' + LO_ICONS.upload + '</span><span class="lo-method__tag">Phương pháp 1</span></div>' +
          "<h3>Tải sơ đồ có sẵn</h3>" +
          '<div class="lo-fmt">' + ["PDF", "PNG", "JPG", "SVG"].map((f) => "<span>" + f + "</span>").join("") + "</div>" +
          "<p>Sử dụng bản vẽ từ đơn vị tổ chức hoặc địa điểm.</p>" +
          '<ol class="lo-steps"><li>Tải bản vẽ lên làm nền tham chiếu</li><li>Hệ thống tự nhận diện các khối màu thành Zone (đọc cả tên khu), bạn chỉnh lại hoặc vẽ thêm</li><li>Nhập số hàng, số ghế rồi bấm Lưu &amp; tạo ghế</li></ol>' +
          '<label class="lo-drop" id="loDrop">' +
            '<input type="file" id="loFile" accept=".pdf,.png,.jpg,.jpeg,.svg,application/pdf,image/png,image/jpeg,image/svg+xml" hidden>' +
            LO_ICONS.file +
            '<span class="lo-drop__main"><strong>Kéo thả bản vẽ vào đây</strong> hoặc <u>chọn tệp</u></span>' +
            '<small class="muted">Tối đa 20 MB. Với PDF, hệ thống lấy trang đầu tiên.</small>' +
          "</label>" +
          '<p class="lo-drop__msg" id="loDropMsg" role="status" hidden></p>' +
        "</section>" +

        '<section class="lo-method" id="loM2">' +
          '<div class="lo-method__top"><span class="lo-method__icon">' + LO_ICONS.design + '</span><span class="lo-method__tag">Phương pháp 2</span></div>' +
          "<h3>Tự thiết kế sơ đồ</h3>" +
          '<div class="lo-fmt"><span>Create Layout</span></div>' +
          "<p>Tự tạo sân khấu, Zone, hàng ghế và vị trí ghế.</p>" +
          '<ol class="lo-steps"><li>Kéo thả sân khấu, khu ghế ngồi, khu đứng</li><li>Thiết lập số hàng, số ghế và màu từng khu</li><li>Bấm Lưu &amp; tạo ghế để mở bán</li></ol>' +
          '<p class="lo-tpl__label">Bắt đầu từ mẫu</p>' +
          '<div class="lo-tpls">' + tpls.map(([k, t, d]) =>
            '<button type="button" class="lo-tpl" data-tpl="' + k + '">' +
              '<span class="lo-tpl__thumb">' + SeatMap.render(loTemplate(k)) + "</span>" +
              "<strong>" + t + "</strong><small>" + d + "</small></button>").join("") +
          "</div>" +
        "</section>" +
      "</div>" +
    "</div>";

  const sig = { signal: LO.ac.signal };
  if (LO.saved) $("loBackEd").addEventListener("click", () => openEditor());
  const drop = $("loDrop");
  $("loFile").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) loUseDrawing(f, "new"); });
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) loUseDrawing(f, "new"); });
  // Tha file ra ngoai o thi trinh duyet se mo file: chan lai
  window.addEventListener("dragover", (e) => e.preventDefault(), sig);
  window.addEventListener("drop", (e) => e.preventDefault(), sig);

  body.querySelector(".lo-tpls").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tpl]");
    if (!b) return;
    if (LO.saved && !confirm("Địa điểm này đã có sơ đồ. Tạo sơ đồ mới từ mẫu sẽ thay sơ đồ cũ khi bạn lưu. Tiếp tục?")) return;
    LO.layout = loTemplate(b.dataset.tpl);
    LO.undo = []; LO.redo = []; LO.sel = null;
    LO.dirty = true;
    openEditor();
  });
}

// ---------- Mau so do ----------
function loId() { return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function loZone(o) {
  return Object.assign({ id: loId(), type: "zone", shape: "rect", x: 0, y: 0, w: 200, h: 120, rot: 0, name: "Khu", color: SeatMap.PALETTE[0],
    seating: "seated", start_row: "A", rows: 5, cols: 10, capacity: null, show_seats: true, zone_id: null }, o);
}
function loStage(o) { return Object.assign({ id: loId(), type: "stage", x: 400, y: 30, w: 400, h: 90, rot: 0, label: "SÂN KHẤU", size: 30, color: null, shape: "rect" }, o); }
function loText(o) {
  const t = Object.assign({ id: loId(), type: "text", x: 0, y: 0, w: 120, h: 30, rot: 0, label: "LỐI VÀO", size: 20, color: null }, o);
  return loFitText(t);
}
function loFitText(t) {
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  t.w = Math.max(20, Math.round((t.label || " ").length * t.size * 0.62 + t.size * 0.6));
  t.h = Math.round(t.size * 1.5);
  t.x = Math.round(cx - t.w / 2); t.y = Math.round(cy - t.h / 2);
  return t;
}

function loTemplate(kind) {
  const P = SeatMap.PALETTE;
  const L = { version: 1, method: "design", width: 1200, height: 800, background: null, items: [] };
  if (kind === "blank") L.items = [loStage({})];
  else if (kind === "concert") L.items = [
    loStage({ x: 380, y: 30, w: 440, h: 100, shape: "thrust", label: "SÂN KHẤU" }),
    loZone({ name: "GA", seating: "standing", capacity: 400, rows: null, cols: null, x: 420, y: 160, w: 360, h: 190, color: P[0] }),
    loZone({ name: "VIP A", x: 170, y: 160, w: 220, h: 190, rows: 9, cols: 11, color: P[2] }),
    loZone({ name: "VIP B", x: 810, y: 160, w: 220, h: 190, rows: 9, cols: 11, color: P[2] }),
    loZone({ name: "CAT 1", x: 170, y: 390, w: 280, h: 170, rows: 8, cols: 14, color: P[1] }),
    loZone({ name: "CAT 2", x: 470, y: 390, w: 260, h: 170, rows: 8, cols: 13, color: P[3] }),
    loZone({ name: "CAT 3", x: 750, y: 390, w: 280, h: 170, rows: 8, cols: 14, color: P[1] }),
    loText({ x: 540, y: 700, label: "LỐI VÀO" }),
  ];
  else if (kind === "theater") L.items = [
    loStage({ x: 350, y: 30, w: 500, h: 110, shape: "round", label: "SÂN KHẤU" }),
    loZone({ name: "Khu A", x: 150, y: 200, w: 260, h: 250, rot: -14, rows: 11, cols: 12, color: P[1] }),
    loZone({ name: "Khu B", x: 470, y: 190, w: 260, h: 270, rows: 12, cols: 12, color: P[2] }),
    loZone({ name: "Khu C", x: 790, y: 200, w: 260, h: 250, rot: 14, rows: 11, cols: 12, color: P[1] }),
    loZone({ name: "Ban công", x: 250, y: 530, w: 700, h: 140, rows: 5, cols: 30, color: P[3] }),
    loText({ x: 560, y: 720, label: "FOH" }),
  ];
  else if (kind === "db") {
    L.items = [loStage({})];
    const per = 4, w = 230, h = 150, gap = 30, x0 = (1200 - (per * w + (per - 1) * gap)) / 2;
    LO.dbZones.forEach((z, i) => L.items.push(loFromDb(z, x0 + (i % per) * (w + gap), 170 + Math.floor(i / per) * (h + gap), w, h, i)));
    L.height = Math.max(800, 170 + Math.ceil(LO.dbZones.length / per) * (h + gap) + 80);
  }
  return L;
}

// Khu trong database -> khu tren so do, giu dung so hang / so ghe dang co
function loFromDb(z, x, y, w, h, i) {
  const o = { name: z.zone_name, zone_id: z.zone_id, x, y, w, h, color: SeatMap.PALETTE[i % 8] };
  if (z.seat_count > 0 && z.first_row && /^[A-Z]$/.test(z.first_row) && z.row_count > 0 && z.max_number > 0) {
    Object.assign(o, { seating: "seated", start_row: z.first_row, rows: Math.min(100, z.row_count), cols: Math.min(200, z.max_number) });
  } else {
    Object.assign(o, { seating: "standing", capacity: Math.max(1, Math.min(5000, z.seat_count || z.capacity)), rows: null, cols: null });
  }
  return loZone(o);
}

// =====================================================================
//  Phuong phap 1: xu ly ban ve -> anh JPG -> tai len
// =====================================================================
function loLoadScript(src) {
  return new Promise((ok, fail) => {
    if ([...document.scripts].some((s) => s.src === src)) return ok();
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Không tải được thư viện đọc PDF. Kiểm tra kết nối mạng."));
    document.head.appendChild(s);
  });
}

async function loDrawingToCanvas(file) {
  const name = file.name.toLowerCase();
  const kind = file.type === "application/pdf" || name.endsWith(".pdf") ? "pdf"
    : file.type === "image/svg+xml" || name.endsWith(".svg") ? "svg"
    : /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/.test(name) ? "img" : null;
  if (!kind) throw new Error("Chỉ nhận tệp PDF, PNG, JPG hoặc SVG.");
  if (file.size > LO_MAX_FILE) throw new Error("Tệp nặng " + (file.size / 1048576).toFixed(1) + " MB, tối đa 20 MB.");
  const LONG = 2400;                       // canh dai nhat cua anh sau khi chuyen
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const paint = (w, h) => {
    const s = Math.min(1, LONG / Math.max(w, h)) || 1;
    canvas.width = Math.max(1, Math.round(w * s)); canvas.height = Math.max(1, Math.round(h * s));
    ctx.fillStyle = "#FFFFFF";             // ban ve trong suot -> nen trang cho de nhin
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return s;
  };

  if (kind === "pdf") {
    await loLoadScript(LO_PDFJS + "pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = LO_PDFJS + "pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, LONG / Math.max(base.width, base.height));
    const vp = page.getViewport({ scale });
    paint(vp.width, vp.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return { canvas, pages: pdf.numPages };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => { throw new Error("Không đọc được tệp ảnh này."); });
    let w = img.naturalWidth, h = img.naturalHeight;
    if (kind === "svg" && (!w || !h)) {        // SVG khong ghi width/height: doc tu viewBox
      const m = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(await file.text());
      w = m ? Number(m[1]) : 1200; h = m ? Number(m[2]) : 800;
    }
    if (kind === "svg") { const k = LONG / Math.max(w, h); w *= k; h *= k; }   // SVG ve lai net o kich thuoc lon
    const s = paint(w, h);
    ctx.drawImage(img, 0, 0, w * s, h * s);
    return { canvas, pages: 1 };
  } finally { URL.revokeObjectURL(url); }
}

async function loCanvasToJpeg(canvas) {
  for (const q of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= 3 * 1024 * 1024) return blob;
  }
  throw new Error("Bản vẽ quá chi tiết, không nén được dưới 3 MB. Hãy thử xuất bản vẽ ở độ phân giải thấp hơn.");
}

// mode: "new" (tu man chon phuong phap) | "replace" (doi ban ve trong trinh thiet ke)
async function loUseDrawing(file, mode) {
  const st = LO;
  const msg = mode === "new" ? $("loDropMsg") : null;
  const say = (t, kind) => {
    if (msg) { msg.hidden = !t; msg.textContent = t || ""; msg.className = "lo-drop__msg" + (kind ? " is-" + kind : ""); }
    else if (t) loToast(t, kind);
  };
  if (mode === "new" && st.saved && !confirm("Địa điểm này đã có sơ đồ. Dùng bản vẽ mới sẽ thay sơ đồ cũ khi bạn lưu. Tiếp tục?")) return;
  try {
    say("Đang đọc bản vẽ...", "busy");
    const { canvas, pages } = await loDrawingToCanvas(file);
    say("Đang tải bản vẽ lên...", "busy");
    const blob = await loCanvasToJpeg(canvas);
    const fd = new FormData();
    fd.append("file", blob, "background.jpg");
    const res = await fetch("/api/admin/venue-layout/" + st.venue.venue_id + "/background", { method: "POST", body: fd, credentials: "same-origin" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || "Lỗi máy chủ (" + res.status + ")");
    if (LO !== st) return;                     // da roi khoi trang trong luc tai
    const W = 1200, H = Math.round(Math.min(6000, Math.max(200, W * canvas.height / canvas.width)));
    const bg = { url: data.url, opacity: 0.6, public: true };
    if (mode === "new") {
      st.layout = { version: 1, method: "image", width: W, height: H, background: bg, items: [] };
      st.undo = []; st.redo = []; st.sel = null;
      st.dirty = true;
      openEditor();
      await loSave(false, true);               // luu nhap ngay de khong mat ban vua tai
      if (pages > 1) loToast("Bản vẽ có " + pages + " trang, hệ thống dùng trang 1.", "info");
      if (LO === st) await loOpenDetect(true);  // thu tu nhan dien cac khu tren ban ve
    } else {
      const before = loSnap();
      const oldW = st.layout.width;
      st.layout.background = Object.assign({ opacity: 0.6, public: true }, st.layout.background || {}, { url: data.url });
      st.layout.height = Math.round(Math.min(6000, Math.max(200, oldW * canvas.height / canvas.width)));
      loCommit(before);
      loDrawAll();
      loToast("Đã đổi bản vẽ nền.", "ok");
    }
    say("");
  } catch (err) {
    say(err.message, "bad");
  }
}

// =====================================================================
//  Trinh thiet ke
// =====================================================================
function openEditor() {
  const L = LO.layout;
  L.items = L.items || [];
  $("loBody").innerHTML =
    '<div class="lo-ed" id="loEd">' +
      '<div class="lo-ed__head">' +
        '<span class="lo-badge">' + (L.method === "image" ? LO_ICONS.upload + "Tải sơ đồ có sẵn" : LO_ICONS.design + "Tự thiết kế") + "</span>" +
        '<button type="button" class="lo-link" id="loRestart">Đổi cách tạo</button>' +
        '<span class="lo-status" id="loStatus"></span>' +
        '<span class="lo-ed__sp"></span>' +
        '<button type="button" class="btn btn--ghost btn--small" id="loPreview">' + LO_ICONS.eye + "Xem như khách</button>" +
        '<button type="button" class="btn btn--ghost btn--small" id="loDraft">Lưu nháp</button>' +
        '<button type="button" class="btn btn--small" id="loApply">' + LO_ICONS.check + "Lưu &amp; tạo ghế</button>" +
      "</div>" +
      '<div class="lo-ed__main">' +
        '<nav class="lo-tools" aria-label="Công cụ vẽ">' +
          LO_TOOLS.map(([k, t, key, ic]) => '<button type="button" class="lo-tool" data-tool="' + k + '" title="' + t + " (" + key + ')" aria-pressed="false">' + ic + "<span>" + t + "</span></button>").join("") +
          '<span class="lo-tools__sep"></span>' +
          '<button type="button" class="lo-tool" id="loUndo" title="Hoàn tác (Ctrl+Z)">' + LO_ICONS.undo + "<span>Hoàn tác</span></button>" +
          '<button type="button" class="lo-tool" id="loRedo" title="Làm lại (Ctrl+Y)">' + LO_ICONS.redo + "<span>Làm lại</span></button>" +
        "</nav>" +
        '<div class="lo-canvas">' +
          '<div class="lo-cbar">' +
            '<div class="lo-zoom" role="group" aria-label="Thu phóng">' +
              '<button type="button" data-z="-1" aria-label="Thu nhỏ">' + LO_ICONS.minus + '</button><output id="loZoomV">100%</output>' +
              '<button type="button" data-z="1" aria-label="Phóng to">' + LO_ICONS.plus + '</button>' +
              '<button type="button" data-z="0" title="Vừa khung">' + LO_ICONS.fit + "</button></div>" +
            '<button type="button" class="lo-chipbtn" id="loGrid" aria-pressed="true">' + LO_ICONS.grid + "Bắt lưới</button>" +
            '<span class="lo-hint" id="loHint"></span>' +
          "</div>" +
          '<svg id="loSvg" class="lo-svg" xmlns="http://www.w3.org/2000/svg" font-family="Be Vietnam Pro, system-ui, sans-serif" tabindex="0" aria-label="Khung vẽ sơ đồ">' +
            '<defs><pattern id="loGridP" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1"/></pattern>' +
            '<pattern id="loGridP2" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#loGridP)"/><path d="M100 0H0V100" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1"/></pattern></defs>' +
            '<g id="loBoard"></g><g id="loItems"></g><g id="loOver"></g>' +
          "</svg>" +
          '<div class="lo-empty" id="loEmpty" hidden></div>' +
        "</div>" +
        '<aside class="lo-props" id="loProps" aria-label="Thuộc tính"></aside>' +
      "</div>" +
    "</div>";

  const sig = { signal: LO.ac.signal };
  const svg = $("loSvg");
  $("loRestart").addEventListener("click", () => {
    if (LO.dirty && !confirm("Sơ đồ có thay đổi chưa lưu. Vẫn đổi cách tạo?")) return;
    if (LO.dirty) { LO.dirty = false; }
    showChooser();
  });
  $("loEd").querySelector(".lo-tools").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tool]");
    if (b) loSetTool(b.dataset.tool);
  });
  $("loUndo").addEventListener("click", () => loHistory(-1));
  $("loRedo").addEventListener("click", () => loHistory(1));
  $("loEd").querySelector(".lo-zoom").addEventListener("click", (e) => {
    const b = e.target.closest("[data-z]");
    if (!b) return;
    if (b.dataset.z === "0") loFit();
    else loZoomAt(Number(b.dataset.z) > 0 ? 1.25 : 0.8);
  });
  $("loGrid").addEventListener("click", () => { LO.grid = !LO.grid; $("loGrid").setAttribute("aria-pressed", String(LO.grid)); loDrawBoard(); });
  $("loDraft").addEventListener("click", () => loSave(false));
  $("loApply").addEventListener("click", loApply);
  $("loPreview").addEventListener("click", loPreview);

  svg.addEventListener("pointerdown", loDown);
  svg.addEventListener("pointermove", loMove);
  svg.addEventListener("pointerup", loUp);
  svg.addEventListener("pointercancel", loUp);
  svg.addEventListener("dblclick", (e) => { if (LO.tool === "poly") { e.preventDefault(); loFinishPoly(); } });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    loZoomAt(Math.pow(1.0015, -e.deltaY), loClientPt(e));
  }, { passive: false });
  svg.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", loKey, sig);
  document.addEventListener("keyup", (e) => { if (e.code === "Space") { LO.space = false; loCursor(); } }, sig);
  const ro = new ResizeObserver(() => loSetView());
  ro.observe(svg);
  LO.ac.signal.addEventListener("abort", () => ro.disconnect());

  loSetTool("select");
  loDrawAll();
  requestAnimationFrame(loFit);
  loStatus();
}

// ---------- Ve lai ----------
function loDrawAll() { loDrawBoard(); loDrawItems(); loDrawOver(); loDrawProps(); loUpdateBtns(); }

function loDrawBoard() {
  const L = LO.layout, bg = L.background;
  $("loBoard").innerHTML =
    '<rect x="0" y="0" width="' + L.width + '" height="' + L.height + '" fill="#1C1C22" stroke="#3A3A44" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
    (bg && !LO.bgHidden ? '<image href="' + esc(bg.url) + '" x="0" y="0" width="' + L.width + '" height="' + L.height + '" preserveAspectRatio="xMidYMid meet" opacity="' + bg.opacity + '"/>' : "") +
    (LO.grid ? '<rect x="0" y="0" width="' + L.width + '" height="' + L.height + '" fill="url(#loGridP2)" pointer-events="none"/>' : "");
  const empty = $("loEmpty");
  const none = !L.items.length || (L.method === "image" && !L.items.some((i) => i.type === "zone"));
  empty.hidden = !none;
  if (none) {
    empty.innerHTML = L.method === "image"
      ? "<strong>Bản vẽ đã sẵn sàng</strong><span>Chọn <b>Đa giác</b> (P) để đồ theo viền từng khu trên bản vẽ, hoặc <b>Khu ghế</b> (R) để kéo khung chữ nhật.</span>"
      : "<strong>Sơ đồ đang trống</strong><span>Chọn một công cụ bên trái rồi bấm hoặc kéo trên khung vẽ.</span>";
  }
}

function loDrawItems() {
  $("loItems").innerHTML = LO.layout.items.map((it) =>
    SeatMap.item(it, { prefix: "ed", cls: it.id === LO.sel ? "is-sel" : "" })).join("");
}

// Khung chon + tay nam (kich thuoc tay nam co dinh tren man hinh)
function loDrawOver() {
  const k = LO.view.k, hs = 9 / k, sw = 1.5 / k;
  let html = "";
  const it = loSel();
  const handle = (x, y, h, cls) => '<rect class="lo-h ' + (cls || "") + '" data-h="' + h + '" x="' + (x - hs / 2) + '" y="' + (y - hs / 2) + '" width="' + hs + '" height="' + hs + '" rx="' + hs * 0.2 + '" stroke-width="' + sw + '"/>';
  if (it && it.type === "zone" && it.shape === "poly") {
    html += '<polygon class="lo-outline" points="' + it.points.map((p) => p.join(",")).join(" ") + '" stroke-width="' + sw + '" stroke-dasharray="' + 5 / k + " " + 4 / k + '"/>';
    it.points.forEach((p, i) => {
      const q = it.points[(i + 1) % it.points.length];
      html += '<circle class="lo-h lo-h--mid" data-h="m' + i + '" cx="' + (p[0] + q[0]) / 2 + '" cy="' + (p[1] + q[1]) / 2 + '" r="' + hs * 0.38 + '" stroke-width="' + sw + '"/>';
    });
    it.points.forEach((p, i) => { html += '<circle class="lo-h" data-h="v' + i + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + hs * 0.6 + '" stroke-width="' + sw + '"/>'; });
  } else if (it) {
    const w = it.w, h = it.h, ry = -26 / k;
    html += '<g transform="' + loFrame(it) + '">' +
      '<rect class="lo-outline" x="0" y="0" width="' + w + '" height="' + h + '" stroke-width="' + sw + '" stroke-dasharray="' + 5 / k + " " + 4 / k + '"/>' +
      '<line class="lo-outline" x1="' + w / 2 + '" y1="0" x2="' + w / 2 + '" y2="' + ry + '" stroke-width="' + sw + '"/>' +
      '<circle class="lo-h lo-h--rot" data-h="rot" cx="' + w / 2 + '" cy="' + ry + '" r="' + hs * 0.65 + '" stroke-width="' + sw + '"/>' +
      (it.type === "text" ? "" :
        [["nw", 0, 0], ["n", w / 2, 0], ["ne", w, 0], ["e", w, h / 2], ["se", w, h], ["s", w / 2, h], ["sw", 0, h], ["w", 0, h / 2]]
          .map(([n, x, y]) => handle(x, y, n, "lo-h--" + n)).join("")) +
      "</g>";
  }
  // Dang ve da giac
  const P = LO.poly;
  if (P && P.pts.length) {
    const pts = P.pts.concat(P.cur ? [P.cur] : []);
    html += '<polyline class="lo-drawing" points="' + pts.map((p) => p.join(",")).join(" ") + '" stroke-width="' + 2 / k + '"/>';
    P.pts.forEach((p, i) => { html += '<circle class="lo-h' + (i === 0 && P.pts.length >= 3 ? " lo-h--first" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + hs * (i === 0 ? 0.8 : 0.5) + '" stroke-width="' + sw + '"/>'; });
  }
  // Dang keo de tao khu / san khau
  const D = LO.drag;
  if (D && D.type === "create" && D.cur) {
    const x = Math.min(D.start[0], D.cur[0]), y = Math.min(D.start[1], D.cur[1]);
    html += '<rect class="lo-drawing" x="' + x + '" y="' + y + '" width="' + Math.abs(D.cur[0] - D.start[0]) + '" height="' + Math.abs(D.cur[1] - D.start[1]) + '" stroke-width="' + 2 / k + '"/>';
  }
  $("loOver").innerHTML = html;
}
const loFrame = (it) => "translate(" + (it.x + it.w / 2) + " " + (it.y + it.h / 2) + ") rotate(" + (it.rot || 0) + ") translate(" + -it.w / 2 + " " + -it.h / 2 + ")";

function loUpdateBtns() {
  $("loUndo").disabled = !LO.undo.length;
  $("loRedo").disabled = !LO.redo.length;
}
function loStatus(text) {
  const el = $("loStatus");
  if (!el) return;
  el.textContent = text || (LO.dirty ? "Chưa lưu" : LO.saved ? "Đã lưu" : "");
  el.classList.toggle("is-dirty", !text && LO.dirty);
}

// ---------- Khung nhin: cuon, thu phong ----------
function loSetView() {
  const svg = $("loSvg");
  if (!svg || !LO) return;
  const r = svg.getBoundingClientRect(), v = LO.view;
  svg.setAttribute("viewBox", v.x + " " + v.y + " " + r.width / v.k + " " + r.height / v.k);
  $("loZoomV").textContent = Math.round(v.k * 100) + "%";
}
function loFit() {
  const svg = $("loSvg");
  if (!svg) return;
  const r = svg.getBoundingClientRect(), L = LO.layout, pad = 30;
  const k = Math.max(0.05, Math.min((r.width - pad * 2) / L.width, (r.height - pad * 2) / L.height));
  LO.view = { k, x: L.width / 2 - r.width / k / 2, y: L.height / 2 - r.height / k / 2 };
  loSetView(); loDrawOver();
}
function loZoomAt(f, at) {
  const svg = $("loSvg"), r = svg.getBoundingClientRect(), v = LO.view;
  const p = at || [v.x + r.width / v.k / 2, v.y + r.height / v.k / 2];
  const k = Math.min(8, Math.max(0.08, v.k * f));
  v.x = p[0] - (p[0] - v.x) * v.k / k;
  v.y = p[1] - (p[1] - v.y) * v.k / k;
  v.k = k;
  loSetView(); loDrawOver();
}
function loClientPt(e) {
  const r = $("loSvg").getBoundingClientRect(), v = LO.view;
  return [v.x + (e.clientX - r.left) / v.k, v.y + (e.clientY - r.top) / v.k];
}
const loSnapV = (n, e) => (LO.grid && !(e && e.altKey) ? Math.round(n / 10) * 10 : Math.round(n));
const loSnapP = (p, e) => [loSnapV(p[0], e), loSnapV(p[1], e)];

// ---------- Lich su hoan tac ----------
function loSnap() { return JSON.stringify(LO.layout); }
function loCommit(before) {
  if (before === loSnap()) return;
  LO.undo.push(before);
  if (LO.undo.length > 100) LO.undo.shift();
  LO.redo = [];
  LO.dirty = true;
  loUpdateBtns(); loStatus();
}
function loHistory(dir) {
  const from = dir < 0 ? LO.undo : LO.redo, to = dir < 0 ? LO.redo : LO.undo;
  if (!from.length) return;
  to.push(loSnap());
  LO.layout = JSON.parse(from.pop());
  if (!loSel()) LO.sel = null;
  LO.dirty = true;
  loDrawAll(); loStatus();
}

// ---------- Chon / cong cu ----------
function loSel() { return LO.layout.items.find((i) => i.id === LO.sel) || null; }
function loSelect(id) {
  if (LO.sel === id) return;
  LO.sel = id;
  loDrawItems(); loDrawOver(); loDrawProps();
}
function loSetTool(t) {
  if (LO.poly && t !== "poly") LO.poly = null;
  LO.tool = t;
  document.querySelectorAll(".lo-tool[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  const tool = LO_TOOLS.find((x) => x[0] === t);
  $("loHint").textContent = tool ? tool[4] : "";
  if (t === "poly") LO.poly = { pts: [], cur: null };
  loCursor(); loDrawOver();
}
function loCursor() {
  const svg = $("loSvg");
  if (svg) svg.dataset.cursor = LO.drag && LO.drag.type === "pan" ? "grabbing" : LO.space ? "grab" : LO.tool === "select" ? "default" : "crosshair";
}

function loNextName() {
  const used = new Set(LO.layout.items.filter((i) => i.type === "zone").map((i) => i.name.toLowerCase()));
  for (let i = 0; i < 702; i++) { const n = "Khu " + SeatMap.rowLabel(i); if (!used.has(n.toLowerCase())) return n; }
  return "Khu " + Date.now();
}
function loNextColor() {
  const n = LO.layout.items.filter((i) => i.type === "zone").length;
  return SeatMap.PALETTE[n % 8];
}
// Goi y so hang / so ghe theo kich thuoc khung
function loGuessGrid(w, h) {
  let cols = Math.max(1, Math.min(200, Math.round(w / LO_SEAT))), rows = Math.max(1, Math.min(100, Math.round(h / LO_SEAT)));
  while (rows * cols > 5000) { if (cols > rows) cols--; else rows--; }
  return { rows, cols };
}

function loCreate(tool, a, b) {
  const big = b && Math.abs(b[0] - a[0]) > 12 && Math.abs(b[1] - a[1]) > 12;
  const def = { stage: [400, 90], zone: [220, 140], standing: [260, 160] }[tool];
  let it;
  if (tool === "text") {
    it = loText({ x: a[0] - 60, y: a[1] - 15 });
  } else {
    const x = big ? Math.min(a[0], b[0]) : a[0] - def[0] / 2, y = big ? Math.min(a[1], b[1]) : a[1] - def[1] / 2;
    const w = big ? Math.max(20, Math.abs(b[0] - a[0])) : def[0], h = big ? Math.max(20, Math.abs(b[1] - a[1])) : def[1];
    if (tool === "stage") it = loStage({ x, y, w, h });
    else if (tool === "standing") it = loZone({ x, y, w, h, name: loNextName(), color: loNextColor(), seating: "standing", capacity: Math.max(10, Math.round(w * h / 160)), rows: null, cols: null });
    else it = loZone(Object.assign({ x, y, w, h, name: loNextName(), color: loNextColor() }, loGuessGrid(w, h)));
  }
  const before = loSnap();
  LO.layout.items.push(it);
  loCommit(before);
  LO.sel = it.id;
  loSetTool("select");
  loDrawAll();
  if (it.type !== "stage") setTimeout(() => { const f = document.querySelector('#loProps [data-f="' + (it.type === "text" ? "label" : "name") + '"]'); if (f) { f.focus(); f.select(); } }, 0);
}

function loFinishPoly() {
  const P = LO.poly;
  if (!P) return;
  const pts = P.pts.filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 2);
  if (pts.length < 3) { loToast("Cần ít nhất 3 điểm để tạo khu.", "info"); return; }
  const it = loZone({ shape: "poly", points: pts, name: loNextName(), color: loNextColor() });
  loPolyBox(it);
  Object.assign(it, loGuessGrid(it.w * 0.8, it.h * 0.8));
  const before = loSnap();
  LO.layout.items.push(it);
  loCommit(before);
  LO.sel = it.id;
  LO.poly = null;
  loSetTool("select");
  loDrawAll();
  setTimeout(() => { const f = document.querySelector('#loProps [data-f="name"]'); if (f) { f.focus(); f.select(); } }, 0);
}
function loPolyBox(it) {
  const xs = it.points.map((p) => p[0]), ys = it.points.map((p) => p[1]);
  it.x = Math.min(...xs); it.y = Math.min(...ys);
  it.w = Math.max(4, Math.max(...xs) - it.x); it.h = Math.max(4, Math.max(...ys) - it.y);
}

// ---------- Chuot / cham ----------
function loDown(e) {
  const svg = $("loSvg");
  svg.focus({ preventScroll: true });
  const p = loClientPt(e);
  if (e.button === 1 || e.button === 2 || LO.space) {            // nut giua / phai / giu Space: cuon
    LO.drag = { type: "pan", sx: e.clientX, sy: e.clientY, vx: LO.view.x, vy: LO.view.y };
    svg.setPointerCapture(e.pointerId); loCursor(); return;
  }
  if (e.button !== 0) return;

  if (LO.tool === "poly") {
    const P = LO.poly, q = loSnapP(p, e);
    if (P.pts.length >= 3 && Math.hypot(p[0] - P.pts[0][0], p[1] - P.pts[0][1]) < 12 / LO.view.k) { loFinishPoly(); return; }
    if (e.detail >= 2) return;                                    // lan bam thu 2 cua nhap dup
    P.pts.push(q); P.cur = q;
    loDrawOver(); return;
  }
  if (LO.tool !== "select") {
    LO.drag = { type: "create", start: loSnapP(p, e), cur: null };
    svg.setPointerCapture(e.pointerId); return;
  }

  const h = e.target.closest("[data-h]");
  const it = loSel();
  if (h && it) {
    const name = h.dataset.h, before = loSnap();
    if (name === "rot") LO.drag = { type: "rot", before };
    else if (name[0] === "v") LO.drag = { type: "vertex", i: Number(name.slice(1)), before };
    else if (name[0] === "m") {
      const i = Number(name.slice(1));
      it.points.splice(i + 1, 0, loSnapP(p, e));
      LO.drag = { type: "vertex", i: i + 1, before };
    } else {
      const sx = name.includes("e") ? 1 : name.includes("w") ? -1 : 0, sy = name.includes("s") ? 1 : name.includes("n") ? -1 : 0;
      const a = (it.rot || 0) * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], v = [-Math.sin(a), Math.cos(a)];
      const c = [it.x + it.w / 2, it.y + it.h / 2];
      const A = [c[0] - sx * it.w / 2 * u[0] - sy * it.h / 2 * v[0], c[1] - sx * it.w / 2 * u[1] - sy * it.h / 2 * v[1]];
      LO.drag = { type: "resize", sx, sy, u, v, A, w0: it.w, h0: it.h, before, grid0: it.type === "zone" && it.seating === "seated" ? [it.rows, it.cols] : null };
    }
    svg.setPointerCapture(e.pointerId); return;
  }
  const g = e.target.closest("[data-id]");
  if (g) {
    const id = g.dataset.id;
    loSelect(id);
    const t = loSel();
    LO.drag = { type: "move", start: p, x0: t.x, y0: t.y, pts0: t.points ? t.points.map((q) => q.slice()) : null, before: loSnap(), moved: false };
    svg.setPointerCapture(e.pointerId); return;
  }
  loSelect(null);
  LO.drag = { type: "pan", sx: e.clientX, sy: e.clientY, vx: LO.view.x, vy: LO.view.y, click: true };
  svg.setPointerCapture(e.pointerId); loCursor();
}

function loMove(e) {
  const D = LO.drag;
  if (!D) {
    if (LO.tool === "poly" && LO.poly && LO.poly.pts.length) { LO.poly.cur = loSnapP(loClientPt(e), e); loDrawOver(); }
    return;
  }
  const p = loClientPt(e);
  if (D.type === "pan") {
    LO.view.x = D.vx - (e.clientX - D.sx) / LO.view.k;
    LO.view.y = D.vy - (e.clientY - D.sy) / LO.view.k;
    loSetView(); return;
  }
  if (D.type === "create") { D.cur = loSnapP(p, e); loDrawOver(); return; }
  const it = loSel();
  if (!it) return;
  if (D.type === "move") {
    const dx = p[0] - D.start[0], dy = p[1] - D.start[1];
    if (!D.moved && Math.hypot(dx, dy) * LO.view.k < 3) return;
    D.moved = true;
    const nx = loSnapV(D.x0 + dx, e) - D.x0, ny = loSnapV(D.y0 + dy, e) - D.y0;
    if (D.pts0) { it.points = D.pts0.map((q) => [q[0] + nx, q[1] + ny]); loPolyBox(it); }
    else { it.x = D.x0 + nx; it.y = D.y0 + ny; }
  } else if (D.type === "vertex") {
    it.points[D.i] = loSnapP(p, e); loPolyBox(it);
  } else if (D.type === "rot") {
    const c = [it.x + it.w / 2, it.y + it.h / 2];
    let a = Math.atan2(p[1] - c[1], p[0] - c[0]) * 180 / Math.PI + 90;
    a = e.shiftKey ? Math.round(a / 15) * 15 : Math.round(a);
    if (a > 180) a -= 360;
    it.rot = a;
  } else if (D.type === "resize") {
    const d = [p[0] - D.A[0], p[1] - D.A[1]];
    const du = d[0] * D.u[0] + d[1] * D.u[1], dv = d[0] * D.v[0] + d[1] * D.v[1];
    let w = D.sx ? Math.max(20, D.sx * du) : D.w0, h = D.sy ? Math.max(20, D.sy * dv) : D.h0;
    if (e.shiftKey && D.sx && D.sy) { const s = Math.max(w / D.w0, h / D.h0); w = D.w0 * s; h = D.h0 * s; }
    if (LO.grid && !e.altKey) { w = Math.max(20, Math.round(w / 10) * 10); h = Math.max(20, Math.round(h / 10) * 10); }
    const c = [D.A[0] + (D.sx * w / 2) * D.u[0] + (D.sy * h / 2) * D.v[0], D.A[1] + (D.sx * w / 2) * D.u[1] + (D.sy * h / 2) * D.v[1]];
    it.w = Math.round(w); it.h = Math.round(h);
    it.x = Math.round(c[0] - it.w / 2); it.y = Math.round(c[1] - it.h / 2);
  }
  loDrawItems(); loDrawOver();
  if (D.type !== "move") loSyncGeom();
}

function loUp(e) {
  const D = LO.drag;
  if (!D) return;
  LO.drag = null;
  try { $("loSvg").releasePointerCapture(e.pointerId); } catch (x) { /* da tha */ }
  loCursor();
  if (D.type === "create") { loCreate(LO.tool, D.start, D.cur); return; }
  if (D.before) { loCommit(D.before); loSyncGeom(); }
  loDrawOver();
}

// ---------- Ban phim ----------
function loKey(e) {
  if (!LO || !$("loSvg")) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); loSave(false); return; }
  if (typing || document.querySelector(".lo-modal:not([hidden])")) return;
  const k = e.key.toLowerCase();
  if (mod && k === "z") { e.preventDefault(); loHistory(e.shiftKey ? 1 : -1); return; }
  if (mod && k === "y") { e.preventDefault(); loHistory(1); return; }
  if (mod && k === "d") { e.preventDefault(); loDuplicate(); return; }
  if (e.code === "Space" && (document.activeElement === $("loSvg") || document.activeElement === document.body)) {
    if (!LO.space) { LO.space = true; loCursor(); }
    e.preventDefault(); return;
  }
  if (LO.tool === "poly" && LO.poly) {
    if (e.key === "Enter") { e.preventDefault(); loFinishPoly(); return; }
    if (e.key === "Escape") { LO.poly = { pts: [], cur: null }; loDrawOver(); if (!LO.poly.pts.length) loSetTool("select"); return; }
    if (e.key === "Backspace") { e.preventDefault(); LO.poly.pts.pop(); loDrawOver(); return; }
  }
  if (e.key === "Escape") { if (LO.tool !== "select") loSetTool("select"); else loSelect(null); return; }
  if (e.key === "Delete" || e.key === "Backspace") { if (LO.sel) { e.preventDefault(); loDelete(); } return; }
  if (e.key.startsWith("Arrow") && LO.sel) {
    e.preventDefault();
    const it = loSel(), n = e.shiftKey ? 10 : 1, before = loSnap();
    const dx = e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, dy = e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0;
    if (it.points) { it.points = it.points.map((q) => [q[0] + dx, q[1] + dy]); loPolyBox(it); }
    else { it.x += dx; it.y += dy; }
    loCommit(before); loDrawItems(); loDrawOver(); loSyncGeom();
    return;
  }
  if (mod || e.altKey) return;
  const t = LO_TOOLS.find((x) => x[2].toLowerCase() === k);
  if (t) { e.preventDefault(); loSetTool(t[0]); }
}

// ---------- Thao tac tren thanh phan ----------
function loDuplicate() {
  const it = loSel();
  if (!it) return;
  const before = loSnap();
  const c = JSON.parse(JSON.stringify(it));
  c.id = loId();
  if (c.points) { c.points = c.points.map((q) => [q[0] + 30, q[1] + 30]); loPolyBox(c); } else { c.x += 30; c.y += 30; }
  if (c.type === "zone") { c.name = loNextName(); c.zone_id = null; }
  LO.layout.items.push(c);
  LO.sel = c.id;
  loCommit(before); loDrawAll();
}
function loDelete() {
  const it = loSel();
  if (!it) return;
  if (it.type === "zone" && it.zone_id && !confirm("Bỏ khu “" + it.name + "” khỏi sơ đồ? Khu và ghế trong hệ thống vẫn được giữ, bạn có thể đặt lại sau.")) return;
  const before = loSnap();
  LO.layout.items = LO.layout.items.filter((x) => x !== it);
  LO.sel = null;
  loCommit(before); loDrawAll();
}
// Dua len tren cung / xuong duoi cung
function loOrder(dir) {
  const it = loSel();
  if (!it) return;
  const before = loSnap();
  const rest = LO.layout.items.filter((x) => x !== it);
  LO.layout.items = dir > 0 ? rest.concat([it]) : [it].concat(rest);
  loCommit(before); loDrawItems(); loDrawOver();
}

// =====================================================================
//  Bang thuoc tinh ben phai
// =====================================================================
function loField(label, input, hint) {
  return '<label class="lo-f"><span>' + label + "</span>" + input + (hint ? "<small>" + hint + "</small>" : "") + "</label>";
}
function loNum(f, v, min, max, step) {
  return '<input type="number" data-f="' + f + '" value="' + (v ?? "") + '"' + (min != null ? ' min="' + min + '"' : "") + (max != null ? ' max="' + max + '"' : "") + (step ? ' step="' + step + '"' : "") + ">";
}
function loColors(cur, none) {
  return '<div class="lo-colors" role="group" aria-label="Màu">' +
    (none ? '<button type="button" class="lo-sw lo-sw--none" data-color="" aria-pressed="' + !cur + '" title="Mặc định"></button>' : "") +
    SeatMap.PALETTE.map((c) => '<button type="button" class="lo-sw" style="--c:' + c + '" data-color="' + c + '" aria-pressed="' + (c.toLowerCase() === String(cur).toLowerCase()) + '" title="' + c + '"></button>').join("") +
    '<label class="lo-sw lo-sw--pick" title="Màu khác"><input type="color" data-f="color" value="' + (cur || "#C9C9D1") + '"></label></div>';
}
function loGeomFields(it) {
  if (it.type === "zone" && it.shape === "poly") {
    return '<p class="lo-note">Đa giác ' + it.points.length + " điểm. Kéo các điểm tròn để chỉnh viền, kéo điểm nhỏ giữa cạnh để thêm góc.</p>";
  }
  return '<div class="lo-grid4">' +
    loField("X", loNum("x", Math.round(it.x))) + loField("Y", loNum("y", Math.round(it.y))) +
    (it.type === "text" ? "" : loField("Rộng", loNum("w", Math.round(it.w), 20)) + loField("Cao", loNum("h", Math.round(it.h), 20))) +
    "</div>" + loField("Xoay (độ)", '<div class="lo-range"><input type="range" data-f="rot" min="-180" max="180" step="1" value="' + Math.round(it.rot || 0) + '">' + loNum("rot", Math.round(it.rot || 0), -180, 180) + "</div>");
}
function loActions() {
  return '<div class="lo-acts">' +
    '<button type="button" class="btn btn--ghost btn--small" data-act="dup" title="Ctrl+D">' + LO_ICONS.copy + "Nhân bản</button>" +
    '<button type="button" class="btn btn--ghost btn--small" data-act="front" title="Đưa lên trên">' + LO_ICONS.front + "</button>" +
    '<button type="button" class="btn btn--ghost btn--small" data-act="back" title="Đưa xuống dưới">' + LO_ICONS.back + "</button>" +
    '<button type="button" class="btn btn--ghost btn--small adm-danger" data-act="del" title="Delete">' + LO_ICONS.trash + "Xoá</button></div>";
}

function loDrawProps() {
  const box = $("loProps");
  if (!box) return;
  const it = loSel();
  // Moi lan ve lai tao khung moi ben trong, de su kien gan vao khong bi lap
  if (!it) { box.innerHTML = '<div class="lo-props__in">' + loOverview() + "</div>"; loBindOverview(box.firstElementChild); return; }

  let html = "";
  if (it.type === "zone") {
    const linked = new Set(LO.layout.items.filter((x) => x.type === "zone" && x !== it && x.zone_id).map((x) => x.zone_id));
    const opts = LO.dbZones.filter((z) => !linked.has(z.zone_id));
    const db = LO.dbZones.find((z) => z.zone_id === it.zone_id);
    const cap = SeatMap.capacity(it);
    html =
      '<div class="lo-props__head"><span class="lo-dot" style="background:' + it.color + '"></span><h3>Khu ' + (it.shape === "poly" ? "đa giác" : "") + "</h3></div>" +
      loField("Tên khu", '<input data-f="name" maxlength="50" value="' + esc(it.name) + '">', "Hiện trên sơ đồ và trên vé, ví dụ VIP A, GA 1, CAT 2") +
      loField("Khu trong hệ thống", '<select data-f="zone_id"><option value="">+ Tạo khu mới khi lưu</option>' +
        opts.map((z) => '<option value="' + z.zone_id + '"' + (z.zone_id === it.zone_id ? " selected" : "") + ">" + esc(z.zone_name) + " · " + z.seat_count + " ghế" + (z.priced_events ? " · đã đặt giá" : "") + "</option>").join("") + "</select>",
        db ? "Đang liên kết. Lưu &amp; tạo ghế sẽ cập nhật khu này." : "Chọn khu đã có nếu khu này đã được tạo ở mục Khu vực.") +
      '<div class="lo-seg" role="group" aria-label="Loại khu">' +
        '<button type="button" data-seating="seated" aria-pressed="' + (it.seating === "seated") + '">' + LO_ICONS.seats + "Ghế ngồi</button>" +
        '<button type="button" data-seating="standing" aria-pressed="' + (it.seating === "standing") + '">' + LO_ICONS.standing + "Khu đứng</button></div>" +
      (it.seating === "seated"
        ? '<div class="lo-grid3">' +
            loField("Hàng đầu", '<input data-f="start_row" maxlength="1" value="' + esc(it.start_row) + '">') +
            loField("Số hàng", loNum("rows", it.rows, 1, 100)) +
            loField("Ghế/hàng", loNum("cols", it.cols, 1, 200)) + "</div>" +
          '<label class="lo-check"><input type="checkbox" data-f="show_seats"' + (it.show_seats !== false ? " checked" : "") + "> Hiện vị trí ghế trên sơ đồ</label>"
        : loField("Sức chứa", loNum("capacity", it.capacity, 1, 5000), "Vé khu đứng không ghi số ghế cụ thể với khách")) +
      '<p class="lo-cap" id="loCap"><strong>' + cap.toLocaleString("vi-VN") + "</strong> " + (it.seating === "standing" ? "chỗ" : "ghế") +
        '<span class="muted">' + SeatMap.seatRange(it) + "</span></p>" +
      loField("Màu khu", loColors(it.color)) +
      '<details class="lo-more"' + (it.shape === "poly" ? " open" : "") + "><summary>Vị trí và kích thước</summary>" + loGeomFields(it) + "</details>";
  } else if (it.type === "stage") {
    html =
      '<div class="lo-props__head">' + LO_ICONS.stage + "<h3>Sân khấu</h3></div>" +
      loField("Chữ hiển thị", '<input data-f="label" maxlength="60" value="' + esc(it.label) + '">') +
      '<div class="lo-seg lo-seg--3" role="group" aria-label="Kiểu sân khấu">' +
        [["rect", "Chữ nhật"], ["round", "Bo cong"], ["thrust", "Chữ T"]].map(([k, t]) => '<button type="button" data-shape="' + k + '" aria-pressed="' + (it.shape === k) + '">' + t + "</button>").join("") + "</div>" +
      loField("Cỡ chữ", loNum("size", it.size, 6, 300)) +
      loField("Màu", loColors(it.color, true)) +
      '<details class="lo-more" open><summary>Vị trí và kích thước</summary>' + loGeomFields(it) + "</details>";
  } else {
    html =
      '<div class="lo-props__head">' + LO_ICONS.text + "<h3>Chữ</h3></div>" +
      loField("Nội dung", '<input data-f="label" maxlength="60" value="' + esc(it.label) + '">') +
      loField("Cỡ chữ", loNum("size", it.size, 6, 300)) +
      loField("Màu", loColors(it.color, true)) +
      '<details class="lo-more" open><summary>Vị trí</summary>' + loGeomFields(it) + "</details>";
  }
  box.innerHTML = '<div class="lo-props__in">' + html + loActions() + '<button type="button" class="lo-link lo-back" data-act="desel">← Tổng quan sơ đồ</button></div>';
  loBindProps(box.firstElementChild, it);
}

// Cap nhat o so khi keo tren khung (khong ve lai ca bang de giu con tro)
function loSyncGeom() {
  const it = loSel(), box = $("loProps");
  if (!it || !box) return;
  ["x", "y", "w", "h", "rot"].forEach((f) => box.querySelectorAll('[data-f="' + f + '"]').forEach((el) => {
    if (document.activeElement !== el) el.value = Math.round(it[f] || 0);
  }));
  const note = box.querySelector(".lo-note");
  if (note && it.points) note.textContent = "Đa giác " + it.points.length + " điểm. Kéo các điểm tròn để chỉnh viền, kéo điểm nhỏ giữa cạnh để thêm góc.";
}

function loBindProps(box, it) {
  let before = null;
  box.addEventListener("focusin", (e) => { if (e.target.dataset.f) before = loSnap(); });
  const apply = (el) => {
    const f = el.dataset.f;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.type === "number" || el.type === "range") {
      if (v === "") return;
      v = Number(v);
      if (!Number.isFinite(v)) return;
      const min = el.min !== "" ? Number(el.min) : -Infinity, max = el.max !== "" ? Number(el.max) : Infinity;
      if (["rows", "cols", "capacity", "w", "h", "size"].includes(f) && (v < min || v > max)) return;
      if (["rows", "cols", "capacity"].includes(f)) v = Math.round(v);
    }
    if (f === "start_row") { v = String(v).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1); if (!v) return; }
    if (f === "zone_id") {
      v = v ? Number(v) : null;
      const z = LO.dbZones.find((x) => x.zone_id === v);
      if (z) {
        const d = loFromDb(z, 0, 0, 1, 1, 0);
        Object.assign(it, { name: z.zone_name, seating: d.seating, start_row: d.start_row, rows: d.rows, cols: d.cols, capacity: d.capacity });
      }
    }
    if (f === "w" || f === "h") {      // giu tam khi doi kich thuoc bang so
      const c = [it.x + it.w / 2, it.y + it.h / 2];
      it[f] = v;
      it.x = c[0] - it.w / 2; it.y = c[1] - it.h / 2;
    } else it[f] = v;
    if (f === "rot") box.querySelectorAll('[data-f="rot"]').forEach((x) => { if (x !== el) x.value = v; });
    if (it.type === "text" && (f === "label" || f === "size")) loFitText(it);
    if (f === "rows" || f === "cols") { const p = it.rows * it.cols; if (p > 5000) { el.setCustomValidity("Tối đa 5000 ghế mỗi khu"); el.reportValidity(); } else el.setCustomValidity(""); }
    loDrawItems(); loDrawOver();
    const cap = $("loCap");
    if (cap && it.type === "zone") cap.innerHTML = "<strong>" + SeatMap.capacity(it).toLocaleString("vi-VN") + "</strong> " + (it.seating === "standing" ? "chỗ" : "ghế") + '<span class="muted">' + SeatMap.seatRange(it) + "</span>";
    if (f === "zone_id") loDrawProps();
  };
  box.addEventListener("input", (e) => { if (e.target.dataset.f && e.target.tagName !== "SELECT") apply(e.target); });
  box.addEventListener("change", (e) => {
    const el = e.target;
    if (!el.dataset.f) return;
    if (el.tagName === "SELECT" || el.type === "checkbox") { before = before || loSnap(); apply(el); }
    if (el.type === "color") box.querySelectorAll(".lo-sw[data-color]").forEach((s) => s.setAttribute("aria-pressed", "false"));
    if (before) { loCommit(before); before = loSnap(); }
    if (el.type === "number") el.value = el.dataset.f === "rot" ? Math.round(it.rot) : (it[el.dataset.f] ?? el.value);
    if (it.type === "zone" && it.seating === "seated" && it.rows * it.cols > 5000) loToast("Mỗi khu tối đa 5.000 ghế.", "bad");
  });
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "dup") return loDuplicate();
    if (act === "del") return loDelete();
    if (act === "front" || act === "back") return loOrder(act === "front" ? 1 : -1);
    if (act === "desel") return loSelect(null);
    const bf = loSnap();
    if (b.dataset.color != null) {
      it.color = b.dataset.color || null;
      if (it.type === "zone" && !it.color) it.color = SeatMap.PALETTE[0];
    } else if (b.dataset.seating) {
      if (it.seating === b.dataset.seating) return;
      if (b.dataset.seating === "standing") { it.capacity = SeatMap.capacity(it) || 100; it.seating = "standing"; }
      else { Object.assign(it, loGuessGrid(it.w, it.h)); it.seating = "seated"; it.start_row = it.start_row || "A"; }
    } else if (b.dataset.shape) it.shape = b.dataset.shape;
    else return;
    loCommit(bf); loDrawItems(); loDrawOver(); loDrawProps();
  });
}

// ---------- Tong quan (khi khong chon gi) ----------
function loOverview() {
  const L = LO.layout;
  const zones = L.items.filter((i) => i.type === "zone");
  const total = zones.reduce((s, z) => s + SeatMap.capacity(z), 0);
  const placed = new Set(zones.map((z) => z.zone_id).filter(Boolean));
  const unplaced = LO.dbZones.filter((z) => !placed.has(z.zone_id));
  const bg = L.background;
  return '<div class="lo-props__head"><h3>Tổng quan sơ đồ</h3></div>' +
    '<div class="lo-stats"><div><strong>' + zones.length + "</strong><span>khu</span></div>" +
      "<div><strong>" + total.toLocaleString("vi-VN") + "</strong><span>ghế / chỗ</span></div>" +
      "<div><strong>" + zones.filter((z) => z.zone_id).length + "</strong><span>đã liên kết</span></div></div>" +

    '<p class="lo-sec">Bản vẽ nền</p>' +
    (bg
      ? loField("Độ đậm bản vẽ", '<div class="lo-range"><input type="range" id="loBgOp" min="0.1" max="1" step="0.05" value="' + bg.opacity + '"><output id="loBgOpV">' + Math.round(bg.opacity * 100) + "%</output></div>") +
        '<label class="lo-check"><input type="checkbox" id="loBgPub"' + (bg.public !== false ? " checked" : "") + "> Hiện bản vẽ cho khách ở trang chọn vé</label>" +
        '<label class="lo-check"><input type="checkbox" id="loBgHide"' + (LO.bgHidden ? " checked" : "") + "> Tạm ẩn bản vẽ khi thiết kế</label>" +
        '<button type="button" class="btn btn--small lo-detect" id="loDetect">' + LO_ICONS.poly + "Tự nhận diện khu từ bản vẽ</button>" +
        '<div class="lo-acts"><label class="btn btn--ghost btn--small">' + LO_ICONS.upload + 'Đổi bản vẽ<input type="file" id="loBgFile" accept=".pdf,.png,.jpg,.jpeg,.svg" hidden></label>' +
        '<button type="button" class="btn btn--ghost btn--small adm-danger" id="loBgDel">Bỏ bản vẽ</button></div>'
      : '<p class="lo-note">Chưa có bản vẽ. Có thể thêm bản vẽ của địa điểm làm nền để vẽ khu cho đúng vị trí.</p>' +
        '<label class="btn btn--ghost btn--small">' + LO_ICONS.upload + 'Thêm bản vẽ (PDF, PNG, JPG, SVG)<input type="file" id="loBgFile" accept=".pdf,.png,.jpg,.jpeg,.svg" hidden></label>') +

    '<p class="lo-sec">Khu trên sơ đồ</p>' +
    (zones.length ? '<ul class="lo-zl">' + zones.map((z) =>
      '<li><button type="button" data-pick="' + esc(z.id) + '"><span class="lo-dot" style="background:' + z.color + '"></span>' +
        "<span><strong>" + esc(z.name) + "</strong><small>" + SeatMap.capacity(z).toLocaleString("vi-VN") + (z.seating === "standing" ? " chỗ đứng" : " ghế") + "</small></span>" +
        (z.zone_id ? '<em class="is-linked" title="Đã liên kết khu trong hệ thống">' + LO_ICONS.link + "</em>" : '<em title="Sẽ tạo khu mới khi lưu">Mới</em>') +
      "</button></li>").join("") + "</ul>"
      : '<p class="lo-note">Chưa có khu nào. Dùng công cụ Khu ghế, Khu đứng hoặc Đa giác.</p>') +

    (unplaced.length
      ? '<p class="lo-sec">Khu đã có, chưa đặt lên sơ đồ</p><ul class="lo-zl lo-zl--db">' + unplaced.map((z) =>
          '<li><button type="button" data-place="' + z.zone_id + '">' + LO_ICONS.plus + "<span><strong>" + esc(z.zone_name) + "</strong><small>" + z.seat_count + " ghế" + (z.priced_events ? " · đã đặt giá" : "") + "</small></span></button></li>").join("") +
        '</ul><button type="button" class="lo-link" id="loPlaceAll">Đặt tất cả lên sơ đồ</button>'
      : "") +

    (L.method === "design" || !bg
      ? '<p class="lo-sec">Kích thước khung vẽ</p><div class="lo-grid4 lo-grid4--2">' +
          loField("Rộng", '<input type="number" id="loW" min="200" max="6000" value="' + L.width + '">') +
          loField("Cao", '<input type="number" id="loH" min="200" max="6000" value="' + L.height + '">') + "</div>"
      : "") +

    '<details class="lo-keys"><summary>Phím tắt</summary><dl>' +
      "<dt>V S R G P T</dt><dd>Chọn công cụ</dd><dt>Kéo nền trống / Space</dt><dd>Cuộn sơ đồ</dd><dt>Lăn chuột</dt><dd>Phóng to, thu nhỏ</dd>" +
      "<dt>Mũi tên</dt><dd>Dịch 1 (Shift: 10)</dd><dt>Shift khi xoay</dt><dd>Bước 15°</dd><dt>Alt khi kéo</dt><dd>Không bắt lưới</dd>" +
      "<dt>Ctrl+D</dt><dd>Nhân bản</dd><dt>Ctrl+Z / Ctrl+Y</dt><dd>Hoàn tác / làm lại</dd><dt>Ctrl+S</dt><dd>Lưu nháp</dd><dt>Delete</dt><dd>Xoá</dd></dl></details>";
}

function loBindOverview(box) {
  const L = LO.layout;
  box.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) { loSelect(p.dataset.pick); return; }
    const pl = e.target.closest("[data-place]");
    if (pl) { loPlace([LO.dbZones.find((z) => String(z.zone_id) === pl.dataset.place)]); return; }
    if (e.target.closest("#loPlaceAll")) {
      const placed = new Set(L.items.map((z) => z.zone_id).filter(Boolean));
      loPlace(LO.dbZones.filter((z) => !placed.has(z.zone_id)));
    }
  });
  const op = $("loBgOp");
  if (op) {
    let before = null;
    op.addEventListener("pointerdown", () => { before = loSnap(); });
    op.addEventListener("input", () => { L.background.opacity = Number(op.value); $("loBgOpV").textContent = Math.round(op.value * 100) + "%"; loDrawBoard(); });
    op.addEventListener("change", () => loCommit(before || loSnap()));
    $("loBgPub").addEventListener("change", (e) => { const b = loSnap(); L.background.public = e.target.checked; loCommit(b); });
    $("loBgHide").addEventListener("change", (e) => { LO.bgHidden = e.target.checked; loDrawBoard(); });
    $("loDetect").addEventListener("click", () => loOpenDetect(false));
    $("loBgDel").addEventListener("click", () => {
      if (!confirm("Bỏ bản vẽ nền? Các khu đã vẽ vẫn giữ nguyên.")) return;
      const b = loSnap(); L.background = null; loCommit(b); loDrawAll();
    });
  }
  $("loBgFile").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) { loToast("Đang xử lý bản vẽ...", "busy"); loUseDrawing(f, "replace"); } });
  ["loW", "loH"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", () => {
      const v = Math.round(Number(el.value));
      if (!(v >= 200 && v <= 6000)) { el.value = id === "loW" ? L.width : L.height; return; }
      const b = loSnap();
      if (id === "loW") L.width = v; else L.height = v;
      loCommit(b); loDrawBoard(); loFit();
    });
  });
}

// Dat cac khu da co trong database len so do (hang ngang ben duoi)
function loPlace(list) {
  if (!list.length) return;
  const before = loSnap(), L = LO.layout;
  const bottom = L.items.reduce((m, i) => Math.max(m, i.y + i.h), 140);
  const w = 220, h = 140, gap = 30, per = Math.max(1, Math.floor((L.width - 60) / (w + gap)));
  let last = null;
  list.forEach((z, i) => {
    const n = L.items.filter((x) => x.type === "zone").length;
    last = loFromDb(z, 30 + (i % per) * (w + gap), bottom + 30 + Math.floor(i / per) * (h + gap), w, h, n);
    L.items.push(last);
  });
  L.height = Math.max(L.height, Math.min(6000, bottom + 30 + Math.ceil(list.length / per) * (h + gap) + 30));
  LO.sel = list.length === 1 ? last.id : null;
  loCommit(before); loDrawAll();
}

// =====================================================================
//  Luu
// =====================================================================
function loCheck() {
  const zones = LO.layout.items.filter((i) => i.type === "zone");
  const seen = {};
  for (const z of zones) {
    const n = (z.name || "").trim();
    if (!n) return [z, "Có khu chưa đặt tên."];
    if (seen[n.toLowerCase()]) return [z, "Tên khu “" + n + "” bị trùng."];
    seen[n.toLowerCase()] = 1;
    if (z.seating === "seated" && (!(z.rows >= 1 && z.rows <= 100) || !(z.cols >= 1 && z.cols <= 200) || z.rows * z.cols > 5000)) return [z, "Khu “" + n + "”: số hàng 1–100, ghế mỗi hàng 1–200, tối đa 5.000 ghế."];
    if (z.seating === "standing" && !(z.capacity >= 1 && z.capacity <= 5000)) return [z, "Khu “" + n + "”: sức chứa từ 1 đến 5.000."];
  }
  return null;
}

async function loSave(apply, silent) {
  const st = LO;
  const bad = loCheck();
  if (bad) { loSelect(bad[0].id); loToast(bad[1], "bad"); return null; }
  const btn = $("loDraft");
  if (!silent && btn) { btn.disabled = true; btn.textContent = "Đang lưu..."; }
  try {
    const res = await API.request("PUT", "/admin/venue-layout/" + st.venue.venue_id, { layout: st.layout, apply: false });
    if (LO !== st) return null;
    st.layout.items.forEach((it, i) => { const s = res.layout.items[i]; if (s && s.id === it.id && it.type === "zone") it.zone_id = s.zone_id; });
    st.dirty = false; st.saved = true;
    const d = new Date();
    loStatus("Đã lưu nháp lúc " + pad(d.getHours()) + ":" + pad(d.getMinutes()));
    if (!silent) loToast("Đã lưu nháp sơ đồ. Bấm “Lưu & tạo ghế” khi muốn mở bán theo sơ đồ này.", "ok");
    return res;
  } catch (err) {
    loToast(err.message, "bad");
    return null;
  } finally {
    if (!silent && btn) { btn.disabled = false; btn.textContent = "Lưu nháp"; }
  }
}

async function loApply() {
  const st = LO;
  const bad = loCheck();
  if (bad) { loSelect(bad[0].id); loToast(bad[1], "bad"); return; }
  if (!st.layout.items.some((i) => i.type === "zone")) { loToast("Sơ đồ chưa có khu nào.", "bad"); return; }
  const btn = $("loApply");
  btn.disabled = true;
  let dry;
  try { dry = await API.request("PUT", "/admin/venue-layout/" + st.venue.venue_id, { layout: st.layout, apply: true, dry_run: true }); }
  catch (err) { loToast(err.message, "bad"); btn.disabled = false; return; }
  btn.disabled = false;
  if (LO !== st) return;

  const R = dry.report;
  const sum = (k) => R.reduce((s, r) => s + r[k], 0);
  const act = { created: ["Tạo mới", "new"], updated: ["Cập nhật", "upd"], unchanged: ["Không đổi", "same"] };
  const body =
    '<p class="muted">Kiểm tra các thay đổi sẽ được ghi vào hệ thống cho <strong>' + esc(st.venue.venue_name) + "</strong>.</p>" +
    '<div class="lo-sum"><div><strong>' + R.filter((r) => r.action === "created").length + "</strong><span>khu mới</span></div>" +
      "<div><strong>+" + sum("added").toLocaleString("vi-VN") + "</strong><span>ghế thêm</span></div>" +
      "<div><strong>−" + sum("removed").toLocaleString("vi-VN") + "</strong><span>ghế bỏ</span></div>" +
      "<div><strong>" + sum("capacity").toLocaleString("vi-VN") + "</strong><span>tổng sức chứa</span></div></div>" +
    '<div class="table-wrap"><table class="lo-tbl"><thead><tr><th>Khu</th><th>Thay đổi</th><th class="num">Ghế</th><th class="num">Sức chứa</th></tr></thead><tbody>' +
    R.map((r) => "<tr><td><strong>" + esc(r.name) + "</strong>" +
      (r.kept_used ? '<small class="lo-warn">Giữ ' + r.kept_used + " ghế đã có vé</small>" : "") +
      (r.tickets ? '<small class="muted">Sinh thêm ' + r.tickets + " vé cho sự kiện đã đặt giá</small>" : "") + "</td>" +
      '<td><span class="lo-tag lo-tag--' + act[r.action][1] + '">' + act[r.action][0] + "</span></td>" +
      '<td class="num">' + (r.added ? '<span class="lo-plus">+' + r.added + "</span> " : "") + (r.removed ? '<span class="lo-minus">−' + r.removed + "</span>" : "") + (!r.added && !r.removed ? "—" : "") + "</td>" +
      '<td class="num">' + r.capacity.toLocaleString("vi-VN") + "</td></tr>").join("") +
    "</tbody></table></div>" +
    (R.some((r) => r.kept_used) ? '<p class="lo-note">Ghế đã phát hành vé (kể cả vé còn trống) không xoá được nên được giữ lại. Muốn bỏ hẳn, hãy ngừng bán khu đó ở mục Giá vé trước.</p>' : "") +
    (dry.unplaced.length ? '<p class="lo-note">Các khu sau có trong hệ thống nhưng không có trên sơ đồ, sẽ được giữ nguyên và không hiện trên sơ đồ chọn vé: <strong>' + dry.unplaced.map((z) => esc(z.zone_name)).join(", ") + "</strong>.</p>" : "");

  loModal("Lưu sơ đồ và tạo ghế", body, "Xác nhận tạo ghế", async (go) => {
    go.disabled = true; go.textContent = "Đang lưu...";
    try {
      const res = await API.request("PUT", "/admin/venue-layout/" + st.venue.venue_id, { layout: st.layout, apply: true });
      if (LO !== st) return true;
      st.layout.items.forEach((it, i) => { const s = res.layout.items[i]; if (s && s.id === it.id && it.type === "zone") it.zone_id = s.zone_id; });
      st.dirty = false; st.saved = true;
      try { st.dbZones = (await API.get("/admin/venue-layout/" + st.venue.venue_id)).zones; } catch (e) { /* giu danh sach cu */ }
      const d = new Date();
      loStatus("Đã lưu và tạo ghế lúc " + pad(d.getHours()) + ":" + pad(d.getMinutes()));
      loDrawAll();
      const created = res.report.filter((r) => r.action === "created").length, added = res.report.reduce((s, r) => s + r.added, 0);
      const removed = res.report.reduce((s, r) => s + r.removed, 0);
      loToast("Đã lưu sơ đồ" + (created ? ", tạo " + created + " khu mới" : "") + (added ? ", thêm " + added + " ghế" : "") + (removed ? ", bỏ " + removed + " ghế" : "") +
        (created ? ". Vào mục Giá vé để đặt giá cho khu mới." : "."), "ok");
      return true;
    } catch (err) {
      go.disabled = false; go.textContent = "Xác nhận tạo ghế";
      loToast(err.message, "bad");
      return false;
    }
  });
}

// Xem so do nhu khach thay o trang chon ve
function loPreview() {
  const L = LO.layout;
  const zones = L.items.filter((i) => i.type === "zone");
  const pub = Object.assign({}, L, { background: L.background && L.background.public !== false ? L.background : null });
  loModal("Xem như khách", '<div class="lo-prev">' + SeatMap.render(pub, () => ({})) + "</div>" +
    '<p class="lo-note">Ở trang chọn vé, khu được tô màu theo hạng giá của từng sự kiện; khu chưa đặt giá hiện màu xám và không bấm được. ' +
    zones.length + " khu, " + zones.reduce((s, z) => s + SeatMap.capacity(z), 0).toLocaleString("vi-VN") + " ghế / chỗ.</p>", null, null, true);
}

// ---------- Hop thoai + thong bao nho ----------
function loModal(title, html, okText, onOk, wide) {
  let m = $("loModal");
  if (!m) { m = document.createElement("div"); m.id = "loModal"; m.className = "lo-modal"; document.body.appendChild(m); }
  m.innerHTML = '<div class="lo-modal__bg" data-close></div>' +
    '<div class="lo-modal__box' + (wide ? " lo-modal__box--wide" : "") + '" role="dialog" aria-modal="true" aria-labelledby="loMT">' +
      '<div class="lo-modal__head"><h2 id="loMT">' + esc(title) + '</h2><button type="button" class="adm-x" data-close aria-label="Đóng">×</button></div>' +
      '<div class="lo-modal__body">' + html + "</div>" +
      '<div class="lo-modal__foot"><button type="button" class="btn btn--ghost" data-close>' + (okText ? "Huỷ" : "Đóng") + "</button>" +
        (okText ? '<button type="button" class="btn" id="loMOk">' + esc(okText) + "</button>" : "") + "</div></div>";
  m.hidden = false;
  document.body.classList.add("am-lock");
  const close = () => { m.hidden = true; document.body.classList.remove("am-lock"); document.removeEventListener("keydown", esc_); };
  const esc_ = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", esc_);
  m.querySelectorAll("[data-close]").forEach((x) => x.addEventListener("click", close));
  if (okText) {
    const ok = $("loMOk");
    ok.focus();
    ok.addEventListener("click", async () => { if (await onOk(ok)) close(); });
  }
}

function loToast(text, kind) {
  let t = $("loToast");
  if (!t) { t = document.createElement("div"); t.id = "loToast"; t.className = "lo-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = text;
  t.className = "lo-toast is-show" + (kind ? " is-" + kind : "");
  clearTimeout(loToast.t);
  if (kind !== "busy") loToast.t = setTimeout(() => t.classList.remove("is-show"), kind === "bad" ? 6000 : 4000);
}

// =====================================================================
//  Tu nhan dien khu tu ban ve
//  Tim cac vung cung mau (khoi to mau, hoac vung ben trong khung vien kin),
//  bo nen ngoai cung + chu nho + duong ke, roi do vien thanh da giac.
//  Tuy chon doc ten khu tren anh (OCR, thu vien tesseract.js tai tu CDN).
// =====================================================================
const LO_DETECT_SIDE = 800;          // canh dai anh dung de phan tich (nho cho nhanh)
const LO_TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/";
const LO_TESS_CORE = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1";
const LO_TESS_LANG = "https://cdn.jsdelivr.net/npm/@tesseract.js-data/vie/4.0.0_best_int";

function loLoadImage(url) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("Không đọc được bản vẽ để nhận diện."));
    img.src = url;
  });
}

// Tra ve { W, H, blocks: [{ pts, bbox, area, color, stage }] } theo toa do anh phan tich
function loFindBlocks(img) {
  const s = Math.min(1, LO_DETECT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.max(1, Math.round(img.naturalWidth * s)), H = Math.max(1, Math.round(img.naturalHeight * s));
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const N = W * H, lab = new Int32Array(N).fill(-1), queue = new Int32Array(N);
  const diff = (a, b) => Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]);
  const TOL = 60, FLAT = 24;
  const comps = [];

  for (let p0 = 0; p0 < N; p0++) {
    if (lab[p0] !== -1) continue;
    const x = p0 % W, y = (p0 - x) / W;
    // Chi bat dau vung tu diem "phang" (khong phai diem vien bi nhoe mau)
    if (x === W - 1 || y === H - 1 || diff(p0 * 4, (p0 + 1) * 4) > FLAT || diff(p0 * 4, (p0 + W) * 4) > FLAT) continue;
    const id = comps.length, o = p0 * 4;
    let qh = 0, qt = 0;
    queue[qt++] = p0; lab[p0] = id;
    let area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, edge = false, sr = 0, sg = 0, sb = 0, first = p0;
    while (qh < qt) {
      const p = queue[qh++], px_ = p % W, py = (p - px_) / W;
      area++; if (p < first) first = p; sr += px[p * 4]; sg += px[p * 4 + 1]; sb += px[p * 4 + 2];
      if (px_ < x0) x0 = px_; if (px_ > x1) x1 = px_; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px_ === 0 || py === 0 || px_ === W - 1 || py === H - 1) edge = true;
      if (px_ > 0 && lab[p - 1] === -1 && diff(o, (p - 1) * 4) <= TOL) { lab[p - 1] = id; queue[qt++] = p - 1; }
      if (px_ < W - 1 && lab[p + 1] === -1 && diff(o, (p + 1) * 4) <= TOL) { lab[p + 1] = id; queue[qt++] = p + 1; }
      if (py > 0 && lab[p - W] === -1 && diff(o, (p - W) * 4) <= TOL) { lab[p - W] = id; queue[qt++] = p - W; }
      if (py < H - 1 && lab[p + W] === -1 && diff(o, (p + W) * 4) <= TOL) { lab[p + W] = id; queue[qt++] = p + W; }
    }
    // first = diem dau tien theo thu tu quet (chac chan nam tren vien ngoai)
    comps.push({ id, start: first, area, x0, y0, x1, y1, edge, color: [sr / area, sg / area, sb / area] });
  }

  const minArea = Math.max(80, N * 0.0018);
  const keep = comps.filter((c) => {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    return !c.edge && c.area >= minArea && bw >= 10 && bh >= 8 && c.area / (bw * bh) >= 0.4;
  });

  const blocks = keep.map((c) => {
    const ring = loTrace(lab, W, H, c.id, c.start);
    let pts = loSimplify(ring, Math.max(1.2, Math.min(3, Math.sqrt(c.area) * 0.02)));
    if (pts.length < 3) pts = [[c.x0, c.y0], [c.x1 + 1, c.y0], [c.x1 + 1, c.y1 + 1], [c.x0, c.y1 + 1]];
    return { id: c.id, pts, bbox: [c.x0, c.y0, c.x1 + 1, c.y1 + 1], area: c.area, color: c.color };
  });

  // San khau: khoi tren cung, dai ngang, khong co khoi nao nam cao hon no
  const top = blocks.slice().sort((a, b) => a.bbox[1] - b.bbox[1])[0];
  if (top) {
    const bw = top.bbox[2] - top.bbox[0], bh = top.bbox[3] - top.bbox[1];
    if (bw / bh >= 2.4 && bw >= W * 0.2 && blocks.every((b) => b === top || b.bbox[1] >= top.bbox[3] - 2)) top.stage = true;
  }
  // Thu tu: tu tren xuong, trai sang phai (theo hang)
  const rowH = H * 0.04;
  blocks.sort((a, b) => Math.round(a.bbox[1] / rowH) - Math.round(b.bbox[1] / rowH) || a.bbox[0] - b.bbox[0]);
  return { W, H, blocks, lab };
}

// Do vien ngoai cua 1 vung (Moore neighbor tracing), tra ve cac diem goc pixel
function loTrace(lab, W, H, id, start) {
  const D = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && lab[y * W + x] === id;
  const sx = start % W, sy = (start - sx) / W;
  const out = [[sx, sy]];
  let cx = sx, cy = sy, back = 0, second = null;
  for (let guard = 0; guard < 8 * W * H && out.length < 4 * (W + H) * 4; guard++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      if (at(cx + D[d][0], cy + D[d][1])) { found = d; break; }
    }
    if (found < 0) break;                                  // 1 diem don le
    const nx = cx + D[found][0], ny = cy + D[found][1];
    const bx = cx + D[(found + 7) % 8][0], by = cy + D[(found + 7) % 8][1];
    if (nx === sx && ny === sy && second) break;
    if (cx === sx && cy === sy && second && nx === second[0] && ny === second[1]) break;
    if (!second) second = [nx, ny];
    cx = nx; cy = ny;
    back = D.findIndex((v) => cx + v[0] === bx && cy + v[1] === by);
    if (back < 0) back = 0;
    out.push([cx, cy]);
  }
  return out;
}

// Rut gon duong vien kin (Ramer-Douglas-Peucker), bo diem gan thang hang
function loSimplify(ring, eps) {
  if (ring.length < 4) return ring;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
  };
  const rdp = (pts) => {
    let best = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if (d > best) { best = d; idx = i; } }
    if (best <= eps) return [pts[0], pts[pts.length - 1]];
    return rdp(pts.slice(0, idx + 1)).slice(0, -1).concat(rdp(pts.slice(idx)));
  };
  // Cat vong tai 2 diem xa nhau nhat de chay RDP tren 2 nua
  let far = 0, fi = 0;
  ring.forEach((p, i) => { const d = Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]); if (d > far) { far = d; fi = i; } });
  const a = rdp(ring.slice(0, fi + 1)), b = rdp(ring.slice(fi).concat([ring[0]]));
  let pts = a.slice(0, -1).concat(b.slice(0, -1));
  // Bo diem gan thang hang con sot
  for (let changed = true; changed && pts.length > 3;) {
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 3; i++) {
      const p = pts[(i + pts.length - 1) % pts.length], q = pts[i], r = pts[(i + 1) % pts.length];
      if (dist(q, p, r) < eps * 0.8) { pts.splice(i, 1); changed = true; break; }
    }
  }
  // Toa do pixel -> canh pixel: noi rong 0.5 de bu phan vien bi an
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [x + 0.5 + Math.sign(x - cx) * 0.5, y + 0.5 + Math.sign(y - cy) * 0.5]);
}

const loHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();

// Mat na chu cua 1 khoi: cac "lo" ben trong khoi (diem khong thuoc khoi va khong
// thong ra ngoai khung bao) chinh la chu viet tren khoi. Tra ve Uint8Array theo bbox.
function loTextMask(det, b) {
  const [x0, y0, x1, y1] = b.bbox, w = x1 - x0, h = y1 - y0, lab = det.lab, W = det.W;
  const inComp = (x, y) => lab[(y0 + y) * W + x0 + x] === b.id;
  const out = new Uint8Array(w * h), q = [];
  const push = (x, y) => { const i = y * w + x; if (!out[i] && !inComp(x, y)) { out[i] = 1; q.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (q.length) {
    const i = q.pop(), x = i % w, y = (i - x) / w;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  const hole = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!out[y * w + x] && !inComp(x, y)) hole[y * w + x] = 1;
  // Noi rong 1 diem de lay ca vien nhoe cua chu
  const grow = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!hole[y * w + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h) grow[Y * w + X] = 1;
    }
  }
  return { w, h, mask: grow, any: hole.some((v) => v) };
}

// Anh den trang cua chu trong 1 khoi, o do phan giai goc, phong to cho de doc
function loTextCanvas(img, det, b) {
  const tm = loTextMask(det, b);
  if (!tm.any) return null;
  const k = img.naturalWidth / det.W, [x0, y0] = b.bbox;
  const sw = tm.w * k, sh = tm.h * k, up = Math.max(1, Math.min(4, 240 / sh));
  const pad = 30, cw = Math.round(sw * up), ch = Math.round(sh * up);
  const cv = document.createElement("canvas");
  cv.width = cw + 2 * pad; cv.height = ch + 2 * pad;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, x0 * k, y0 * k, sw, sh, pad, pad, cw, ch);
  const d = ctx.getImageData(0, 0, cv.width, cv.height), p = d.data, [r, g, bl] = b.color;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const j = (y * cv.width + x) * 4;
    const mx = Math.floor((x - pad) / up / k), my = Math.floor((y - pad) / up / k);
    const inText = mx >= 0 && my >= 0 && mx < tm.w && my < tm.h && tm.mask[my * tm.w + mx];
    const far = Math.abs(p[j] - r) + Math.abs(p[j + 1] - g) + Math.abs(p[j + 2] - bl) > 150;
    p[j] = p[j + 1] = p[j + 2] = inText && far ? 0 : 255;
  }
  ctx.putImageData(d, 0, 0);
  return cv;
}

const loCleanText = (t) => String(t || "").replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim()
  .split(" ").filter((w, i, a) => a.length === 1 || w.length > 1 || /\d/.test(w) || (i > 0 && /^\p{L}{2,}$/u.test(a[i - 1]) && /^[A-Z]$/.test(w))).join(" ");
// Bo ky tu le do vien / nhieu (VD "TỔ 2 J"), giu chu cai sau 1 tu (VD "ZONE A")

// Doc chu trong tung khoi (tesseract.js): ban tieng Viet doc chu, ban tieng Anh doc so
// (font tieu de hay lam ban tieng Viet doc nham 3 thanh 5). Loi -> throw de dung ten tu dat.
async function loReadNames(img, det, blocks, onStep) {
  await loLoadScript(LO_TESS + "tesseract.min.js");
  const make = async (lang) => {
    const w = await window.Tesseract.createWorker(lang, 1, {
      workerPath: LO_TESS + "worker.min.js", corePath: LO_TESS_CORE,
      langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/" + lang + "/4.0.0_best_int",
    });
    await w.setParameters({ tessedit_pageseg_mode: "7" });   // 1 dong chu
    return w;
  };
  onStep(0, blocks.length);
  const [vie, eng] = await Promise.all([make("vie"), make("eng")]);
  const names = [];
  try {
    for (let i = 0; i < blocks.length; i++) {
      onStep(i + 1, blocks.length);
      const cv = loTextCanvas(img, det, blocks[i]);
      if (!cv) { names.push(""); continue; }
      const [rv, re] = await Promise.all([vie.recognize(cv), eng.recognize(cv)]);
      const tv = loCleanText(rv.data.text), te = loCleanText(re.data.text);
      const cv_ = rv.data.confidence, ce = re.data.confidence;
      const nd = (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toUpperCase();
      const vw = tv.split(" ");
      let t;
      if (te && /^[A-Za-z0-9 .-]+$/.test(te) && ce > cv_ + 15) {
        // Ban tieng Anh chac hon: lay ket qua do, tu nao trung (bo dau) voi ban tieng Viet thi giu dau
        t = te.split(" ").map((w) => vw.find((v) => nd(v) === nd(w)) || w).join(" ");
      } else {
        // Ban tieng Viet: thay so bang so cua ban tieng Anh neu cung so luong, cung do dai
        const dv = tv.match(/\d+/g) || [], de = te.match(/\d+/g) || [];
        const ok = dv.length && dv.length === de.length && dv.every((d, j) => d.length === de[j].length);
        let n = 0;
        t = ok ? tv.replace(/\d+/g, () => de[n++]) : tv;
      }
      names.push(t && t.length <= 40 && Math.max(cv_, ce) > 40 ? t : "");
    }
  } finally { await Promise.all([vie.terminate(), eng.terminate()]); }
  return names;
}

// Mo hop nhan dien. auto = true khi vua tai ban ve (khong tim thay thi thoi, khong bao loi)
async function loOpenDetect(auto) {
  const st = LO, bg = st && st.layout.background;
  if (!bg) { loToast("Chưa có bản vẽ để nhận diện.", "bad"); return; }
  let img, det;
  try {
    loToast("Đang nhận diện các khu trên bản vẽ...", "busy");
    img = await loLoadImage(bg.url);
    await new Promise((r) => setTimeout(r, 30));           // de thong bao kip hien
    det = loFindBlocks(img);
  } catch (err) { loToast(err.message, "bad"); return; }
  if (LO !== st) return;
  if (!det.blocks.length) {
    loToast(auto ? "Không tự tìm thấy khu nào trên bản vẽ. Dùng công cụ Đa giác để đồ theo từng khu."
                 : "Không tìm thấy khối màu hay vùng có viền kín nào trên bản vẽ.", auto ? "info" : "bad");
    return;
  }
  const tt = $("loToast"); if (tt) tt.classList.remove("is-show");

  const zones = det.blocks.filter((b) => !b.stage), stage = det.blocks.find((b) => b.stage);
  const sw = Math.max(1.5, det.W / 400);
  const preview = '<svg class="sm" viewBox="0 0 ' + det.W + " " + det.H + '" xmlns="http://www.w3.org/2000/svg">' +
    '<image href="' + esc(bg.url) + '" width="' + det.W + '" height="' + det.H + '"/>' +
    det.blocks.map((b) => {
      const [cx, cy] = SeatMap.polyCenter(b.pts);
      const no = b.stage ? "S" : zones.indexOf(b) + 1;
      return '<polygon points="' + b.pts.map((p) => p.join(",")).join(" ") + '" fill="' + (b.stage ? "rgba(255,255,255,.18)" : "rgba(43,208,127,.25)") +
        '" stroke="' + (b.stage ? "#FFFFFF" : "#2BD07F") + '" stroke-width="' + sw + '" stroke-dasharray="' + sw * 3 + " " + sw * 2 + '"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + sw * 7 + '" fill="#111" stroke="#2BD07F" stroke-width="' + sw + '"/>' +
        '<text x="' + cx + '" y="' + cy + '" fill="#FFF" font-size="' + sw * 8 + '" font-weight="800" text-anchor="middle" dominant-baseline="central">' + no + "</text>";
    }).join("") + "</svg>";

  loModal("Tự nhận diện khu từ bản vẽ",
    '<p class="muted">Tìm thấy <strong>' + zones.length + " khu</strong>" + (stage ? " và <strong>sân khấu</strong> (S)" : "") +
      ". Các khu được tạo thành hình có thể kéo, chỉnh điểm, đổi tên và nhập số ghế như khu vẽ tay.</p>" +
    '<div class="lo-prev">' + preview + "</div>" +
    '<label class="lo-check"><input type="checkbox" id="loDetOcr" checked> Đọc tên khu trên bản vẽ (cần mạng, mất vài giây)</label>' +
    (stage ? '<label class="lo-check"><input type="checkbox" id="loDetStage" checked> Tạo sân khấu từ khối S</label>' : "") +
    (st.layout.items.some((i) => i.type === "zone") ? '<label class="lo-check"><input type="checkbox" id="loDetClear"> Xoá các khu đang có trên sơ đồ trước khi tạo</label>' : "") +
    '<p class="lo-note">Số hàng và số ghế được gợi ý theo kích thước từng khu, hãy kiểm tra lại trước khi bấm Lưu &amp; tạo ghế. Bấm Hoàn tác (Ctrl+Z) nếu muốn bỏ.</p>',
    "Tạo " + zones.length + " khu", async (go) => {
      const useOcr = $("loDetOcr").checked, useStage = !!(stage && $("loDetStage") && $("loDetStage").checked);
      const clear = !!($("loDetClear") && $("loDetClear").checked);
      go.disabled = true;
      let names = [];
      if (useOcr) {
        try { names = await loReadNames(img, det, det.blocks, (i, n) => { go.textContent = i ? "Đang đọc tên " + i + "/" + n + "..." : "Đang tải bộ đọc chữ..."; }); }
        catch (err) { loToast("Không đọc được tên khu (" + err.message + "). Đã đặt tên tự động.", "info"); }
      }
      if (LO !== st) return true;
      loAddDetected(det, names, useStage, clear);
      return true;
    }, true);
}

function loAddDetected(det, names, useStage, clear) {
  const L = LO.layout, f = L.width / det.W, before = loSnap();
  if (clear) L.items = L.items.filter((i) => i.type !== "zone");
  const used = new Set(L.items.filter((i) => i.type === "zone").map((i) => i.name.toLowerCase()));
  const unique = (n) => {
    let name = n.slice(0, 44), k = 2;
    while (used.has(name.toLowerCase())) name = n.slice(0, 44) + " (" + k++ + ")";
    used.add(name.toLowerCase());
    return name;
  };
  // Ten doc duoc bi lap (VD: 2 khoi "TỔ 2" hai ben san khau) -> them ben Trai / Giua / Phai
  const count = {};
  names.forEach((n, i) => { if (n && !det.blocks[i].stage) count[n.toLowerCase()] = (count[n.toLowerCase()] || 0) + 1; });
  const side = (b) => { const c = (b.bbox[0] + b.bbox[2]) / 2 / det.W; return c < 0.4 ? "Trái" : c > 0.6 ? "Phải" : "Giữa"; };
  let auto = 1, made = 0;
  det.blocks.forEach((b, i) => {
    const pts = b.pts.map(([x, y]) => [Math.round(x * f), Math.round(y * f)]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
    // 4 diem gan nhu chu nhat thang -> dung khung chu nhat (de keo gian / xoay)
    const rect = pts.length === 4 && pts.every((p, j) => {
      const q = pts[(j + 1) % 4];
      return Math.abs(p[0] - q[0]) <= 3 * f || Math.abs(p[1] - q[1]) <= 3 * f;
    });
    // Vung trang / den (ban ve chi co duong vien) -> dung mau trong bang mau cho de nhin
    const lum = (0.2126 * b.color[0] + 0.7152 * b.color[1] + 0.0722 * b.color[2]) / 255;
    const color = lum > 0.92 || lum < 0.08 ? SeatMap.PALETTE[made % 8] : loHex(b.color), read = names[i] || "";
    if (b.stage) {
      if (useStage) L.items.unshift(loStage({ x, y, w, h, label: read ? read.toUpperCase() : "SÂN KHẤU", color, shape: "rect" }));
      return;
    }
    let name = read && count[read.toLowerCase()] > 1 ? read + " " + side(b) : read;
    if (!name) { while (used.has(("Khu " + auto).toLowerCase())) auto++; name = "Khu " + auto; }
    const z = loZone(Object.assign({ name: unique(name), color }, loGuessGrid(w * 0.85, h * 0.85),
      rect ? { shape: "rect", x, y, w, h } : { shape: "poly", points: pts }));
    if (z.shape === "poly") loPolyBox(z);
    L.items.push(z);
    made++;
  });
  LO.sel = null;
  loCommit(before);
  loDrawAll();
  loToast("Đã tạo " + made + " khu từ bản vẽ. Kiểm tra tên, số hàng, số ghế rồi bấm Lưu & tạo ghế.", "ok");
}