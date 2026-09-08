const CreateView = {
  images: [],
  busy: false,
  render({ id } = {}) {
    const a = id ? Store.auction(id) : null,
      root = document.getElementById("view-create");
    if (
      id &&
      (!a ||
        a.sellerId !== "me" ||
        a.bidsCount ||
        a.status !== "active" ||
        a.endTime <= Date.now())
    ) {
      root.innerHTML =
        UI.header("상품 수정") +
        empty(
          "수정할 수 없는 상품이에요",
          "입찰 전인 내 상품만 수정할 수 있습니다.",
        );
      return;
    }
    this.images = a ? [...a.images] : [];
    root.innerHTML =
      UI.header(
        a ? "상품 수정" : "경매 등록",
        '<span class="step-label">좋은 물건, 새로운 시작</span>',
      ) +
      '<div class="form-layout"><form id="product-form" class="form-card"><h2>어떤 물건을 판매하시나요?</h2><p class="muted">상태를 솔직하게 알려주시면 거래가 더 편해져요.</p><label class="field">상품 사진 <span class="required">*</span></label><div class="upload-grid" id="upload-grid"></div><p class="field-hint">최대 5장 · JPG, PNG, WEBP · 장당 5MB 이하</p><label class="field">상품 제목 <span class="required">*</span><input name="title" maxlength="100" required placeholder="브랜드, 모델명과 상품의 특징을 적어주세요" value="' +
      esc(a?.title || "") +
      '"></label><div class="form-two"><label class="field">카테고리<select name="category">' +
      CATEGORIES.filter((c) => c.id !== "all")
        .map(
          (c) =>
            '<option value="' +
            c.id +
            '" ' +
            (a?.category === c.id ? "selected" : "") +
            ">" +
            c.name +
            "</option>",
        )
        .join("") +
      '</select></label><label class="field">세부 분류<select name="subcategory"></select></label></div><div class="form-two"><label class="field">브랜드<input name="brand" maxlength="50" placeholder="예: Sony" value="' +
      esc(a?.brand || "") +
      '"></label><label class="field">모델명<input name="model" maxlength="80" placeholder="예: WH-1000XM5" value="' +
      esc(a?.model || "") +
      '"></label></div><label class="field">상품 상태<select name="condition">' +
      ["새 상품", "거의 새것", "사용감 적음", "사용감 있음"]
        .map(
          (s) =>
            "<option " +
            (a?.condition === s ? "selected" : "") +
            ">" +
            s +
            "</option>",
        )
        .join("") +
      '</select></label><label class="field">상품 설명 <span class="required">*</span><textarea name="description" rows="6" maxlength="5000" required placeholder="사용 기간, 구성품, 하자 여부를 자세히 적어주세요.">' +
      esc(a?.description || "") +
      '</textarea></label><h2 class="form-section-title">경매 조건</h2><div class="form-two"><label class="field">시작가 (원)<input name="startingPrice" type="number" min="1000" max="1000000000" step="100" required value="' +
      (a?.startingPrice || "") +
      '" placeholder="50,000"></label><label class="field">입찰 단위 (원)<input name="minStep" type="number" min="100" max="1000000000" step="100" required value="' +
      (a?.minStep || 1000) +
      '"></label></div>' +
      (!a
        ? '<label class="field">경매 진행 시간<select name="duration"><option value="24">24시간</option><option value="48">48시간</option><option value="72">3일</option><option value="168">7일</option></select></label>'
        : '<p class="field-hint">기존 마감 시간은 유지됩니다.</p>') +
      '<h2 class="form-section-title">거래 방법</h2><div class="form-two"><label class="field">선호 거래 지역<input name="location" maxlength="80" required value="' +
      esc(a?.location || Store.data.user.location) +
      '" placeholder="예: 성수역 2번 출구"></label><label class="field">거래 방식<select name="method">' +
      ["둘 다", "직거래", "택배"]
        .map(
          (s) =>
            "<option " +
            ((a?.method || Store.data.user.method) === s ? "selected" : "") +
            ">" +
            s +
            "</option>",
        )
        .join("") +
      '</select></label></div><p class="inline-error" id="create-error" role="alert"></p><button class="button full" type="submit">' +
      (a ? "수정 내용 저장" : "경매 등록하기") +
      '</button></form><aside class="form-aside"><div class="aside-icon">' +
      icon("box") +
      '</div><h3>다음 주인을 만날 준비</h3><ol><li>밝은 곳에서 직접 찍은 사진</li><li>작은 흠집까지 솔직한 설명</li><li>부담 없이 시작할 수 있는 가격</li></ol><div class="notice">' +
      icon("help") +
      "<p>입찰이 시작되면 상품의 조건을 수정하거나 삭제할 수 없어요.</p></div>" +
      (!Store.data.user.verified
        ? '<button class="button secondary full" id="create-verify">전화번호 인증하기</button>'
        : '<p class="text-green small">' +
          icon("check") +
          "전화번호 인증 완료</p>") +
      "</aside></div>";
    const form = root.querySelector("#product-form");
    const updateSubs = () => {
      form.elements.subcategory.innerHTML = (
        SUBCATEGORIES[form.elements.category.value] || ["기타"]
      )
        .filter((x) => x !== "전체")
        .map(
          (s) =>
            "<option " +
            (a?.subcategory === s ? "selected" : "") +
            ">" +
            s +
            "</option>",
        )
        .join("");
    };
    updateSubs();
    form.elements.category.onchange = updateSubs;
    root.querySelector("#create-verify")?.addEventListener("click", () =>
      Account.verify(() => {
        toast("인증을 완료했어요. 상품 등록을 계속해 주세요.");
      }),
    );
    form.onsubmit = async (e) => {
      e.preventDefault();
      const error = root.querySelector("#create-error");
      error.textContent = "";
      if (this.busy) {
        error.textContent = "사진 처리가 끝난 뒤 등록해 주세요.";
        return;
      }
      try {
        const v = Object.fromEntries(new FormData(form));
        await Store.saveAuction(
          {
            ...v,
            startingPrice: Number(v.startingPrice),
            minStep: Number(v.minStep),
            endTime: a ? a.endTime : Date.now() + Number(v.duration) * 3600000,
            images: [...this.images],
          },
          a?.id,
        );
        toast(a ? "상품을 수정했어요." : "경매를 등록했어요.");
        Nav.go("profile", { tab: "selling" });
      } catch (err) {
        error.textContent = err.message;
        error.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    this.renderPhotos();
  },
  renderPhotos() {
    const grid = document.getElementById("upload-grid");
    if (!grid) return;
    grid.innerHTML =
      this.images
        .map(
          (src, i) =>
            '<div class="upload-preview"><img src="' +
            esc(src) +
            '" alt="등록 사진 ' +
            (i + 1) +
            '"><button type="button" data-remove="' +
            i +
            '" aria-label="사진 ' +
            (i + 1) +
            ' 삭제">' +
            icon("close") +
            "</button>" +
            (i === 0 ? "<span>대표</span>" : "") +
            "</div>",
        )
        .join("") +
      (this.images.length < 5
        ? '<label class="upload-picker">' +
          icon("camera") +
          "<span>" +
          this.images.length +
          ' / 5</span><input type="file" id="photo-files" accept="image/jpeg,image/png,image/webp" multiple aria-label="상품 사진 선택"></label>'
        : "");
    grid.querySelectorAll("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          this.images.splice(Number(b.dataset.remove), 1);
          this.renderPhotos();
        }),
    );
    grid
      .querySelector("#photo-files")
      ?.addEventListener("change", async (e) => {
        this.busy = true;
        try {
          for (const file of e.target.files) {
            if (this.images.length >= 5) {
              toast("사진은 최대 5장까지 등록할 수 있어요.");
              break;
            }
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 5 * 1024 * 1024
            )
              throw new Error("JPG·PNG·WEBP 파일을 5MB 이하로 선택해 주세요.");
            this.images.push(await this.resize(file));
          }
        } catch (err) {
          toast(err.message);
        } finally {
          this.busy = false;
          this.renderPhotos();
        }
      });
  },
  resize(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file),
        img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas
            .getContext("2d")
            .drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } catch {
          reject(new Error("사진을 처리하지 못했어요."));
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("손상된 이미지입니다. 다른 사진을 선택해 주세요."));
      };
      img.src = url;
    });
  },
};
