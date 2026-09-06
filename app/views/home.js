const HomeView = {
  filter: {
    category: "all",
    sub: "전체",
    query: "",
    sort: "popular",
    mode: "all",
    method: "전체",
  },
  render() {
    const root = document.getElementById("view-home");
    root.innerHTML =
      '<div class="home-heading"><div><p class="eyebrow">취향이 만나는 작은 경매장</p><h1>좋은 물건의<br class="mobile-only"> 다음 주인이 되어보세요.</h1></div><div class="home-note">' +
      icon("shield") +
      '<span>거래 전, 판매자 정보를<br>꼭 확인해 주세요.</span></div></div><div class="discovery-bar"><label class="search-field">' +
      icon("search") +
      '<input id="product-search" type="search" placeholder="어떤 물건을 찾고 있나요?" aria-label="상품 검색" value="' +
      esc(this.filter.query) +
      '"><kbd>검색</kbd></label><button class="button secondary filter-button" id="trade-filter">' +
      icon("settings") +
      "<span>" +
      esc(this.filter.method === "전체" ? "거래 방식" : this.filter.method) +
      '</span></button></div><div class="categories">' +
      CATEGORIES.map(
        (c) =>
          '<button class="category-button ' +
          (this.filter.category === c.id ? "selected" : "") +
          '" data-category="' +
          c.id +
          '">' +
          esc(c.name) +
          "</button>",
      ).join("") +
      '</div><div id="subcategory-list"></div><div class="catalog-header"><div class="catalog-tabs"><button data-mode="all">지금 경매 중</button><button data-mode="top">인기 TOP 100</button><button data-mode="for-you">내 취향</button></div><label class="sort-control"><span class="sr-only">정렬</span><select id="catalog-sort"><option value="popular">인기순</option><option value="ending">마감 임박순</option><option value="new">최신순</option><option value="low">낮은 가격순</option></select></label></div><p class="catalog-count" id="catalog-count"></p><div id="product-grid" class="product-grid"></div><div class="catalog-footer">' +
      icon("shield") +
      '<div><strong>서두르기 전에, 한 번 더 확인하세요.</strong><p>상품 상태와 판매자의 거래 정보를 살펴보고 입찰해 주세요.</p></div><button class="text-button" id="safety-guide">거래 가이드 ' +
      icon("arrow") +
      "</button></div>";
    root.querySelector("#product-search").oninput = (e) => {
      this.filter.query = e.target.value;
      this.renderList();
    };
    root.querySelectorAll("[data-category]").forEach(
      (b) =>
        (b.onclick = () => {
          this.filter.category = b.dataset.category;
          this.filter.sub = "전체";
          this.render();
        }),
    );
    root.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === this.filter.mode);
      b.onclick = () => {
        this.filter.mode = b.dataset.mode;
        this.render();
      };
    });
    const sort = root.querySelector("#catalog-sort");
    sort.value = this.filter.sort;
    sort.onchange = () => {
      this.filter.sort = sort.value;
      this.renderList();
    };
    root.querySelector("#trade-filter").onclick = () =>
      UI.open(
        "거래 방식",
        '<div class="option-list">' +
          ["전체", "직거래", "택배"]
            .map(
              (m) =>
                '<button class="option-row" data-method="' +
                m +
                '">' +
                m +
                (this.filter.method === m ? icon("check") : "") +
                "</button>",
            )
            .join("") +
          "</div>",
        (d) =>
          d.querySelectorAll("[data-method]").forEach(
            (b) =>
              (b.onclick = () => {
                this.filter.method = b.dataset.method;
                UI.close();
                this.render();
              }),
          ),
      );
    root.querySelector("#safety-guide").onclick = () => Nav.go("support");
    const subs = SUBCATEGORIES[this.filter.category] || [];
    root.querySelector("#subcategory-list").innerHTML = subs.length
      ? '<div class="subcategories">' +
        subs
          .map(
            (s) =>
              '<button data-sub="' +
              esc(s) +
              '" class="chip ' +
              (this.filter.sub === s ? "active" : "") +
              '">' +
              esc(s) +
              "</button>",
          )
          .join("") +
        "</div>"
      : "";
    root.querySelectorAll("[data-sub]").forEach(
      (b) =>
        (b.onclick = () => {
          this.filter.sub = b.dataset.sub;
          this.render();
        }),
    );
    this.renderList();
    Discovery.mount();
  },
  renderList() {
    const f = this.filter;
    let items = Store.data.auctions.filter(
      (a) =>
        a.status === "active" &&
        !Store.isBlocked(a.sellerId) &&
        (f.category === "all" || a.category === f.category) &&
        (f.sub === "전체" ||
          a.subcategory === f.sub ||
          a.title.includes(f.sub)) &&
        (f.method === "전체" ||
          a.method === f.method ||
          a.method === "둘 다") &&
        [a.title, a.brand, a.model, a.subcategory]
          .join(" ")
          .toLowerCase()
          .includes(f.query.trim().toLowerCase()),
    );
    if (f.mode === "for-you" && Store.data.user.personalization)
      items = items.filter((a) =>
        Store.data.user.interests.includes(a.category),
      );
    const score = (a) => a.likes * 3 + a.bidsCount * 5 + a.views * 0.1;
    items.sort(
      f.mode === "top" || f.sort === "popular"
        ? (a, b) => score(b) - score(a)
        : f.sort === "ending"
          ? (a, b) => a.endTime - b.endTime
          : f.sort === "low"
            ? (a, b) => a.currentPrice - b.currentPrice
            : (a, b) => b.createdAt - a.createdAt,
    );
    if (f.mode === "top") items = items.slice(0, 100);
    document.getElementById("catalog-count").textContent =
      items.length +
      "개의 상품" +
      (f.mode === "top"
        ? " · 데모 관심·입찰·조회 기반 순위"
        : f.mode === "for-you"
          ? Store.data.user.personalization
            ? " · 내가 고른 관심 카테고리 기준"
            : " · 추천 설정이 꺼져 있어 전체 상품을 보여드려요"
          : "");
    const grid = document.getElementById("product-grid");
    grid.innerHTML = items.length
      ? UI.cards(items, { ranking: f.mode === "top" })
      : empty(
          "아직 만나지 못한 취향이에요",
          "다른 검색어나 카테고리를 선택해 보세요.",
          '<button class="button secondary" id="reset-filter">전체 상품 보기</button>',
        );
    grid.querySelector("#reset-filter")?.addEventListener("click", () => {
      this.filter = {
        category: "all",
        sub: "전체",
        query: "",
        sort: "popular",
        mode: "all",
        method: "전체",
      };
      this.render();
    });
    UI.bindCards(grid);
  },
};
