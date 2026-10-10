import fs from "fs";
import path from "path";

/**
 * Creates a safety backup of local SQLite database files (local.db).
 * Stores timestamped files in .backups/ with a rolling retention policy.
 */
export async function createLocalDatabaseBackup(label: string = "manual"): Promise<string | null> {
  try {
    const dbPath = path.resolve(process.cwd(), "local.db");
    if (!fs.existsSync(dbPath)) {
      // No local.db file exists (e.g. running purely on Turso cloud or in-memory)
      return null;
    }

    const backupDir = path.resolve(process.cwd(), ".backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `local-db-${label}-${timestamp}.bak`;
    const targetPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(dbPath, targetPath);

    // Prune backups older than 14 entries
    pruneOldBackups(backupDir, 14);

    return targetPath;
  } catch (error) {
    console.error("Failed to create database backup:", error);
    return null;
  }
}

function pruneOldBackups(dir: string, maxFiles: number) {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".bak"))
      .map((f) => ({
        name: f,
        path: path.join(dir, f),
        time: fs.statSync(path.join(dir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxFiles) {
      const toDelete = files.slice(maxFiles);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
      }
    }
  } catch (e) {
    console.warn("Could not prune old backups:", e);
  }
}
