const LikesView = {
  filter: "all",
  render() {
    const root = document.getElementById("view-likes");
    const liked = Store.data.auctions.filter(
      (a) =>
        Store.data.likes.includes(a.id) &&
        a.status !== "deleted" &&
        !Store.isBlocked(a.sellerId),
    );
    const items = liked.filter(
      (a) =>
        this.filter === "all" ||
        (this.filter === "active" && a.status === "active") ||
        (this.filter === "ending" &&
          a.status === "active" &&
          a.endTime - Date.now() < 3600000) ||
        (this.filter === "ended" && a.status !== "active"),
    );
    root.innerHTML =
      UI.header(
        "관심 상품",
        '<span class="count-pill">' + liked.length + "</span>",
      ) +
      '<p class="page-intro">눈여겨본 물건을 한곳에서 살펴보세요.</p><div class="subcategories">' +
      [
        ["all", "전체"],
        ["active", "진행 중"],
        ["ending", "마감 임박"],
        ["ended", "종료"],
      ]
        .map(
          ([id, label]) =>
            '<button class="chip ' +
            (this.filter === id ? "active" : "") +
            '" data-filter="' +
            id +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '</div><div class="product-grid">' +
      (items.length
        ? UI.cards(items)
        : empty(
            "아직 관심 상품이 없어요",
            "마음에 드는 상품의 하트를 눌러 담아보세요.",
            '<button class="button" id="discover-likes">상품 둘러보기</button>',
          )) +
      "</div>";
    root.querySelectorAll("[data-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          this.filter = b.dataset.filter;
          this.render();
        }),
    );
    root
      .querySelector("#discover-likes")
      ?.addEventListener("click", () => Nav.go("home"));
    UI.bindCards(root);
  },
};
