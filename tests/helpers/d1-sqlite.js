import { Database } from 'bun:sqlite';
export function sqliteD1(schema) {
  const raw = new Database(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  raw.exec(schema);
  const prepare = (sql, args = []) => ({
    bind: (...values) => prepare(sql, values),
    first: async () => raw.query(sql).get(...args),
    all: async () => ({ success: true, results: raw.query(sql).all(...args) }),
    run: async () => execute(sql, args),
    execute: () => execute(sql, args),
  });
  const execute = (sql, args) => { const result = raw.query(sql).run(...args); return { success: true, results: [], meta: { changes: result.changes } }; };
  return { raw, prepare, batch: async (statements) => raw.transaction(() => statements.map((statement) => statement.execute()))(), close: () => raw.close() };
}
