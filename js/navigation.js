/**
 * 하단 탭 네비게이션 (홈 / 경매 찾기 / 경매 올리기 / 내정보)
 * 화면 전환과, 화면에 들어갈 때 실행할 콜백(onEnter) 등록만 담당한다.
 * 각 view 파일이 registerOnEnter로 자신의 렌더 함수를 등록해두면,
 * navigation.js는 어떤 화면에 어떤 로직이 있는지 몰라도 된다.
 */

const Navigation = {
  onEnterHandlers: {},

  init(navRoot, views) {
    this.views = views;
    this.navRoot = navRoot;

    navRoot.innerHTML = `
      <button class="nav-item-btn active" data-view="home">
        <span class="nav-icon"><svg class="ic" viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 20v-6h5v6"/></svg></span>
        <span class="nav-text">홈</span>
      </button>
      <button class="nav-item-btn" data-view="search">
        <span class="nav-icon"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
        <span class="nav-text">경매 찾기</span>
      </button>
      <button class="nav-item-btn" data-view="create">
        <span class="nav-icon"><svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>
        <span class="nav-text">등록</span>
      </button>
      <button class="nav-item-btn" data-view="profile">
        <span class="nav-icon"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5"/></svg></span>
        <span class="nav-text">내정보</span>
      </button>
    `;

    this.navButtons = navRoot.querySelectorAll(".nav-item-btn");
    this.navButtons.forEach(btn => {
      btn.addEventListener("click", () => this.switchView(btn.dataset.view));
    });
  },

  // 특정 화면으로 전환될 때 실행할 콜백을 등록 (보통 그 화면의 render 함수)
  registerOnEnter(viewName, handler) {
    this.onEnterHandlers[viewName] = handler;
  },

  switchView(viewName) {
    Object.keys(this.views).forEach(key => {
      this.views[key]?.classList.toggle("active", key === viewName);
    });

    this.navButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    document.querySelector(".device-container")?.classList.toggle("in-detail", viewName === "detail");

    this.onEnterHandlers[viewName]?.();

    const viewport = document.querySelector(".app-view-port");
    if (viewport) viewport.scrollTop = 0;
  }
};
