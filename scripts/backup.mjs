// Nightly copy of the database: `node scripts/backup.mjs`, run on a schedule (cron, or your host's scheduled tasks).
// Writes lockbox-YYYY-MM-DD.db into LOCKBOX_BACKUP_DIR with VACUUM INTO and keeps the newest 14.
// The copies hold sealed PINs and items only; they open with LOCKBOX_KEY, which is not in them.
import Database from "better-sqlite3";
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const KEEP = 14;
const NAME = /^lockbox-\d{4}-\d{2}-\d{2}\.db$/;

const source = join(process.env.LOCKBOX_DATA_DIR ?? ".data", "lockbox.db");
const dir = process.env.LOCKBOX_BACKUP_DIR;
if (!dir) throw new Error("LOCKBOX_BACKUP_DIR is not set");
// Never created here: a missing directory means the NFS mount is missing, and a copy on local disk would hide that.
if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`${dir} does not exist`);
if (!existsSync(source)) throw new Error(`${source} does not exist`);

const target = join(dir, `lockbox-${new Date().toISOString().slice(0, 10)}.db`);
if (existsSync(target)) {
  console.log(`${target} already exists`);
} else {
  // VACUUM INTO refuses an existing file, so a crashed run's partial copy goes first. The rename means a
  // half-written copy never carries the final name.
  const partial = `${target}.partial`;
  rmSync(partial, { force: true });
  const db = new Database(source, { readonly: true, fileMustExist: true });
  db.prepare("VACUUM INTO ?").run(partial);
  db.close();
  renameSync(partial, target);
  console.log(`wrote ${target}`);
}

const copies = readdirSync(dir).filter((f) => NAME.test(f)).sort();
for (const old of copies.slice(0, -KEEP)) {
  rmSync(join(dir, old));
  console.log(`removed ${old}`);
}
