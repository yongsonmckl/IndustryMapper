import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(rootDir, "..");
const webDir = path.join(repoDir, "web");
const webNextDir = path.join(webDir, ".next");
const rootNextDir = path.join(repoDir, ".next");
const webPublicDir = path.join(webDir, "public");
const rootPublicDir = path.join(repoDir, "public");

execSync("npm run build", {
  cwd: webDir,
  stdio: "inherit",
});

rmSync(rootNextDir, { force: true, recursive: true });
cpSync(webNextDir, rootNextDir, { recursive: true });

if (existsSync(webPublicDir)) {
  rmSync(rootPublicDir, { force: true, recursive: true });
  mkdirSync(path.dirname(rootPublicDir), { recursive: true });
  cpSync(webPublicDir, rootPublicDir, { recursive: true });
}
