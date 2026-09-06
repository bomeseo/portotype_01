/**
 * 경매 상세 화면 (+ 하단 고정 좋아요/입찰하기 바)
 */

const ViewDetail = {
  init(section, bottomBar) {
    this.section = section;

    section.innerHTML = `
      <div class="detail-nav-bar">
        <button class="icon-btn" id="btn-back-from-detail" title="뒤로가기">
          <svg class="ic" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
        <span class="nav-title">경매 상세</span>
        <button class="icon-btn" title="공유하기">
          <svg class="ic" viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>
        </button>
      </div>

      <div class="detail-gallery-container">
        <img id="detail-main-img" src="" alt="상품 이미지">
        <div class="live-timer-floating" id="detail-timer-tag">남은 시간 00:00:00</div>
        <div class="gallery-indicators">1 / 3</div>
      </div>

      <div class="detail-content-body">

        <div class="seller-profile-card">
          <div class="seller-left">
            <img id="detail-seller-avatar" class="seller-avatar" src="" alt="판매자 프로필">
            <div>
              <div class="seller-name-row">
                <span id="detail-seller-name" class="seller-name">판매자명</span>
                <span class="verified-badge">동네인증</span>
              </div>
              <div id="detail-seller-location" class="seller-location">위치 정보</div>
            </div>
          </div>
          <div class="seller-score">
            <div id="detail-seller-rating" class="manner-temp-box">98.5℃</div>
            <div id="detail-seller-reviews" class="review-count">거래후기 42개</div>
          </div>
        </div>

        <div class="detail-product-info">
          <h1 id="detail-title" class="detail-item-title">상품 이름</h1>

          <div class="detail-price-box">
            <div class="detail-price-header">
              <span class="live-price-tag"><span class="live-dot"></span> 현재가</span>
              <span id="detail-bids-count" class="bid-count-inline">입찰 0회</span>
            </div>
            <div id="detail-current-price" class="detail-current-price">0원</div>
            <div class="detail-sub-prices">
              <span>시작가 <strong id="detail-starting-price">0원</strong></span>
              <span>입찰단위 <strong id="detail-min-step">+0원</strong></span>
            </div>
          </div>

          <div class="trade-method-box" id="detail-trade-method">
            <span>직거래 및 안심택배 가능</span>
          </div>

          <div class="safety-escrow-card">
            <svg class="ic" viewBox="0 0 24 24"><path d="M12 3l7 2.5v5.8c0 4.3-2.9 8-7 9.2-4.1-1.2-7-4.9-7-9.2V5.5z"/><path d="m9 12 2 2 4-4"/></svg>
            <p>결제 대금은 구매 확정 시까지 보관됩니다.</p>
          </div>

          <div class="detail-description-section">
            <h3 class="section-subtitle">상품 설명</h3>
            <p id="detail-desc" class="detail-description-text">상품 설명 내용</p>
          </div>

          <div class="bid-history-section">
            <h3 class="section-subtitle">입찰 내역</h3>
            <div id="detail-bid-history-list" class="history-list"></div>
          </div>
        </div>

      </div>
    `;

    bottomBar.innerHTML = `
      <button class="like-toggle-btn" id="detail-like-btn" title="관심 등록">
        <svg class="ic" viewBox="0 0 24 24"><path d="M19 5.6a5 5 0 0 0-7 0l-.9.9-.9-.9a5 5 0 0 0-7 7l7.9 8 7.9-8a5 5 0 0 0 0-7Z"/></svg>
      </button>
      <button class="btn-open-bid-modal" id="btn-open-bid-modal">입찰하기</button>
    `;

    this.img = section.querySelector("#detail-main-img");
    this.timer = section.querySelector("#detail-timer-tag");
    this.sellerAvatar = section.querySelector("#detail-seller-avatar");
    this.sellerName = section.querySelector("#detail-seller-name");
    this.sellerRating = section.querySelector("#detail-seller-rating");
    this.sellerReviews = section.querySelector("#detail-seller-reviews");
    this.sellerLocation = section.querySelector("#detail-seller-location");
    this.tradeMethod = section.querySelector("#detail-trade-method");
    this.title = section.querySelector("#detail-title");
    this.currentPrice = section.querySelector("#detail-current-price");
    this.startingPrice = section.querySelector("#detail-starting-price");
    this.minStep = section.querySelector("#detail-min-step");
    this.desc = section.querySelector("#detail-desc");
    this.bidHistoryList = section.querySelector("#detail-bid-history-list");
    this.bidsCount = section.querySelector("#detail-bids-count");
    this.likeBtn = bottomBar.querySelector("#detail-like-btn");

    section.querySelector("#btn-back-from-detail")?.addEventListener("click", () => {
      Navigation.switchView("home");
    });

    this.likeBtn.addEventListener("click", () => {
      const liked = AppState.toggleLike(AppState.currentAuctionId);
      if (liked === null) return;
      this.likeBtn.classList.toggle("liked", liked);
      showToast(liked ? "찜 목록에 추가했습니다." : "찜 목록에서 제외했습니다.");
    });

    bottomBar.querySelector("#btn-open-bid-modal")?.addEventListener("click", () => {
      BidModal.open(AppState.currentAuctionId);
    });

    // 내가 입찰하거나(bid-modal.js) 다른 사용자가 경쟁 입찰(main.js)하면 실시간 반영
    document.addEventListener("auction-updated", (e) => {
      if (!this.section.classList.contains("active")) return;
      if (AppState.currentAuctionId !== e.detail.id) return;

      const auction = AppState.getCurrentAuction();
      this.currentPrice.textContent = formatPrice(auction.currentPrice);
      this.currentPrice.classList.add("price-updated");
      setTimeout(() => this.currentPrice.classList.remove("price-updated"), 1000);

      this.bidsCount.textContent = `입찰 ${auction.bidsCount}회`;
      this.renderBidHistory(auction);
    });

    // 1초마다 남은 시간 갱신 (상세 화면이 활성 화면일 때만)
    setInterval(() => {
      if (!this.section.classList.contains("active")) return;
      const auction = AppState.getCurrentAuction();
      if (auction) this.timer.textContent = `남은 시간 ${formatTimeRemaining(auction.endTime)}`;
    }, 1000);
  },

  open(auctionId) {
    AppState.currentAuctionId = auctionId;
    const auction = AppState.getAuction(auctionId);
    if (!auction) return;

    this.img.src = auction.images[0];
    this.timer.textContent = `남은 시간 ${formatTimeRemaining(auction.endTime)}`;

    this.sellerAvatar.src = auction.seller.avatar;
    this.sellerName.textContent = auction.seller.name;
    this.sellerRating.textContent = `${auction.seller.mannerTemp}℃`;
    this.sellerReviews.textContent = `거래후기 ${auction.seller.reviewsCount}개`;
    this.sellerLocation.textContent = `${auction.seller.location} · ${auction.seller.isVerified ? '동네인증 완료' : '일반회원'}`;
    if (this.tradeMethod) this.tradeMethod.textContent = auction.seller.tradeLocation;

    this.title.textContent = auction.title;
    this.currentPrice.textContent = formatPrice(auction.currentPrice);
    this.startingPrice.textContent = formatPrice(auction.startingPrice);
    this.minStep.textContent = `+${formatPrice(auction.minStep)}`;
    this.desc.textContent = auction.description;
    this.bidsCount.textContent = `입찰 ${auction.bidsCount}회`;

    this.likeBtn.classList.toggle("liked", AppState.userLikes.has(auction.id));

    this.renderBidHistory(auction);

    Navigation.switchView("detail");
  },

  renderBidHistory(auction) {
    this.bidHistoryList.innerHTML = auction.bidHistory.map((log, idx) => `
      <div class="history-item ${idx === 0 ? 'latest' : ''} ${log.isUser ? 'user-bid' : ''}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="bidder-name">${log.bidder} ${log.isUser ? '<span class="bidder-me">(나)</span>' : ''}</span>
          <span class="bid-time">${log.time}</span>
        </div>
        <div class="bid-amount">${formatPrice(log.amount)}</div>
      </div>
    `).join("");
  }
};
