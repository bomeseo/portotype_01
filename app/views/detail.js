const DetailView = {
  render({ id } = Nav.params) {
    const a = Store.auction(id),
      root = document.getElementById("view-detail");
    if (!a || a.status === "deleted") {
      root.innerHTML =
        UI.header("경매 상세", "", true) +
        empty(
          "찾을 수 없는 상품이에요",
          "삭제되었거나 더 이상 공개되지 않는 상품입니다.",
        );
      UI.bindBack(root);
      return;
    }
    const seller = Store.member(a.sellerId),
      mine = a.sellerId === "me",
      ended = a.status !== "active" || a.endTime <= Date.now(),
      blocked = Store.isBlocked(a.sellerId);
    root.innerHTML =
      UI.header(
        "경매 상세",
        '<button class="icon-button" id="detail-report" aria-label="상품 신고">' +
          icon("flag") +
          "</button>",
        true,
      ) +
      '<div class="detail-layout"><div class="detail-left"><div class="gallery"><img id="gallery-main" src="' +
      esc(a.images[0]) +
      '" alt="' +
      esc(a.title) +
      '"><span class="gallery-counter" id="gallery-counter">1 / ' +
      a.images.length +
      '</span></div><div class="thumbnails">' +
      a.images
        .map(
          (src, i) =>
            '<button data-image="' +
            i +
            '" class="' +
            (i === 0 ? "selected" : "") +
            '" aria-label="상품 사진 ' +
            (i + 1) +
            '"><img src="' +
            esc(src) +
            '" alt=""></button>',
        )
        .join("") +
      '</div><section class="detail-description desktop-description"><h2>상품 이야기</h2><p>' +
      esc(a.description) +
      '</p></section></div><div class="detail-right"><div class="detail-tags"><span class="tag">' +
      esc(categoryName(a.category)) +
      '</span><span class="tag">' +
      esc(a.condition) +
      '</span><span class="tag">' +
      esc(a.method) +
      '</span></div><h2 class="detail-title">' +
      esc(a.title) +
      '</h2><p class="muted small">' +
      icon("pin") +
      esc(a.location) +
      " · 조회 " +
      a.views +
      '</p><div class="price-panel"><div class="spread"><span class="live-label">' +
      (ended ? "경매 종료" : "<i></i> 경매 진행 중") +
      '</span><span class="timer-text" data-timer="' +
      a.id +
      '">' +
      (ended ? "마감" : remaining(a.endTime)) +
      '</span></div><div class="detail-price">' +
      money(a.currentPrice) +
      '</div><div class="price-foot"><span>시작가 ' +
      money(a.startingPrice) +
      "</span><span>입찰 단위 " +
      money(a.minStep) +
      '</span></div></div><button class="seller-card" id="seller-open"><span class="avatar">' +
      (seller.avatar
        ? '<img src="' + esc(seller.avatar) + '" alt="">'
        : esc(seller.name.slice(0, 1))) +
      '</span><span class="seller-summary"><strong>' +
      esc(seller.name) +
      '</strong><span class="presence">' +
      (blocked ? "차단한 사용자" : esc(presence(seller))) +
      '</span></span><span class="seller-rating">' +
      icon("star") +
      (seller.rating || "신규") +
      "</span>" +
      icon("arrow") +
      '</button><div class="trust-line">' +
      icon("shield") +
      "<span>" +
      (seller.verified ? "전화번호 인증 · 데모" : "전화번호 미인증") +
      '</span><button class="text-button" id="trust-open">거래 정보</button></div>' +
      (seller.fraud === "review"
        ? '<div class="notice warning">신고 검토 중인 데모 판매자입니다. 거래 정보를 확인해 주세요.</div>'
        : "") +
      '<div class="detail-actions">' +
      (mine
        ? '<button class="button secondary" id="edit-product" ' +
          (a.bidsCount || ended ? "disabled" : "") +
          ">" +
          icon("edit") +
          '수정</button><button class="button secondary danger" id="delete-product">삭제</button>'
        : '<button class="button secondary" id="detail-chat" ' +
          (blocked ? "disabled" : "") +
          ">" +
          icon("chat") +
          '문의</button><button class="button" id="detail-bid" ' +
          (ended || blocked ? "disabled" : "") +
          ">" +
          (blocked
            ? "차단한 판매자"
            : ended
              ? "경매가 종료됐어요"
              : "입찰하기") +
          "</button>") +
      '<button class="button secondary square ' +
      (Store.data.likes.includes(a.id) ? "liked" : "") +
      '" data-like="' +
      a.id +
      '" aria-label="관심 상품 토글" aria-pressed="' +
      Store.data.likes.includes(a.id) +
      '">' +
      icon("heart") +
      '</button></div><p class="payment-note">판매자와 직접 거래하는 경매입니다.<br>계좌이체 전 상품과 거래 상대를 확인해 주세요.</p><button class="compare-button" id="compare-open">' +
      icon("search") +
      "새 상품 가격이 궁금하다면<span>외부 가격 확인 " +
      icon("external") +
      '</span></button><section class="detail-description mobile-description"><h2>상품 이야기</h2><p>' +
      esc(a.description) +
      '</p></section><section class="bid-history"><div class="spread"><h2>입찰 내역 <span>' +
      a.bidsCount +
      '</span></h2><span class="small muted">입찰자 비공개</span></div>' +
      (a.bidHistory.length
        ? a.bidHistory
            .slice(0, 8)
            .map(
              (b, i) =>
                '<div class="bid-row"><span>' +
                (b.userId === "me"
                  ? '<b class="text-green">내 입찰</b>'
                  : "비공개 입찰") +
                "<small>" +
                esc(b.at ? ago(b.at) : b.time) +
                "</small></span><strong>" +
                money(b.amount) +
                (i === 0 ? '<span class="tag green">최고가</span>' : "") +
                "</strong></div>",
            )
            .join("")
        : '<p class="muted">아직 입찰이 없어요. 첫 입찰을 시작해 보세요.</p>') +
      "</section>" +
      (a.bidHistory[0]?.userId === "me" && !ended
        ? '<button class="text-button demo-control" id="demo-end">' +
          icon("clock") +
          "데모: 지금 마감하고 낙찰 흐름 보기</button>"
        : "") +
      "</div></div>";
    UI.bindBack(root);
    UI.bindCards(root);
    root.querySelectorAll("[data-image]").forEach(
      (b) =>
        (b.onclick = () => {
          root.querySelector("#gallery-main").src =
            a.images[Number(b.dataset.image)];
          root.querySelector("#gallery-counter").textContent =
            Number(b.dataset.image) + 1 + " / " + a.images.length;
          root
            .querySelectorAll("[data-image]")
            .forEach((t) => t.classList.toggle("selected", t === b));
        }),
    );
    root.querySelector("#seller-open").onclick = root.querySelector(
      "#trust-open",
    ).onclick = () => Nav.go("seller", { id: a.sellerId });
    root.querySelector("#detail-report").onclick = () =>
      Safety.report(a.sellerId, a.id);
    root
      .querySelector("#detail-chat")
      ?.addEventListener("click", () =>
        Membership.require(() =>
          attempt(() => Nav.go("chat", { id: Store.chat(a.id).id })),
        ),
      );
    root
      .querySelector("#detail-bid")
      ?.addEventListener("click", () => Bidding.open(a.id));
    root
      .querySelector("#edit-product")
      ?.addEventListener("click", () => Nav.go("create", { id: a.id }));
    root.querySelector("#delete-product")?.addEventListener("click", () =>
      UI.confirm(
        "상품을 삭제할까요?",
        "목록에서 사라지며 되돌릴 수 없습니다.",
        () => {
          Store.deleteAuction(a.id);
          Nav.go("profile");
          toast("상품을 삭제했어요.");
        },
        "삭제",
      ),
    );
    root.querySelector("#compare-open").onclick = () => this.compare(a);
    root.querySelector("#demo-end")?.addEventListener("click", () =>
      UI.confirm(
        "경매 마감 체험",
        "현재 내 입찰로 마감하고 거래 내역을 만듭니다. 이 데모 경매는 다시 진행되지 않습니다.",
        () => {
          a.endTime = Date.now() - 1;
          Store.settleExpired();
          const trade = Store.data.trades.find((t) => t.auctionId === a.id);
          Nav.go("trade", { id: trade.id });
        },
        "마감 체험",
      ),
    );
    Discovery.detail(a.id);
  },
  compare(a) {
    const q = encodeURIComponent([a.brand, a.model || a.title].join(" "));
    UI.open(
      "외부 가격 확인",
      '<p class="muted">같은 모델의 새 상품 가격을 참고해 보세요. 옵션·상태·배송비에 따라 가격이 달라질 수 있습니다.</p><div class="compare-product">' +
        esc(a.brand) +
        " " +
        esc(a.model || a.title) +
        '</div><a class="option-row" href="https://www.coupang.com/np/search?q=' +
        q +
        '" target="_blank" rel="noopener noreferrer"><strong>쿠팡에서 검색</strong>' +
        icon("external") +
        '</a><a class="option-row" href="https://search.11st.co.kr/Search.tmall?kwd=' +
        q +
        '" target="_blank" rel="noopener noreferrer"><strong>11번가에서 검색</strong>' +
        icon("external") +
        '</a><p class="field-hint">현재는 일반 검색 링크입니다. 파트너스 수익 링크와 실시간 가격 수집은 연결되어 있지 않습니다.</p>',
    );
  },
};
