// Uploads dist/ to the cPanel host over SFTP. The server .htaccess keeps the blocks cPanel
// generates (PHP handler, ini directives); they are fetched first and appended to ours.
// Upload order: hashed asset folder (_astro) first, other folders and files next, .htaccess last,
// so a half-finished upload never serves HTML that points at missing assets.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative } from "node:path";

const { SFTP_HOST, SFTP_USER } = process.env;
const KEY = process.env.SFTP_KEY_PATH || join(homedir(), ".ssh", "pipolune_deploy");
const PORT = process.env.SFTP_PORT || "22";
const REMOTE = process.env.SFTP_REMOTE || "public_html";
const PHP = process.env.DEPLOY_PHP || "/opt/cpanel/ea-php82/root/usr/bin/php";
const DIST = "dist";
const ASSETS_DIR = "_astro";

if (!SFTP_HOST || !SFTP_USER) throw new Error("Set SFTP_HOST and SFTP_USER (locally in .env.deploy).");
if (!existsSync(join(DIST, "index.html"))) throw new Error("dist/ is missing; run npm run build first.");
if (!existsSync(join(DIST, ".htaccess"))) throw new Error("dist/.htaccess is missing; it must come from public/.htaccess.");

const slash = (p) => p.replaceAll("\\", "/");
const quote = (p) => `"${slash(p)}"`;
const work = mkdtempSync(join(tmpdir(), "site-deploy-"));
const sshOptions = ["-i", KEY, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes"];

function sftp(lines) {
  const batch = join(work, "batch.txt");
  writeFileSync(batch, `${lines.join("\n")}\n`);
  const res = spawnSync("sftp", ["-P", PORT, ...sshOptions, "-b", batch, `${SFTP_USER}@${SFTP_HOST}`], {
    encoding: "utf8",
  });
  if (res.status !== 0) {
    process.stderr.write(res.stdout + res.stderr);
    throw new Error(`sftp exited with ${res.status}`);
  }
}

function ssh(command) {
  return spawnSync("ssh", ["-p", PORT, ...sshOptions, `${SFTP_USER}@${SFTP_HOST}`, command], { encoding: "utf8" });
}

// Applies new SQL files in api/lib/migrations; the script tracks what already ran.
function migrateDatabase() {
  const res = ssh(`${PHP} ${REMOTE}/api/lib/bin/migrate.php`);
  process.stdout.write(res.stdout);
  if (res.status !== 0) {
    process.stderr.write(res.stderr);
    throw new Error(`Database migration failed (exit ${res.status}).`);
  }
}

// Queues new-product letters after the rebuilt pages are on the server. Does not fail the deploy.
function queueProductMail() {
  const res = ssh(`${PHP} ${REMOTE}/api/lib/bin/mail-announce.php`);
  process.stdout.write(res.stdout || "");
  if (res.status !== 0) {
    process.stderr.write(res.stderr || "");
    console.warn("Could not queue new-product emails.");
  }
}

// One line in the cPanel user's crontab. The script itself is quiet when there is nothing to send.
function ensureMailCron() {
  const command = [
    'mkdir -p "$HOME/logs"',
    `( crontab -l 2>/dev/null | grep -v "api/lib/bin/mail-cron.php" || true; echo "*/5 * * * * ${PHP} $HOME/${REMOTE}/api/lib/bin/mail-cron.php >> $HOME/logs/mail-cron.log 2>&1" ) | crontab -`,
  ].join(" && ");
  const res = ssh(command);
  if (res.status !== 0) {
    process.stderr.write(res.stderr || res.stdout || "");
    console.warn("Could not install the mail cron.");
    return;
  }
  console.log("Mail cron installed.");
}

// cPanel's ea-nginx proxy caches pages (it kept serving an empty "Index of /" after the first upload).
function clearServerCache() {
  const res = ssh("uapi NginxCaching clear_cache");
  if (res.status === 0 && /result:[\s\S]*?status: 1|errors: ~/.test(res.stdout)) console.log("Cleared nginx cache.");
  else console.warn(`Could not clear nginx cache (exit ${res.status}): ${(res.stderr || res.stdout).trim()}`);
}

try {
  const stage = join(work, "site");
  cpSync(DIST, stage, { recursive: true });

  const serverCopy = join(work, "htaccess.server");
  sftp([`get ${quote(`${REMOTE}/.htaccess`)} ${quote(serverCopy)}`]);
  const blocks = readFileSync(serverCopy, "utf8").match(
    /^# (?:php -- )?BEGIN cPanel-generated[\s\S]*?^# (?:php -- )?END cPanel-generated.*$/gm,
  );
  if (!blocks) throw new Error("No cPanel blocks in the server .htaccess; refusing to overwrite the PHP handler.");
  const ours = readFileSync(join(stage, ".htaccess"), "utf8").trimEnd();
  writeFileSync(join(stage, ".htaccess"), `${ours}\n\n${blocks.join("\n\n")}\n`);

  const dirs = [];
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        dirs.push(slash(relative(stage, p)));
        walk(p);
      } else files.push(slash(relative(stage, p)));
    }
  };
  walk(stage);

  const top = readdirSync(stage).sort();
  const topDirs = top.filter((n) => statSync(join(stage, n)).isDirectory());
  topDirs.sort((a, b) => (a === ASSETS_DIR ? -1 : b === ASSETS_DIR ? 1 : 0));
  const topFiles = top.filter((n) => !topDirs.includes(n) && n !== ".htaccess");

  sftp([
    `lcd ${quote(stage)}`,
    `cd ${REMOTE}`,
    ...topDirs.map((d) => `put -r ${d}`),
    ...topFiles.map((f) => `put ${f}`),
    "put .htaccess",
    ...dirs.map((d) => `chmod 755 ${d}`),
    ...files.map((f) => `chmod 644 ${f}`),
  ]);
  console.log(`Deployed ${files.length} files to ${REMOTE}.`);
  migrateDatabase();
  ensureMailCron();
  queueProductMail();
  clearServerCache();
} finally {
  rmSync(work, { recursive: true, force: true });
}
