// sql-storage-fake.ts — 테스트 전용: node:sqlite 위에 SqlStorage 부분 집합(exec·toArray·one·transactionSync) 모사만
// TASK-003 | REQ-017 | ARCH-018 | task-wall A-04 | devguide §2.2 L-14 (런타임 번들에 포함되지 않음)
import { DatabaseSync } from "node:sqlite";
import type { DurableStorageLike, SqlCursorLike, SqlStorageLike, SqlValue } from "../../src/storage/migrations";

/** DO SqlStorageCursor의 one(): 정확히 1행이 아니면 예외 (workerd 동작과 같게) */
class FakeCursor<T> implements SqlCursorLike<T> {
  private readonly rows: T[];
  constructor(rows: T[]) {
    this.rows = rows;
  }
  toArray(): T[] {
    return [...this.rows];
  }
  one(): T {
    if (this.rows.length !== 1) {
      const got = this.rows.length === 0 ? "no" : "more than one";
      throw new Error(`Expected exactly one result from SQL query, but got ${got} results.`);
    }
    return this.rows[0];
  }
}

/** ctx.storage 모사 — 메모리 SQLite, DO와 같이 외래 키 검사 켬 (A-03 실측: DO `PRAGMA foreign_keys` = 1) */
export class FakeDurableStorage implements DurableStorageLike {
  readonly db: DatabaseSync;
  readonly sql: SqlStorageLike;
  private depth = 0;

  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON");
    const db = this.db;
    this.sql = {
      exec<T extends Record<string, SqlValue> = Record<string, SqlValue>>(query: string, ...bindings: SqlValue[]) {
        const rows = db.prepare(query).all(...bindings) as unknown as T[];
        // node:sqlite 행은 null 프로토타입 객체 — 일반 객체로 복사
        return new FakeCursor<T>(rows.map((row) => ({ ...row }) as T));
      },
    };
  }

  /** DO transactionSync: 콜백이 던지면 전부 롤백 후 다시 던진다 (중첩은 SAVEPOINT) */
  transactionSync<T>(closure: () => T): T {
    const name = `sp_${this.depth}`;
    this.db.exec(`SAVEPOINT ${name}`);
    this.depth += 1;
    try {
      const result = closure();
      this.depth -= 1;
      this.db.exec(`RELEASE ${name}`);
      return result;
    } catch (err) {
      this.depth -= 1;
      this.db.exec(`ROLLBACK TO ${name}`);
      this.db.exec(`RELEASE ${name}`);
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}
