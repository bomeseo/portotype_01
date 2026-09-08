const Safety = {
  report(peerId, auctionId) {
    if (peerId === "me") {
      toast("내 상품은 신고할 수 없어요.");
      return;
    }
    UI.open(
      "신고하기",
      '<p class="muted">신고 내용은 공개되지 않으며, 검토 후 조치합니다.</p><form id="report-form"><label class="field">신고 사유<select name="reason"><option>사기 의심</option><option>허위 상품 정보</option><option>욕설·괴롭힘</option><option>금지 상품</option><option>기타</option></select></label><label class="field">자세한 내용<textarea name="detail" rows="5" minlength="5" maxlength="2000" required placeholder="어떤 일이 있었는지 구체적으로 알려주세요."></textarea></label><p class="field-hint">신고는 운영진에게 접수됩니다.</p><button type="submit" class="button full">신고 접수</button></form>',
      (d) => {
        d.querySelector("#report-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (f.get("detail").trim().length < 5) {
            toast("신고 내용을 5자 이상 입력해 주세요.");
            return;
          }
          try {
            await Store.mutate("report", {
              peerId,
              auctionId,
              reason: f.get("reason"),
              detail: f.get("detail").trim(),
            });
          } catch (error) {
            toast(error.message);
            return;
          }
          UI.close();
          toast("신고를 접수했어요.");
        };
      },
    );
  },
  block(peerId, after) {
    if (peerId === "me") return;
    const blocked = Store.isBlocked(peerId),
      peer = Store.member(peerId);
    UI.confirm(
      blocked ? "차단을 해제할까요?" : "사용자를 차단할까요?",
      blocked
        ? "다시 상품을 보고 메시지를 보낼 수 있어요."
        : (peer?.name || "상대방") +
            "님의 상품과 신규 연락을 차단합니다. 기존 대화와 거래 기록은 유지됩니다.",
      async () => {
        await Store.mutate("block", { id: peerId, blocked: !blocked });
        after?.();
        toast(blocked ? "차단을 해제했어요." : "사용자를 차단했어요.");
      },
      blocked ? "차단 해제" : "차단",
    );
  },
  blockedList() {
    UI.open(
      "차단한 사용자",
      Store.data.blocked.length
        ? Store.data.blocked
            .map(
              (id) =>
                '<div class="option-row"><strong>' +
                esc(Store.member(id)?.name || "사용자") +
                '</strong><button class="text-button" data-unblock="' +
                esc(id) +
                '">해제</button></div>',
            )
            .join("")
        : empty(
            "차단한 사용자가 없어요",
            "불편한 상대는 프로필이나 채팅에서 차단할 수 있어요.",
          ),
      (d) => {
        d.querySelectorAll("[data-unblock]").forEach(
          (b) =>
            (b.onclick = () =>
              attempt(async () => {
                await Store.mutate("block", {
                  id: b.dataset.unblock,
                  blocked: false,
                });
                this.blockedList();
              })),
        );
      },
    );
  },
};
