const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
function prepare({ output, dbUser = "bullty", dbName = "bullty", password }) {
  const root = path.resolve(__dirname, "..");
  output = path.resolve(output);
  if (output === root || output.startsWith(root + path.sep))
    throw Error("Private files must be outside the public project.");
  fs.mkdirSync(output, { recursive: true });
  const php = (s) =>
    "'" + s.replaceAll("\\", "\\\\").replaceAll("'", "\\'") + "'";
  const sql = (s) => "'" + s.replaceAll("'", "''") + "'";
  const config = path.join(output, "bullty-config.php");
  if (!fs.existsSync(config))
    fs.writeFileSync(
      config,
      `<?php\nreturn ['dsn'=>${php("mysql:host=localhost;dbname=" + dbName + ";charset=utf8mb4")},'user'=>${php(dbUser)},'password'=>${php(password)},'require_https'=>true,'support_email'=>'','mail_from'=>'','sms_sender'=>null];\n`,
      { flag: "wx", mode: 0o600 },
    );
  const credentials = path.join(output, "admin-credentials.txt"),
    bootstrap = path.join(output, "admin-bootstrap.sql");
  if (fs.existsSync(credentials) || fs.existsSync(bootstrap))
    throw Error("Administrator files already exist; refusing to overwrite.");
  let instructions =
    "불티 관리자 초기 계정\nDB에 admin-bootstrap.sql을 가져온 뒤 사용할 수 있습니다. 최초 로그인 후 비밀번호를 변경하세요.\n\n";
  let statements =
    "-- Import server/schema.sql first. No existing members are overwritten.\nSTART TRANSACTION;\nSELECT id FROM bullty_lock WHERE id=1 FOR UPDATE;\n";
  for (let i = 1; i <= 2; i++) {
    const username = "bullty_admin" + i,
      secret = crypto.randomBytes(18).toString("hex");
    const profile = JSON.stringify({
      bio: "",
      location: "",
      method: "둘 다",
      verified: false,
      interests: [],
      publicHistory: false,
      showOnline: true,
      dnd: { enabled: false, start: "23:00", end: "08:00" },
      passwordChangeRequired: true,
      createdAt: Date.now(),
    });
    const row = [
      crypto.randomBytes(16).toString("hex"),
      username,
      bcrypt.hashSync(secret, 12).replace(/^\$2b\$/, "$2y$"),
      "운영자 " + i,
      "admin",
      "active",
      profile,
    ]
      .map(sql)
      .join(",");
    statements += `INSERT INTO bullty_members(id,username,password_hash,name,role,status,profile) SELECT ${row} WHERE NOT EXISTS (SELECT 1 FROM bullty_members WHERE username=${sql(username)}) AND (SELECT COUNT(*) FROM bullty_members WHERE role='admin')<2;\n`;
    instructions += `아이디: ${username}\n초기 비밀번호: ${secret}\n\n`;
  }
  statements += "COMMIT;\n";
  fs.writeFileSync(credentials, instructions, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(bootstrap, statements, { flag: "wx", mode: 0o600 });
  return { config, credentials, bootstrap };
}
module.exports = { prepare };
if (require.main === module) {
  const output = process.argv[2];
  if (!output) throw Error("Provide a private output directory.");
  let password = process.env.BULLTY_DB_PASSWORD;
  if (process.argv[3]) {
    const memo = fs.readFileSync(process.argv[3], "utf8");
    password = memo.match(/^비밀번호:\s*(.+)$/m)?.[1]?.trim();
  }
  if (!password) throw Error("DB password is missing.");
  prepare({ output, password });
  console.log(
    "Private DB configuration and two initial administrator import records prepared. No database connection was attempted.",
  );
}
