const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { parseHTML } = require("linkedom");
const root = path.resolve(__dirname, "..");
const guest = {
  id: "me",
  name: "방문자",
  bio: "",
  location: "",
  method: "둘 다",
  phone: "",
  verified: false,
  interests: [],
  publicHistory: false,
  showOnline: true,
  dnd: { enabled: false, start: "23:00", end: "08:00" },
  status: "guest",
  role: "member",
};
const blank = () => ({
  authenticated: false,
  user: structuredClone(guest),
  auctions: [],
  sellers: {},
  likes: [],
  blocked: [],
  bids: [],
  chats: [],
  trades: [],
  publicTrades: [],
  reviews: [],
  reports: [],
  tickets: [],
  notifications: [],
});
function harness(fetcher) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const { window, document } = parseHTML(html);
  window.scrollTo = () => {};
  window.HTMLElement.prototype.showModal = function () {};
  window.HTMLElement.prototype.close = function () {
    this.remove();
  };
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      const o =
        this.querySelector("option[selected]") || this.querySelector("option");
      return o?.getAttribute("value") ?? o?.textContent ?? "";
    },
    set(value) {
      this.querySelectorAll("option").forEach((o) => {
        if ((o.getAttribute("value") ?? o.textContent) === String(value))
          o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      });
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, "elements", {
    configurable: true,
    get() {
      return Object.fromEntries(
        [...this.querySelectorAll("[name]")].map((e) => [
          e.getAttribute("name"),
          e,
        ]),
      );
    },
  });
  const c = vm.createContext({
    window,
    document,
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    AbortController,
    setTimeout: () => 0,
    clearTimeout() {},
    CustomEvent: window.CustomEvent,
    crypto: require("node:crypto").webcrypto,
    fetch: fetcher,
    FormData: class {},
    Image: class {},
  });
  for (const m of html.matchAll(/<script src="([^"]+)"/g))
    if (m[1] !== "app/main.js")
      vm.runInContext(fs.readFileSync(path.join(root, m[1]), "utf8"), c, {
        filename: m[1],
      });
  c.initial = blank();
  vm.runInContext(
    "Store.data=initial; Nav.init({home:HomeView,likes:LikesView,create:CreateView,detail:DetailView,profile:ProfileView,seller:SellerView,chat:ChatView,support:SupportView});",
    c,
  );
  return { c, document, run: (s) => vm.runInContext(s, c, { timeout: 2000 }) };
}
test("host HTML error pages preserve validation messages through a safe header", async () => {
  const h = harness(async () => ({
    ok: false,
    headers: {
      get: (name) =>
        name === "x-bullty-error"
          ? encodeURIComponent("이미 사용 중인 아이디입니다.")
          : "text/html",
    },
    json: async () => {
      throw Error("HTML must not be parsed as JSON");
    },
  }));
  await assert.rejects(
    h.run("Store.mutate('register')"),
    /이미 사용 중인 아이디/,
  );
  assert.equal(h.run("Store.data.authenticated"), false);
  assert.equal(h.run("Store.busy"), false);
});

test("malformed error headers fall back without hiding the connection error", async () => {
  const h = harness(async () => ({
    ok: false,
    headers: {
      get: (name) => (name === "x-bullty-error" ? "%ZZ" : "text/html"),
    },
  }));
  await assert.rejects(h.run("Store.like(1)"), /연결 상태/);
  assert.equal(h.run("Store.data.likes.length"), 0);
  assert.equal(h.run("Store.busy"), false);
});

