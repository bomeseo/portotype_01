/**
 * 라이브 경매 프로토타입
 */

class AuctionApp {
  constructor() {
    this.auctions = JSON.parse(JSON.stringify(INITIAL_AUCTIONS));
    this.currentAuctionId = 1;
    this.activeCategory = "all";
    this.searchQuery = "";
    this.selectedBidAmount = 0;
    this.userLikes = new Set([1]); // 기본 찜 목록
    this.userBids = []; // 사용자가 참여한 입찰 기록
    
    this.initElements();
    this.initEvents();
    this.startTimers();
    this.startLiveSimulation();
    
    // 초기 렌더링
    this.renderHome();
    this.renderExplore();
  }

  // DOM 요소 캐싱
  initElements() {
    // 뷰 섹션들
    this.views = {
      home: document.getElementById("view-home"),
      detail: document.getElementById("view-detail"),
      search: document.getElementById("view-search"),
      create: document.getElementById("view-create"),
      profile: document.getElementById("view-profile")
    };

    // 하단 네비게이션 버튼들
    this.navButtons = document.querySelectorAll(".nav-item-btn");

    // 홈 화면 요소
    this.homeAuctionList = document.getElementById("home-auction-list");
    this.categoryChips = document.getElementById("category-chips");
    this.homeSearchInput = document.getElementById("home-search-input");

    // 상세 화면 요소
    this.detailImg = document.getElementById("detail-main-img");
    this.detailTimer = document.getElementById("detail-timer-tag");
    this.detailSellerAvatar = document.getElementById("detail-seller-avatar");
    this.detailSellerName = document.getElementById("detail-seller-name");
    this.detailSellerRating = document.getElementById("detail-seller-rating");
    this.detailSellerReviews = document.getElementById("detail-seller-reviews");
    this.detailSellerLocation = document.getElementById("detail-seller-location");
    this.detailTitle = document.getElementById("detail-title");
    this.detailCurrentPrice = document.getElementById("detail-current-price");
    this.detailStartingPrice = document.getElementById("detail-starting-price");
    this.detailMinStep = document.getElementById("detail-min-step");
    this.detailDesc = document.getElementById("detail-desc");
    this.detailBidHistoryList = document.getElementById("detail-bid-history-list");
    this.detailLikeBtn = document.getElementById("detail-like-btn");
    this.detailBidsCount = document.getElementById("detail-bids-count");

    // 입찰 바텀시트
    this.bidModalBackdrop = document.getElementById("bid-modal-backdrop");
    this.modalCurrentLivePrice = document.getElementById("modal-current-live-price");
    this.modalTargetBidAmount = document.getElementById("modal-target-bid-amount");
    this.modalPriceDiffInfo = document.getElementById("modal-price-diff-info");
    this.bidRangeSlider = document.getElementById("bid-range-slider");
    this.sliderMinLabel = document.getElementById("slider-min-label");
    this.sliderMaxLabel = document.getElementById("slider-max-label");
    this.btnSubmitBid = document.getElementById("btn-submit-bid");

    // 토스트 컨테이너
    this.toastContainer = document.getElementById("toast-container");
  }

