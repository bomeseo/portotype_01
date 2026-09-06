const Trades = {
  advance(id) {
    const t = Store.data.trades.find((t) => t.id === id);
    if (!t) return;
    const flow = ["협의 중", "송금 표시", "전달·배송 중", "거래 완료"];
    const next = flow[flow.indexOf(t.status) + 1];
    if (!next) return;
    UI.confirm(
      next === "거래 완료"
        ? "상품을 잘 받으셨나요?"
        : next === "송금 표시"
          ? "송금 표시를 남길까요?"
          : "전달·배송 단계 체험",
      next === "거래 완료"
        ? "데모 거래를 완료하고 후기를 작성할 수 있습니다."
        : next === "송금 표시"
          ? "실제 이체나 입금 확인은 이루어지지 않습니다. 거래 단계만 변경됩니다."
          : "프로토타입에서 판매자의 입금 확인과 상품 전달 단계를 체험합니다.",
      () => {
        t.status = next;
        Store.notify("거래 상태가 변경됐어요", t.title + " · " + next);
        Store.save();
        ProfileView.render({ tab: "trades" });
        toast(next + " 상태로 변경했어요.");
      },
      next === "거래 완료" ? "수령 확인" : "데모 단계 진행",
    );
  },
  review(id) {
    const t = Store.data.trades.find((t) => t.id === id);
    if (
      !t ||
      t.status !== "거래 완료" ||
      Store.data.reviews.some((r) => r.tradeId === id)
    ) {
      toast("완료된 거래에 한 번만 후기를 남길 수 있어요.");
      return;
    }
    UI.open(
      "거래 후기",
      '<p class="muted">' +
        esc(t.title) +
        '</p><form id="review-form"><label class="field">거래는 어떠셨나요?<select name="rating"><option value="5">★★★★★ 정말 좋았어요</option><option value="4">★★★★☆ 좋았어요</option><option value="3">★★★☆☆ 보통이에요</option><option value="2">★★☆☆☆ 아쉬웠어요</option><option value="1">★☆☆☆☆ 좋지 않았어요</option></select></label><label class="field">후기<textarea name="text" rows="4" minlength="5" maxlength="1000" required placeholder="다음 거래자에게 도움이 될 경험을 남겨주세요."></textarea></label><button type="submit" class="button full">후기 등록</button></form>',
      (d) => {
        d.querySelector("#review-form").onsubmit = (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (f.get("text").trim().length < 5) {
            toast("후기를 5자 이상 입력해 주세요.");
            return;
          }
          if (Store.data.reviews.some((r) => r.tradeId === id)) return;
          Store.data.reviews.unshift({
            id: uid(),
            tradeId: id,
            sellerId: t.peerId,
            author: Store.data.user.name,
            rating: Number(f.get("rating")),
            text: f.get("text").trim(),
            at: Date.now(),
          });
          Store.save();
          UI.close();
          ProfileView.render({ tab: "trades" });
          toast("후기를 남겼어요.");
        };
      },
    );
  },
};
