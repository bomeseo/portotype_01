const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const Parser = require("php-parser"),
  bcrypt = require("bcryptjs");
const { prepare } = require("../scripts/prepare-dothome.cjs");
const root = path.resolve(__dirname, "..");
test("all PHP endpoints and migration helpers have valid PHP syntax", () => {
  const parser = new Parser({
    parser: { version: "8.4", suppressErrors: false },
  });
  for (const dir of ["server", "api", "tests"])
    for (const name of fs.readdirSync(path.join(root, dir)))
      if (name.endsWith(".php"))
        assert.doesNotThrow(() =>
          parser.parseCode(
            fs.readFileSync(path.join(root, dir, name), "utf8"),
            name,
          ),
        );
});
test("private preparation creates two independent hashed admin accounts without leaking DB password", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "bullty-private-test-"));
  try {
    const files = prepare({ output, password: "db-test-secret" }),
      sql = fs.readFileSync(files.bootstrap, "utf8"),
      secrets = fs.readFileSync(files.credentials, "utf8");
    const passwords = [...secrets.matchAll(/초기 비밀번호: (\w+)/g)].map(
      (m) => m[1],
    );
    const hashes = [...sql.matchAll(/\$2y\$[^']+/g)].map((m) => m[0]);
    assert.equal(passwords.length, 2);
    assert.notEqual(passwords[0], passwords[1]);
    hashes.forEach((hash, i) => {
      assert.ok(bcrypt.compareSync(passwords[i], hash));
      assert.ok(!sql.includes(passwords[i]));
    });
    assert.ok(!sql.includes("db-test-secret"));
    assert.match(sql, /passwordChangeRequired/);
    assert.throws(
      () => prepare({ output, password: "new-value" }),
      /already exist/,
    );
  } finally {
    if (
      path.dirname(output) === os.tmpdir() &&
      path.basename(output).startsWith("bullty-private-test-")
    )
      fs.rmSync(output, { recursive: true, force: true });
  }
});
