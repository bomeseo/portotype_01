const Bidding = {
  open(id) {
    if (!Store.data.user.onboardingComplete || !Store.data.user.verified) {
      Membership.require(() => this.open(id));
      return;
    }
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
          '<p>입찰자는 공개되지 않아요. 낙찰되면 판매자와 채팅으로 거래를 협의합니다.</p></div><p class="field-hint">데모 입찰이며 실제 결제는 발생하지 않습니다.</p><button class="button full" type="submit">금액 확인하기</button></form>',
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
              const amount = Number(input.value),
                fee = a.method === "직거래" ? 0 : a.shippingFee;
              if (
                !Number.isSafeInteger(amount) ||
                amount < min ||
                (amount - min) % a.minStep ||
                amount > 1000000000
              )
                throw new Error("최소 입찰 금액과 입찰 단위를 확인해 주세요.");
              UI.confirm(
                "입찰 금액 최종 확인",
                money(amount) +
                  "에 입찰합니다. " +
                  (amount >= min * 2
                    ? "최소 입찰 금액의 두 배 이상입니다. 0을 더 입력하지 않았는지 확인해 주세요. "
                    : "") +
                  "택배 기준 배송비 " +
                  money(fee) +
                  " 포함 " +
                  money(amount + fee) +
                  ". 직거래 시 배송비는 0원입니다. 자동 결제는 없으며, 접수 후 취소는 고객센터에 요청할 수 있습니다.",
                () => {
                  Store.bid(id, amount);
                  Nav.go("detail", { id }, true);
                  toast("최고 입찰자가 되었어요.");
                },
                money(amount) + " 입찰 확정",
              );
            });
          };
        },
      );
    });
  },
};
