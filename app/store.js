/* All durable changes are accepted by the server before updating the UI. */
const Store = {
  data: null,
  csrf: "",
  busy: false,
  async init() {
    await this.refresh();
  },
  async request(op, values = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("api/index.php", {
        method: op ? "POST" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: op
          ? { "Content-Type": "application/json", "X-CSRF-Token": this.csrf }
          : {},
        body: op ? JSON.stringify({ op, ...values }) : undefined,
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json"))
        throw new Error(
          "요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
        );
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error || "요청을 처리하지 못했습니다.");
      this.csrf = result.csrf;
      this.data = result.state;
      document.dispatchEvent(new CustomEvent("state-changed"));
      return result.result;
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error(
          "요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },
  async refresh() {
    return this.request();
  },
  async mutate(op, values = {}) {
    if (this.busy)
      throw new Error(
        "앞선 요청을 처리하고 있습니다. 잠시 후 다시 시도해 주세요.",
      );
    this.busy = true;
    try {
      return await this.request(op, values);
    } finally {
      this.busy = false;
    }
  },
  auction(id) {
    return this.data.auctions.find((a) => a.id === Number(id));
  },
  member(id) {
    return id === "me" ? this.data.user : this.data.sellers[id];
  },
  isBlocked(id) {
    return this.data.blocked.includes(id);
  },
  canTrade() {
    if (!this.data.authenticated)
      throw new Error("내 정보에서 로그인해 주세요.");
    if (this.data.user.status !== "active")
      throw new Error("이용이 제한된 계정입니다. 고객센터에 문의해 주세요.");
  },
  like(id) {
    return this.mutate("like", { id });
  },
  bid(id, amount) {
    return this.mutate("bid", { id, amount });
  },
  async saveAuction(values, id) {
    const images = [];
    for (const image of values.images)
      images.push(
        image.startsWith("data:")
          ? await this.mutate("upload", { image })
          : image,
      );
    return this.mutate("saveAuction", { id, values: { ...values, images } });
  },
  deleteAuction(id) {
    return this.mutate("deleteAuction", { id });
  },
  chat(id) {
    return this.mutate("chat", { id });
  },
  send(id, text, kind = "text", requestId = uid()) {
    return this.mutate("send", { id, text, kind, requestId });
  },
  settleExpired() {},
};
