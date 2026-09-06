/**
 * 입찰 바텀시트 (슬라이더 + 빠른 증액 버튼 + 최종 입찰)
 * 입찰이 성사되면 "auction-updated" 커스텀 이벤트를 문서에 쏘아서
 * 상세/홈/검색 화면이 각자 알아서 자기 화면을 갱신하도록 한다 (직접 참조하지 않음).
 */

const BidModal = {
  init(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="bid-bottom-sheet">
        <div class="sheet-handle-bar"></div>

        <div class="sheet-header">
          <h3>입찰하기</h3>
          <button class="sheet-close-btn" id="btn-close-bid-modal" title="닫기"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>

        <div class="modal-price-display-card">
          <div class="live-label">
            <span class="live-dot"></span> 현재가 <span id="modal-current-live-price">0원</span>
          </div>

          <div class="target-bid-amount-wrap">
            <span class="bid-tag">내 입찰가</span>
            <div id="modal-target-bid-amount" class="target-bid-amount">0원</div>
            <div id="modal-price-diff-info" class="price-difference-info">현재가 +0원</div>
          </div>
        </div>

        <div class="slider-control-group">
          <div class="slider-header-row">
            <span>최소 <span id="slider-min-label">0원</span></span>
            <span>최대 <span id="slider-max-label">0원</span></span>
          </div>

          <input type="range" class="custom-range-slider" id="bid-range-slider" min="0" max="100" step="1000" value="0">

          <div class="quick-step-buttons">
            <button type="button" class="step-pill-btn" data-step="5000">+5천</button>
            <button type="button" class="step-pill-btn" data-step="10000">+1만</button>
            <button type="button" class="step-pill-btn" data-step="50000">+5만</button>
            <button type="button" class="step-pill-btn" data-step="100000">+10만</button>
          </div>
        </div>

        <button type="button" class="btn-submit-bid" id="btn-submit-bid">입찰하기</button>
      </div>
    `;

    this.backdrop = container;
    this.currentLivePrice = container.querySelector("#modal-current-live-price");
    this.targetAmount = container.querySelector("#modal-target-bid-amount");
    this.priceDiffInfo = container.querySelector("#modal-price-diff-info");
    this.rangeSlider = container.querySelector("#bid-range-slider");
    this.minLabel = container.querySelector("#slider-min-label");
    this.maxLabel = container.querySelector("#slider-max-label");
    this.submitBtn = container.querySelector("#btn-submit-bid");

    container.querySelector("#btn-close-bid-modal")?.addEventListener("click", () => this.close());

    container.addEventListener("click", (e) => {
      if (e.target === container) this.close();
    });

    this.rangeSlider.addEventListener("input", (e) => {
      AppState.selectedBidAmount = parseInt(e.target.value, 10);
      this.updateUI();
    });

    container.querySelectorAll(".step-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const addAmount = parseInt(btn.dataset.step, 10);
        const max = parseInt(this.rangeSlider.max, 10);
        AppState.selectedBidAmount = Math.min(AppState.selectedBidAmount + addAmount, max);
        this.rangeSlider.value = AppState.selectedBidAmount;
        this.updateUI();
      });
    });

    this.submitBtn.addEventListener("click", () => this.submit());
  },

  open(auctionId) {
    const auction = AppState.getAuction(auctionId);
    if (!auction) return;

    const minBid = auction.currentPrice + auction.minStep;
    const maxBid = Math.max(auction.maxPrice, minBid * 1.5);

    AppState.selectedBidAmount = minBid;

    this.currentLivePrice.textContent = formatPrice(auction.currentPrice);

    this.rangeSlider.min = minBid;
    this.rangeSlider.max = maxBid;
    this.rangeSlider.step = auction.minStep;
    this.rangeSlider.value = minBid;

    this.minLabel.textContent = formatPrice(minBid);
    this.maxLabel.textContent = formatPrice(maxBid);

    this.updateUI();
    this.backdrop.classList.add("open");
  },

  close() {
    this.backdrop.classList.remove("open");
  },

  updateUI() {
    const auction = AppState.getCurrentAuction();
    if (!auction) return;

    this.targetAmount.textContent = formatPrice(AppState.selectedBidAmount);

    const diff = AppState.selectedBidAmount - auction.currentPrice;
    this.priceDiffInfo.textContent = `현재가 +${formatPrice(diff)}`;

    if (this.submitBtn) {
      this.submitBtn.textContent = `${formatPrice(AppState.selectedBidAmount)} 입찰하기`;
    }

    const min = parseInt(this.rangeSlider.min, 10);
    const max = parseInt(this.rangeSlider.max, 10);
    const percentage = ((AppState.selectedBidAmount - min) / (max - min)) * 100;
    this.rangeSlider.style.background = `linear-gradient(to right, var(--primary) ${percentage}%, var(--border-color) ${percentage}%)`;
  },

  submit() {
    const auction = AppState.getCurrentAuction();
    if (!auction) return;

    if (AppState.selectedBidAmount <= auction.currentPrice) {
      alert("현재가보다 높은 금액을 설정해주세요.");
      return;
    }

    auction.currentPrice = AppState.selectedBidAmount;
    auction.bidsCount += 1;
    auction.bidHistory.unshift({
      id: Date.now(),
      bidder: "나(입찰자*)",
      amount: AppState.selectedBidAmount,
      time: "방금 전",
      isUser: true
    });

    AppState.recordUserBid(auction, AppState.selectedBidAmount);

    this.close();
    showToast(`${formatPrice(AppState.selectedBidAmount)}으로 최고 입찰자가 되었습니다.`);

    document.dispatchEvent(new CustomEvent("auction-updated", { detail: { id: auction.id } }));
  }
};
