/**
 * 경매 찾기 화면 (전체 경매 목록)
 */

const ViewSearch = {
  init(section) {
    this.section = section;

    section.innerHTML = `
      <div class="subview-header">
        <h2>경매 찾기</h2>
      </div>
      <div class="auction-list" id="explore-auction-list" style="padding: 16px;"></div>
    `;

    this.list = section.querySelector("#explore-auction-list");

    document.addEventListener("auction-updated", () => {
      if (this.section.classList.contains("active")) this.render();
    });

    Navigation.registerOnEnter("search", () => this.render());
  },

  render() {
    if (!this.list) return;

    this.list.innerHTML = AppState.auctions.map(item => auctionCardHTML(item, { showLikes: false })).join("");

    this.list.querySelectorAll(".auction-card").forEach(card => {
      card.addEventListener("click", () => {
        ViewDetail.open(parseInt(card.dataset.id, 10));
      });
    });
  }
};
