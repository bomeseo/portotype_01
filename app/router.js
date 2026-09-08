const Nav = {
  current: "home",
  params: {},
  history: [],
  views: {},
  init(views) {
    this.views = views;
    const tabs = [
      ["home", "home", "홈"],
      ["likes", "heart", "관심"],
      ["create", "plus", "등록"],
      ["chat", "chat", "채팅"],
      ["profile", "user", "내 정보"],
    ];
    const html = tabs
      .map(
        ([id, glyph, label]) =>
          '<button data-nav="' +
          id +
          '" class="nav-link">' +
          icon(glyph) +
          "<span>" +
          label +
          "</span>" +
          (id === "chat" ? '<i class="nav-dot" hidden></i>' : "") +
          "</button>",
      )
      .join("");
    document.getElementById("desktop-nav").innerHTML = html;
    document.getElementById("bottom-nav-root").innerHTML = html;
    document
      .querySelectorAll("[data-nav]")
      .forEach((b) => (b.onclick = () => this.go(b.dataset.nav)));
    document.getElementById("brand-home").onclick = () => this.go("home");
    document.getElementById("header-notifications").onclick = () =>
      SupportView.notifications();
    document.getElementById("header-profile").onclick = () =>
      this.go("profile");
    document.getElementById("assistant-button").onclick = () =>
      SupportView.assistant();
  },
  go(name, params = {}, replace = false) {
    if (
      ["create", "likes", "chat"].includes(name) &&
      !Store.data.authenticated
    ) {
      name = "profile";
      params = {};
      toast("로그인 후 이용해 주세요.");
    }
    if (!this.views[name]) return;
    if (!replace)
      this.history.push({ name: this.current, params: this.params });
    UI.close();
    this.current = name;
    this.params = params;
    document
      .querySelectorAll(".view-section")
      .forEach((s) => (s.hidden = s.id !== "view-" + name));
    document.querySelectorAll("[data-nav]").forEach((b) => {
      const active = b.dataset.nav === name;
      b.classList.toggle("active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.getElementById("assistant-button").hidden = [
      "chat",
      "create",
    ].includes(name);
    this.views[name].render(params);
    document.title =
      ({
        home: "라이브 경매",
        likes: "관심 상품",
        create: "상품 등록",
        chat: "채팅",
        profile: "내 정보",
        detail: "경매 상세",
        seller: "판매자 정보",
        support: "고객센터",
      }[name] || "라이브 경매") + " · 좋은 물건의 다음 주인";
    window.scrollTo(0, 0);
  },
  back() {
    const p = this.history.pop();
    this.go(p?.name || "home", p?.params || {}, true);
  },
};