test("server failure never changes local state or reports a mutation as successful", async () => {
  const h = harness(async () => ({
    ok: false,
    headers: {
      get: (name) => (name === "content-type" ? "application/json" : null),
    },
    json: async () => ({ ok: false, error: "rejected" }),
  }));
  await assert.rejects(h.run("Store.like(1)"), /rejected/);
  assert.equal(h.run("Store.data.likes.length"), 0);
  assert.equal(h.run("Store.busy"), false);
});
test("successful mutation uses session CSRF and server response", async () => {
  let request;
  const state = blank();
  state.likes = [42];
  const h = harness(async (url, options) => {
    request = options;
    return {
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true, result: true, state, csrf: "new-token" }),
    };
  });
  h.run('Store.csrf="old-token"');
  assert.equal(await h.run("Store.like(42)"), true);
  assert.equal(request.headers["X-CSRF-Token"], "old-token");
  assert.equal(h.run("Store.data.likes[0]"), 42);
});
test("all empty public screens render and protected routes show login", () => {
  const h = harness();
  for (const name of ["home", "likes", "chat", "create", "profile", "support"])
    assert.doesNotThrow(() => h.run(`Nav.go('${name}')`));
  h.run('Nav.go("create")');
  assert.ok(h.document.querySelector("#login-form"));
  assert.equal(h.run("Nav.current"), "profile");
  assert.ok(!h.document.querySelector("#demo-info"));
});
test("member screens and settings use existing presentation without demo controls", () => {
  const h = harness();
  h.run(
    'Store.data.authenticated=true;Store.data.user.status="active";Store.data.user.name="회원";',
  );
  for (const name of ["home", "likes", "chat", "create", "profile", "support"])
    assert.doesNotThrow(() => h.run(`Nav.go('${name}')`));
  h.run("Account.settings()");
  assert.ok(h.document.querySelector("#settings-form"));
  h.run("Account.quietHours()");
  assert.ok(h.document.querySelector("#quiet-form"));
  h.run("SupportView.assistant()");
  assert.ok(h.document.querySelector("#ticket-form"));
  assert.equal(h.document.querySelector("#assistant-form"), null);
});
test("live entrypoint does not load mock data or browser persistence", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /app\/seed|js\/data|PROTOTYPE/);
  for (const m of html.matchAll(/<script src="([^"]+)"/g))
    assert.doesNotMatch(
      fs.readFileSync(path.join(root, m[1]), "utf8"),
      /localStorage|Store\.save\(|demo-reply|demo-end|123456/,
    );
});
test("signup has separate member ID and email fields and password settings", () => {
  const h = harness();
  h.run("Live.loginPage()");
  assert.ok(h.document.querySelector("[name=identity]"));
  h.document.querySelector("#toggle-signup").onclick();
  assert.equal(h.document.querySelector("#signup-email").hidden, false);
  assert.match(
    h.document.querySelector("#identity-label").textContent,
    /회원 아이디/,
  );
  h.run("Account.password()");
  assert.ok(h.document.querySelector("[name=currentPassword]"));
  assert.ok(h.document.querySelector("[name=confirmPassword]"));
});
test("product, seller, trade and chat screens render server-shaped records", () => {
  const h = harness();
  const state = blank();
  state.authenticated = true;
  state.user.status = "active";
  state.sellers.peer = {
    ...guest,
    id: "peer",
    name: "상대방",
    status: "active",
    rating: null,
    lastSeen: Date.now(),
  };
  state.auctions = [
    {
      id: 1,
      sellerId: "peer",
      title: "테스트 상품",
      description: "상품 상태 설명",
      category: "digital",
      subcategory: "헤드폰",
      brand: "",
      model: "",
      images: ["uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"],
      startingPrice: 1000,
      currentPrice: 1000,
      minStep: 100,
      bidsCount: 0,
      bidHistory: [],
      likes: 0,
      views: 0,
      status: "active",
      createdAt: Date.now(),
      endTime: Date.now() + 86400000,
      location: "서울",
      condition: "새 상품",
      method: "직거래",
    },
  ];
  state.chats = [
    {
      id: "room",
      auctionId: 1,
      peerId: "peer",
      unread: 0,
      messages: [
        {
          id: "msg",
          mine: false,
          text: "실제 메시지 형식",
          kind: "text",
          at: Date.now(),
        },
      ],
    },
  ];
  state.trades = [
    {
      id: "1",
      auctionId: 1,
      peerId: "peer",
      title: "테스트 상품",
      amount: 1000,
      at: Date.now(),
      status: "송금 표시",
      role: "buyer",
    },
  ];
  h.c.fixture = state;
  h.run("Store.data=fixture");
  h.run('Nav.go("detail",{id:1})');
  assert.ok(h.document.querySelector("#detail-chat"));
  h.run('Nav.go("seller",{id:"peer"})');
  h.run('Nav.go("chat",{id:"room"})');
  assert.ok(h.document.querySelector("#message-input"));
  assert.match(
    h.document.querySelector("#message-list").textContent,
    /실제 메시지/,
  );
  h.run('Nav.go("profile",{tab:"trades"})');
  assert.ok(!h.document.querySelector("[data-advance]"));
});
