import type Database from 'better-sqlite3';

interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
}

export class ConfigRepository {
  private _getStmt: Database.Statement<string> | undefined;
  private _setStmt: Database.Statement<{ key: string; value: string; updated_at: string }> | undefined;
  private _deleteStmt: Database.Statement<string> | undefined;
  private _getAllStmt: Database.Statement | undefined;

  constructor(private readonly db: Database.Database) {}

  private lazyInit() {
    if (!this._getStmt) {
      this._getStmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?');
      this._setStmt = this.db.prepare(
        'INSERT INTO app_config (key, value, updated_at) VALUES (@key, @value, @updated_at) ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = @updated_at'
      );
      this._deleteStmt = this.db.prepare('DELETE FROM app_config WHERE key = ?');
      this._getAllStmt = this.db.prepare('SELECT key, value FROM app_config');
    }
  }

  get(key: string): string | undefined {
    this.lazyInit();
    const row = this._getStmt!.get(key) as { value: string } | undefined;
    return row?.value;
  }

  set(key: string, value: string): void {
    this.lazyInit();
    this._setStmt!.run({ key, value, updated_at: new Date().toISOString() });
  }

  delete(key: string): void {
    this.lazyInit();
    this._deleteStmt!.run(key);
  }

  getAll(): Record<string, string> {
    this.lazyInit();
    const rows = this._getAllStmt!.all() as Array<{ key: string; value: string }>;
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }
}
