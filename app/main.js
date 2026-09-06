document.addEventListener("DOMContentLoaded", () => {
  Store.init();
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
  document.getElementById("demo-info").onclick = () =>
    UI.open(
      "프로토타입 안내",
      '<p class="muted">이 사이트의 상품·판매자·평가·대화는 예시입니다. 입력한 정보는 이 브라우저에만 저장되며 실제 인증·조회·결제·거래가 발생하지 않습니다.</p><p class="muted">테스트 번호로 인증한 후 입찰·등록을 체험해 보세요. 내 정보의 거래 내역에는 거래 완료와 후기를 시험할 수 있는 예시가 있습니다.</p><button class="button secondary full" id="reset-demo">체험 데이터 초기화</button>',
      (d) => {
        d.querySelector("#reset-demo").onclick = () =>
          UI.confirm(
            "체험 데이터를 초기화할까요?",
            "이 브라우저에 등록한 상품·사진·대화·설정을 지우고 처음 상태로 돌아갑니다.",
            () => {
              Store.data = DemoData.create();
              Store.save();
              HomeView.filter = {
                category: "all",
                sub: "전체",
                query: "",
                sort: "popular",
                mode: "all",
                method: "전체",
              };
              ChatView.active = null;
              Nav.history = [];
              Nav.go("home", {}, true);
              toast("처음 상태로 돌아왔어요.");
            },
            "초기화",
          );
      },
    );
  if (Store.storageWarning)
    toast(
      "브라우저 저장소를 사용할 수 없어 변경 사항이 유지되지 않을 수 있어요.",
    );
});
