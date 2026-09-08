const ChatView = {
  active: null,
  render({ id } = {}) {
    if (id) this.active = id;
    const root = document.getElementById("view-chat"),
      rooms = Store.data.chats;
    let room = rooms.find((c) => c.id === this.active);
    root.innerHTML =
      UI.header(
        "채팅",
        '<span class="muted small">상품 이야기부터 거래 약속까지</span>',
      ) +
      '<div class="chat-layout ' +
      (room ? "has-room" : "") +
      '"><aside class="chat-list"><h2>메시지 <span>' +
      rooms.length +
      "</span></h2>" +
      rooms
        .map((c) => {
          const m = Store.member(c.peerId),
            a = Store.auction(c.auctionId),
            last = c.messages.at(-1);
          return (
            '<button class="chat-list-item ' +
            (c.id === this.active ? "active" : "") +
            '" data-room="' +
            c.id +
            '"><span class="avatar">' +
            (m?.avatar
              ? '<img src="' + esc(m.avatar) + '" alt="">'
              : icon("user")) +
            '</span><span class="chat-list-copy"><strong>' +
            esc(m?.name || "거래 상대") +
            "<small>" +
            (last ? ago(last.at) : "") +
            "</small></strong><span>" +
            esc(
              Store.isBlocked(c.peerId)
                ? "차단한 사용자"
                : last?.text || "대화를 시작해 보세요.",
            ) +
            "</span></span>" +
            (c.unread ? '<i class="unread-dot"></i>' : "") +
            '<img class="chat-list-product" src="' +
            esc(a?.images[0] || "") +
            '" alt=""></button>'
          );
        })
        .join("") +
      (rooms.length
        ? ""
        : empty(
            "아직 대화가 없어요",
            "상품 상세에서 판매자에게 문의해 보세요.",
          )) +
      '</aside><section class="chat-room" id="chat-room">' +
      (room
        ? this.roomHTML(room)
        : '<div class="chat-welcome">' +
          icon("chat") +
          "<h2>대화를 시작해 보세요</h2><p>왼쪽에서 대화를 선택하거나<br>상품 상세에서 판매자에게 문의해 주세요.</p></div>") +
      "</section></div>";
    root.querySelectorAll("[data-room]").forEach(
      (b) =>
        (b.onclick = () => {
          this.active = b.dataset.room;
          Nav.params = { id: this.active };
          this.render(Nav.params);
        }),
    );
    if (!room) return;
    if (room.unread) {
      attempt(() => Store.mutate("readRoom", { id: room.id }));
    }
    const blocked = Store.isBlocked(room.peerId);
    root.querySelector("#chat-back").onclick = () => {
      this.active = null;
      Nav.params = {};
      this.render();
    };
    root.querySelector("#chat-seller").onclick = () =>
      Nav.go("seller", { id: room.peerId });
    root.querySelector("#chat-report").onclick = () =>
      Safety.report(room.peerId, room.auctionId);
    root.querySelector("#chat-block").onclick = () =>
      Safety.block(room.peerId, () => this.render({ id: room.id }));
    root.querySelector("#chat-product").onclick = () =>
      Nav.go("detail", { id: room.auctionId });
    root.querySelector("#message-form").onsubmit = (e) => {
      e.preventDefault();
      const input = root.querySelector("#message-input");
      attempt(async () => {
        const key =
          this.pending?.text === input.value && this.pending?.roomId === room.id
            ? this.pending.id
            : uid();
        this.pending = { id: key, text: input.value, roomId: room.id };
        await Store.send(room.id, input.value, "text", key);
        this.pending = null;
        input.value = "";
        this.render({ id: room.id });
        root.querySelector("#message-input")?.focus();
      });
    };
    root.querySelector("#message-input").oncompositionstart = () => {
      Live.composing = true;
    };
    root.querySelector("#message-input").oncompositionend = () => {
      Live.composing = false;
    };
    root.querySelector("#share-account").onclick = () => this.account(room);
    const messages = root.querySelector("#message-list");
    messages.scrollTop = messages.scrollHeight;
  },
  roomHTML(room) {
    const m = Store.member(room.peerId),
      a = Store.auction(room.auctionId),
      blocked = Store.isBlocked(room.peerId);
    return (
      '<header class="chat-room-header"><button class="icon-button mobile-only" id="chat-back" aria-label="대화 목록">' +
      icon("back") +
      '</button><button class="chat-peer" id="chat-seller"><strong>' +
      esc(m.name) +
      "</strong><span>" +
      esc(blocked ? "차단한 사용자" : presence(m)) +
      '</span></button><button class="icon-button" id="chat-report" aria-label="대화 신고">' +
      icon("flag") +
      '</button><button class="text-button" id="chat-block">' +
      (blocked ? "차단 해제" : "차단") +
      '</button></header><button class="chat-product" id="chat-product"><img src="' +
      esc(a.images[0]) +
      '" alt=""><span><strong>' +
      esc(a.title) +
      "</strong><b>" +
      money(a.currentPrice) +
      "</b></span>" +
      icon("arrow") +
      "</button>" +
      (isDnd(m)
        ? '<div class="quiet-banner">' +
          icon("moon") +
          "현재 시간은 상대방이 지정한 방해금지 시간입니다.</div>"
        : "") +
      '<div class="message-list" id="message-list"><p class="chat-date">상품과 거래 약속을 이 대화에서 확인해 주세요.</p>' +
      room.messages
        .map(
          (msg) =>
            '<div class="message-row ' +
            (msg.mine ? "mine" : "") +
            '"><div class="message-bubble ' +
            (msg.kind === "account" ? "account-bubble" : "") +
            '">' +
            (msg.kind === "account"
              ? "<strong>" + icon("shield") + "계좌 정보</strong>"
              : "") +
            "<p>" +
            esc(msg.text) +
            "</p>" +
            '</div><span class="message-time">' +
            new Date(msg.at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }) +
            "</span></div>",
        )
        .join("") +
      '</div><div class="chat-compose"><div class="chat-tools"><button class="text-button" id="share-account" ' +
      (blocked ? "disabled" : "") +
      ">" +
      icon("plus") +
      '계좌 전달</button></div><form id="message-form"><label class="sr-only" for="message-input">메시지</label><input id="message-input" maxlength="2000" autocomplete="off" placeholder="' +
      (blocked
        ? "차단을 해제하면 메시지를 보낼 수 있어요."
        : "메시지를 입력해 주세요.") +
      '" ' +
      (blocked ? "disabled" : "") +
      ' required><button class="send-button" type="submit" aria-label="메시지 보내기" ' +
      (blocked ? "disabled" : "") +
      ">" +
      icon("send") +
      "</button></form></div>"
    );
  },
  account(room) {
    UI.open(
      "계좌 정보 전달",
      '<div class="notice">' +
        icon("shield") +
        '<p>계좌 정보는 이 대화 상대방에게 전달됩니다. 예금주와 거래 내용을 확인해 주세요.</p></div><form id="account-share-form"><label class="field">은행<input name="bank" maxlength="30" required placeholder="은행명"></label><label class="field">계좌번호<input name="number" maxlength="30" inputmode="numeric" required placeholder="000-0000-0000"></label><label class="field">예금주<input name="holder" maxlength="30" required placeholder="예금주"></label><button class="button full" type="submit">대화방에 전달</button></form>',
      (d) => {
        d.querySelector("#account-share-form").onsubmit = (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          attempt(async () => {
            await Store.mutate("send", {
              id: room.id,
              text: "계좌 정보",
              kind: "account",
              requestId: uid(),
              bank: f.get("bank"),
              number: f.get("number"),
              holder: f.get("holder"),
            });
            UI.close();
            this.render({ id: room.id });
          });
        };
      },
    );
  },
};
