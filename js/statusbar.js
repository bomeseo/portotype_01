/**
 * 상단 상태창 (시계 · 통신사 · 배터리 아이콘)
 * main.js가 넘겨주는 컨테이너에 자신의 마크업을 그리고, 10초마다 시계를 갱신한다.
 */

const StatusBar = {
  init(container) {
    if (!container) return;

    container.innerHTML = `
      <span class="status-time" id="status-clock">14:32</span>
      <div class="status-icons">
        <span class="carrier">5G</span>
        <svg viewBox="0 0 24 24"><path d="M2.5 8.5a15 15 0 0 1 19 0"/><path d="M5.5 12a10.5 10.5 0 0 1 13 0"/><path d="M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>
        <svg viewBox="0 0 24 24"><rect x="2" y="8" width="17" height="9" rx="2.5"/><rect x="4" y="10" width="11" height="5" rx="1" fill="currentColor" stroke="none"/><path d="M21 11.5v3"/></svg>
      </div>
    `;

    this.clockEl = container.querySelector("#status-clock");
    this.update();
    setInterval(() => this.update(), 10000);
  },

  update() {
    if (!this.clockEl) return;
    const now = new Date();
    this.clockEl.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
};
