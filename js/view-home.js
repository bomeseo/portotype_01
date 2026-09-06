/**
 * 홈 화면: 헤더, 검색창, 카테고리 필터, 실시간 경매 목록
 */

const ViewHome = {
  init(section) {
    this.section = section;

    section.innerHTML = `
      <header class="app-header">
        <div class="header-brand">
          <span class="live-dot"></span>
          <span>라이브 경매</span>
        </div>
        <div class="header-actions">
          <button class="icon-btn" title="알림">
            <svg class="ic" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </button>
        </div>
      </header>

      <div class="search-box-container">
        <div class="search-input-wrapper">
          <svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="text" id="home-search-input" placeholder="상품명 검색">
        </div>
      </div>

      <div class="category-chips" id="category-chips"></div>

      <div class="section-title-bar">
        <h3>
          <span>지금 입찰 중</span>
          <span class="live-badge">LIVE</span>
        </h3>
      </div>

      <div class="auction-list" id="home-auction-list"></div>
    `;

    this.list = section.querySelector("#home-auction-list");
    this.chips = section.querySelector("#category-chips");
    this.searchInput = section.querySelector("#home-search-input");

    this.searchInput.addEventListener("input", (e) => {
      AppState.searchQuery = e.target.value.trim().toLowerCase();
      this.render();
    });

    // 다른 화면(입찰 모달, 실시간 경쟁 입찰 시뮬레이션)에서 가격이 바뀌면
    // 지금 홈 화면이 보이고 있을 때만 다시 그린다.
    document.addEventListener("auction-updated", () => {
      if (this.section.classList.contains("active")) this.render();
    });

    // 1초마다 카드의 남은 시간 갱신 (홈이 활성 화면일 때만)
    setInterval(() => {
      if (!this.section.classList.contains("active")) return;
      const timeTags = this.list.querySelectorAll(".card-img-wrap .time-tag");
      AppState.auctions.forEach((item, idx) => {
        if (timeTags[idx]) {
          timeTags[idx].textContent = `${formatTimeRemaining(item.endTime)} 남음`;
        }
      });
    }, 1000);

    Navigation.registerOnEnter("home", () => this.render());
  },

  render() {
    this.renderCategoryChips();

    const filtered = AppState.getFilteredAuctions();

    if (filtered.length === 0) {
      this.list.innerHTML = `<div class="empty-state">진행 중인 경매가 없습니다.</div>`;
      return;
    }

    this.list.innerHTML = filtered.map(item => auctionCardHTML(item)).join("");

    this.list.querySelectorAll(".auction-card").forEach(card => {
      card.addEventListener("click", () => {
        ViewDetail.open(parseInt(card.dataset.id, 10));
      });
    });
  },

  renderCategoryChips() {
    this.chips.innerHTML = CATEGORIES.map(cat => `
      <button class="chip-btn ${AppState.activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
        <span>${cat.name}</span>
      </button>
    `).join("");

    this.chips.querySelectorAll(".chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        AppState.activeCategory = btn.dataset.cat;
        this.render();
      });
    });
  }
};
