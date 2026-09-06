const TradeView = {
  render({ id } = {}) {
    const root = document.getElementById("view-trade");
    let t;
    try {
      t = Journey.get(id);
    } catch {
      root.innerHTML =
        UI.header("거래") +
        empty(
          "거래를 찾을 수 없어요",
          "내 정보의 거래 내역에서 다시 선택해 주세요.",
        );
      return;
    }
    const agreement = t.agreement,
      held = ["취소 요청", "문제 접수"].includes(t.status);
    const index = Journey.flow.indexOf(t.status);
    const actor = ["buyer", "seller", "seller", "buyer"][index];
    const label = [
      "송금했다고 표시",
      "입금 내역 직접 확인",
      "전달·배송 정보 남기기",
      "상품 수령·상태 확인",
    ][index];
    root.innerHTML =
      UI.header(
        "거래 진행",
        '<span class="tag">' +
          (t.role === "buyer" ? "구매자" : "판매자") +
          "로 진행 중</span>",
        true,
      ) +
      '<div class="transaction-layout"><section class="form-card"><span class="tag green">' +
      esc(t.status) +
      "</span><h2>" +
      esc(t.title) +
      '</h2><p class="trade-amount">' +
      money(t.amount) +
      '</p><p class="field-hint">낙찰가 · 배송비 ' +
      (agreement ? money(agreement.fee) : "약속 작성 시 확정") +
      '</p><ol class="transaction-steps">' +
      Journey.flow
        .map(
          (s, i) =>
            '<li class="' + (i <= index ? "done" : "") + '">' + s + "</li>",
        )
        .join("") +
      '</ol><div class="notice"><p>실제 결제·대금 보관·배송 조회는 연결되지 않았습니다. 송금 표시와 판매자의 입금 확인을 별도로 체험합니다.</p></div>' +
      (t.status === "협의 중"
        ? '<form id="agreement-form"><h3>거래 약속</h3><label class="field">방식<select name="method"><option ' +
          (agreement?.method === "직거래" ? "selected" : "") +
          ">직거래</option><option " +
          (agreement?.method === "택배" ? "selected" : "") +
          '>택배</option></select></label><label class="field">만날 장소 / 택배 수령 방법<input name="place" maxlength="120" value="' +
          esc(agreement?.place || "") +
          '" placeholder="예: 성수역 2번 출구, 편의점 택배" required></label><label class="field">만날 시간 / 발송 예정 · 한국 시간<input name="when" type="datetime-local" value="' +
          esc(agreement?.when || "") +
          '" required></label><label class="field">구매자 부담 배송비 (원)<input name="fee" type="number" min="0" max="100000" value="' +
          (agreement?.fee || 0) +
          '" required></label><button class="button secondary" type="submit">약속 저장</button></form>'
        : "") +
      (agreement
        ? '<div class="agreement-summary"><h3>약속 내용</h3><p>' +
          esc(agreement.method + " · " + agreement.place) +
          "</p><p>" +
          esc(agreement.when.replace("T", " ")) +
          " (한국 시간)</p><strong>거래 합계 " +
          money(t.amount + agreement.fee) +
          "</strong><p>" +
          (agreement.accepted ? "양측 확인 완료 · 데모" : "상대방 확인 대기") +
          "</p>" +
          (!agreement.accepted && t.status === "협의 중"
            ? '<button class="button secondary" id="agreement-accept">데모: 상대방 약속 확인</button>'
            : "") +
          "</div>"
        : "") +
      (t.delivery
        ? '<p class="notice preserve-lines">전달 기록: ' +
          esc(t.delivery) +
          "</p>"
        : "") +
      (held
        ? '<div class="notice"><p>' +
          esc(t.issue?.reason || "") +
          '</p></div><p>요청을 검토하는 동안 진행이 보류됩니다. 아래는 운영 검토 결과를 체험하는 버튼입니다.</p><div class="button-row"><button class="button secondary" data-resolve="resume">데모: 협의 후 재개</button><button class="button secondary" data-resolve="cancel">데모: 취소 처리</button></div>'
        : actor
          ? '<button class="button full" id="trade-next" ' +
            (!agreement?.accepted ? "disabled" : "") +
            ">" +
            (actor === t.role ? "" : "데모 상대방: ") +
            label +
            "</button>"
          : t.status === "거래 완료"
            ? '<button class="button full" id="trade-review" ' +
              (Store.data.reviews.some((r) => r.tradeId === id)
                ? "disabled"
                : "") +
              ">후기 남기기</button>"
            : "<p>취소된 거래입니다. 실제 환불 처리는 발생하지 않습니다.</p>") +
      '<p class="inline-error" id="trade-error" role="alert"></p></section><aside class="form-card"><h3>다음 행동이 궁금할 때</h3><div class="stack-actions"><button class="button secondary" id="trade-chat">거래 채팅 열기</button><button class="button secondary" id="trade-help">이 거래의 도우미</button>' +
      (!held && t.status !== "취소 완료"
        ? '<button class="text-button" data-issue="문제 접수">미입금·노쇼·상품 문제 접수</button>' +
          (t.status !== "거래 완료"
            ? '<button class="text-button" data-issue="취소 요청">거래 취소 요청</button>'
            : "")
        : "") +
      '</div><h3>거래 기록</h3><ul class="transaction-log">' +
      (t.timeline.length
        ? t.timeline
            .map(
              (l) =>
                "<li>" + esc(l.text) + "<small>" + day(l.at) + "</small></li>",
            )
            .join("")
        : "<li>약속을 정하면 진행 기록이 여기에 남아요.</li>") +
      "</ul></aside></div>";
    UI.bindBack(root);
    const act = (fn) => {
      try {
        fn();
        this.render({ id });
        Tutorial.refresh();
      } catch (e) {
        root.querySelector("#trade-error").textContent = e.message;
      }
    };
    root.querySelector("#agreement-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      act(() => Journey.agree(id, Object.fromEntries(new FormData(e.target))));
    });
    root
      .querySelector("#agreement-accept")
      ?.addEventListener("click", () => act(() => Journey.accept(id)));
    root.querySelector("#trade-chat").onclick = () =>
      Nav.go("chat", { id: Journey.room(id).id });
    root.querySelector("#trade-help").onclick = () => Assistant.open();
    root
      .querySelector("#trade-review")
      ?.addEventListener("click", () => Trades.review(id));
    root
      .querySelectorAll("[data-resolve]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            UI.confirm(
              "검토 결과 체험",
              "이 브라우저의 거래 상태만 변경합니다. 실제 운영자 판단이나 환불이 아닙니다.",
              () => act(() => Journey.resolve(id, b.dataset.resolve)),
            )),
      );
    root
      .querySelectorAll("[data-issue]")
      .forEach((b) => (b.onclick = () => this.issue(id, b.dataset.issue)));
    root.querySelector("#trade-next")?.addEventListener("click", () => {
      if (t.status === "입금 확인") {
        UI.open(
          "전달·배송 기록",
          '<form id="delivery-form"><label class="field">직거래 전달 장소 / 택배사·운송장<textarea name="delivery" maxlength="300" required placeholder="테스트 운송장이나 전달 내용을 입력해 주세요."></textarea></label><button class="button" type="submit">기록하고 진행</button></form>',
          (d) => {
            d.querySelector("#delivery-form").onsubmit = (e) => {
              e.preventDefault();
              try {
                Journey.next(id, actor, new FormData(e.target).get("delivery"));
                UI.close();
                this.render({ id });
                Tutorial.refresh();
              } catch (err) {
                toast(err.message);
              }
            };
          },
        );
      } else
        UI.confirm(
          label,
          actor === t.role
            ? "해당 내용을 직접 확인했을 때만 진행해 주세요. 실제 이체나 자동 입금 확인은 발생하지 않습니다."
            : "상대방이 직접 확인한 상황을 체험합니다. 실제 상대가 응답한 것은 아닙니다.",
          () => act(() => Journey.next(id, actor)),
        );
    });
  },
  issue(id, type) {
    UI.open(
      type,
      '<form id="issue-form"><label class="field">사유<select name="reason"><option>거래 조건 협의 불가</option><option>미입금</option><option>연락 두절·노쇼</option><option>설명과 다른 상품</option><option>기타</option></select></label><label class="field">상황과 확인 가능한 기록<textarea name="detail" minlength="5" maxlength="2000" required placeholder="언제 어떤 일이 있었는지 적어주세요. 실제 계좌·전화번호는 입력하지 마세요."></textarea></label><button class="button" type="submit">요청 접수</button></form>',
      (d) => {
        d.querySelector("#issue-form").onsubmit = (e) => {
          e.preventDefault();
          attempt(() => {
            const v = new FormData(e.target);
            if (v.get("detail").trim().length < 5)
              throw new Error("상황을 5자 이상 적어주세요.");
            Journey.issue(id, type, v.get("reason") + ": " + v.get("detail"));
            UI.close();
            Nav.go("trade", { id });
          });
        };
      },
    );
  },
};
