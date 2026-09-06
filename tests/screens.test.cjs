const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseHTML } = require("linkedom");
const root = path.resolve(__dirname, "..");

test("first visit starts a resumable Korean membership flow", () => {
  const a = app({ onboarding: true });
  assert.equal(a.run("Nav.current"), "onboarding");
  a.document.querySelector('[name="name"]').value = "테스트수집가";
  a.submit("#signup-form");
  a.document.querySelector('[name="interests"][value="fashion"]').checked =
    true;
  a.document.querySelector('[name="personalization"]').checked = true;
  a.submit("#signup-form");
  a.document.querySelector('[name="region"]').value = "부산";
  a.document.querySelector('[name="neighborhood"]').value = "수영구";
  a.document.querySelector('[name="method"]').value = "택배";
  a.click("#signup-guest");
  const b = app({
    onboarding: true,
    saved: a.records.get("live-auction-prototype-v3"),
  });
  b.click("#home-signup");
  assert.equal(b.run("Onboarding.step"), 2);
  assert.equal(
    b.document.querySelector('[name="neighborhood"]').value,
    "수영구",
  );
  b.submit("#signup-form");
  b.document.querySelector('[name="dndEnabled"]').checked = true;
  b.document.querySelector('[name="start"]').value = "22:00";
  b.document.querySelector('[name="end"]').value = "07:00";
  b.document.querySelector('[name="terms"]').checked = true;
  b.document.querySelector('[name="privacy"]').checked = true;
  b.submit("#signup-form");
  assert.equal(b.run("Store.data.user.onboardingComplete"), true);
  assert.equal(b.run("Store.data.user.location"), "부산 수영구");
  assert.equal(b.run("Store.data.user.method"), "택배");
  assert.equal(b.run("Store.data.user.interests.join(',')"), "fashion");
  assert.equal(b.run("Store.data.user.dnd.enabled"), true);
  assert.equal(b.run("Store.data.user.publicHistory"), false);
  assert.equal(b.run("Store.data.user.showOnline"), false);
  assert.equal(b.run("Store.data.user.marketing"), false);
  assert.equal(b.run("Store.data.user.verified"), false);
  b.run("UI.close()");
  b.click('[data-mode="for-you"]');
  assert.equal(
    b.document.querySelectorAll("#product-grid .product-card").length,
    1,
  );
});

test("membership requires notices but allows optional interests and marketing to be skipped", () => {
  const a = app({ onboarding: true });
  a.document.querySelector('[name="name"]').value = "첫방문자";
  a.submit("#signup-form");
  a.submit("#signup-form");
  a.document.querySelector('[name="neighborhood"]').value = "성동구";
  a.submit("#signup-form");
  a.submit("#signup-form");
  assert.match(a.document.querySelector("#signup-error").textContent, /필수/);
  assert.equal(a.run("Store.data.user.onboardingComplete"), false);
  a.document.querySelector('[name="terms"]').checked = true;
  a.document.querySelector('[name="privacy"]').checked = true;
  a.submit("#signup-form");
  assert.equal(a.run("Store.data.user.onboardingComplete"), true);
  assert.equal(a.run("Store.data.user.interests.length"), 0);
  assert.equal(a.run("Store.data.user.personalization"), false);
});

test("drafts restore form values and pictures without publishing and can be deleted", () => {
  const a = app();
  a.run('Nav.go("create")');
  a.click("#sample-photo");
  a.document.querySelector('[name="title"]').value = "저장 중인 상품";
  a.document.querySelector('[name="category"]').value = "fashion";
  a.document.querySelector('[name="category"]').onchange();
  a.document.querySelector('[name="subcategory"]').value = "후드";
  a.click("#draft-save");
  assert.equal(a.run("Store.data.auctions.length"), 6);
  const b = app({ saved: a.records.get("live-auction-prototype-v3") });
  b.run('Nav.go("create")');
  assert.equal(
    b.document.querySelector('[name="title"]').value,
    "저장 중인 상품",
  );
  assert.equal(b.document.querySelector('[name="subcategory"]').value, "후드");
  assert.equal(b.run("CreateView.images.length"), 1);
  b.click("#draft-delete");
  b.click("#confirm-action");
  assert.equal(b.document.querySelector('[name="title"]').value, "");
  assert.equal(b.run("CreateView.images.length"), 0);
});

test("assistant uses the product context and drafts a question without sending", () => {
  const a = app();
  a.run(
    'Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Nav.go("detail",{id:3});Assistant.open()',
  );
  assert.match(
    a.document.querySelector(".assistant-context").textContent,
    /X100V/,
  );
  a.click('[data-question="0"]');
  assert.equal(a.run("Nav.current"), "chat");
  assert.match(a.document.querySelector("#message-input").value, /렌즈/);
  assert.equal(
    a.run("Store.data.chats.find(c=>c.auctionId===3).messages.length"),
    0,
  );
  a.submit("#message-form");
  assert.equal(
    a.run("Store.data.chats.find(c=>c.auctionId===3).messages.length"),
    1,
  );
});