  // 이벤트 리스너 등록
  initEvents() {
    // 하단 탭 네비게이션 클릭
    this.navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // 상세화면 뒤로가기 버튼
    document.getElementById("btn-back-from-detail")?.addEventListener("click", () => {
      this.switchView("home");
    });

    // 상세화면 찜하기 토글
    this.detailLikeBtn?.addEventListener("click", () => {
      this.toggleLike(this.currentAuctionId);
    });

    // 입찰 바텀시트 열기
    document.getElementById("btn-open-bid-modal")?.addEventListener("click", () => {
      this.openBidModal(this.currentAuctionId);
    });

    // 모달 닫기
    document.getElementById("btn-close-bid-modal")?.addEventListener("click", () => {
      this.closeBidModal();
    });

    this.bidModalBackdrop?.addEventListener("click", (e) => {
      if (e.target === this.bidModalBackdrop) {
        this.closeBidModal();
      }
    });

    // 슬라이더 조작 시 가격 실시간 반영
    this.bidRangeSlider?.addEventListener("input", (e) => {
      this.selectedBidAmount = parseInt(e.target.value, 10);
      this.updateBidModalUI();
    });

    // 빠른 증액 버튼 (+5천원, +1만원, +5만원, +10만원)
    document.querySelectorAll(".step-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const addAmount = parseInt(btn.dataset.step, 10);
        const max = parseInt(this.bidRangeSlider.max, 10);
        this.selectedBidAmount = Math.min(this.selectedBidAmount + addAmount, max);
        this.bidRangeSlider.value = this.selectedBidAmount;
        this.updateBidModalUI();
      });
    });

    // 최종 입찰하기 버튼 클릭
    this.btnSubmitBid?.addEventListener("click", () => {
      this.executeBid();
    });

    // 홈 검색창 입력
    this.homeSearchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderHome();
    });

    // 경매 올리기 폼 제출
    document.getElementById("form-create-auction")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleCreateAuction();
    });
  }

  // 뷰 전환
  switchView(viewName) {
    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle("active", key === viewName);
      }
    });

    this.navButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    document.querySelector(".device-container")?.classList.toggle("in-detail", viewName === "detail");

    if (viewName === "home") {
      this.renderHome();
    } else if (viewName === "search") {
      this.renderExplore();
    } else if (viewName === "profile") {
      this.renderProfile();
    }

    // 스크롤 최상단으로 리셋
    const viewport = document.querySelector(".app-view-port");
    if (viewport) viewport.scrollTop = 0;
  }

  // 숫자 포맷터 (예: 840,000원)
  formatPrice(num) {
    return Number(num).toLocaleString("ko-KR") + "원";
  }

  // 남은 시간 계산 및 포맷팅
  formatTimeRemaining(endTime) {
    const totalSec = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    if (totalSec <= 0) return "경매 종료";

    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => String(n).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  // 홈
  renderHome() {
    this.renderCategoryChips();

    const filtered = this.auctions.filter(item => {
      const matchCat = this.activeCategory === "all" || item.category === this.activeCategory;
      const matchSearch = !this.searchQuery || item.title.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      this.homeAuctionList.innerHTML = `
        <div class="empty-state">진행 중인 경매가 없습니다.</div>
      `;
      return;
    }

    this.homeAuctionList.innerHTML = filtered.map(item => `
      <div class="auction-card" data-id="${item.id}">
        <div class="card-img-wrap">
          <img src="${item.images[0]}" alt="${item.title}" loading="lazy" />
          <div class="time-tag">${this.formatTimeRemaining(item.endTime)} 남음</div>
        </div>

        <div class="card-info">
          <div class="item-title">${item.title}</div>
          
          <div class="price-row">
            <span class="price-label">실시간</span>
            <span class="current-price">${this.formatPrice(item.currentPrice)}</span>
          </div>

          <div class="item-meta-desc">${item.seller.name} · ${item.seller.location}</div>

          <div class="card-footer-stats">
            <span class="bid-count-badge">입찰 ${item.bidsCount}회</span>
            <span>조회 ${item.views} · 찜 ${item.likes}</span>
          </div>
        </div>
      </div>
    `).join("");

    // 카드 클릭 -> 상세
    this.homeAuctionList.querySelectorAll(".auction-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.id, 10);
        this.openDetail(id);
      });
    });
  }

  renderCategoryChips() {
    this.categoryChips.innerHTML = CATEGORIES.map(cat => `
      <button class="chip-btn ${this.activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
        <span>${cat.name}</span>
      </button>
    `).join("");

    this.categoryChips.querySelectorAll(".chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeCategory = btn.dataset.cat;
        this.renderHome();
      });
    });
  }

  // 경매 상세
  openDetail(auctionId) {
    this.currentAuctionId = auctionId;
    const auction = this.auctions.find(a => a.id === auctionId);
    if (!auction) return;

    // 상세 내용 채우기
    this.detailImg.src = auction.images[0];
    this.detailTimer.textContent = `남은 시간 ${this.formatTimeRemaining(auction.endTime)}`;
    
    // 판매자의 정보 (매너온도, 거래 방식 반영)
    this.detailSellerAvatar.src = auction.seller.avatar;
    this.detailSellerName.textContent = auction.seller.name;
    this.detailSellerRating.textContent = `${auction.seller.mannerTemp}℃`;
    this.detailSellerReviews.textContent = `거래후기 ${auction.seller.reviewsCount}개`;
    this.detailSellerLocation.textContent = `${auction.seller.location} · ${auction.seller.isVerified ? '동네인증 완료' : '일반회원'}`;

    const tradeEl = document.getElementById("detail-trade-method");
    if (tradeEl) {
      tradeEl.textContent = auction.seller.tradeLocation;
    }

    // 상품 정보
    this.detailTitle.textContent = auction.title;
    this.detailCurrentPrice.textContent = this.formatPrice(auction.currentPrice);
    this.detailStartingPrice.textContent = this.formatPrice(auction.startingPrice);
    this.detailMinStep.textContent = `+${this.formatPrice(auction.minStep)}`;
    this.detailDesc.textContent = auction.description;
    this.detailBidsCount.textContent = `입찰 ${auction.bidsCount}회`;

    // 찜하기 버튼 상태
    this.detailLikeBtn.classList.toggle("liked", this.userLikes.has(auction.id));

    // 입찰 히스토리
    this.renderBidHistory(auction);

    // 상세 화면으로 전환
    this.switchView("detail");
  }

  renderBidHistory(auction) {
    this.detailBidHistoryList.innerHTML = auction.bidHistory.map((log, idx) => `
      <div class="history-item ${idx === 0 ? 'latest' : ''} ${log.isUser ? 'user-bid' : ''}">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="bidder-name">${log.bidder} ${log.isUser ? '<span class="bidder-me">(나)</span>' : ''}</span>
          <span class="bid-time">${log.time}</span>
        </div>
        <div class="bid-amount">${this.formatPrice(log.amount)}</div>
      </div>
    `).join("");
  }

  toggleLike(auctionId) {
    const auction = this.auctions.find(a => a.id === auctionId);
    if (!auction) return;

    if (this.userLikes.has(auctionId)) {
      this.userLikes.delete(auctionId);
      auction.likes = Math.max(0, auction.likes - 1);
      this.showToast("찜 목록에서 제외했습니다.");
    } else {
      this.userLikes.add(auctionId);
      auction.likes += 1;
      this.showToast("찜 목록에 추가했습니다.");
    }

    this.detailLikeBtn.classList.toggle("liked", this.userLikes.has(auctionId));
  }

  // 입찰 바텀시트
  openBidModal(auctionId) {
    const auction = this.auctions.find(a => a.id === auctionId);
    if (!auction) return;

    const minBid = auction.currentPrice + auction.minStep;
    const maxBid = Math.max(auction.maxPrice, minBid * 1.5);

    this.selectedBidAmount = minBid;

    // 모달 내 실시간 가격 표시 설정
    this.modalCurrentLivePrice.textContent = this.formatPrice(auction.currentPrice);
    
    // 슬라이더 min / max / step 초기화
    this.bidRangeSlider.min = minBid;
    this.bidRangeSlider.max = maxBid;
    this.bidRangeSlider.step = auction.minStep;
    this.bidRangeSlider.value = minBid;

    this.sliderMinLabel.textContent = this.formatPrice(minBid);
    this.sliderMaxLabel.textContent = this.formatPrice(maxBid);

    this.updateBidModalUI();
    this.bidModalBackdrop.classList.add("open");
  }

  updateBidModalUI() {
    const auction = this.auctions.find(a => a.id === this.currentAuctionId);
    if (!auction) return;

    this.modalTargetBidAmount.textContent = this.formatPrice(this.selectedBidAmount);
    
    const diff = this.selectedBidAmount - auction.currentPrice;
    this.modalPriceDiffInfo.textContent = `현재가 +${this.formatPrice(diff)}`;

    // 버튼에 현재 선택 금액 반영
    if (this.btnSubmitBid) {
      this.btnSubmitBid.textContent = `${this.formatPrice(this.selectedBidAmount)} 입찰하기`;
    }

    // 슬라이더 게이지 배경색 동적 그라데이션
    const min = parseInt(this.bidRangeSlider.min, 10);
    const max = parseInt(this.bidRangeSlider.max, 10);
    const percentage = ((this.selectedBidAmount - min) / (max - min)) * 100;
    this.bidRangeSlider.style.background = `linear-gradient(to right, var(--primary) ${percentage}%, var(--border-color) ${percentage}%)`;
  }

  closeBidModal() {
    this.bidModalBackdrop.classList.remove("open");
  }

  // 입찰 실행
  executeBid() {
    const auction = this.auctions.find(a => a.id === this.currentAuctionId);
    if (!auction) return;

    if (this.selectedBidAmount <= auction.currentPrice) {
      alert("현재가보다 높은 금액을 설정해주세요.");
      return;
    }

    // 입찰가 갱신
    auction.currentPrice = this.selectedBidAmount;
    auction.bidsCount += 1;

    // 히스토리에 내 입찰 추가
    const newBidLog = {
      id: Date.now(),
      bidder: "나(입찰자*)",
      amount: this.selectedBidAmount,
      time: "방금 전",
      isUser: true
    };
    auction.bidHistory.unshift(newBidLog);

    // 내 입찰 참여 기록에 저장
    this.userBids.push({
      auctionId: auction.id,
      title: auction.title,
      amount: this.selectedBidAmount,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    });

    // 팝업 닫기
    this.closeBidModal();

    // 상세 화면 실시간 업데이트 & 강조 애니메이션
    this.detailCurrentPrice.textContent = this.formatPrice(auction.currentPrice);
    this.detailCurrentPrice.classList.add("price-updated");
    setTimeout(() => {
      this.detailCurrentPrice.classList.remove("price-updated");
    }, 1000);

    this.detailBidsCount.textContent = `입찰 ${auction.bidsCount}회`;
    this.renderBidHistory(auction);


    this.showToast(`${this.formatPrice(this.selectedBidAmount)}으로 최고 입찰자가 되었습니다.`);
  }

  // 실시간 타이머 및 가상 경쟁 입찰 시뮬레이션
  startTimers() {
    setInterval(() => {
      // 1초마다 남은 시간 갱신
      if (this.views.detail.classList.contains("active")) {
        const auction = this.auctions.find(a => a.id === this.currentAuctionId);
        if (auction && this.detailTimer) {
          this.detailTimer.textContent = `남은 시간 ${this.formatTimeRemaining(auction.endTime)}`;
        }
      }

      // 홈 화면의 카드들 타이머 갱신
      const timeTags = this.homeAuctionList.querySelectorAll(".card-img-wrap .time-tag");
      this.auctions.forEach((item, idx) => {
        if (timeTags[idx]) {
          timeTags[idx].textContent = `${this.formatTimeRemaining(item.endTime)} 남음`;
        }
      });
    }, 1000);
  }

  // 다른 사용자의 실시간 입찰 시뮬레이션 (경매의 긴장감 부여)
  startLiveSimulation() {
    const competitorNames = ["판교개발자", "당근마니아", "수집가_K", "새벽비더", "성수스니커", "강남컬렉터"];

    setInterval(() => {
      // 18초마다 랜덤하게 한 아이템에 다른 참가자가 입찰
      const randomIndex = Math.floor(Math.random() * this.auctions.length);
      const targetAuction = this.auctions[randomIndex];
      const randomCompetitor = competitorNames[Math.floor(Math.random() * competitorNames.length)];

      const increase = targetAuction.minStep * (Math.floor(Math.random() * 2) + 1);
      targetAuction.currentPrice += increase;
      targetAuction.bidsCount += 1;

      targetAuction.bidHistory.unshift({
        id: Date.now(),
        bidder: randomCompetitor,
        amount: targetAuction.currentPrice,
        time: "방금 전",
        isUser: false
      });

      // 만약 사용자가 해당 상품 상세 화면을 보고 있는 중이면 즉시 반영
      if (this.views.detail.classList.contains("active") && this.currentAuctionId === targetAuction.id) {
        this.detailCurrentPrice.textContent = this.formatPrice(targetAuction.currentPrice);
        this.detailCurrentPrice.classList.add("price-updated");
        setTimeout(() => this.detailCurrentPrice.classList.remove("price-updated"), 800);
        this.renderBidHistory(targetAuction);
        this.showToast(`${randomCompetitor}님이 ${this.formatPrice(targetAuction.currentPrice)}에 입찰했습니다.`);
      }

      // 홈 화면이 열려있으면 목록 갱신
      if (this.views.home.classList.contains("active")) {
        this.renderHome();
      }
    }, 18000);
  }

  // 서브 화면들: 경매 찾기 / 경매 올리기 / 내정보
  renderExplore() {
    const listEl = document.getElementById("explore-auction-list");
    if (!listEl) return;

    listEl.innerHTML = this.auctions.map(item => `
      <div class="auction-card" data-id="${item.id}">
        <div class="card-img-wrap">
          <img src="${item.images[0]}" alt="${item.title}" />
          <div class="time-tag">${this.formatTimeRemaining(item.endTime)} 남음</div>
        </div>
        <div class="card-info">
          <div class="item-title">${item.title}</div>
          <div class="price-row">
            <span class="price-label">실시간</span>
            <span class="current-price">${this.formatPrice(item.currentPrice)}</span>
          </div>
          <div class="item-meta-desc">${item.seller.name} · ${item.seller.location}</div>
          <div class="card-footer-stats">
            <span class="bid-count-badge">입찰 ${item.bidsCount}회</span>
            <span>조회 ${item.views}</span>
          </div>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll(".auction-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.id, 10);
        this.openDetail(id);
      });
    });
  }

  handleCreateAuction() {
    const title = document.getElementById("create-title").value.trim();
    const category = document.getElementById("create-category").value;
    const startPrice = parseInt(document.getElementById("create-start-price").value, 10);
    const minStep = parseInt(document.getElementById("create-min-step").value, 10);
    const desc = document.getElementById("create-desc").value.trim();

    if (!title || !startPrice || !minStep) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }

    const newAuction = {
      id: Date.now(),
      title,
      category,
      seller: {
        name: "나(판매자)",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        rating: 5.0,
        reviewsCount: 1,
        isVerified: true,
        location: "내 동네"
      },
      images: [
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"
      ],
      startingPrice: startPrice,
      currentPrice: startPrice,
      minStep: minStep,
      maxPrice: startPrice * 3,
      endTime: Date.now() + 1000 * 60 * 60 * 24, // 24시간 후
      bidsCount: 0,
      views: 1,
      likes: 0,
      description: desc || "상품 설명이 작성되지 않았습니다.",
      bidHistory: []
    };

    this.auctions.unshift(newAuction);
    this.showToast("경매를 등록했습니다.");
    document.getElementById("form-create-auction").reset();
    this.switchView("home");
  }

  renderProfile() {
    const profileBidList = document.getElementById("profile-bid-history-list");
    if (!profileBidList) return;

    if (this.userBids.length === 0) {
      profileBidList.innerHTML = `
        <div class="empty-state">아직 참여한 입찰 내역이 없습니다.</div>
      `;
      return;
    }

    profileBidList.innerHTML = this.userBids.map(bid => `
      <div class="history-item user-bid" style="margin-bottom: 8px;">
        <div>
          <div class="bidder-name">${bid.title}</div>
          <div class="bid-time" style="margin-left:0">${bid.time}</div>
        </div>
        <div class="bid-amount">${this.formatPrice(bid.amount)}</div>
      </div>
    `).join("");
  }

  // 토스트 메시지 띄우기
  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// 앱 실행
document.addEventListener("DOMContentLoaded", () => {
  window.app = new AuctionApp();
});
