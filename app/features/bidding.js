const Bidding = {
  open(id) {
    attempt(() => {
      Store.canTrade();
      const a = Store.auction(id);
      if (a.status !== "active" || a.endTime <= Date.now())
        throw new Error("이미 종료된 경매입니다.");
      const min = a.bidsCount ? a.currentPrice + a.minStep : a.startingPrice;
      UI.open(
        "입찰하기",
        '<p class="muted">' +
          esc(a.title) +
          '</p><div class="bid-summary"><span>현재가</span><strong>' +
          money(a.currentPrice) +
          '</strong></div><form id="bid-form"><label class="field">내 입찰 금액<div class="currency-input"><input id="bid-value" type="number" min="' +
          min +
          '" max="1000000000" step="' +
          a.minStep +
          '" value="' +
          min +
          '" required><span>원</span></div></label><p class="field-hint">최소 ' +
          money(min) +
          " · " +
          money(a.minStep) +
          ' 단위</p><div class="quick-amounts">' +
          [1, 2, 5]
            .map(
              (n) =>
                '<button type="button" class="chip" data-step="' +
                n * a.minStep +
                '">+' +
                money(n * a.minStep) +
                "</button>",
            )
            .join("") +
          '</div><div class="notice">' +
          icon("shield") +
          '<p>입찰자는 공개되지 않아요. 낙찰되면 판매자와 채팅으로 거래를 협의합니다.</p></div><p class="field-hint">데모 입찰이며 실제 결제는 발생하지 않습니다.</p><button class="button full" type="submit">입찰 확정</button></form>',
        (d) => {
          const input = d.querySelector("#bid-value");
          d.querySelectorAll("[data-step]").forEach(
            (b) =>
              (b.onclick = () =>
                (input.value = Math.min(
                  1000000000,
                  Number(input.value) + Number(b.dataset.step),
                ))),
          );
          d.querySelector("#bid-form").onsubmit = (e) => {
            e.preventDefault();
            attempt(() => {
              Store.bid(id, Number(input.value));
              UI.close();
              DetailView.render({ id });
              toast("최고 입찰자가 되었어요.");
            });
          };
        },
      );
    });
  },
};
