/* A coach beside the real controls; progression depends on completed actions. */
const Tutorial = {
  active: false,
  refreshing: false,
  step: 0,
  auctionId: null,
  welcome() {
    UI.open(
      "첫 거래를 함께 해볼까요?",
      '<p>예시 상품으로 찜 → 문의 → 입찰 → 낙찰 → 거래 완료 → 후기까지 직접 눌러볼 수 있어요.</p><div class="button-row"><button class="button" id="tour-start">초보자 따라하기</button><button class="button secondary" id="tour-later">먼저 둘러보기</button></div>',
      (d) => {
        d.querySelector("#tour-start").onclick = () =>
          Membership.require(() => this.start());
        d.querySelector("#tour-later").onclick = () => UI.close();
      },
    );
  },
  start() {
    this.stop();
    UI.close();
    let a = Store.auction(Store.data.tutorial.auctionId);
    if (!a || a.status !== "active") {
      const seed = Store.auction(2);
      const peerId = "tutorial-seller";
      Store.data.sellers[peerId] = {
        ...Store.member("seller-1"),
        id: peerId,
        name: "연습 판매자",
        bio: "처음 거래 따라하기의 예시 판매자입니다.",
        publicHistory: false,
      };
      a = {
        ...JSON.parse(JSON.stringify(seed)),
        id: Date.now(),
        sellerId: peerId,
        title: "[따라하기] 소니 헤드폰 첫 경매",
        startingPrice: 20000,
        currentPrice: 20000,
        minStep: 1000,
        bidsCount: 0,
        bidHistory: [],
        likes: 0,
        views: 0,
        status: "active",
        createdAt: Date.now(),
        endTime: Date.now() + 86400000,
        demoTutorial: true,
      };
      Store.data.auctions.unshift(a);
      Store.data.tutorial = { completed: false, auctionId: a.id };
      Store.save();
    }
    this.auctionId = a.id;
    this.step = 0;
    this.active = true;
    Nav.go("detail", { id: a.id });
    this.refresh();
  },
  stop() {
    this.active = false;
    document.getElementById("tutorial-coach")?.remove();
    document
      .querySelectorAll(".tutorial-target")
      .forEach((el) => el.classList.remove("tutorial-target"));
    document.body.classList.remove("has-tutorial");
  },
  refresh() {
    if (!this.active || this.refreshing) return;
    this.refreshing = true;
    try {
      const a = Store.auction(this.auctionId);
      const room = Store.data.chats.find((c) => c.auctionId === this.auctionId);
      const t = Store.data.trades.find((t) => t.auctionId === this.auctionId);
      const complete = [
        Store.data.likes.includes(this.auctionId),
        room?.messages.some((m) => m.mine),
        a?.bidHistory.some((b) => b.userId === "me"),
        !!t,
        t?.status === "거래 완료",
        t && Store.data.reviews.some((r) => r.tradeId === t.id),
      ];
      let moved = false;
      while (this.step < complete.length && complete[this.step]) {
        this.step++;
        moved = true;
      }
      if (this.step === 6) {
        Store.data.tutorial.completed = true;
        Store.save();
        this.stop();
        UI.open(
          "첫 거래 체험을 마쳤어요",
          '<p>찜부터 후기까지 모두 완료했습니다. 이제 관심 카테고리의 상품을 둘러보거나, 내 상품을 등록해 보세요.</p><button class="button full" id="tour-sell">판매 상품 등록해 보기</button>',
          (d) =>
            (d.querySelector("#tour-sell").onclick = () => Nav.go("create")),
        );
        return;
      }
      if (moved && (this.step === 2 || this.step === 3))
        Nav.go("detail", { id: this.auctionId });
      if (moved && (this.step === 4 || this.step === 5))
        Nav.go("trade", { id: t.id });
      const instructions = [
        [
          "관심 상품으로 저장",
          "상품의 하트 버튼을 눌러 찜해 보세요. 하단 ‘관심’에서 모아볼 수 있어요.",
          '[data-like="' + this.auctionId + '"]',
        ],
        [
          "판매자에게 문의",
          Nav.current === "chat"
            ? "사용 기간이나 하자가 궁금하다고 메시지를 적고 보내세요. 문구가 필요하면 ‘질문 도우미’를 눌러보세요."
            : "‘판매자 문의’를 눌러 채팅으로 들어간 다음 질문을 보내보세요.",
          Nav.current === "chat" ? "#message-input" : "#detail-chat",
        ],
        [
          "금액 확인 후 입찰",
          "‘입찰하기’를 누르고 금액과 배송비를 확인하세요. 마지막 확인 버튼까지 누르면 접수됩니다.",
          UI.dialog
            ? document.getElementById("confirm-action")
              ? "#confirm-action"
              : "#bid-value"
            : "#detail-bid",
        ],
        [
          "낙찰 결과 확인",
          "실제 마감까지 기다리는 대신 ‘데모: 지금 마감’ 버튼으로 낙찰을 체험해 보세요.",
          UI.dialog ? "#confirm-action" : "#demo-end",
        ],
        [
          "약속부터 수령 확인까지",
          "미래의 거래 약속을 저장하고 데모 상대방 확인을 누르세요. 송금 표시 → 입금 확인 → 전달 기록 → 수령 확인 순서로 진행해 보세요.",
          document.getElementById("agreement-form") && !t?.agreement
            ? "#agreement-form"
            : !t?.agreement?.accepted
              ? "#agreement-accept"
              : "#trade-next",
        ],
        [
          "거래 후기 남기기",
          "‘후기 남기기’에서 거래 경험을 적으면 첫 거래 체험이 끝나요.",
          UI.dialog ? "#review-form" : "#trade-review",
        ],
      ];
      const [title, text, selector] = instructions[this.step];
      document
        .querySelectorAll(".tutorial-target")
        .forEach((el) => el.classList.remove("tutorial-target"));
      document.getElementById("tutorial-coach")?.remove();
      const coach = document.createElement("aside");
      coach.id = "tutorial-coach";
      coach.className = "tutorial-coach";
      coach.setAttribute("aria-label", "처음 거래 따라하기");
      coach.innerHTML =
        '<div><span class="eyebrow">처음 거래 따라하기 · ' +
        (this.step + 1) +
        "/6</span><strong>" +
        title +
        "</strong><p>" +
        text +
        '</p></div><div class="button-row"><button class="button secondary" id="tour-locate">버튼 위치 보기</button><button class="text-button" id="tour-exit">나중에 하기</button></div>';
      document.body.append(coach);
      document.body.classList.add("has-tutorial");
      const target = document.querySelector(selector);
      target?.classList.add("tutorial-target");
      coach.querySelector("#tour-locate").onclick = () => {
        if (!target) {
          Nav.go(this.step >= 4 ? "trade" : "detail", {
            id: this.step >= 4 ? t.id : this.auctionId,
          });
          return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus();
      };
      coach.querySelector("#tour-exit").onclick = () => {
        this.stop();
        toast("체험 안내에서 언제든 다시 시작할 수 있어요.");
      };
    } finally {
      this.refreshing = false;
    }
  },
};
document.addEventListener("click", () =>
  setTimeout(() => Tutorial.refresh(), 0),
);
document.addEventListener("state-changed", () =>
  setTimeout(() => Tutorial.refresh(), 0),
);