test("assistant escalates with product context and user text safely preserved", () => {
  const a = app();
  a.run('Nav.go("detail",{id:1});Assistant.open()');
  a.document.querySelector("#assistant-question").value =
    "<script>불안해요</script>";
  a.click("#assistant-escalate");
  assert.match(a.document.querySelector('[name="body"]').value, /애플워치/);
  assert.match(a.document.querySelector('[name="body"]').value, /불안해요/);
  assert.equal(a.document.querySelector("dialog script"), null);
});

test("beginner tutorial completes only through actual wishlist, chat, bid and transaction actions", () => {
  const a = app();
  a.run(
    "Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Tutorial.start()",
  );
  const id = a.run("Tutorial.auctionId");
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Tutorial.step"), 0);
  a.click('[data-like="' + id + '"]');
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Tutorial.step"), 1);
  a.click("#detail-chat");
  a.document.querySelector("#message-input").value = "사용 기간을 알려주세요.";
  a.submit("#message-form");
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Tutorial.step"), 2);
  a.click("#detail-bid");
  a.submit("#bid-form");
  assert.equal(a.run("Store.auction(Tutorial.auctionId).bidsCount"), 0);
  a.click("#confirm-action");
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Tutorial.step"), 3);
  a.click("#demo-end");
  a.click("#confirm-action");
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Tutorial.step"), 4);
  fillAgreement(a);
  a.click("#agreement-accept");
  completeTrade(a);
  assert.equal(a.run("Tutorial.step"), 5);
  a.click("#trade-review");
  a.document.querySelector('[name="text"]').value =
    "첫 거래 흐름을 이해했습니다.";
  a.submit("#review-form");
  a.run("Tutorial.refresh()");
  assert.equal(a.run("Store.data.tutorial.completed"), true);
  assert.equal(a.run("Tutorial.active"), false);
  assert.equal(a.document.getElementById("tutorial-coach"), null);
});

test("seller role has a usable buyer chat and separate receipt, dispatch and delivery confirmations", () => {
  const a = app();
  a.run(
    'Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Journey.demo("seller")',
  );
  const id = a.run("Nav.params.id");
  fillAgreement(a);
  a.click("#agreement-accept");
  assert.match(
    a.document.querySelector("#trade-next").textContent,
    /데모 상대방.*송금/,
  );
  a.click("#trade-chat");
  assert.ok(a.document.querySelector("#message-input"));
  a.run('Nav.go("trade",{id:' + JSON.stringify(id) + "})");
  completeTrade(a);
  assert.equal(
    a.run("Journey.get(" + JSON.stringify(id) + ").status"),
    "거래 완료",
  );
});

test("problem report holds progress and can be resolved explicitly in the prototype", () => {
  const a = app();
  a.run(
    'Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Nav.go("trade",{id:"trade-demo"})',
  );
  a.click('[data-issue="문제 접수"]');
  a.document.querySelector('[name="detail"]').value =
    "약속 시간에 상대방이 오지 않았어요.";
  a.submit("#issue-form");
  assert.equal(a.run('Journey.get("trade-demo").status'), "문제 접수");
  assert.equal(a.document.querySelector("#trade-next"), null);
  a.click('[data-resolve="resume"]');
  a.click("#confirm-action");
  assert.equal(a.run('Journey.get("trade-demo").status'), "협의 중");
  assert.equal(a.run("Store.data.tickets[0].status"), "답변 완료");
});

