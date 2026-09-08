function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function esc(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function money(value) {
  return Number(value).toLocaleString("ko-KR") + "원";
}
function remaining(end) {
  const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
  if (!s) return "마감";
  if (s >= 86400)
    return (
      Math.floor(s / 86400) + "일 " + Math.floor((s % 86400) / 3600) + "시간"
    );
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
function ago(at) {
  const m = Math.max(0, Math.floor((Date.now() - at) / 60000));
  return m < 1
    ? "방금 전"
    : m < 60
      ? m + "분 전"
      : m < 1440
        ? Math.floor(m / 60) + "시간 전"
        : Math.floor(m / 1440) + "일 전";
}
function day(at) {
  return new Date(at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}
function isDnd(member, date = new Date()) {
  if (!member?.dnd?.enabled) return false;
  const { start, end } = member.dnd;
  const clock =
    String(
      Number(
        date.toLocaleString("en-US", {
          timeZone: "Asia/Seoul",
          hour: "2-digit",
          hourCycle: "h23",
        }),
      ),
    ).padStart(2, "0") +
    ":" +
    String(
      Number(
        date.toLocaleString("en-US", {
          timeZone: "Asia/Seoul",
          minute: "2-digit",
        }),
      ),
    ).padStart(2, "0");
  return (
    start === end ||
    (start < end
      ? clock >= start && clock < end
      : clock >= start || clock < end)
  );
}
function presence(m) {
  return !m?.showOnline
    ? "접속 정보 비공개"
    : m.lastSeen && Date.now() - m.lastSeen < 60000
      ? "접속 중"
      : m.id === "me"
        ? "온라인"
        : m.lastSeen
          ? ago(m.lastSeen) + " 접속"
          : "접속 기록 없음";
}
function categoryName(id) {
  return CATEGORIES.find((c) => c.id === id)?.name || "기타";
}
function toast(message) {
  const host = document.getElementById("toast-container");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.append(el);
  setTimeout(() => el.remove(), 3500);
}
function attempt(fn) {
  try {
    const result = fn();
    if (result && typeof result.catch === "function")
      return result.catch((e) => toast(e.message));
    return result;
  } catch (e) {
    toast(e.message);
  }
}
function empty(title, text, action = "") {
  return (
    '<div class="empty-state">' +
    icon("box") +
    "<h3>" +
    esc(title) +
    "</h3><p>" +
    esc(text) +
    "</p>" +
    action +
    "</div>"
  );
}
