/* seatmap.js - Ve so do su kien bang SVG, dung chung cho:
   - trang quan tri (Tao so do su kien)  -> js/layout-editor.js
   - trang chon ve (booking.html)

   Du lieu so do (luu o backend/venue_layout.py):
   { method: "image"|"design", width, height,
     background: { url, opacity, public } | null,
     items: [
       { type: "stage", id, x, y, w, h, rot, label, size, color, shape: "rect"|"round"|"thrust" },
       { type: "zone",  id, x, y, w, h, rot, shape: "rect"|"poly", points, name, color, zone_id,
         seating: "seated"|"standing", start_row, rows, cols, capacity, show_seats },
       { type: "text",  id, x, y, w, h, rot, label, size, color }
     ] }
   Toa do: x, y, w, h la khung chua (truoc khi xoay), xoay quanh tam khung. */

const SeatMap = (() => {
  const PALETTE = ["#2BD07F", "#4FC6E3", "#9B6BFF", "#FFB547", "#FF4D8D", "#FF7A45", "#2EC4B6", "#D34FE8", "#8BE9FB", "#C9C9D1"];
  const STAGE_COLOR = "#C9C9D1";
  const STANDING_PER_ROW = 50;   // khop backend/venue_layout.py

  const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const r2 = (n) => Math.round(n * 100) / 100;

  // 0 -> A, 25 -> Z, 26 -> AA (giong backend)
  function rowLabel(i) {
    let s = "";
    i += 1;
    while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  function capacity(z) {
    return z.seating === "standing" ? (z.capacity || 0) : (z.rows || 0) * (z.cols || 0);
  }
  // "A1 → J12" cho khu ghe ngoi
  function seatRange(z) {
    const start = (z.start_row || "A").charCodeAt(0) - 65;
    if (z.seating === "standing") {
      const rows = Math.ceil((z.capacity || 0) / STANDING_PER_ROW);
      if (!rows) return "";
      const last = (z.capacity - 1) % STANDING_PER_ROW + 1;
      return rowLabel(start) + "1 → " + rowLabel(start + rows - 1) + last;
    }
    if (!z.rows || !z.cols) return "";
    return rowLabel(start) + "1 → " + rowLabel(start + z.rows - 1) + z.cols;
  }

  // Mau chu doc duoc tren nen
  function inkOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#111";
    const n = parseInt(m[1], 16);
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
    return L > 0.33 ? "#121216" : "#FFFFFF";
  }

  function frame(it) {
    return "translate(" + r2(it.x + it.w / 2) + " " + r2(it.y + it.h / 2) + ") rotate(" + r2(it.rot || 0) + ") translate(" + r2(-it.w / 2) + " " + r2(-it.h / 2) + ")";
  }

  function polyPts(pts) { return pts.map((p) => r2(p[0]) + "," + r2(p[1])).join(" "); }

  // Tam nhin thay cua da giac (trung binh dinh, du dung cho nhan)
  function polyCenter(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    if (Math.abs(a) < 1e-6) return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
    return [cx / (3 * a), cy / (3 * a)];
  }

  // Hoa van cham ghe: moi o la 1 ghe
  function seatPattern(pid, z, ink) {
    const rows = z.seating === "standing" ? 0 : z.rows, cols = z.seating === "standing" ? 0 : z.cols;
    if (!rows || !cols) return "";
    const pad = Math.min(z.w, z.h) * 0.06;
    const cw = (z.w - 2 * pad) / cols, ch = (z.h - 2 * pad) / rows;
    if (cw < 1.2 || ch < 1.2) return "";
    const r = Math.max(0.5, Math.min(cw, ch) * 0.34);
    const ox = z.shape === "poly" ? z.x + pad : pad, oy = z.shape === "poly" ? z.y + pad : pad;
    return '<pattern id="' + pid + '" patternUnits="userSpaceOnUse" x="' + r2(ox) + '" y="' + r2(oy) + '" width="' + r2(cw) + '" height="' + r2(ch) + '">' +
      '<circle cx="' + r2(cw / 2) + '" cy="' + r2(ch / 2) + '" r="' + r2(r) + '" fill="' + (ink === "#FFFFFF" ? "rgba(255,255,255,.38)" : "rgba(0,0,0,.28)") + '"/></pattern>';
  }

  function stageShape(it, fill) {
    const w = it.w, h = it.h;
    if (it.shape === "round") {
      const k = Math.min(h * 0.55, w * 0.25);
      return '<path d="M0 0H' + r2(w) + "V" + r2(h - k) + "Q" + r2(w / 2) + " " + r2(h + k * 0.6) + " 0 " + r2(h - k) + 'Z" fill="' + fill + '"/>';
    }
    if (it.shape === "thrust") {
      const bh = h * 0.55, rw = w * 0.22;
      return '<path d="M0 0H' + r2(w) + "V" + r2(bh) + "H" + r2(w / 2 + rw / 2) + "V" + r2(h) + "H" + r2(w / 2 - rw / 2) + "V" + r2(bh) + 'H0Z" fill="' + fill + '"/>';
    }
    return '<rect width="' + r2(w) + '" height="' + r2(h) + '" rx="6" fill="' + fill + '"/>';
  }

  // Ve 1 thanh phan. opt (tuy chon, cho trang chon ve):
  //   fill, sub (dong chu thu 2), attrs (thuoc tinh them cho <g>), cls, prefix (tien to id hoa van)
  function item(it, opt) {
    opt = opt || {};
    const attrs = ' data-id="' + e(it.id) + '"' + (opt.attrs || "");
    if (it.type === "stage") {
      const fill = it.color || STAGE_COLOR, ink = inkOn(fill);
      const fs = Math.max(6, Math.min(it.size || 28, it.h * (it.shape === "thrust" ? 0.32 : 0.5), it.w / Math.max(4, (it.label || "").length * 0.62)));
      const ty = it.shape === "thrust" ? it.h * 0.29 : it.shape === "round" ? it.h * 0.42 : it.h / 2;
      return '<g class="sm-item sm-stage ' + (opt.cls || "") + '" transform="' + frame(it) + '"' + attrs + ">" + stageShape(it, fill) +
        '<text x="' + r2(it.w / 2) + '" y="' + r2(ty) + '" fill="' + ink + '" font-size="' + r2(fs) + '" font-weight="800" text-anchor="middle" dominant-baseline="central">' + e(it.label) + "</text></g>";
    }
    if (it.type === "text") {
      return '<g class="sm-item sm-text ' + (opt.cls || "") + '" transform="' + frame(it) + '"' + attrs + ">" +
        '<rect class="sm-hit" width="' + r2(it.w) + '" height="' + r2(it.h) + '" fill="transparent"/>' +
        '<text x="' + r2(it.w / 2) + '" y="' + r2(it.h / 2) + '" fill="' + (it.color || "#D4D4D8") + '" font-size="' + r2(it.size || 20) + '" font-weight="700" text-anchor="middle" dominant-baseline="central">' + e(it.label) + "</text></g>";
    }
    // Khu
    const fill = opt.fill || it.color || PALETTE[0], ink = inkOn(fill);
    const pid = (opt.prefix || "sp") + "-" + it.id;
    const pat = it.show_seats !== false && it.seating !== "standing" ? seatPattern(pid, it, ink) : "";
    const cap = capacity(it);
    const sub = opt.sub != null ? opt.sub : cap ? (it.seating === "standing" ? "Đứng · " : "") + cap.toLocaleString("vi-VN") + (it.seating === "standing" ? " chỗ" : " ghế") : "";
    let shape, cx, cy, w = it.w, h = it.h, open, close = "</g>";
    if (it.shape === "poly" && it.points && it.points.length >= 3) {
      const pts = polyPts(it.points);
      shape = '<polygon class="sm-shape" points="' + pts + '" fill="' + fill + '"/>' + (pat ? '<polygon points="' + pts + '" fill="url(#' + pid + ')" pointer-events="none"/>' : "");
      [cx, cy] = polyCenter(it.points);
      open = '<g class="sm-item sm-zone ' + (opt.cls || "") + '"' + attrs + ">";
    } else {
      const pad = Math.min(w, h) * 0.06;     // chi to cham ghe phan ben trong, khong tran ra mep
      shape = '<rect class="sm-shape" width="' + r2(w) + '" height="' + r2(h) + '" rx="4" fill="' + fill + '"/>' +
        (pat ? '<rect x="' + r2(pad) + '" y="' + r2(pad) + '" width="' + r2(w - 2 * pad) + '" height="' + r2(h - 2 * pad) + '" fill="url(#' + pid + ')" pointer-events="none"/>' : "");
      cx = w / 2; cy = h / 2;
      open = '<g class="sm-item sm-zone ' + (opt.cls || "") + '" transform="' + frame(it) + '"' + attrs + ">";
    }
    const name = it.name || "";
    const fs = Math.max(7, Math.min(26, h * 0.26, w / Math.max(3, name.length * 0.62)));
    const fs2 = Math.max(6, fs * 0.6);
    const both = sub && h > fs * 2.6;
    // Chu doc nguoc khi xoay > 90 do: xoay chu lai cho de doc
    const nr = (((it.rot || 0) % 360) + 360) % 360;
    const flip = it.shape !== "poly" && nr > 90 && nr < 270 ?' transform="rotate(180 ' + r2(cx) + " " + r2(cy) + ')"' : "";
    const label = '<g class="sm-label" pointer-events="none"' + flip + '>' +
      '<text x="' + r2(cx) + '" y="' + r2(both ? cy - fs2 * 0.65 : cy) + '" fill="' + ink + '" font-size="' + r2(fs) + '" font-weight="800" text-anchor="middle" dominant-baseline="central" ' +
        'paint-order="stroke" stroke="' + fill + '" stroke-width="' + r2(fs * 0.28) + '" stroke-linejoin="round">' + e(name) + "</text>" +
      (both ? '<text x="' + r2(cx) + '" y="' + r2(cy + fs * 0.62) + '" fill="' + ink + '" font-size="' + r2(fs2) + '" font-weight="600" text-anchor="middle" dominant-baseline="central" ' +
        'paint-order="stroke" stroke="' + fill + '" stroke-width="' + r2(fs2 * 0.28) + '" opacity=".9">' + e(sub) + "</text>" : "") + "</g>";
    return (pat ? "<defs>" + pat + "</defs>" : "") + open + shape + label + close;
  }

  // Khung bao cac thanh phan (tinh ca goc xoay)
  function bounds(items) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    items.forEach((it) => {
      if (it.shape === "poly" && it.points) return it.points.forEach((p) => add(p[0], p[1]));
      const a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v]) => {
        const dx = u * it.w / 2, dy = v * it.h / 2;
        add(cx + dx * c - dy * s, cy + dx * s + dy * c);
      });
    });
    return x0 === Infinity ? null : [x0, y0, x1 - x0, y1 - y0];
  }

  // Ca so do (trang chon ve). zoneOpt(item) -> opt cho tung khu.
  // Khong co ban ve nen thi cat sat cac thanh phan cho so do to, de bam.
  function render(layout, zoneOpt) {
    const W = layout.width, H = layout.height, bg = layout.background;
    const items = layout.items || [];
    const b = bg ? null : bounds(items), m = 24;
    const vb = b ? [b[0] - m, b[1] - m, b[2] + 2 * m, b[3] + 2 * m].map(r2).join(" ") : "0 0 " + W + " " + H;
    return '<svg class="sm" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" font-family="Be Vietnam Pro, system-ui, sans-serif">' +
      (bg ? '<image href="' + e(bg.url) + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid meet" opacity="' + (bg.opacity ?? 0.6) + '"/>' : "") +
      items.filter((it) => it.type !== "zone").map((it) => item(it)).join("") +
      items.filter((it) => it.type === "zone").map((it) => item(it, zoneOpt ? zoneOpt(it) : null)).join("") +
      "</svg>";
  }

  return { PALETTE, STAGE_COLOR, rowLabel, capacity, seatRange, inkOn, item, render, polyCenter, esc: e };
})();