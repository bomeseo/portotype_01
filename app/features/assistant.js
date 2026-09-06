const Assistant = {
  context() {
    const room =
      Nav.current === "chat"
        ? Store.data.chats.find((c) => c.id === ChatView.active)
        : null;
    const trade =
      Nav.current === "trade"
        ? Store.data.trades.find((t) => t.id === Nav.params.id)
        : room
          ? Store.data.trades.find((t) =>
              room.tradeId
                ? t.id === room.tradeId
                : t.auctionId === room.auctionId,
            )
          : null;
    const auction = Store.auction(
      trade?.auctionId ||
        room?.auctionId ||
        (Nav.current === "detail" ? Nav.params.id : 0),
    );
    return { auction, trade, room, listing: Nav.current === "create" };
  },
  questions(a) {
    const common = [
      "사용 기간과 눈에 띄는 흠집이 있나요?",
      "사진에 나온 구성품이 모두 포함되나요?",
      "직거래 때 작동과 상태를 확인해도 될까요?",
    ];
    if (a?.category === "digital")
      common.unshift("배터리 상태와 주요 기능의 작동 여부를 알려주세요.");
    if (a?.category === "camera")
      common.unshift("렌즈 곰팡이·센서 먼지와 촬영 기능에 이상이 있나요?");
    if (a?.category === "fashion")
      common.unshift("실측 사이즈와 오염·수선 여부를 알려주세요.");
    if (a?.category === "collect")
      common.unshift("정품 확인 자료와 보관 상태를 볼 수 있을까요?");
    return common;
  },
  draftQuestion(a, text) {
    Membership.require(() =>
      attempt(() => {
        const trade = Store.data.trades.find((t) => t.auctionId === a.id);
        const room = trade ? Journey.room(trade.id) : Store.chat(a.id);
        Nav.go("chat", { id: room.id });
        document.getElementById("message-input").value = text;
        document.getElementById("message-input").focus();
        toast("질문 초안을 넣었어요. 확인한 뒤 직접 보내주세요.");
      }),
    );
  },
  open() {
    const c = this.context(),
      a = c.auction,
      t = c.trade;
    const m = a ? Store.member(a.sellerId) : null;
    const checklist = a
      ? [
          [a.condition, "상품 상태"],
          [a.flaws, "하자·수리 이력"],
          [a.components, "구성품"],
          [a.location, "거래 지역"],
        ]
          .map(
            ([value, label]) =>
              "<li>" +
              label +
              ": " +
              (value ? esc(value) : "<strong>판매자에게 확인 필요</strong>") +
              "</li>",
          )
          .join("")
      : "";
    UI.open(
      "거래 도우미",
      '<p class="field-hint">현재 화면에 맞춘 규칙·문구 기반 도우미입니다. 실제 AI나 사기 조회 서비스는 연결 전입니다.</p>' +
        (a
          ? '<div class="assistant-context"><span class="tag">' +
            (t ? esc(t.status) : "상품 확인 중") +
            "</span><h3>" +
            esc(a.title) +
            "</h3>" +
            "<p>" +
            esc(m?.name || "판매자") +
            " · " +
            (m?.verified ? "데모 연락처 인증" : "연락처 미인증") +
            "</p><p>인증과 신고 이력만으로 안전한 거래를 보장할 수 없어요.</p></div>"
          : "<h3>" +
            (c.listing
              ? "상품 설명을 빠짐없이 준비해요"
              : "지금 필요한 도움을 골라보세요") +
            "</h3>") +
        (t
          ? '<div class="notice"><p>' +
            esc(this.tradeHint(t)) +
            '</p></div><button class="button secondary full" id="assistant-trade">거래 진행 화면으로</button>'
          : "") +
        (a
          ? '<details open><summary>입찰 전 확인할 정보</summary><ul class="assistant-checklist">' +
            checklist +
            '</ul></details><h3>판매자에게 물어보기</h3><div class="stack-actions">' +
            this.questions(a)
              .map(
                (q, i) =>
                  '<button class="option-row" data-question="' +
                  i +
                  '">' +
                  q +
                  "</button>",
              )
              .join("") +
            "</div>" +
            '<h3>내 예산 계산</h3><form id="budget-form"><label class="field">배송비 포함 최대 예산 (원)<input name="budget" type="number" min="1000" max="1000000000" required value="' +
            (a.currentPrice + a.minStep + a.shippingFee) +
            '"></label><button class="button secondary" type="submit">입찰 가능한 금액 계산</button><p id="budget-result" role="status"></p></form>'
          : "") +
        (c.listing
          ? '<p>현재 입력한 상품 정보를 바탕으로 편집 가능한 설명 틀을 만들어드려요. 모르는 상태를 임의로 채우지 않습니다.</p><button class="button secondary full" id="assistant-description">상품 설명 틀 넣기</button>'
          : "") +
        '<div class="stack-actions"><button class="option-row" id="assistant-risk">송금 요청이 불안해요</button><button class="option-row" id="assistant-tour">처음 거래 따라하기</button><button class="option-row" id="assistant-preferences">관심사·가입 정보 바꾸기</button></div><label class="field">추가로 궁금한 상황<textarea id="assistant-question" maxlength="1000" placeholder="상황을 적으면 고객센터 문의 초안에 함께 담아드려요."></textarea></label><button class="button full" id="assistant-escalate">상황을 담아 고객센터 문의</button>',
      (d) => {
        d.querySelectorAll("[data-question]").forEach(
          (b) =>
            (b.onclick = () =>
              this.draftQuestion(
                a,
                this.questions(a)[Number(b.dataset.question)],
              )),
        );
        d.querySelector("#assistant-trade")?.addEventListener("click", () =>
          Nav.go("trade", { id: t.id }),
        );
        d.querySelector("#budget-form")?.addEventListener("submit", (e) => {
          e.preventDefault();
          const budget = Number(new FormData(e.target).get("budget")),
            fee = a.method === "직거래" ? 0 : a.shippingFee;
          const min = a.bidsCount
            ? a.currentPrice + a.minStep
            : a.startingPrice;
          const ceiling =
            min + Math.floor((budget - fee - min) / a.minStep) * a.minStep;
          d.querySelector("#budget-result").textContent =
            ceiling < min
              ? "배송비를 포함하면 최소 입찰 금액에 부족해요."
              : "입찰 단위에 맞춘 최대 " +
                money(ceiling) +
                " · 배송비 " +
                money(fee) +
                " 포함 합계 " +
                money(ceiling + fee) +
                ". 시세 평가나 자동 입찰은 하지 않아요.";
        });
        d.querySelector("#assistant-description")?.addEventListener(
          "click",
          () => {
            const form = document.getElementById("product-form"),
              v = Object.fromEntries(new FormData(form));
            const text = [
              v.title || "[상품명]",
              "사용 기간: [직접 입력]",
              "상품 상태: " + v.condition,
              "하자·수리 이력: " + (v.flaws || "[직접 확인 후 입력]"),
              "구성품: " + (v.components || "[직접 입력]"),
              "거래: " + v.method + " / " + v.location,
            ].join("\n");
            UI.open(
              "상품 설명 초안",
              '<label class="field">확인하고 고쳐주세요<textarea id="description-draft" rows="9">' +
                esc(text) +
                '</textarea></label><p class="field-hint">적용하면 현재 설명을 바꿉니다. 실제 상태를 확인해 빈칸을 채워주세요.</p><button class="button" id="apply-description">설명에 적용</button>',
              (dialog) => {
                dialog.querySelector("#apply-description").onclick = () => {
                  form.elements.description.value =
                    dialog.querySelector("#description-draft").value;
                  Listing.capture();
                  UI.close();
                  toast("설명 초안을 적용했어요.");
                };
              },
            );
          },
        );
        d.querySelector("#assistant-risk").onclick = () => this.risk(a, t);
        d.querySelector("#assistant-tour").onclick = () =>
          Membership.require(() => Tutorial.start());
        d.querySelector("#assistant-preferences").onclick = () =>
          Onboarding.start(true);
        d.querySelector("#assistant-escalate").onclick = () =>
          SupportView.contact({
            title: t ? "거래 진행 문의" : a ? "상품 거래 문의" : "이용 문의",
            body: [
              a ? "상품: " + a.title : "",
              t ? "거래 상태: " + t.status : "",
              "문의: " + d.querySelector("#assistant-question").value,
            ]
              .filter(Boolean)
              .join("\n"),
          });
      },
    );
  },
  tradeHint(t) {
    return (
      {
        "협의 중":
          "거래 방식·장소·시간·배송비를 약속에 남기고 상대 확인을 받아주세요.",
        "송금 표시":
          "구매자가 송금했다고 표시한 상태입니다. 판매자는 자신의 입금 내역을 직접 확인해야 합니다.",
        "입금 확인":
          "판매자가 입금을 확인한 상태입니다. 상품을 전달한 뒤 전달 또는 배송 기록을 남겨주세요.",
        "전달·배송 중":
          "구매자는 상품을 실제로 받고 상태·구성품을 확인한 다음 수령 확인을 눌러주세요.",
        "거래 완료":
          "이번 거래의 후기를 남겨주세요. 뒤늦게 발견한 문제는 문제 접수로 남길 수 있어요.",
        "취소 요청":
          "취소 요청 검토 중입니다. 거래 진행을 보류하고 채팅 기록을 남겨주세요.",
        "문제 접수":
          "문제 내용을 접수했습니다. 처리 내역은 고객센터와 이 거래에서 확인할 수 있어요.",
        "취소 완료": "취소된 데모 거래입니다. 실제 환불은 발생하지 않습니다.",
      }[t.status] || "거래 약속과 상대방의 확인 상태를 살펴보세요."
    );
  },
  risk(a, t) {
    UI.open(
      "송금 전에 다시 확인해 주세요",
      '<ul class="assistant-checklist"><li>상품 사진·상태·구성품에 대한 답변을 받았나요?</li><li>합의한 금액·배송비와 예금주 정보를 다시 확인했나요?</li><li>외부 링크나 추가 송금을 서둘러 요구하나요?</li><li>의심이 풀리지 않았다면 송금을 멈추고 대화 기록을 남겨주세요.</li></ul><p class="field-hint">도우미는 사기 여부를 판정하거나 안전을 보증하지 않습니다.</p><div class="button-row">' +
        (a && a.sellerId !== "me"
          ? '<button class="button secondary" id="risk-report">상대 신고</button>'
          : "") +
        (t
          ? '<button class="button" id="risk-issue">거래 문제 접수</button>'
          : '<button class="button" id="risk-contact">고객센터 문의</button>') +
        "</div>",
      (d) => {
        d.querySelector("#risk-report")?.addEventListener("click", () =>
          Safety.report(a.sellerId, a.id),
        );
        d.querySelector("#risk-issue")?.addEventListener("click", () =>
          TradeView.issue(t.id, "문제 접수"),
        );
        d.querySelector("#risk-contact")?.addEventListener("click", () =>
          SupportView.contact({
            title: "송금 전 확인 문의",
            body: a ? "상품: " + a.title + "\n우려되는 상황: " : "",
          }),
        );
      },
    );
  },
  chatTools() {
    const tools = document.querySelector("#view-chat .chat-tools");
    if (!tools || document.getElementById("chat-assistant")) return;
    const b = document.createElement("button");
    b.id = "chat-assistant";
    b.className = "text-button";
    b.textContent = "질문·거래 도우미";
    b.onclick = () => this.open();
    tools.append(b);
    const room = Store.data.chats.find((c) => c.id === ChatView.active);
    const t = Store.data.trades.find((t) =>
      room?.tradeId ? t.id === room.tradeId : t.auctionId === room?.auctionId,
    );
    if (t) {
      const b = document.createElement("button");
      b.className = "text-button";
      b.textContent = "거래 진행";
      b.onclick = () => Nav.go("trade", { id: t.id });
      tools.append(b);
    }
  },
};
