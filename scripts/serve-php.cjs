const { spawn } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const child = spawn(
  process.env.BULLTY_PHP || "php",
  ["-S", "127.0.0.1:8080", "-t", root, "server/dev-router.php"],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
child.on("error", () => {
  console.error(
    "PHP 8.0+ is required. Set BULLTY_PHP to your PHP executable and BULLTY_CONFIG to the private configuration file.",
  );
  process.exitCode = 1;
});
child.on("spawn", () => console.log("Local: http://127.0.0.1:8080"));
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
