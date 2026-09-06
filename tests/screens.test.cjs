const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { parseHTML } = require("linkedom");
const root = path.resolve(__dirname, "..");

// Linkedom supplies the DOM; these standard form/dialog shims keep this a unit
// test harness rather than a browser or a network-dependent end-to-end suite.
function app() {
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
  const records = new Map();
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
  return {
    document,
    run: (source) => vm.runInContext(source, context),
    click: (selector) => {
      const button = document.querySelector(selector);
      assert.ok(button, "Missing control: " + selector);
      button.click();
    },
    submit: (selector) => {
      const form = document.querySelector(selector);
      form.onsubmit({ preventDefault() {}, target: form });
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
  a.run("Account.verify()");
  a.document.querySelector("#phone-input").value = "01012345678";
  a.click("#send-code");
  a.document.querySelector("#code-input").value = "123456";
  a.submit("#verify-form");
  assert.equal(a.run("Store.data.user.verified"), true);
  a.run('Nav.go("detail",{id:1})');
  a.click("#detail-bid");
  a.submit("#bid-form");
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
  a.run('Store.data.user.verified=true;Nav.go("create")');
  a.click("#sample-photo");
  a.document.querySelector('[name="title"]').value = "내가 등록한 테스트 상품";
  a.document.querySelector('#product-form [name="description"]').value =
    "깨끗하게 사용한 테스트 상품입니다.";
  a.document.querySelector('[name="startingPrice"]').value = "20000";
  a.submit("#product-form");
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
  assert.equal(a.run("Store.auction(" + id + ").title"), "수정한 테스트 상품");
});

test("trade completion unlocks one review and displays it on the seller", () => {
  const a = app();
  a.run('Nav.go("profile",{tab:"trades"})');
  for (let i = 0; i < 3; i++) {
    a.click('[data-advance="trade-demo"]');
    a.click("#confirm-action");
  }
  assert.equal(a.run("Store.data.trades[0].status"), "거래 완료");
  a.click('[data-review="trade-demo"]');
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