// Linkedom supplies the DOM; these standard form/dialog shims keep this a unit
// test harness rather than a browser or a network-dependent end-to-end suite.
function fillAgreement(a) {
  a.document.querySelector('[name="place"]').value = "성수역 2번 출구";
  a.document.querySelector('[name="when"]').value = "2030-09-08T15:00";
  a.submit("#agreement-form");
  assert.equal(a.document.querySelector("#trade-error").textContent, "");
}
function completeTrade(a) {
  for (let i = 0; i < 4; i++) {
    a.click("#trade-next");
    if (a.document.querySelector("#delivery-form")) {
      a.document.querySelector('[name="delivery"]').value =
        "성수역에서 상품을 전달했습니다.";
      a.submit("#delivery-form");
    } else a.click("#confirm-action");
  }
}
function app(options = {}) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const { window, document } = parseHTML(html);
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
  Object.defineProperty(window.HTMLElement.prototype, "elements", {
    configurable: true,
    get() {
      return Object.fromEntries(
        [...this.querySelectorAll("[name]")].map((el) => [
          el.name || el.getAttribute("name"),
          el,
        ]),
      );
    },
  });
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      const option =
        this.querySelector("option[selected]") || this.querySelector("option");
      return option?.getAttribute("value") ?? option?.textContent ?? "";
    },
    set(value) {
      this.querySelectorAll("option").forEach((o) => {
        if ((o.getAttribute("value") ?? o.textContent) === String(value))
          o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      });
    },
  });
  class FormDataShim {
    constructor(form) {
      this.values = [...form.querySelectorAll("[name]")]
        .filter(
          (el) =>
            !el.disabled &&
            (!["checkbox", "radio"].includes(el.type) || el.checked),
        )
        .map((el) => [el.name || el.getAttribute("name"), el.value]);
    }
    get(key) {
      return this.values.find(([name]) => name === key)?.[1] ?? null;
    }
    getAll(key) {
      return this.values
        .filter(([name]) => name === key)
        .map(([, value]) => value);
    }
    has(key) {
      return this.values.some(([name]) => name === key);
    }
    [Symbol.iterator]() {
      return this.values[Symbol.iterator]();
    }
  }
  Object.defineProperty(window.HTMLInputElement.prototype, "checked", {
    configurable: true,
    get() {
      return this.hasAttribute("checked");
    },
    set(value) {
      value
        ? this.setAttribute("checked", "")
        : this.removeAttribute("checked");
    },
  });
  const records = new Map(
    options.saved ? [["live-auction-prototype-v3", options.saved]] : [],
  );
  const context = vm.createContext({
    document,
    window,
    console,
    Date,
    Math,
    JSON,
    URL,
    crypto: require("node:crypto").webcrypto,
    CustomEvent: window.CustomEvent,
    FormData: FormDataShim,
    localStorage: {
      getItem: (key) => records.get(key) || null,
      setItem: (key, value) => records.set(key, value),
    },
    setTimeout() {},
    setInterval() {},
  });
  for (const [, file] of html.matchAll(/<script src="([^"]+)"/g))
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {
      filename: file,
    });
  document.dispatchEvent(new window.Event("DOMContentLoaded"));
  if (!options.onboarding)
    vm.runInContext('Store.data.welcomeSeen=true;Nav.go("home")', context);
  return {
    document,
    records,
    run: (source) => vm.runInContext(source, context),
    click: (selector) => {
      const button = document.querySelector(selector);
      assert.ok(button, "Missing control: " + selector);
      button.click();
    },
    submit: (selector) => {
      const form = document.querySelector(selector);
      assert.ok(form, "Missing form: " + selector);
      if (form.onsubmit) form.onsubmit({ preventDefault() {}, target: form });
      else
        form.dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
    },
  };
}

test("initial home renders six products and every navigation tab", () => {
  const a = app();
  assert.equal(
    a.document.querySelectorAll("#product-grid .product-card").length,
    6,
  );
  assert.equal(
    a.document.querySelectorAll("#bottom-nav-root [data-nav]").length,
    5,
  );
  assert.ok(a.document.querySelector("#view-likes").hidden);
});

test("every primary and secondary view renders without exceptions", () => {
  const a = app();
  for (const [name, params] of [
    ["likes", {}],
    ["create", {}],
    ["detail", { id: 1 }],
    ["profile", {}],
    ["profile", { tab: "bids" }],
    ["profile", { tab: "trades" }],
    ["seller", { id: "seller-1" }],
    ["seller", { id: "seller-3" }],
    ["chat", {}],
    ["chat", { id: "chat-1" }],
    ["support", {}],
  ]) {
    a.run(
      "Nav.go(" + JSON.stringify(name) + "," + JSON.stringify(params) + ")",
    );
    assert.equal(a.document.getElementById("view-" + name).hidden, false);
    assert.equal(
      a.document.getElementById("view-" + name).innerHTML.includes("undefined"),
      false,
      name + " contains undefined",
    );
  }
});

test("search filters products and the empty state restores all filters", () => {
  const a = app();
  const input = a.document.querySelector("#product-search");
  input.value = "없는 상품";
  input.oninput({ target: input });
  assert.equal(
    a.document.querySelectorAll("#product-grid .product-card").length,
    0,
  );
  a.click("#reset-filter");
  assert.equal(
    a.document.querySelectorAll("#product-grid .product-card").length,
    6,
  );
});

test("wishlist removal updates the visible list", () => {
  const a = app();
  a.run('Nav.go("likes")');
  assert.equal(
    a.document.querySelectorAll("#view-likes .product-card").length,
    2,
  );
  a.click('#view-likes [data-like="1"]');
  assert.equal(
    a.document.querySelectorAll("#view-likes .product-card").length,
    1,
  );
});

