/**
 * 여러 화면에서 함께 쓰는 유틸 함수
 * (가격/시간 포맷팅, 토스트, 경매 카드 HTML)
 */

function formatPrice(num) {
  return Number(num).toLocaleString("ko-KR") + "원";
}

function formatTimeRemaining(endTime) {
  const totalSec = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  if (totalSec <= 0) return "경매 종료";

  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// 홈 / 경매 찾기 화면에서 공통으로 쓰는 경매 카드 마크업
function auctionCardHTML(item, { showLikes = true } = {}) {
  const statsRight = showLikes ? `조회 ${item.views} · 찜 ${item.likes}` : `조회 ${item.views}`;

  return `
    <div class="auction-card" data-id="${item.id}">
      <div class="card-img-wrap">
        <img src="${item.images[0]}" alt="${item.title}" loading="lazy" />
        <div class="time-tag">${formatTimeRemaining(item.endTime)} 남음</div>
      </div>

      <div class="card-info">
        <div class="item-title">${item.title}</div>

        <div class="price-row">
          <span class="price-label">실시간</span>
          <span class="current-price">${formatPrice(item.currentPrice)}</span>
        </div>

        <div class="item-meta-desc">${item.seller.name} · ${item.seller.location}</div>

        <div class="card-footer-stats">
          <span class="bid-count-badge">입찰 ${item.bidsCount}회</span>
          <span>${statsRight}</span>
        </div>
      </div>
    </div>
  `;
}
