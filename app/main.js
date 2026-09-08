document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Store.init();
  } catch (error) {
    document.getElementById("view-home").innerHTML = empty(
      "서비스에 연결하지 못했어요",
      error.message,
      '<button class="button" id="retry-connection">다시 연결</button>',
    );
    document.getElementById("retry-connection").onclick = () =>
      location.reload();
    return;
  }
  document.getElementById("header-notifications").innerHTML =
    icon("bell") + '<i id="notification-dot" class="unread-dot" hidden></i>';
  document.getElementById("header-profile").innerHTML = icon("user");
  document.getElementById("assistant-button").innerHTML =
    icon("bolt") + "<span>거래 도우미</span>";
  Nav.init({
    home: HomeView,
    likes: LikesView,
    create: CreateView,
    detail: DetailView,
    profile: ProfileView,
    seller: SellerView,
    chat: ChatView,
    support: SupportView,
  });
  const badges = () => {
    const dot = document.getElementById("notification-dot");
    if (dot) dot.hidden = !Store.data.notifications.some((n) => !n.read);
    document
      .querySelectorAll(".nav-dot")
      .forEach((d) => (d.hidden = !Store.data.chats.some((c) => c.unread)));
  };
  document.addEventListener("state-changed", badges);
  Nav.go("home", {}, true);
  badges();
  setInterval(() => {
    const expired = Store.data.auctions.some(
      (a) => a.status === "active" && a.endTime <= Date.now(),
    );
    Store.settleExpired();
    document.querySelectorAll("[data-timer]").forEach((el) => {
      const a = Store.auction(el.dataset.timer);
      if (a)
        el.textContent =
          a.status === "active"
            ? remaining(a.endTime)
            : a.status === "unsold"
              ? "유찰"
              : "경매 종료";
    });
    if (expired && ["home", "detail", "likes", "profile"].includes(Nav.current))
      Nav.views[Nav.current].render(Nav.params);
  }, 1000);
  document.getElementById("footer-support").onclick = () => Nav.go("support");
  Live.start();
});