test("phone demo authentication unlocks the bid form", () => {
  const a = app();
  a.run("Store.data.user.onboardingComplete=true;Account.verify()");
  a.document.querySelector("#phone-input").value = "01012345678";
  a.click("#send-code");
  a.document.querySelector("#code-input").value = "123456";
  a.submit("#verify-form");
  assert.equal(a.run("Store.data.user.verified"), true);
  a.run('Nav.go("detail",{id:1})');
  a.click("#detail-bid");
  a.submit("#bid-form");
  a.click("#confirm-action");
  assert.equal(a.run("Store.auction(1).currentPrice"), 850000);
  assert.match(a.document.querySelector("#view-detail").textContent, /내 입찰/);
  assert.doesNotMatch(
    a.document.querySelector("#view-detail .bid-history").textContent,
    /얼리어답터/,
  );
});

test("flagged phone is rejected without replacing the account identity", () => {
  const a = app();
  a.run("Account.verify()");
  a.document.querySelector("#phone-input").value = "01000000000";
  a.click("#send-code");
  assert.match(a.document.querySelector("#verify-error").textContent, /제한/);
  assert.equal(a.run("Store.data.user.verified"), false);
});

test("chat sends escaped text and supports an explicit demo reply", () => {
  const a = app();
  a.run('Nav.go("chat",{id:"chat-1"})');
  a.document.querySelector("#message-input").value =
    "<img src=x onerror=alert(1)> 안녕하세요";
  a.submit("#message-form");
  assert.equal(a.document.querySelectorAll(".message-bubble img").length, 0);
  assert.equal(a.run("Store.data.chats[0].messages.length"), 2);
  a.click("#demo-reply");
  assert.equal(a.run("Store.data.chats[0].messages.length"), 3);
});

test("create and edit forms save a real product with a sample image", () => {
  const a = app();
  a.run(
    'Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Nav.go("create")',
  );
  a.click("#sample-photo");
  a.document.querySelector('[name="title"]').value = "내가 등록한 테스트 상품";
  a.document.querySelector('#product-form [name="description"]').value =
    "깨끗하게 사용한 테스트 상품입니다.";
  a.document.querySelector('[name="startingPrice"]').value = "20000";
  a.document.querySelector('[name="flaws"]').value = "하자 없음";
  a.document.querySelector('[name="components"]').value = "본품과 박스";
  a.submit("#product-form");
  a.click("#confirm-listing");
  assert.equal(
    a.document.querySelector("#create-error")?.textContent || "",
    "",
  );
  assert.equal(
    a.run("Store.data.auctions[0].title"),
    "내가 등록한 테스트 상품",
  );
  const id = a.run("Store.data.auctions[0].id");
  a.run('Nav.go("create",{id:' + id + "})");
  a.document.querySelector('[name="title"]').value = "수정한 테스트 상품";
  a.submit("#product-form");
  a.click("#confirm-listing");
  assert.equal(a.run("Store.auction(" + id + ").title"), "수정한 테스트 상품");
});

test("trade completion unlocks one review and displays it on the seller", () => {
  const a = app();
  a.run(
    'Store.data.user.onboardingComplete=true;Store.data.user.verified=true;Nav.go("trade",{id:"trade-demo"})',
  );
  fillAgreement(a);
  a.click("#agreement-accept");
  completeTrade(a);
  assert.equal(a.run("Store.data.trades[0].status"), "거래 완료");
  a.click("#trade-review");
  a.document.querySelector('[name="text"]').value =
    "친절하게 거래해 주셨습니다.";
  a.submit("#review-form");
  assert.equal(
    a.run('Store.data.reviews.filter(r=>r.tradeId==="trade-demo").length'),
    1,
  );
  a.run('Nav.go("seller",{id:"seller-2"})');
  assert.match(
    a.document.querySelector("#view-seller").textContent,
    /친절하게 거래/,
  );
});

test("support requests and reports remain accessible after navigation", () => {
  const a = app();
  a.run("SupportView.contact()");
  a.document.querySelector('[name="title"]').value = "거래 문의";
  a.document.querySelector('[name="body"]').value =
    "거래 단계를 확인하고 싶어요.";
  a.submit("#ticket-form");
  a.run('Nav.go("support")');
  assert.match(
    a.document.querySelector("#support-history").textContent,
    /거래 문의/,
  );
  a.run('Safety.report("seller-1",1)');
  a.document.querySelector('[name="detail"]').value =
    "설명과 다른 상품이 의심됩니다.";
  a.submit("#report-form");
  a.run('Nav.go("support")');
  assert.equal(a.document.querySelectorAll("[data-ticket]").length, 2);
});
