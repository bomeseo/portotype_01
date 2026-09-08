const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  php = process.env.BULLTY_PHP || "php";
const available = spawnSync(php, ["-v"], { windowsHide: true }).status === 0;
test(
  "real HTTP sessions, SQLite persistence, private chat, bans, CSRF and SMS verification",
  { skip: !available, timeout: 60000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bullty-test-"));
    const literal = (s) =>
      "'" + s.replaceAll("\\", "/").replaceAll("'", "\\'") + "'";
    const config = path.join(tmp, "config.php");
    const dbFile = path.join(tmp, "data.sqlite");
    const codeFile = path.join(tmp, "code.txt");
    fs.writeFileSync(
      config,
      `<?php return ['dsn'=>${literal("sqlite:" + dbFile)},'require_https'=>false,'sms_sender'=>function($phone,$code){file_put_contents(${literal(codeFile)},$code);return true;}];`,
    );
    const setup = path.join(tmp, "setup.php");
    fs.writeFileSync(
      setup,
      `<?php require ${literal(path.join(root, "server/members.php"))};$p=new PDO(${literal("sqlite:" + dbFile)});$p->exec('CREATE TABLE bullty_lock(id INTEGER PRIMARY KEY);INSERT INTO bullty_lock VALUES(1);CREATE TABLE bullty_records(collection TEXT,id TEXT,payload TEXT,PRIMARY KEY(collection,id));');member_schema($p);$im=imagecreatetruecolor(10,10);imagepng($im,${literal(path.join(tmp, "image.png"))});`,
    );
    const args = [
      "-d",
      "extension_dir=" + path.join(path.dirname(php), "ext"),
      "-d",
      "extension=pdo_sqlite",
      "-d",
      "extension=gd",
    ];
    const init = spawnSync(php, [...args, setup], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(init.status, 0, init.stderr || init.stdout);
    const listener = net.createServer();
    await new Promise((r) => listener.listen(0, "127.0.0.1", r));
    const port = listener.address().port;
    await new Promise((r) => listener.close(r));
    const server = spawn(
      php,
      [...args, "-S", "127.0.0.1:" + port, "-t", root, "server/dev-router.php"],
      {
        cwd: root,
        env: { ...process.env, BULLTY_CONFIG: config },
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    const url = "http://127.0.0.1:" + port + "/api/index.php";
    let log = "";
    server.stderr.on("data", (x) => (log += x));
    const uploaded = [];
    try {
      for (let n = 0; n < 80; n++) {
        try {
          await fetch(url);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      function client() {
        let cookie = "",
          csrf = "";
        return async (op, values = {}, bad = false) => {
          const response = await fetch(url, {
            method: op ? "POST" : "GET",
            headers: {
              Cookie: cookie,
              ...(op
                ? {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": bad ? "wrong" : csrf,
                  }
                : {}),
            },
            body: op ? JSON.stringify({ op, ...values }) : undefined,
          });
          const set = response.headers.getSetCookie();
          if (set.length) cookie = set.map((s) => s.split(";")[0]).join("; ");
          const body = await response.json();
          if (body.csrf) csrf = body.csrf;
          return body;
        };
      }
      const seller = client(),
        buyer = client(),
        other = client();
      await seller();
      await buyer();
      await other();
      for (const [call, email] of [
        [seller, "seller@example.test"],
        [buyer, "buyer@example.test"],
        [other, "other@example.test"],
      ]) {
        const r = await call("register", {
          username: email.split("@")[0],
          email,
          password: "test-password-2026",
          name: email.split("@")[0],
        });
        assert.equal(r.ok, true, JSON.stringify(r));
      }
      const denied = await seller(
        "settings",
        { values: { name: "wrong" } },
        true,
      );
      assert.equal(denied.ok, false);
      const image =
        "data:image/png;base64," +
        fs.readFileSync(path.join(tmp, "image.png")).toString("base64");
      const upload = await seller("upload", { image });
      assert.equal(upload.ok, true, JSON.stringify(upload));
      uploaded.push(upload.result);
      const values = {
        title: "HTTP 상품",
        description: "실제 HTTP 통신을 검증하는 상품",
        location: "서울",
        category: "digital",
        subcategory: "헤드폰",
        brand: "",
        model: "",
        condition: "거의 새것",
        method: "직거래",
        startingPrice: 1000,
        minStep: 100,
        duration: 24,
        images: [upload.result],
      };
      const product = await seller("saveAuction", { values });
      assert.equal(product.ok, true, JSON.stringify(product));
      const id = product.result;
      assert.equal((await other("deleteAuction", { id })).ok, false);
      assert.equal((await buyer("bid", { id, amount: 1000 })).ok, true);
      const room = await buyer("chat", { id });
      assert.equal(room.ok, true);
      const roomId = room.result.id;
      assert.equal(
        (
          await buyer("send", {
            id: roomId,
            text: "안녕하세요",
            requestId: "stable-message",
          })
        ).ok,
        true,
      );
      await buyer("send", {
        id: roomId,
        text: "안녕하세요",
        requestId: "stable-message",
      });
      const inbox = await seller();
      assert.equal(inbox.state.chats[0].messages.length, 1);
      assert.equal(inbox.state.chats[0].unread, 1);
      assert.equal((await other()).state.chats.length, 0);
      assert.equal((await other("readRoom", { id: roomId })).ok, false);
      const buyerId = inbox.state.chats[0].peerId;
      await seller("block", { id: buyerId, blocked: true });
      assert.equal(
        (
          await buyer("send", {
            id: roomId,
            text: "blocked",
            requestId: "blocked",
          })
        ).ok,
        false,
      );
      assert.equal((await seller("adminList")).ok, false);
      const support = await buyer("ticket", {
        title: "문의입니다",
        body: "답변을 부탁드립니다.",
        type: "기타",
      });
      assert.equal(support.ok, true);
      assert.equal(support.state.tickets[0].mailStatus, "failed");
      await buyer("logout");
      assert.equal((await buyer()).state.authenticated, false);
      assert.equal(
        (
          await buyer("login", {
            email: "buyer@example.test",
            password: "wrong-password",
          })
        ).ok,
        false,
      );
      const login = await buyer("login", {
        email: "buyer@example.test",
        password: "test-password-2026",
      });
      assert.equal(login.ok, true);
      assert.equal(login.state.chats[0].messages.length, 1);
      const otp = await buyer("requestCode", { phone: "01011112222" });
      assert.equal(otp.ok, true, JSON.stringify(otp));
      assert.equal(
        (await buyer("verifyCode", { phone: "01011112222", code: "000000" }))
          .ok,
        false,
      );
      const verified = await buyer("verifyCode", {
        phone: "01011112222",
        code: fs.readFileSync(codeFile, "utf8"),
      });
      assert.equal(verified.ok, true);
      assert.equal(verified.state.user.verified, true);
      assert.equal(
        (
          await buyer("verifyCode", {
            phone: "01011112222",
            code: fs.readFileSync(codeFile, "utf8"),
          })
        ).ok,
        false,
      );
      const promote = path.join(tmp, "promote.php");
      fs.writeFileSync(
        promote,
        `<?php require ${literal(path.join(root, "server/bootstrap.php"))};$db=load_db($pdo);$before=$db;foreach($db['users'] as $id=>$u)if(($u['email']??'')==='seller@example.test')$db['users'][$id]['role']='admin';save_db($pdo,$before,$db);`,
      );
      const promoted = spawnSync(php, [...args, promote], {
        env: { ...process.env, BULLTY_CONFIG: config },
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(promoted.status, 0, promoted.stderr);
      assert.equal((await seller("adminList")).ok, true);
      assert.equal(
        (
          await seller("adminUser", {
            id: buyerId,
            banned: true,
            reason: "테스트로 확인된 사기",
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await buyer("send", {
            id: roomId,
            text: "정지 후 요청",
            requestId: "after-ban",
          })
        ).ok,
        false,
      );
      assert.equal(
        (await buyer("requestCode", { phone: "01011112222" })).ok,
        false,
      );
      assert.equal(
        (
          await seller("adminUser", {
            id: buyerId,
            banned: false,
            reason: "검증 후 해제",
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await seller("adminTicket", {
            id: support.result,
            kind: "tickets",
            reason: "문의 답변입니다.",
          })
        ).ok,
        true,
      );
      assert.equal((await buyer()).state.tickets[0].answer, "문의 답변입니다.");
      const second = client();
      await second();
      assert.equal(
        (
          await second("login", {
            identity: "buyer",
            password: "test-password-2026",
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await buyer("changePassword", {
            currentPassword: "incorrect-pass",
            newPassword: "new-password-2026",
          })
        ).ok,
        false,
      );
      assert.equal(
        (
          await buyer("changePassword", {
            currentPassword: "test-password-2026",
            newPassword: "new-password-2026",
          })
        ).ok,
        true,
      );
      assert.equal((await second()).state.authenticated, false);
      assert.equal(
        (
          await second("login", {
            identity: "buyer",
            password: "new-password-2026",
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await buyer("settings", {
            values: {
              name: "수정한 회원",
              location: "서울",
              publicHistory: true,
              interests: ["digital"],
              rating: 5,
              role: "admin",
            },
          })
        ).ok,
        true,
      );
      const stored = await buyer();
      assert.equal(stored.state.user.name, "수정한 회원");
      assert.equal(stored.state.user.role, "member");
      assert.equal(stored.state.user.rating, null);
      assert.equal(
        (
          await buyer("send", {
            id: roomId,
            text: "계좌",
            kind: "account",
            bank: "테스트은행",
            number: "1234567890",
            holder: "구매자",
            requestId: "account-share",
          })
        ).ok,
        false,
      );
      await seller("block", { id: buyerId, blocked: false });
      assert.equal(
        (
          await buyer("send", {
            id: roomId,
            text: "계좌",
            kind: "account",
            bank: "테스트은행",
            number: "1234567890",
            holder: "구매자",
            requestId: "account-share",
          })
        ).ok,
        true,
      );
      const accounts = (await seller("adminList")).result.accounts;
      const account = accounts.find((a) => a.uid === buyerId);
      assert.equal((await other()).state.accounts, undefined);
      assert.equal(
        (
          await seller("adminFraud", {
            id: buyerId,
            kind: "account",
            accountKey: account.key,
            reason: "증거 자료 확인 완료",
          })
        ).ok,
        true,
      );
      assert.equal((await buyer()).state.user.status, "banned");
      assert.equal(
        (
          await seller("adminUser", {
            id: buyerId,
            banned: false,
            reason: "일반 해제 시도",
          })
        ).ok,
        false,
      );
      const inspect = path.join(tmp, "inspect.php");
      fs.writeFileSync(
        inspect,
        `<?php require ${literal(path.join(root, "server/bootstrap.php"))};$rows=$pdo->query('SELECT username,password_hash,role,rating,review_count FROM bullty_members')->fetchAll(PDO::FETCH_ASSOC);echo json_encode($rows);`,
      );
      const persisted = spawnSync(php, [...args, inspect], {
        env: { ...process.env, BULLTY_CONFIG: config },
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(persisted.status, 0, persisted.stderr);
      const members = JSON.parse(persisted.stdout);
      assert.equal(members.length, 3);
      assert.ok(members.every((m) => m.password_hash.startsWith("$2")));
      const hidden = await fetch(
        "http://127.0.0.1:" + port + "/server/bootstrap.php",
      );
      assert.equal(hidden.status, 404);
    } finally {
      server.kill();
      await new Promise((r) => server.once("exit", r));
      for (const file of uploaded) fs.unlinkSync(path.join(root, file));
      if (
        path.dirname(tmp) === os.tmpdir() &&
        path.basename(tmp).startsWith("bullty-test-")
      )
        fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
test(
  "PHP domain authorization and settlement invariants",
  { skip: !available },
  () => {
    const result = spawnSync(php, ["tests/server-domain.php"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(JSON.parse(result.stdout).passed >= 21);
  },
);
