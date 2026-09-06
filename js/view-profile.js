/**
 * 내 정보 화면 (예치금, 내 입찰 참여 내역)
 */

const ViewProfile = {
  init(section) {
    this.section = section;

    section.innerHTML = `
      <div class="subview-header">
        <h2>내 정보</h2>
      </div>
      <div class="profile-body">
        <div class="profile-account-card">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&fit=crop" alt="내 프로필">
          <div>
            <div class="profile-name">내 계정</div>
            <div class="profile-deposit">예치금 <strong>3,500,000원</strong></div>
          </div>
        </div>

        <h3 class="section-subtitle">내 입찰 내역</h3>
        <div id="profile-bid-history-list"></div>
      </div>
    `;

    this.list = section.querySelector("#profile-bid-history-list");

    Navigation.registerOnEnter("profile", () => this.render());
  },

  render() {
    if (!this.list) return;

    if (AppState.userBids.length === 0) {
      this.list.innerHTML = `<div class="empty-state">아직 참여한 입찰 내역이 없습니다.</div>`;
      return;
    }

    this.list.innerHTML = AppState.userBids.map(bid => `
      <div class="history-item user-bid" style="margin-bottom: 8px;">
        <div>
          <div class="bidder-name">${bid.title}</div>
          <div class="bid-time" style="margin-left:0">${bid.time}</div>
        </div>
        <div class="bid-amount">${formatPrice(bid.amount)}</div>
      </div>
    `).join("");
  }
};
