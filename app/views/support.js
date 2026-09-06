const SupportView = {
  faqs: [
    {
      q: "경매는 어떻게 참여하나요?",
      a: "내 정보에서 데모 전화번호를 인증한 뒤 상품의 입찰하기를 눌러주세요. 입찰 금액은 정해진 단위에 맞춰야 하며, 입찰자 정보는 공개되지 않습니다.",
    },
    {
      q: "낙찰된 다음에는 어떻게 하나요?",
      a: "내 정보의 거래 내역에서 낙찰 상품을 확인하고 판매자와 채팅으로 거래를 협의하세요. 이 프로토타입은 실제 결제나 대금 보관 기능이 없습니다.",
    },
    {
      q: "판매 상품을 수정하거나 삭제하고 싶어요.",
      a: "내 정보 → 내 판매 → 상품 상세에서 수정·삭제할 수 있습니다. 입찰이 시작된 상품의 조건은 바꿀 수 없으니 고객센터로 취소를 요청해 주세요.",
    },
    {
      q: "사기가 의심되면 어떻게 하나요?",
      a: "상품·판매자 프로필·채팅의 신고 버튼으로 상황을 남겨주세요. 계좌이체를 서두르지 말고 상품과 상대 정보를 확인하세요. 데모 신고는 실제 운영자나 기관에 전송되지 않습니다.",
    },
    {
      q: "밤에는 알림을 받고 싶지 않아요.",
      a: "내 정보 → 방해금지 시간에서 설정할 수 있습니다. 지정한 시간에는 앱 안 알림만 저장하고 상대에게 안내 문구를 보여줍니다. 실제 문자·푸시는 발송하지 않습니다.",
    },
  ],
  render() {
    const root = document.getElementById("view-support");
    root.innerHTML =
      UI.header("고객센터", "", true) +
      '<div class="support-layout"><section><p class="eyebrow">도움이 필요하신가요?</p><h2 class="support-title">편하게 물어보세요.</h2><p class="muted">거래 중 생긴 궁금한 점부터 불편한 경험까지.</p><div class="faq-list">' +
      this.faqs
        .map(
          (f) =>
            "<details><summary>" +
            esc(f.q) +
            icon("plus") +
            "</summary><p>" +
            esc(f.a) +
            "</p></details>",
        )
        .join("") +
      '<div class="section-heading"><h2>내 문의와 신고</h2></div><div id="support-history">' +
      this.historyHTML() +
      '</div></section><aside><div class="contact-card">' +
      icon("chat") +
      '<h3>1:1 문의</h3><p>거래 상황을 자세히 남겨주세요.<br>문의 내용은 이 브라우저에 저장됩니다.</p><button class="button full" id="support-contact">문의 작성</button><small>데모 고객센터 · 실제 상담 미연결</small></div><div class="contact-card subdued">' +
      icon("help") +
      '<h3>거래 도우미</h3><p>자주 묻는 질문에 바로 답해드려요.</p><button class="button secondary full" id="support-assistant">도우미에게 물어보기</button></div></aside></div>';
    UI.bindBack(root);
    root.querySelector("#support-contact").onclick = () => this.contact();
    root.querySelector("#support-assistant").onclick = () => this.assistant();
    root
      .querySelectorAll("[data-ticket]")
      .forEach((b) => (b.onclick = () => this.ticket(b.dataset.ticket)));
  },
  historyHTML() {
    const tickets = Store.data.tickets.map((t) => ({ ...t, type: "문의" })),
      reports = Store.data.reports.map((r) => ({
        ...r,
        title: r.reason,
        body: r.detail,
        type: "신고",
      })),
      all = [...tickets, ...reports].sort((a, b) => b.at - a.at);
    return all.length
      ? all
          .map(
            (t) =>
              '<button class="option-row history-ticket" data-ticket="' +
              t.id +
              '"><span><small>' +
              t.type +
              " · " +
              day(t.at) +
              "</small><strong>" +
              esc(t.title) +
              '</strong></span><span class="tag">' +
              t.status +
              "</span>" +
              icon("arrow") +
              "</button>",
          )
          .join("")
      : empty(
          "접수한 문의가 없어요",
          "궁금한 점이 있으면 1:1 문의를 남겨주세요.",
        );
  },
  contact() {
    UI.open(
      "1:1 문의",
      '<form id="ticket-form"><label class="field">문의 유형<select name="type"><option>거래·입찰</option><option>계정·인증</option><option>신고·차단</option><option>기타</option></select></label><label class="field">제목<input name="title" maxlength="100" required placeholder="어떤 도움이 필요하신가요?"></label><label class="field">문의 내용<textarea name="body" rows="6" maxlength="3000" minlength="5" required placeholder="상품명과 상황을 함께 적어주세요."></textarea></label><p class="field-hint">실제 운영자에게 전송되지 않는 데모 문의입니다.</p><button class="button full" type="submit">문의 접수</button></form>',
      (d) => {
        d.querySelector("#ticket-form").onsubmit = (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (!f.get("title").trim() || f.get("body").trim().length < 5) {
            toast("제목과 5자 이상의 문의 내용을 입력해 주세요.");
            return;
          }
          Store.data.tickets.unshift({
            id: uid(),
            title: f.get("title").trim(),
            body: f.get("body").trim(),
            type: f.get("type"),
            status: "접수",
            at: Date.now(),
          });
          Store.save();
          UI.close();
          if (Nav.current === "support") this.render();
          toast("문의가 접수됐어요.");
        };
      },
    );
  },
  ticket(id) {
    const t =
      Store.data.tickets.find((t) => t.id === id) ||
      Store.data.reports.find((r) => r.id === id);
    if (!t) return;
    UI.open(
      "접수 내역",
      '<span class="tag">' +
        esc(t.status) +
        '</span><h3 class="form-section-title">' +
        esc(t.title || t.reason) +
        '</h3><p class="preserve-lines">' +
        esc(t.body || t.detail) +
        '</p><p class="field-hint">' +
        day(t.at) +
        ' 접수 · 데모 내역</p><div class="notice"><p>실제 운영자에게 전송되지 않았습니다. 아래 버튼으로 답변·검토 흐름을 체험할 수 있어요.</p></div>' +
        (t.status === "접수"
          ? '<button class="button secondary full" id="ticket-demo">데모 ' +
            (t.reason ? "검토 상태" : "답변") +
            " 보기</button>"
          : '<div class="notice"><p>' +
            esc(
              t.answer ||
                "신고 내용을 검토 중입니다. 신고 접수만으로 사기 확정이나 영구 제재를 하지 않습니다.",
            ) +
            "</p></div>"),
      (d) => {
        d.querySelector("#ticket-demo")?.addEventListener("click", () => {
          t.status = t.reason ? "검토 중" : "답변 완료";
          t.answer = t.reason
            ? null
            : "[데모 답변] 문의 내용을 확인했습니다. 거래의 상품 상세와 채팅 내용을 보관해 주세요. 추가로 필요한 내용이 있다면 새 문의를 남겨주세요.";
          Store.save();
          this.ticket(id);
          if (Nav.current === "support") this.render();
        });
      },
    );
  },
  notifications() {
    const items = Store.data.notifications;
    UI.open(
      "알림",
      '<div class="spread"><span class="muted small">' +
        (isDnd(Store.data.user)
          ? "방해금지 중 · 알림함에만 저장"
          : "내 경매와 거래 소식") +
        '</span><button class="text-button" id="read-all">모두 읽음</button></div><div class="notification-list">' +
        (items.length
          ? items
              .map(
                (n) =>
                  '<article class="notification-item ' +
                  (!n.read ? "unread" : "") +
                  '"><span class="notification-icon">' +
                  icon("bell") +
                  "</span><div><strong>" +
                  esc(n.title) +
                  "</strong><p>" +
                  esc(n.text) +
                  "</p><small>" +
                  ago(n.at) +
                  "</small></div></article>",
              )
              .join("")
          : empty(
              "새로운 알림이 없어요",
              "경매와 거래 소식을 여기에서 알려드려요.",
            )) +
        "</div>",
      (d) => {
        d.querySelector("#read-all").onclick = () => {
          items.forEach((n) => (n.read = true));
          Store.save();
          this.notifications();
        };
      },
    );
  },
  assistant() {
    UI.open(
      "거래 도우미",
      '<div class="assistant-intro"><span class="assistant-avatar">' +
        icon("bolt") +
        '</span><div><strong>무엇을 도와드릴까요?</strong><p>경매와 거래에 대해 편하게 물어보세요.</p></div></div><p class="field-hint">AI 연결 전, FAQ 기반으로 동작하는 데모 도우미입니다.</p><div class="assistant-prompts">' +
        [
          "입찰은 어떻게 해요?",
          "상품을 수정하고 싶어요",
          "사기가 의심돼요",
          "방해금지 설정",
        ]
          .map(
            (q) =>
              '<button class="chip" data-prompt="' + q + '">' + q + "</button>",
          )
          .join("") +
        '</div><div id="assistant-messages" class="assistant-messages" aria-live="polite"></div><form id="assistant-form" class="assistant-form"><label class="sr-only" for="assistant-input">도우미 질문</label><input id="assistant-input" placeholder="궁금한 내용을 입력해 주세요" maxlength="500" required><button class="send-button" aria-label="질문 보내기">' +
        icon("send") +
        '</button></form><button class="text-button full" id="assistant-escalate">해결되지 않았어요 · 고객센터 문의</button>',
      (d) => {
        const ask = (q) => {
          const f = /수정|삭제|등록/.test(q)
            ? this.faqs[2]
            : /사기|신고|차단/.test(q)
              ? this.faqs[3]
              : /방해|알림|밤/.test(q)
                ? this.faqs[4]
                : /낙찰|결제|송금|계좌/.test(q)
                  ? this.faqs[1]
                  : /입찰|인증|경매/.test(q)
                    ? this.faqs[0]
                    : null;
          const list = d.querySelector("#assistant-messages");
          list.insertAdjacentHTML(
            "beforeend",
            '<div class="assistant-question">' +
              esc(q) +
              '</div><div class="assistant-answer">' +
              esc(
                f?.a ||
                  "이 질문은 아직 안내하기 어려워요. 아래 고객센터 문의에 상황을 남겨주시면 문의 흐름을 체험할 수 있습니다.",
              ) +
              "</div>",
          );
          list.scrollTop = list.scrollHeight;
        };
        d.querySelectorAll("[data-prompt]").forEach(
          (b) => (b.onclick = () => ask(b.dataset.prompt)),
        );
        d.querySelector("#assistant-form").onsubmit = (e) => {
          e.preventDefault();
          const input = d.querySelector("#assistant-input");
          if (input.value.trim()) {
            ask(input.value.trim());
            input.value = "";
          }
        };
        d.querySelector("#assistant-escalate").onclick = () => this.contact();
      },
    );
  },
};
