const ProfileView = {
  tab: "selling",
  render(params = {}) {
    if (params.tab) this.tab = params.tab;
    const root = document.getElementById("view-profile"),
      u = Store.data.user;
    const selling = Store.data.auctions.filter(
        (a) => a.sellerId === "me" && a.status !== "deleted",
      ),
      trades = Store.data.trades;
    root.innerHTML =
      UI.header(
        "내 정보",
        '<button class="icon-button" id="profile-settings" aria-label="프로필 설정">' +
          icon("settings") +
          "</button>",
      ) +
      '<div class="account-layout"><aside class="account-sidebar"><div class="account-card"><div class="profile-avatar">' +
      esc(u.name.slice(0, 1)) +
      "</div><h2>" +
      esc(u.name) +
      "</h2><p>" +
      esc(u.bio) +
      '</p><span class="tag ' +
      (u.verified ? "green" : "") +
      '">' +
      (u.verified ? "데모 전화번호 인증 완료" : "전화번호 미인증") +
      '</span><div class="profile-stats"><div><strong>' +
      selling.length +
      "</strong><span>판매 상품</span></div><div><strong>" +
      trades.filter((t) => t.status === "거래 완료").length +
      "</strong><span>거래 완료</span></div><div><strong>" +
      Store.data.likes.length +
      '</strong><span>관심 상품</span></div></div></div><div class="settings-menu"><button id="profile-verify">' +
      icon("shield") +
      "<span>전화번호 인증</span>" +
      icon("arrow") +
      '</button><button id="profile-preferences">' +
      icon("pin") +
      "<span>관심사·거래 설정</span>" +
      icon("arrow") +
      '</button><button id="profile-quiet">' +
      icon("moon") +
      "<span>방해금지 시간</span><small>" +
      (u.dnd.enabled ? u.dnd.start + "–" + u.dnd.end : "꺼짐") +
      '</small></button><button id="profile-blocked">' +
      icon("flag") +
      "<span>차단한 사용자</span>" +
      icon("arrow") +
      '</button><button id="profile-support">' +
      icon("help") +
      "<span>고객센터</span>" +
      icon("arrow") +
      '</button></div><p class="demo-footnote">프로토타입 · 이 브라우저에 저장됨<br>인증·거래·대화는 데모입니다.</p></aside><div class="account-content">' +
      (isDnd(u)
        ? '<div class="notice">' +
          icon("moon") +
          "<p>현재 방해금지 시간입니다. 알림은 알림함에서 확인해 주세요.</p></div>"
        : "") +
      '<div class="catalog-tabs account-tabs">' +
      [
        ["selling", "내 판매"],
        ["bids", "내 입찰"],
        ["trades", "거래 내역"],
      ]
        .map(
          ([id, label]) =>
            '<button data-profile-tab="' +
            id +
            '" class="' +
            (this.tab === id ? "active" : "") +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '</div><div id="profile-content"></div></div></div>';
    root.querySelector("#profile-settings").onclick = root.querySelector(
      "#profile-preferences",
    ).onclick = () => Account.settings();
    root.querySelector("#profile-verify").onclick = () =>
      Account.verify(() => toast("데모 인증을 완료했어요."));
    root.querySelector("#profile-quiet").onclick = () => Account.quietHours();
    root.querySelector("#profile-blocked").onclick = () => Safety.blockedList();
    root.querySelector("#profile-support").onclick = () => Nav.go("support");
    root.querySelectorAll("[data-profile-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          Nav.params = { tab: b.dataset.profileTab };
          this.render(Nav.params);
        }),
    );
    const content = root.querySelector("#profile-content");
    if (this.tab === "selling") {
      content.innerHTML =
        '<div class="spread section-heading"><h2>내가 올린 상품 <span>' +
        selling.length +
        '</span></h2><button class="text-button" id="profile-create">' +
        icon("plus") +
        '상품 등록</button></div><div class="product-grid compact">' +
        (selling.length
          ? UI.cards(selling)
          : empty(
              "첫 상품을 올려보세요",
              "잘 쓰지 않는 물건에 새로운 주인을 찾아주세요.",
            )) +
        "</div>";
      content.querySelector("#profile-create").onclick = () => Nav.go("create");
      UI.bindCards(content);
    } else if (this.tab === "bids") {
      const ids = [...new Set(Store.data.bids.map((b) => b.auctionId))],
        items = ids.map((id) => Store.auction(id)).filter(Boolean);
      content.innerHTML =
        '<div class="section-heading"><h2>참여 중인 경매</h2><p class="muted">내 입찰 기록은 나에게만 보여요.</p></div>' +
        (items.length
          ? items
              .map(
                (a) =>
                  '<button class="bid-product option-row" data-product="' +
                  a.id +
                  '"><img src="' +
                  esc(a.images[0]) +
                  '" alt=""><span><strong>' +
                  esc(a.title) +
                  "</strong><small>" +
                  money(
                    Store.data.bids.find((b) => b.auctionId === a.id).amount,
                  ) +
                  " · " +
                  (a.status !== "active"
                    ? "경매 종료"
                    : a.bidHistory[0]?.userId === "me"
                      ? "최고 입찰 중"
                      : "다른 입찰이 앞서 있어요") +
                  "</small></span>" +
                  icon("arrow") +
                  "</button>",
              )
              .join("")
          : empty(
              "아직 참여한 입찰이 없어요",
              "마음에 드는 상품에서 첫 입찰을 해보세요.",
            ));
      UI.bindCards(content);
    } else {
      content.innerHTML =
        '<div class="section-heading"><h2>거래 내역</h2><p class="muted">' +
        (u.publicHistory
          ? "완료된 거래 내역을 공개하고 있어요."
          : "완료된 거래 내역을 비공개로 설정했어요.") +
        "</p></div>" +
        trades
          .map(
            (t) =>
              '<article class="trade-card"><div class="spread"><span class="tag ' +
              (t.status === "거래 완료" ? "green" : "") +
              '">' +
              esc(t.status) +
              '</span><small class="muted">' +
              (t.demo ? "체험용 거래 · " : "") +
              day(t.at) +
              "</small></div><h3>" +
              esc(t.title) +
              '</h3><p class="trade-amount">' +
              money(t.amount) +
              '</p><div class="trade-progress">' +
              ["협의 중", "송금 표시", "전달·배송 중", "거래 완료"]
                .map(
                  (s, i) =>
                    '<span class="' +
                    (i <=
                    [
                      "협의 중",
                      "송금 표시",
                      "전달·배송 중",
                      "거래 완료",
                    ].indexOf(t.status)
                      ? "done"
                      : "") +
                    '">' +
                    s +
                    "</span>",
                )
                .join("") +
              '</div><div class="button-row"><button class="button secondary" data-trade-chat="' +
              t.auctionId +
              '">' +
              icon("chat") +
              "거래 채팅</button>" +
              (t.status === "거래 완료"
                ? Store.data.reviews.some((r) => r.tradeId === t.id)
                  ? '<button class="button secondary" disabled>후기 작성 완료</button>'
                  : '<button class="button" data-review="' +
                    t.id +
                    '">후기 남기기</button>'
                : '<button class="button" data-advance="' +
                  t.id +
                  '">' +
                  ({
                    "협의 중": "송금 표시",
                    "송금 표시": "전달·배송 체험",
                    "전달·배송 중": "수령 확인",
                  }[t.status] || "다음 단계") +
                  "</button>") +
              "</div></article>",
          )
          .join("") +
        (trades.length
          ? ""
          : empty(
              "아직 거래 내역이 없어요",
              "낙찰된 상품의 거래가 여기에 표시됩니다.",
            ));
      content
        .querySelectorAll("[data-advance]")
        .forEach((b) => (b.onclick = () => Trades.advance(b.dataset.advance)));
      content
        .querySelectorAll("[data-review]")
        .forEach((b) => (b.onclick = () => Trades.review(b.dataset.review)));
      content
        .querySelectorAll("[data-trade-chat]")
        .forEach(
          (b) =>
            (b.onclick = () =>
              attempt(() =>
                Nav.go("chat", { id: Store.chat(b.dataset.tradeChat).id }),
              )),
        );
    }
  },
};
