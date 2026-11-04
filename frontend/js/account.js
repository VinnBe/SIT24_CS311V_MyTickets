/* Khung trang tai khoan (kieu ticketbox): duong dan + thanh ben trai + noi dung.
   Dung: const page = await AccountShell.mount({ active, crumbs, title });  page.body la phan noi dung. */
const AccountShell = (() => {
  const I = (d) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const ICON = {
    user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
    order: I('<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3z"/>'),
    caret: I('<path d="M6 9l6 6 6-6"/>'),
  };

  // active: profile | settings | tickets | memberships
  function sidebar(me, active) {
    const initial = [...(String(me.full_name || me.username).trim().split(/\s+/).pop() || "?")][0].toUpperCase();
    const orders = active === "tickets" || active === "memberships";
    const cur = (k) => (active === k ? ' aria-current="page"' : "");
    return '<aside class="as__side" aria-label="Menu tài khoản">' +
      '<a class="as__who' + (active === "profile" ? " is-on" : "") + '" href="profile.html"' + cur("profile") + ">" +
        '<span class="as__avatar" aria-hidden="true">' + esc(initial) + "</span>" +
        '<span><small>Tài khoản của</small><strong>' + esc(me.full_name || me.username) + "</strong></span></a>" +
      '<a class="as__item' + (active === "settings" ? " is-on" : "") + '" href="settings.html"' + cur("settings") + ">" + ICON.user + "Cài đặt tài khoản</a>" +
      '<button type="button" class="as__item' + (orders ? " is-on" : "") + '" id="asOrders" aria-expanded="' + orders + '">' + ICON.order + "Đơn hàng của tôi" + '<span class="as__caret">' + ICON.caret + "</span></button>" +
      '<div class="as__sub" id="asSub"' + (orders ? "" : " hidden") + ">" +
        '<a href="my-orders.html"' + cur("tickets") + (active === "tickets" ? ' class="is-on"' : "") + ">Vé của tôi</a>" +
        '<a href="memberships.html"' + cur("memberships") + (active === "memberships" ? ' class="is-on"' : "") + ">Thẻ thành viên của tôi</a>" +
      "</div></aside>";
  }

  async function mount(opt) {
    const root = document.getElementById("acctRoot");
    const me = await initPage();
    if (!me.logged_in) { location.replace("login.html?next=" + encodeURIComponent(currentPage())); return null; }
    if (me.role !== "customer") {
      root.innerHTML = '<div class="panel"><p>Trang này dành cho tài khoản khách hàng.</p><p><a href="index.html">Về trang chủ</a></p></div>';
      return null;
    }
    document.title = opt.title + " | MyTickets";
    const crumbs = [["Trang chủ", "index.html"]].concat(opt.crumbs || []);
    root.innerHTML =
      '<nav class="as__crumbs" aria-label="Đường dẫn">' + crumbs.map(([t, h], i) =>
        i === crumbs.length - 1 ? '<span aria-current="page">' + esc(t) + "</span>"
                                : '<a href="' + h + '">' + esc(t) + "</a>").join('<span class="as__sep">›</span>') + "</nav>" +
      '<div class="as">' + sidebar(me, opt.active) + '<section class="as__main" id="asMain"></section></div>';
    document.getElementById("asOrders").addEventListener("click", (e) => {
      const sub = document.getElementById("asSub");
      sub.hidden = !sub.hidden;
      e.currentTarget.setAttribute("aria-expanded", String(!sub.hidden));
    });
    return { me, body: document.getElementById("asMain") };
  }

  // Trang thai trong: hinh tron + dong chu + (nut)
  function empty(text, btn) {
    return '<div class="as__empty"><div class="as__art" aria-hidden="true"><i></i></div><p>' + esc(text) + "</p>" +
           (btn ? '<a class="btn" href="' + btn[1] + '">' + esc(btn[0]) + "</a>" : "") + "</div>";
  }

  return { mount, empty };
})();
