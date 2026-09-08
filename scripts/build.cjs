/* Build only public assets. Development tools and fixtures outside the entry graph stay private. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
// Only remove the known generated output directory inside this checkout.
if (
  path.resolve(output) !== path.join(root, "dist") ||
  !output.startsWith(root + path.sep)
)
  throw new Error("Unsafe build output");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith("#") && !/^https?:/.test(p));
for (const file of ["index.html", ...assets]) {
  const source = path.resolve(root, file);
  if (!source.startsWith(root + path.sep))
    throw new Error("Asset outside project: " + file);
  if (!fs.existsSync(source)) throw new Error("Missing asset: " + file);
  if (file.endsWith(".js"))
    new vm.Script(fs.readFileSync(source, "utf8"), { filename: file });
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
console.log(
  "Built " + (assets.length + 1) + " validated public assets to dist.",
);
for (const file of [
  "api/index.php",
  "server/bootstrap.php",
  "server/domain.php",
  "server/members.php",
  "server/.htaccess",
  "server/schema.sql",
  "server/manage.php",
  "uploads/.htaccess",
]) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
fs.writeFileSync(
  path.join(output, ".htaccess"),
  'Options -Indexes\n<FilesMatch "^(?:bullty-config\\.php|\\.env.*)$">\nRequire all denied\n</FilesMatch>\n',
);
console.log(
  "Included PHP endpoints and protected server files. Deploy this package only to a PHP host.",
);
