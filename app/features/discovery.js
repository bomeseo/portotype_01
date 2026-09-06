const Discovery = {
  mount() {
    const root = document.getElementById("view-home");
    root.querySelector("#welcome-actions")?.remove();
    const box = document.createElement("div");
    box.id = "welcome-actions";
    box.className = "welcome-actions";
    const u = Store.data.user;
    box.innerHTML =
      "<div><strong>" +
      (u.onboardingComplete
        ? esc(u.name) + "님, 반가워요"
        : "관심사부터 첫 거래까지, 함께 시작해요") +
      "</strong><p>" +
      (u.onboardingComplete
        ? "관심 카테고리 " +
          (u.interests.map(categoryName).join(" · ") || "아직 선택하지 않음")
        : "가입 정보를 완성하면 관심사에 맞게 둘러보고 거래를 체험할 수 있어요.") +
      '</p></div><div class="button-row"><button class="button secondary" id="home-signup">' +
      (u.onboardingComplete ? "관심사·가입 정보" : "가입 시작·이어서 하기") +
      '</button><button class="button" id="home-tutorial">처음 거래 따라하기</button></div>';
    root.prepend(box);
    box.querySelector("#home-signup").onclick = () =>
      Onboarding.start(u.onboardingComplete);
    box.querySelector("#home-tutorial").onclick = () =>
      Membership.require(() => Tutorial.start());
    const search = root.querySelector("#product-search");
    search.onchange = () => {
      const q = search.value.trim();
      if (q) {
        Store.data.searches = [
          q,
          ...Store.data.searches.filter((x) => x !== q),
        ].slice(0, 6);
        Store.save();
      }
    };
    if (Store.data.searches.length) {
      const recent = document.createElement("div");
      recent.className = "recent-searches";
      recent.innerHTML =
        "<span>최근 검색</span>" +
        Store.data.searches
          .map(
            (q, i) =>
              '<button class="chip" data-recent-search="' +
              i +
              '">' +
              esc(q) +
              "</button>",
          )
          .join("") +
        '<button class="text-button" id="clear-searches">기록 지우기</button>';
      root.querySelector(".discovery-bar").after(recent);
      recent.querySelectorAll("[data-recent-search]").forEach(
        (b) =>
          (b.onclick = () => {
            HomeView.filter.query =
              Store.data.searches[Number(b.dataset.recentSearch)];
            HomeView.render();
          }),
      );
      recent.querySelector("#clear-searches").onclick = () => {
        Store.data.searches = [];
        Store.save();
        HomeView.render();
      };
    }
    const recent = Store.data.recentViews
      .map((id) => Store.auction(id))
      .filter(
        (a) => a && a.status !== "deleted" && !Store.isBlocked(a.sellerId),
      )
      .slice(0, 4);
    if (recent.length) {
      const section = document.createElement("section");
      section.className = "recent-products";
      section.innerHTML =
        '<h2>최근 본 상품</h2><div class="product-grid">' +
        UI.cards(recent) +
        "</div>";
      root.append(section);
      UI.bindCards(section);
    }
  },
  profile() {
    const menu = document.querySelector("#view-profile .settings-menu");
    if (!menu || document.getElementById("profile-signup")) return;
    const b = document.createElement("button");
    b.id = "profile-signup";
    b.innerHTML = icon("user") + "<span>가입 정보·알림·공개 설정</span>";
    b.onclick = () => Onboarding.start(true);
    menu.prepend(b);
    const extra = document.createElement("div");
    extra.className = "demo-scenarios";
    extra.innerHTML =
      '<h3>거래 역할 체험</h3><div class="button-row"><button class="button secondary" id="buyer-scenario">구매자 체험</button><button class="button secondary" id="seller-scenario">판매자 체험</button></div><p class="field-hint">내 상품이나 기존 거래를 바꾸지 않고 새 예시 거래를 만듭니다.</p>';
    menu.after(extra);
    extra.querySelector("#buyer-scenario").onclick = () =>
      Membership.require(() => Journey.demo("buyer"));
    extra.querySelector("#seller-scenario").onclick = () =>
      Membership.require(() => Journey.demo("seller"));
  },
  detail(id) {
    const a = Store.auction(id),
      root = document.getElementById("view-detail");
    if (!a || a.status === "deleted") return;
    Store.data.recentViews = [
      a.id,
      ...Store.data.recentViews.filter((x) => x !== a.id),
    ].slice(0, 12);
    Store.save();
    const tools = document.createElement("div");
    tools.className = "detail-extra";
    const won = a.status === "ended" && a.bidHistory[0]?.userId === "me";
    tools.innerHTML =
      '<div class="spread"><strong>' +
      (won ? "낙찰됐어요! 거래 약속을 정해주세요." : "입찰 전 확인") +
      '</strong><button class="text-button" id="share-product">링크 공유</button></div><p>하자·수리: ' +
      esc(a.flaws || "판매자에게 확인 필요") +
      " · 구성품: " +
      esc(a.components || "판매자에게 확인 필요") +
      "</p><p>직거래 배송비 0원 · 택배 " +
      money(a.shippingFee) +
      '</p><p class="field-hint">정해진 마감 시각에 최고 입찰이 낙찰됩니다. 자동 연장·자동 결제는 없으며 입찰 후 취소는 고객센터에 요청할 수 있어요.</p><div class="button-row"><button class="button secondary" id="detail-assistant">상품 확인 도우미</button>' +
      (won
        ? '<button class="button" id="detail-trade">낙찰 거래 진행</button>'
        : "") +
      "</div>";
    root.append(tools);
    tools.querySelector("#detail-assistant").onclick = () => Assistant.open();
    tools.querySelector("#detail-trade")?.addEventListener("click", () => {
      const t = Store.data.trades.find((t) => t.auctionId === a.id);
      if (t) Nav.go("trade", { id: t.id });
    });
    tools.querySelector("#share-product").onclick = () => {
      const sample = a.id >= 1 && a.id <= 5;
      const origin =
        window.location?.origin ||
        "https://live-auction-prototype-park-0906.pokesheugu.chatgpt.site";
      const url = origin + "/#product=" + a.id;
      UI.open(
        "상품 링크 공유",
        sample
          ? '<p>아래 예시 상품 링크를 복사해 공유해 보세요. 방문자마다 경매 진행 기록은 별도로 체험합니다.</p><label class="field">공유 링크<input id="share-url" readonly value="' +
              esc(url) +
              '"></label><button class="button" id="copy-link">링크 복사</button>'
          : '<p>직접 등록한 상품과 따라하기 상품은 이 브라우저에만 저장됩니다. 다른 방문자에게 상품을 공유하는 기능은 서버 연결 후 사용할 수 있어요.</p><a class="button" href="' +
              esc(origin) +
              '">프로토타입 홈으로</a>',
        (d) => {
          d.querySelector("#copy-link")?.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast("링크를 복사했어요.");
            } catch {
              const input = d.querySelector("#share-url");
              input.focus();
              input.select();
              toast("주소를 선택했어요. 복사해서 보내주세요.");
            }
          });
        },
      );
    };
  },
  remind() {
    if (!Store.data.user.alerts.ending) return;
    let changed = false;
    for (const a of Store.data.auctions) {
      if (
        a.status === "active" &&
        Store.data.likes.includes(a.id) &&
        !a.endingNotified &&
        a.endTime - Date.now() <= 600000 &&
        a.endTime > Date.now()
      ) {
        a.endingNotified = true;
        Store.notify(
          "찜한 경매가 곧 마감돼요",
          a.title + " · 10분 이내 마감",
          "ending",
        );
        changed = true;
      }
    }
    if (changed) Store.save();
  },
};
