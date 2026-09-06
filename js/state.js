/**
 * 앱 공유 상태
 * 경매 목록, 현재 보고 있는 경매, 사용자의 찜/입찰 기록을 보관한다.
 * 각 화면(view) 파일은 이 객체를 통해서만 데이터를 읽고 쓴다.
 */

const AppState = {
  auctions: JSON.parse(JSON.stringify(INITIAL_AUCTIONS)),
  currentAuctionId: 1,
  activeCategory: "all",
  searchQuery: "",
  selectedBidAmount: 0,
  userLikes: new Set([1]), // 기본 찜 목록
  userBids: [], // 사용자가 참여한 입찰 기록

  getAuction(auctionId) {
    return this.auctions.find(a => a.id === auctionId);
  },

  getCurrentAuction() {
    return this.getAuction(this.currentAuctionId);
  },

  getFilteredAuctions() {
    return this.auctions.filter(item => {
      const matchCat = this.activeCategory === "all" || item.category === this.activeCategory;
      const matchSearch = !this.searchQuery || item.title.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });
  },

  // 찜 토글. liked 최종 상태(true/false)를 반환, 대상이 없으면 null.
  toggleLike(auctionId) {
    const auction = this.getAuction(auctionId);
    if (!auction) return null;

    let liked;
    if (this.userLikes.has(auctionId)) {
      this.userLikes.delete(auctionId);
      auction.likes = Math.max(0, auction.likes - 1);
      liked = false;
    } else {
      this.userLikes.add(auctionId);
      auction.likes += 1;
      liked = true;
    }
    return liked;
  },

  addAuction(auction) {
    this.auctions.unshift(auction);
  },

  recordUserBid(auction, amount) {
    this.userBids.push({
      auctionId: auction.id,
      title: auction.title,
      amount,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    });
  }
};
