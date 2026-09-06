/**
 * 경매 올리기(등록) 화면 - 폼과 등록 버튼
 */

const ViewCreate = {
  init(section) {
    this.section = section;

    section.innerHTML = `
      <div class="subview-header">
        <h2>경매 등록</h2>
      </div>
      <form class="create-form" id="form-create-auction">
        <div class="image-upload-preview-box">
          <svg class="ic" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>
          <span>사진 등록 (최대 5장)</span>
        </div>

        <div class="form-group">
          <label for="create-title">상품 제목 *</label>
          <input type="text" id="create-title" class="form-input" placeholder="브랜드, 모델명" required>
        </div>

        <div class="form-group">
          <label for="create-category">카테고리 *</label>
          <select id="create-category" class="form-select">
            <option value="digital">디지털/가전</option>
            <option value="camera">카메라/렌즈</option>
            <option value="fashion">명품/스니커즈</option>
            <option value="collect">한정판/아트</option>
          </select>
        </div>

        <div class="form-group">
          <label for="create-start-price">시작가 (원) *</label>
          <input type="number" id="create-start-price" class="form-input" placeholder="50000" step="1000" required>
        </div>

        <div class="form-group">
          <label for="create-min-step">입찰단위 (원) *</label>
          <input type="number" id="create-min-step" class="form-input" value="5000" step="1000" required>
        </div>

        <div class="form-group">
          <label for="create-desc">상품 설명</label>
          <textarea id="create-desc" class="form-textarea" placeholder="상태, 사용 기간, 하자 여부를 적어주세요."></textarea>
        </div>

        <button type="submit" class="btn-submit-bid" style="margin-top: 10px;">등록하기</button>
      </form>
    `;

    this.form = section.querySelector("#form-create-auction");
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  },

  handleSubmit() {
    const title = this.section.querySelector("#create-title").value.trim();
    const category = this.section.querySelector("#create-category").value;
    const startPrice = parseInt(this.section.querySelector("#create-start-price").value, 10);
    const minStep = parseInt(this.section.querySelector("#create-min-step").value, 10);
    const desc = this.section.querySelector("#create-desc").value.trim();

    if (!title || !startPrice || !minStep) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }

    const newAuction = {
      id: Date.now(),
      title,
      category,
      seller: {
        name: "나(판매자)",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        rating: 5.0,
        reviewsCount: 1,
        isVerified: true,
        location: "내 동네"
      },
      images: [
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"
      ],
      startingPrice: startPrice,
      currentPrice: startPrice,
      minStep: minStep,
      maxPrice: startPrice * 3,
      endTime: Date.now() + 1000 * 60 * 60 * 24, // 24시간 후
      bidsCount: 0,
      views: 1,
      likes: 0,
      description: desc || "상품 설명이 작성되지 않았습니다.",
      bidHistory: []
    };

    AppState.addAuction(newAuction);
    showToast("경매를 등록했습니다.");
    this.form.reset();
    Navigation.switchView("home");
  }
};
