/* rich-text.js - Hien thi noi dung gioi thieu su kien do admin soan.
 *
 * Cu phap don gian (dung chung cho trang su kien va khung xem truoc cua admin):
 *   ## Tieu de          mot dong bat dau bang "## " -> tieu de nho
 *   **chu dam**         in dam trong doan van
 *   ![chu thich](url)   mot dong rieng -> hinh anh (chu thich co the de trong)
 *   1 dong trong        sang doan moi; xuong dong 1 lan -> ngat dong
 *
 * An toan: moi ky tu deu duoc esc() truoc khi ghep HTML, va chi nhan anh nam trong
 * /uploads/events/<id>/content/ (anh admin tai len), khong nhan link ngoai.
 * Can js/api.js (ham esc) nap truoc.
 */
const RichText = (() => {
  const IMG_LINE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;
  const SAFE_IMG = /^\/uploads\/events\/\d+\/content\/[0-9a-f]{16}\.(?:jpg|png|webp)$/;

  // Doan van: esc truoc roi moi doi **...** thanh <strong>, xuong dong thanh <br>
  function inline(text) {
    return esc(text)
      .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function render(text) {
    const out = [];
    let para = [];
    const flush = () => {
      const p = para.join("\n").trim();
      if (p) out.push("<p>" + inline(p) + "</p>");
      para = [];
    };

    String(text || "").replace(/\r\n/g, "\n").split("\n").forEach((raw) => {
      const line = raw.trim();
      if (!line) { flush(); return; }

      if (line.startsWith("## ")) {
        flush();
        out.push("<h3>" + inline(line.slice(3).trim()) + "</h3>");
        return;
      }

      const m = line.match(IMG_LINE);
      if (m) {
        flush();
        const alt = m[1].trim();
        if (SAFE_IMG.test(m[2])) {
          out.push('<figure class="rt-fig"><img src="' + esc(m[2]) + '" alt="' + esc(alt) +
            '" loading="lazy">' + (alt ? "<figcaption>" + esc(alt) + "</figcaption>" : "") + "</figure>");
        } else {
          out.push('<p class="muted">[Ảnh không hợp lệ]</p>');
        }
        return;
      }
      para.push(raw);
    });
    flush();
    return out.join("");
  }

  // Doan "Luu y cho nguoi mua" mac dinh khi admin chua sua (can fmtDt trong api.js).
  // Tinh lai moi lan hien thi nen ngay mo ban luon dung theo su kien.
  function defaultNotes(saleStart) {
    return (saleStart ? "Vé được mở bán từ " + fmtDt(saleStart) + ".\n\n" : "") +
      "Mỗi tài khoản được mua tối đa 2 vé cho sự kiện này. Vé đã thanh toán không đổi hoặc hoàn tiền.";
  }

  return { render, defaultNotes };
})();
