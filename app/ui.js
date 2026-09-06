const UI = {
  dialog: null,
  open(title, body, onReady) {
    this.close();
    const d = document.createElement("dialog");
    d.className = "sheet";
    d.innerHTML =
      '<div class="sheet-header"><h2>' +
      esc(title) +
      '</h2><button class="icon-button" data-close aria-label="닫기">' +
      icon("close") +
      '</button></div><div class="sheet-body">' +
      body +
      "</div>";
    document.body.append(d);
    this.dialog = d;
    d.querySelector("[data-close]").onclick = () => this.close();
    d.addEventListener("click", (e) => {
      if (e.target === d) this.close();
    });
    d.addEventListener("close", () => {
      d.remove();
      if (this.dialog === d) this.dialog = null;
    });
    d.showModal();
    onReady?.(d);
    return d;
  },
  close() {
    const dialog = this.dialog;
    if (dialog) {
      this.dialog = null;
      dialog.close();
      dialog.remove();
    }
  },
  confirm(title, text, action, label = "확인") {
    this.open(
      title,
      '<p class="muted">' +
        esc(text) +
        '</p><div class="button-row"><button class="button secondary" id="cancel-action">취소</button><button class="button" id="confirm-action">' +
        esc(label) +
        "</button></div>",
      (d) => {
        d.querySelector("#cancel-action").onclick = () => this.close();
        d.querySelector("#confirm-action").onclick = () =>
          attempt(() => {
            action();
            this.close();
          });
      },
    );
  },
  header(title, extra = "", back = false) {
    return (
      '<header class="page-header"><div class="heading-row">' +
      (back
        ? '<button class="icon-button" data-back aria-label="뒤로">' +
          icon("back") +
          "</button>"
        : "") +
      "<h1>" +
      esc(title) +
      "</h1></div>" +
      extra +
      "</header>"
    );
  },
  bindBack(root) {
    root
      .querySelector("[data-back]")
      ?.addEventListener("click", () => Nav.back());
  },
  cards(items, { ranking = false } = {}) {
    return items
      .map((a, i) => {
        const liked = Store.data.likes.includes(a.id);
        return (
          '<article class="product-card"><button class="product-image" data-product="' +
          a.id +
          '" aria-label="' +
          esc(a.title) +
          ' 상세 보기"><img src="' +
          esc(a.images[0]) +
          '" alt="' +
          esc(a.title) +
          '" loading="lazy">' +
          (ranking ? '<span class="rank-badge">' + (i + 1) + "</span>" : "") +
          '<span class="time-badge ' +
          (a.endTime - Date.now() < 3600000 ? "urgent" : "") +
          '" data-timer="' +
          a.id +
          '">' +
          (a.status === "active"
            ? remaining(a.endTime)
            : a.status === "unsold"
              ? "유찰"
              : "경매 종료") +
          '</span></button><button class="card-heart ' +
          (liked ? "liked" : "") +
          '" data-like="' +
          a.id +
          '" aria-label="' +
          (liked ? "찜 해제" : "찜하기") +
          '" aria-pressed="' +
          liked +
          '">' +
          icon("heart") +
          '</button><div class="product-body"><p class="product-meta">' +
          esc(a.location) +
          " · " +
          esc(a.condition) +
          '</p><button class="product-title" data-product="' +
          a.id +
          '">' +
          esc(a.title) +
          '</button><div class="product-price">' +
          money(a.currentPrice) +
          "<span>" +
          (a.bidsCount ? "현재가" : "시작가") +
          '</span></div><div class="product-stats"><span>입찰 ' +
          a.bidsCount +
          "</span><span>관심 " +
          a.likes +
          "</span>" +
          (a.sellerId === "me"
            ? '<span class="text-green">내 상품</span>'
            : "") +
          "</div></div></article>"
        );
      })
      .join("");
  },
  bindCards(root) {
    root
      .querySelectorAll("[data-product]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            Nav.go("detail", { id: Number(b.dataset.product) })),
      );
    root.querySelectorAll("[data-like]").forEach(
      (b) =>
        (b.onclick = () => {
          const liked = Store.like(b.dataset.like);
          b.classList.toggle("liked", liked);
          b.setAttribute("aria-pressed", liked);
          b.setAttribute("aria-label", liked ? "찜 해제" : "찜하기");
          if (Nav.current === "likes") LikesView.render();
        }),
    );
  },
};
