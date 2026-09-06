/* Domain actions own mutations; views only read state and call these actions. */
const Store = {
  key: "live-auction-prototype-v3",
  data: null,
  storageWarning: false,
  init() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      this.data =
        saved?.version === 3 && Array.isArray(saved.auctions) && saved.user
          ? saved
          : DemoData.create();
    } catch {
      this.data = DemoData.create();
      this.storageWarning = true;
    }
    this.settleExpired();
  },
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
      this.storageWarning = false;
    } catch {
      this.storageWarning = true;
    }
    document.dispatchEvent(new CustomEvent("state-changed"));
    if (this.storageWarning)
      toast("저장 공간이 부족해 이번 변경은 새로고침 후 사라질 수 있어요.");
  },
  auction(id) {
    return this.data.auctions.find((a) => a.id === Number(id));
  },
  member(id) {
    return id === "me" ? this.data.user : this.data.sellers[id];
  },
  isBlocked(id) {
    return this.data.blocked.includes(id);
  },
  canTrade() {
    if (this.data.user.status !== "active")
      throw new Error("거래가 제한된 계정입니다. 고객센터에서 확인해 주세요.");
    if (!this.data.user.verified)
      throw new Error("먼저 내 정보에서 데모 전화번호 인증을 완료해 주세요.");
  },
  notify(title, text) {
    this.data.notifications.unshift({
      id: uid(),
      title,
      text,
      at: Date.now(),
      read: false,
    });
  },
  like(id) {
    id = Number(id);
    const a = this.auction(id);
    if (!a) return;
    const liked = this.data.likes.includes(id);
    this.data.likes = liked
      ? this.data.likes.filter((x) => x !== id)
      : [...this.data.likes, id];
    a.likes = Math.max(0, a.likes + (liked ? -1 : 1));
    this.save();
    return !liked;
  },
  bid(id, amount) {
    this.canTrade();
    this.settleExpired();
    const a = this.auction(id);
    if (!a || a.status !== "active" || a.endTime <= Date.now())
      throw new Error("이미 종료된 경매입니다.");
    if (a.sellerId === "me") throw new Error("내 상품에는 입찰할 수 없습니다.");
    if (
      this.isBlocked(a.sellerId) ||
      this.member(a.sellerId).status !== "active"
    )
      throw new Error("거래할 수 없는 판매자입니다.");
    const base = a.bidsCount ? a.currentPrice : a.startingPrice - a.minStep;
    if (
      !Number.isSafeInteger(amount) ||
      amount < base + a.minStep ||
      (amount - base) % a.minStep !== 0 ||
      amount > 1000000000
    )
      throw new Error("최소 입찰 금액과 입찰 단위를 확인해 주세요.");
    const bid = {
      id: uid(),
      auctionId: a.id,
      userId: "me",
      amount,
      at: Date.now(),
    };
    a.currentPrice = amount;
    a.bidsCount++;
    a.bidHistory.unshift(bid);
    this.data.bids.unshift(bid);
    this.notify("입찰이 접수됐어요", a.title + " · " + money(amount));
    this.save();
  },
  settleExpired() {
    let changed = false;
    this.data.auctions.forEach((a) => {
      if (a.status !== "active" || a.endTime > Date.now()) return;
      a.status = a.bidsCount ? "ended" : "unsold";
      changed = true;
      const winner = a.bidHistory[0]?.userId;
      if (
        (winner === "me" || a.sellerId === "me") &&
        a.bidsCount &&
        !this.data.trades.some((t) => t.auctionId === a.id && !t.demo)
      ) {
        this.data.trades.unshift({
          id: uid(),
          auctionId: a.id,
          peerId: a.sellerId === "me" ? winner : a.sellerId,
          title: a.title,
          amount: a.currentPrice,
          role: a.sellerId === "me" ? "seller" : "buyer",
          status: "협의 중",
          at: Date.now(),
        });
        this.notify(
          "경매가 마감됐어요",
          a.title + " 거래 내용을 확인해 주세요.",
        );
      }
    });
    if (changed) this.save();
  },
  saveAuction(values, id) {
    this.canTrade();
    const a = id ? this.auction(id) : null;
    if (id && (!a || a.sellerId !== "me"))
      throw new Error("수정 권한이 없습니다.");
    if (
      a &&
      (a.bidsCount > 0 || a.status !== "active" || a.endTime <= Date.now())
    )
      throw new Error("입찰이 시작되었거나 종료된 상품은 수정할 수 없습니다.");
    if (
      !values.title.trim() ||
      values.title.length > 100 ||
      !values.description.trim()
    )
      throw new Error("제목과 상품 설명을 입력해 주세요.");
    if (
      !Number.isSafeInteger(values.startingPrice) ||
      values.startingPrice < 1000 ||
      values.startingPrice > 1000000000 ||
      !Number.isSafeInteger(values.minStep) ||
      values.minStep < 100 ||
      values.minStep > 1000000000
    )
      throw new Error(
        "시작가는 1,000원 이상, 입찰 단위는 100원 이상으로 입력해 주세요.",
      );
    if (!values.images.length || values.images.length > 5)
      throw new Error("상품 사진을 1~5장 등록해 주세요.");
    if (!values.location.trim()) throw new Error("거래 지역을 입력해 주세요.");
    if (a) Object.assign(a, values, { currentPrice: values.startingPrice });
    else
      this.data.auctions.unshift({
        ...values,
        id: Date.now(),
        sellerId: "me",
        currentPrice: values.startingPrice,
        bidsCount: 0,
        likes: 0,
        views: 0,
        bidHistory: [],
        status: "active",
        createdAt: Date.now(),
      });
    this.save();
  },
  deleteAuction(id) {
    const a = this.auction(id);
    if (!a || a.sellerId !== "me") throw new Error("삭제 권한이 없습니다.");
    if (a.bidsCount)
      throw new Error(
        "입찰 기록이 있는 상품은 삭제할 수 없습니다. 고객센터에 취소를 요청해 주세요.",
      );
    a.status = "deleted";
    this.save();
  },
  chat(id) {
    const a = this.auction(id);
    if (!a || a.sellerId === "me")
      throw new Error("다른 판매자의 상품에서 문의해 주세요.");
    if (this.isBlocked(a.sellerId))
      throw new Error("차단한 사용자입니다. 차단 해제 후 대화할 수 있어요.");
    let room = this.data.chats.find((c) => c.auctionId === a.id);
    if (!room) {
      room = {
        id: uid(),
        auctionId: a.id,
        peerId: a.sellerId,
        messages: [],
        unread: 0,
      };
      this.data.chats.unshift(room);
      this.save();
    }
    return room;
  },
  send(roomId, text, kind = "text") {
    const room = this.data.chats.find((c) => c.id === roomId);
    if (!room || this.isBlocked(room.peerId))
      throw new Error("차단을 해제한 뒤 메시지를 보낼 수 있습니다.");
    if (this.data.user.status !== "active")
      throw new Error("제한된 계정은 메시지를 보낼 수 없습니다.");
    if (!text.trim() || text.length > 2000)
      throw new Error("메시지는 1~2,000자로 입력해 주세요.");
    room.messages.push({
      id: uid(),
      mine: true,
      text: text.trim(),
      at: Date.now(),
      kind,
    });
    this.save();
  },
};
