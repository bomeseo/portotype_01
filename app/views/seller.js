const SellerView = {
  render({ id } = Nav.params) {
    const root = document.getElementById("view-seller"),
      m = Store.member(id);
    if (!m) {
      root.innerHTML = empty(
        "사용자를 찾을 수 없어요",
        "다른 상품을 확인해 주세요.",
      );
      return;
    }
    const reviews = Store.data.reviews.filter((r) => r.sellerId === id),
      items = Store.data.auctions.filter(
        (a) => a.sellerId === id && a.status === "active",
      ),
      blocked = Store.isBlocked(id);
    root.innerHTML =
      UI.header("판매자 정보", "", true) +
      '<div class="seller-page"><div class="seller-identity"><div class="profile-avatar">' +
      (m.avatar
        ? '<img src="' + esc(m.avatar) + '" alt="">'
        : esc(m.name.slice(0, 1))) +
      "</div><h2>" +
      esc(m.name) +
      "</h2><p>" +
      esc(m.bio) +
      '</p><span class="presence">' +
      (blocked ? "차단한 사용자" : esc(presence(m))) +
      '</span></div><div class="trust-grid"><div>' +
      icon("shield") +
      "<strong>" +
      (m.verified ? "인증 완료" : "미인증") +
      "</strong><span>전화번호 · 데모</span></div><div>" +
      icon("star") +
      "<strong>" +
      (m.rating || "신규") +
      "</strong><span>판매자 평점 · 예시</span></div><div>" +
      icon("pin") +
      "<strong>" +
      esc(m.location) +
      '</strong><span>선호 거래 지역</span></div></div><div class="notice ' +
      (m.fraud === "review" ? "warning" : "") +
      '">' +
      icon("shield") +
      "<div><strong>" +
      (m.fraud === "review"
        ? "신고 검토 중 · 데모"
        : "확인된 서비스 제재 없음 · 데모") +
      '</strong><p>실제 외부 사기 조회 결과가 아닙니다. 신고 접수와 사기 확정은 구분됩니다.</p></div></div><div class="button-row">' +
      (id !== "me"
        ? '<button class="button secondary" id="seller-block">' +
          (blocked ? "차단 해제" : "사용자 차단") +
          '</button><button class="button secondary" id="seller-report">신고하기</button>'
        : '<button class="button secondary" id="seller-edit">공개 설정 변경</button>') +
      '</div><section class="seller-section"><div class="section-heading"><h2>판매자의 거래 내역</h2><p class="muted">' +
      (m.publicHistory
        ? "판매자가 공개한 상품과 완료 기록입니다."
        : "판매자가 거래 내역을 비공개로 설정했어요.") +
      "</p></div>" +
      (blocked
        ? empty("차단한 판매자입니다", "차단을 해제하면 상품을 볼 수 있어요.")
        : m.publicHistory
          ? '<div class="product-grid compact">' +
            UI.cards(items) +
            "</div>" +
            Store.data.trades
              .filter(
                (t) =>
                  t.status === "거래 완료" && (id === "me" || t.peerId === id),
              )
              .map(
                (t) =>
                  '<div class="option-row"><span>' +
                  esc(t.title) +
                  '</span><span class="tag green">거래 완료</span></div>',
              )
              .join("")
          : '<div class="private-history">' +
            icon("shield") +
            "비공개 거래 내역</div>") +
      '</section><section class="seller-section"><h2>거래 후기 <span>' +
      reviews.length +
      "</span></h2>" +
      (reviews.length
        ? reviews
            .map(
              (r) =>
                '<article class="review-card"><div class="spread"><strong>' +
                esc(r.author) +
                '</strong><span class="stars">' +
                "★".repeat(r.rating) +
                "☆".repeat(5 - r.rating) +
                "</span></div><p>" +
                esc(r.text) +
                '</p><small class="muted">' +
                day(r.at) +
                "</small></article>",
            )
            .join("")
        : empty(
            "아직 작성된 후기가 없어요",
            "거래가 완료되면 후기를 남길 수 있습니다.",
          )) +
      "</section></div>";
    UI.bindBack(root);
    UI.bindCards(root);
    root
      .querySelector("#seller-block")
      ?.addEventListener("click", () =>
        Safety.block(id, () => this.render({ id })),
      );
    root
      .querySelector("#seller-report")
      ?.addEventListener("click", () => Safety.report(id));
    root
      .querySelector("#seller-edit")
      ?.addEventListener("click", () => Account.settings());
  },
};
