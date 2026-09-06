/* Role checks and transitions live here, separately from transaction screens. */
const Journey = {
  flow: ["협의 중", "송금 표시", "입금 확인", "전달·배송 중", "거래 완료"],
  get(id) {
    const t = Store.data.trades.find((t) => t.id === id);
    if (!t) throw new Error("거래를 찾을 수 없어요.");
    t.timeline ||= [];
    return t;
  },
  active(t) {
    Store.canTrade();
    if (["취소 요청", "문제 접수", "취소 완료", "거래 완료"].includes(t.status))
      throw new Error("현재 단계에서는 거래를 진행할 수 없어요.");
    if (Store.isBlocked(t.peerId))
      throw new Error("차단한 상대와는 고객센터를 통해 거래를 정리해 주세요.");
  },
  log(t, text) {
    t.timeline.push({ text, at: Date.now() });
    Store.notify("거래 진행 안내", t.title + " · " + text);
    Store.save();
  },
  agree(id, v) {
    const t = this.get(id);
    this.active(t);
    if (t.status !== "협의 중")
      throw new Error("협의 단계에서만 약속을 바꿀 수 있어요.");
    if (!["직거래", "택배"].includes(v.method))
      throw new Error("거래 방식을 정해주세요.");
    if (!String(v.place || "").trim())
      throw new Error(
        v.method === "직거래"
          ? "만날 공공장소를 입력해 주세요."
          : "택배 방식과 수령 방법을 입력해 주세요.",
      );
    if (
      !v.when ||
      !Number.isFinite(Date.parse(v.when + "+09:00")) ||
      Date.parse(v.when + "+09:00") <= Date.now()
    )
      throw new Error("앞으로의 약속 시간을 입력해 주세요.");
    const fee = Number(v.fee);
    if (!Number.isSafeInteger(fee) || fee < 0 || fee > 100000)
      throw new Error("배송비를 0~100,000원으로 입력해 주세요.");
    t.agreement = {
      method: v.method,
      place: String(v.place).trim(),
      when: v.when,
      fee: v.method === "직거래" ? 0 : fee,
      accepted: false,
    };
    this.log(t, "거래 약속 제안 저장");
  },
  accept(id) {
    const t = this.get(id);
    this.active(t);
    if (!t.agreement || t.status !== "협의 중")
      throw new Error("먼저 거래 약속을 작성해 주세요.");
    t.agreement.accepted = true;
    this.log(t, "데모 상대방이 거래 약속을 확인");
  },
  next(id, actor, delivery = "") {
    const t = this.get(id);
    this.active(t);
    const index = this.flow.indexOf(t.status);
    if (index < 0 || index >= this.flow.length - 1)
      throw new Error("진행할 단계가 없어요.");
    const needed = ["buyer", "seller", "seller", "buyer"][index];
    if (actor !== needed)
      throw new Error(
        "이 단계는 " +
          (needed === "buyer" ? "구매자" : "판매자") +
          "가 확인해야 해요.",
      );
    if (!t.agreement?.accepted)
      throw new Error("거래 약속을 상대방과 먼저 확인해 주세요.");
    if (t.status === "입금 확인" && !String(delivery).trim())
      throw new Error("전달 장소 또는 택배사·운송장 번호를 입력해 주세요.");
    if (t.status === "입금 확인") t.delivery = String(delivery).trim();
    t.status = this.flow[index + 1];
    this.log(
      t,
      (actor === t.role ? "내 확인: " : "데모 상대 확인: ") + t.status,
    );
  },
  issue(id, type, reason) {
    const t = this.get(id);
    if (["취소 완료", "취소 요청", "문제 접수"].includes(t.status))
      throw new Error("이미 접수되었거나 종료된 거래입니다.");
    if (type === "취소 요청" && t.status === "거래 완료")
      throw new Error("완료한 거래는 문제 접수로 문의해 주세요.");
    if (
      !["취소 요청", "문제 접수"].includes(type) ||
      String(reason).trim().length < 5
    )
      throw new Error("상황을 5자 이상 입력해 주세요.");
    t.previousStatus = t.status;
    t.status = type;
    t.issue = { type, reason: String(reason).trim(), at: Date.now() };
    Store.data.tickets.unshift({
      id: uid(),
      tradeId: id,
      title: type + " · " + t.title,
      body: t.issue.reason,
      type: "거래·입찰",
      status: "접수",
      at: Date.now(),
    });
    this.log(t, type + " 접수 · 진행 보류");
  },
  resolve(id, decision) {
    const t = this.get(id);
    if (!["취소 요청", "문제 접수"].includes(t.status))
      throw new Error("검토할 요청이 없어요.");
    if (!["resume", "cancel"].includes(decision))
      throw new Error("처리 결과를 선택해 주세요.");
    t.status = decision === "resume" ? t.previousStatus : "취소 완료";
    Store.data.tickets
      .filter((x) => x.tradeId === id && x.status === "접수")
      .forEach((x) => {
        x.status = "답변 완료";
        x.answer =
          "[데모 검토] " +
          (decision === "resume"
            ? "당사자 확인 후 거래를 재개합니다."
            : "취소 처리 흐름입니다. 실제 환불은 발생하지 않습니다.");
      });
    this.log(t, "데모 검토: " + t.status);
  },
  room(id) {
    const t = this.get(id);
    let c =
      Store.data.chats.find((c) => c.tradeId === t.id) ||
      Store.data.chats.find(
        (c) =>
          !c.tradeId && c.auctionId === t.auctionId && c.peerId === t.peerId,
      );
    if (!c) {
      c = {
        id: uid(),
        auctionId: t.auctionId,
        peerId: t.peerId,
        unread: 0,
        messages: [],
      };
      Store.data.chats.unshift(c);
      Store.save();
    }
    c.tradeId = id;
    Store.save();
    return c;
  },
  demo(role = "buyer") {
    Store.canTrade();
    const own = role === "seller";
    const t = {
      id: uid(),
      auctionId: own ? 6 : 2,
      peerId: "seller-2",
      title: own ? Store.auction(6).title : Store.auction(2).title,
      amount: own ? 180000 : 320000,
      role,
      status: "협의 중",
      at: Date.now(),
      demo: true,
      timeline: [],
    };
    Store.data.trades.unshift(t);
    Store.save();
    Nav.go("trade", { id: t.id });
  },
};
