const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function session(saved) {
  const records = new Map(saved ? [["live-auction-prototype-v3", saved]] : []);
  const context = vm.createContext({
    console,
    Date,
    Math,
    JSON,
    Set,
    Map,
    localStorage: {
      getItem: (k) => records.get(k) || null,
      setItem: (k, v) => records.set(k, v),
    },
    document: {
      dispatchEvent() {},
      getElementById() {
        return null;
      },
    },
    CustomEvent: class {},
    crypto: require("node:crypto").webcrypto,
  });
  for (const file of [
    "js/data.js",
    "app/seed.js",
    "app/helpers.js",
    "app/icons.js",
    "app/store.js",
  ])
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {
      filename: file,
    });
  vm.runInContext("Store.init()", context);
  return { run: (code) => vm.runInContext(code, context), records };
}
test("fresh sessions contain useful demo products without fake payment balances", () => {
  const s = session();
  assert.equal(s.run("Store.data.auctions.length"), 6);
  assert.equal(s.run("Store.data.user.verified"), false);
  assert.equal(s.run("'deposit' in Store.data.user"), false);
});
test("likes persist and survive a new session", () => {
  const s = session();
  s.run("Store.like(2)");
  const reopened = session(s.records.get("live-auction-prototype-v3"));
  assert.equal(reopened.run("Store.data.likes.includes(2)"), true);
  assert.equal(reopened.run("Store.auction(2).likes"), 25);
});
test("corrupt storage recovers to usable fixtures", () => {
  const s = session("{broken");
  assert.equal(s.run("Store.data.auctions.length"), 6);
});
test("unverified members cannot bid", () => {
  assert.throws(() => session().run("Store.bid(1,850000)"), /인증/);
});
test("restricted members cannot bid", () => {
  const s = session();
  s.run('Store.data.user.verified=true;Store.data.user.status="banned"');
  assert.throws(() => s.run("Store.bid(1,850000)"), /제한/);
});
test("bid step and minimum are enforced, including stale amounts", () => {
  const s = session();
  s.run("Store.data.user.verified=true");
  assert.throws(() => s.run("Store.bid(1,845000)"), /단위/);
  s.run("Store.bid(1,850000)");
  assert.throws(() => s.run("Store.bid(1,850000)"), /단위/);
  assert.equal(s.run("Store.auction(1).currentPrice"), 850000);
  assert.equal(s.run("Store.auction(1).bidHistory[0].userId"), "me");
});
test("a seller cannot bid on their own product", () => {
  const s = session();
  s.run("Store.data.user.verified=true");
  assert.throws(() => s.run("Store.bid(6,185000)"), /내 상품/);
});
test("blocked sellers cannot receive bids or new chats", () => {
  const s = session();
  s.run('Store.data.user.verified=true;Store.data.blocked.push("seller-1")');
  assert.throws(() => s.run("Store.bid(1,850000)"), /거래할 수/);
  assert.throws(() => s.run("Store.chat(1)"), /차단/);
});
test("expired auctions settle once and create one winning trade", () => {
  const s = session();
  s.run(
    "Store.data.user.verified=true;Store.bid(1,850000);Store.auction(1).endTime=Date.now()-1;Store.settleExpired();Store.settleExpired()",
  );
  assert.equal(s.run("Store.data.trades.filter(t=>t.auctionId===1).length"), 1);
  assert.equal(s.run("Store.auction(1).status"), "ended");
  assert.throws(() => s.run("Store.bid(1,860000)"), /종료/);
});
test("no-bid auctions become unsold without a trade", () => {
  const s = session();
  s.run("Store.auction(6).endTime=Date.now()-1;Store.settleExpired()");
  assert.equal(s.run("Store.auction(6).status"), "unsold");
  assert.equal(s.run("Store.data.trades.some(t=>t.auctionId===6)"), false);
});
test("new products validate images, prices and ownership", () => {
  const s = session();
  s.run("Store.data.user.verified=true");
  const values =
    '({title:"테스트 상품",description:"실사용 상품입니다",startingPrice:10000,minStep:1000,images:["test.jpg"],location:"성수역",endTime:Date.now()+3600000,category:"digital"})';
  s.run("Store.saveAuction(" + values + ")");
  assert.equal(s.run("Store.data.auctions[0].sellerId"), "me");
  assert.throws(
    () => s.run("Store.saveAuction({..." + values + ",images:[]})"),
    /사진/,
  );
  assert.throws(
    () => s.run("Store.saveAuction({..." + values + ",startingPrice:-1000})"),
    /시작가/,
  );
  assert.throws(() => s.run("Store.saveAuction(" + values + ",1)"), /권한/);
});
test("only own unbid products can be edited or deleted", () => {
  const s = session();
  s.run(
    'Store.data.user.verified=true;Store.saveAuction({...Store.auction(6),title:"수정된 상품"},6)',
  );
  assert.equal(s.run("Store.auction(6).title"), "수정된 상품");
  s.run("Store.auction(6).bidsCount=1");
  assert.throws(
    () => s.run('Store.saveAuction({...Store.auction(6),title:"다시 수정"},6)'),
    /수정/,
  );
  assert.throws(() => s.run("Store.deleteAuction(6)"), /삭제/);
  assert.throws(() => s.run("Store.deleteAuction(1)"), /권한/);
});
test("deleted products are marked without erasing historical records", () => {
  const s = session();
  s.run("Store.deleteAuction(6)");
  assert.equal(s.run("Store.auction(6).status"), "deleted");
});
test("opening the same product chat does not duplicate rooms", () => {
  const s = session();
  s.run("Store.chat(2);Store.chat(2)");
  assert.equal(s.run("Store.data.chats.filter(c=>c.auctionId===2).length"), 1);
});
test("blocked peers retain history but cannot receive messages", () => {
  const s = session();
  s.run(
    'Store.send("chat-1","안녕하세요");Store.data.blocked.push("seller-1")',
  );
  assert.throws(() => s.run('Store.send("chat-1","추가 메시지")'), /차단/);
  assert.equal(s.run("Store.data.chats[0].messages.length"), 2);
});
test("messages reject empty content and keep plain text intact", () => {
  const s = session();
  assert.throws(() => s.run('Store.send("chat-1","   ")'), /메시지/);
  s.run('Store.send("chat-1","<script>alert(1)</script>")');
  assert.equal(
    s.run("Store.data.chats[0].messages.at(-1).text"),
    "<script>alert(1)</script>",
  );
  assert.equal(
    s.run("esc(Store.data.chats[0].messages.at(-1).text)"),
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  );
});
test("quiet hours cover midnight and same-time all-day settings", () => {
  const s = session();
  assert.equal(
    s.run(
      'isDnd({dnd:{enabled:true,start:"23:00",end:"08:00"}},new Date(2026,8,6,1,30))',
    ),
    true,
  );
  assert.equal(
    s.run(
      'isDnd({dnd:{enabled:true,start:"23:00",end:"08:00"}},new Date(2026,8,6,12,0))',
    ),
    false,
  );
  assert.equal(
    s.run(
      'isDnd({dnd:{enabled:true,start:"08:00",end:"08:00"}},new Date(2026,8,6,12,0))',
    ),
    true,
  );
});
test("price injection and title markup are escaped", () => {
  const s = session();
  assert.equal(
    s.run("esc('<img src=x onerror=\"alert(1)\">')"),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
});
