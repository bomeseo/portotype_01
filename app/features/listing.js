/* Draft and review behavior wraps the existing photo/form editor. */
const Listing = {
  current: null,
  capture() {
    if (!this.current || Nav.current !== "create") return;
    const form = document.getElementById("product-form");
    if (!form) return;
    Store.data.drafts[this.current] = {
      values: Object.fromEntries(new FormData(form)),
      images: [...CreateView.images],
      at: Date.now(),
    };
    Store.save();
    const state = document.getElementById("draft-status");
    if (state)
      state.textContent = Store.storageWarning
        ? "저장 공간 부족 · 화면을 닫기 전에 사진을 줄여주세요."
        : "이 브라우저에 임시 저장됨";
  },
  mount(id) {
    const form = document.getElementById("product-form");
    if (!form) return;
    this.current = id ? "edit-" + id : "new";
    const a = id ? Store.auction(id) : null;
    const saved = Store.data.drafts[this.current];
    const extra = document.createElement("div");
    extra.innerHTML =
      '<h3 class="form-section-title">빠뜨리기 쉬운 거래 정보</h3><label class="field">하자·수리 이력<input name="flaws" maxlength="300" value="' +
      esc(a?.flaws || "") +
      '" placeholder="예: 오른쪽 모서리 흠집, 수리 이력 없음" required></label><label class="field">포함 구성품<input name="components" maxlength="300" value="' +
      esc(a?.components || "") +
      '" placeholder="예: 본품, 충전 케이블, 박스" required></label><label class="field">택배 거래 시 구매자 부담 배송비 (원)<input name="shippingFee" type="number" min="0" max="100000" value="' +
      (a?.shippingFee || 0) +
      '" required></label><p class="field-hint">직거래는 배송비 0원입니다. 택배 무료배송은 0원으로 입력해 주세요.</p>';
    form.insertBefore(extra, form.querySelector("#create-error"));
    const toolbar = document.createElement("div");
    toolbar.className = "draft-toolbar";
    toolbar.innerHTML =
      '<span id="draft-status" role="status">' +
      (saved
        ? "임시 저장한 내용을 불러왔어요"
        : "작성 중인 내용은 이 브라우저에 임시 저장됩니다") +
      '</span><div class="button-row"><button class="text-button" type="button" id="listing-help">설명 작성 도우미</button><button class="text-button" type="button" id="draft-save">임시 저장</button><button class="text-button" type="button" id="draft-delete">초안 삭제</button></div>';
    form.prepend(toolbar);
    if (saved) {
      const category = form.querySelector('[name="category"]');
      category.value = saved.values.category;
      category.onchange?.();
      for (const [name, value] of Object.entries(saved.values)) {
        const input = [...form.querySelectorAll("[name]")].find(
          (el) => el.name === name,
        );
        if (input) input.value = value;
      }
      CreateView.images = [...saved.images];
      CreateView.renderPhotos();
    }
    form.querySelector("#listing-help").onclick = () => Assistant.open();
    form.querySelector("#draft-save").onclick = () => this.capture();
    form.querySelector("#draft-delete").onclick = () =>
      UI.confirm(
        "초안을 지울까요?",
        "작성 중인 초안과 사진이 지워집니다. 이미 등록된 상품은 그대로입니다.",
        () => {
          delete Store.data.drafts[this.current];
          Store.save();
          this.current = null;
          CreateView.render({ id });
          this.mount(id);
        },
        "초안 삭제",
      );
    form.addEventListener("input", () => this.capture());
    form.addEventListener("change", () => this.capture());
    const submit = form.onsubmit;
    form.onsubmit = (e) => {
      e.preventDefault();
      this.capture();
      const v = Object.fromEntries(new FormData(form));
      const error = document.getElementById("create-error");
      error.textContent = "";
      if (CreateView.busy) {
        error.textContent = "사진 처리가 끝날 때까지 기다려주세요.";
        return;
      }
      if (
        !CreateView.images.length ||
        !v.title.trim() ||
        !v.description.trim() ||
        !v.flaws.trim() ||
        !v.components.trim()
      ) {
        error.textContent =
          "사진, 제목, 설명, 하자 여부와 구성품을 입력해 주세요.";
        return;
      }
      if (
        !Number.isSafeInteger(Number(v.shippingFee)) ||
        Number(v.shippingFee) < 0 ||
        Number(v.shippingFee) > 100000
      ) {
        error.textContent = "배송비를 0~100,000원으로 입력해 주세요.";
        return;
      }
      if (
        !Number.isSafeInteger(Number(v.startingPrice)) ||
        Number(v.startingPrice) < 1000 ||
        Number(v.startingPrice) > 1000000000 ||
        !Number.isSafeInteger(Number(v.minStep)) ||
        Number(v.minStep) < 100 ||
        Number(v.minStep) > 1000000000
      ) {
        error.textContent = "시작가와 입찰 단위를 확인해 주세요.";
        return;
      }
      const key = this.current;
      UI.open(
        "등록 전 마지막 확인",
        '<img class="listing-preview-image" src="' +
          esc(CreateView.images[0]) +
          '" alt="등록할 대표 사진"><h3>' +
          esc(v.title) +
          '</h3><p class="preserve-lines">' +
          esc(v.description) +
          '</p><dl class="review-values"><dt>하자·수리</dt><dd>' +
          esc(v.flaws) +
          "</dd><dt>구성품</dt><dd>" +
          esc(v.components) +
          "</dd><dt>시작가 / 입찰 단위</dt><dd>" +
          money(Number(v.startingPrice)) +
          " / " +
          money(Number(v.minStep)) +
          "</dd><dt>거래 방식</dt><dd>" +
          esc(v.method + " · " + v.location) +
          "</dd><dt>배송비</dt><dd>" +
          money(v.method === "직거래" ? 0 : Number(v.shippingFee)) +
          '</dd></dl><p class="notice">입찰 후에는 상품 조건을 수정·삭제할 수 없어요. 하자와 구성품, 금액을 다시 확인해 주세요.</p><div class="button-row"><button class="button secondary" id="edit-listing">계속 수정</button><button class="button" id="confirm-listing">' +
          (id ? "수정 확정" : "등록 확정") +
          "</button></div>",
        (d) => {
          d.querySelector("#edit-listing").onclick = () => UI.close();
          d.querySelector("#confirm-listing").onclick = () => {
            if (
              !Store.data.user.onboardingComplete ||
              !Store.data.user.verified
            ) {
              Membership.require(() => {
                Nav.go("create", { id });
                toast(
                  "가입·인증을 완료했어요. 저장한 초안을 확인하고 등록해 주세요.",
                );
              });
              return;
            }
            UI.close();
            submit(e);
            if (Nav.current !== "create") {
              delete Store.data.drafts[key];
              this.current = null;
              Store.save();
            }
          };
        },
      );
    };
  },
};
