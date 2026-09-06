/**
 * 메인코드 - 앱 부팅
 * 각 화면/기능 모듈을 초기화하고 연결하는 조립 담당.
 * 개별 화면의 마크업이나 세부 로직은 알지 못하고, 초기화 순서와
 * 화면 전체에 걸친 백그라운드 동작(경쟁 입찰 시뮬레이션)만 관리한다.
 */

document.addEventListener("DOMContentLoaded", () => {
  const views = {
    home: document.getElementById("view-home"),
    detail: document.getElementById("view-detail"),
    search: document.getElementById("view-search"),
    create: document.getElementById("view-create"),
    profile: document.getElementById("view-profile")
  };

  StatusBar.init(document.getElementById("status-bar-root"));
  Navigation.init(document.getElementById("bottom-nav-root"), views);
  BidModal.init(document.getElementById("bid-modal-backdrop"));

  ViewHome.init(views.home);
  ViewDetail.init(views.detail, document.getElementById("detail-bottom-bar"));
  ViewSearch.init(views.search);
  ViewCreate.init(views.create);
  ViewProfile.init(views.profile);

  ViewHome.render();
  ViewSearch.render();

  startLiveSimulation();
});

// 다른 사용자의 실시간 입찰 시뮬레이션 (경매의 긴장감 부여)
function startLiveSimulation() {
  const competitorNames = ["판교개발자", "당근마니아", "수집가_K", "새벽비더", "성수스니커", "강남컬렉터"];

  setInterval(() => {
    // 18초마다 랜덤하게 한 아이템에 다른 참가자가 입찰
    const randomIndex = Math.floor(Math.random() * AppState.auctions.length);
    const targetAuction = AppState.auctions[randomIndex];
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

    document.dispatchEvent(new CustomEvent("auction-updated", { detail: { id: targetAuction.id } }));

    // 사용자가 해당 상품 상세 화면을 보고 있는 중이면 토스트로 알림
    const detailSection = document.getElementById("view-detail");
    if (detailSection?.classList.contains("active") && AppState.currentAuctionId === targetAuction.id) {
      showToast(`${randomCompetitor}님이 ${formatPrice(targetAuction.currentPrice)}에 입찰했습니다.`);
    }
  }, 18000);
}
