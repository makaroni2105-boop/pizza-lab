/**
 * 単体テスト用インメモリ D1 モック。
 * Repository が発行する SQL パターンのみサポート（本番 D1 非接続）。
 */

import type { D1Database, D1PreparedStatement, D1Result, PizzaLabTableName } from "./d1-types";

type Row = Record<string, unknown>;

function emptyMeta(changes = 0): D1Result["meta"] {
  return {
    duration: 0,
    changes,
    last_row_id: 0,
    rows_read: 0,
    rows_written: changes,
  };
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function parseInsertTable(sql: string): string | null {
  const match = normalizeSql(sql).match(/^INSERT (?:OR REPLACE )?INTO (\w+)/i);
  return match?.[1] ?? null;
}

function parseFromTable(sql: string): string | null {
  const match = normalizeSql(sql).match(/ FROM (\w+)/i);
  return match?.[1] ?? null;
}

function parseDeleteTable(sql: string): string | null {
  const match = normalizeSql(sql).match(/^DELETE FROM (\w+)/i);
  return match?.[1] ?? null;
}

function parseUpdateTable(sql: string): string | null {
  const match = normalizeSql(sql).match(/^UPDATE (\w+)/i);
  return match?.[1] ?? null;
}

function parseInsertColumns(sql: string): string[] {
  const match = normalizeSql(sql).match(/\(([^)]+)\)\s*VALUES/i);
  if (!match) {
    return [];
  }

  return match[1].split(",").map((column) => column.trim());
}

function parseWhereEqualsColumns(sql: string): string[] {
  const whereMatch = normalizeSql(sql).match(/ WHERE (.+?)(?: ORDER BY|$)/i);
  if (!whereMatch) {
    return [];
  }

  return whereMatch[1]
    .split(/\s+AND\s+/i)
    .map((clause) => clause.match(/^(\w+)\s*=\s*\?/i)?.[1])
    .filter((column): column is string => Boolean(column));
}

function parseOrderBy(sql: string): { column: string; direction: "ASC" | "DESC" } | null {
  const match = normalizeSql(sql).match(/ ORDER BY (\w+)( ASC| DESC)?/i);
  if (!match) {
    return null;
  }

  return {
    column: match[1],
    direction: match[2]?.trim().toUpperCase() === "DESC" ? "DESC" : "ASC",
  };
}

function parseLimit(sql: string, bindingCount: number): { index: number | null; value: number | null } {
  const literalMatch = normalizeSql(sql).match(/ LIMIT (\d+)/i);
  if (literalMatch) {
    return { index: null, value: Number(literalMatch[1]) };
  }

  const placeholderMatch = normalizeSql(sql).match(/ LIMIT \?/i);
  if (placeholderMatch) {
    return { index: bindingCount - 1, value: null };
  }

  return { index: null, value: null };
}

function parseSetColumns(sql: string): string[] {
  const match = normalizeSql(sql).match(/^UPDATE \w+ SET (.+?) WHERE/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((part) => part.trim().split("=")[0]?.trim())
    .filter((column): column is string => Boolean(column));
}

function rowMatches(row: Row, columns: string[], bindings: unknown[]): boolean {
  return columns.every((column, index) => row[column] === bindings[index]);
}

class MemoryD1PreparedStatement implements D1PreparedStatement {
  private bindings: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly tables: Map<string, Row[]>,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const rows = await this.selectRows<T>();
    const first = rows[0] ?? null;

    if (first === null || colName === undefined) {
      return first;
    }

    return (first as Record<string, unknown>)[colName] as T;
  }

  async run(): Promise<D1Result> {
    const normalized = normalizeSql(this.sql);

    if (normalized.startsWith("INSERT")) {
      return this.runInsert();
    }

    if (normalized.startsWith("DELETE")) {
      return this.runDelete();
    }

    if (normalized.startsWith("UPDATE")) {
      return this.runUpdate();
    }

    return { success: true, meta: emptyMeta(0) };
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const results = await this.selectRows<T>();
    return {
      success: true,
      meta: emptyMeta(0),
      results,
    };
  }

  private getTable(name: string): Row[] {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }

    return this.tables.get(name)!;
  }

  private runInsert(): D1Result {
    const tableName = parseInsertTable(this.sql);
    if (!tableName) {
      return { success: false, meta: emptyMeta(0), error: "Unsupported INSERT" };
    }

    const columns = parseInsertColumns(this.sql);
    const row: Row = {};
    columns.forEach((column, index) => {
      row[column] = this.bindings[index];
    });

    const table = this.getTable(tableName);
    const primaryKey = columns[0];
    const existingIndex = table.findIndex((item) => item[primaryKey] === row[primaryKey]);

    if (existingIndex >= 0) {
      table[existingIndex] = row;
    } else {
      table.push(row);
    }

    return { success: true, meta: emptyMeta(1) };
  }

  private runDelete(): D1Result {
    const tableName = parseDeleteTable(this.sql);
    if (!tableName) {
      return { success: false, meta: emptyMeta(0), error: "Unsupported DELETE" };
    }

    const normalized = normalizeSql(this.sql);
    const table = this.getTable(tableName);

    if (normalized.includes("expires_at <= ?")) {
      const threshold = String(this.bindings[0]);
      const next = table.filter((row) => String(row.expires_at) > threshold);
      this.tables.set(tableName, next);
      return { success: true, meta: emptyMeta(table.length - next.length) };
    }

    const whereColumns = parseWhereEqualsColumns(this.sql);
    const next = table.filter((row) => !rowMatches(row, whereColumns, this.bindings));

    this.tables.set(tableName, next);
    return { success: true, meta: emptyMeta(table.length - next.length) };
  }

  private runUpdate(): D1Result {
    const tableName = parseUpdateTable(this.sql);
    if (!tableName) {
      return { success: false, meta: emptyMeta(0), error: "Unsupported UPDATE" };
    }

    const setColumns = parseSetColumns(this.sql);
    const whereColumns = parseWhereEqualsColumns(this.sql);
    const setBindingCount = setColumns.length;
    const setBindings = this.bindings.slice(0, setBindingCount);
    const whereBindings = this.bindings.slice(setBindingCount);

    const table = this.getTable(tableName);
    let changes = 0;

    for (const row of table) {
      if (!rowMatches(row, whereColumns, whereBindings)) {
        continue;
      }

      setColumns.forEach((column, index) => {
        row[column] = setBindings[index];
      });
      changes += 1;
    }

    return { success: true, meta: emptyMeta(changes) };
  }

  private async selectRows<T>(): Promise<T[]> {
    const tableName = parseFromTable(this.sql);
    if (!tableName) {
      return [];
    }

    let rows = [...this.getTable(tableName)];
    const whereColumns = parseWhereEqualsColumns(this.sql);

    if (whereColumns.length > 0) {
      rows = rows.filter((row) => rowMatches(row, whereColumns, this.bindings));
    }

    const normalized = normalizeSql(this.sql);

    if (normalized.includes("deleted_at IS NULL")) {
      rows = rows.filter((row) => row.deleted_at === null || row.deleted_at === undefined);
    }

    if (normalized.includes("expires_at > ?")) {
      const threshold = String(this.bindings[this.bindings.length - 1]);
      rows = rows.filter((row) => String(row.expires_at) > threshold);
    }

    if (normalized.includes("status = ?")) {
      const statusIndex = whereColumns.indexOf("status");
      if (statusIndex >= 0) {
        rows = rows.filter((row) => row.status === this.bindings[statusIndex]);
      }
    }

    const orderBy = parseOrderBy(this.sql);
    if (orderBy) {
      rows.sort((left, right) => {
        const leftValue = String(left[orderBy.column] ?? "");
        const rightValue = String(right[orderBy.column] ?? "");
        const cmp = leftValue.localeCompare(rightValue);
        return orderBy.direction === "DESC" ? -cmp : cmp;
      });
    }

    const limitInfo = parseLimit(this.sql, this.bindings.length);
    if (limitInfo.value !== null) {
      rows = rows.slice(0, limitInfo.value);
    } else if (limitInfo.index !== null) {
      const limit = Number(this.bindings[limitInfo.index]);
      rows = rows.slice(0, limit);
    }

    return rows as T[];
  }
}

export class MemoryD1Database implements D1Database {
  private readonly tables = new Map<string, Row[]>();

  prepare(query: string): D1PreparedStatement {
    return new MemoryD1PreparedStatement(query, this.tables);
  }

  /** テスト用: テーブルに行を投入 */
  seed(table: PizzaLabTableName | string, rows: Row[]): void {
    this.tables.set(table, rows.map((row) => ({ ...row })));
  }

  /** テスト用: テーブル全行取得 */
  rows(table: PizzaLabTableName | string): Row[] {
    return [...(this.tables.get(table) ?? [])];
  }

  clear(): void {
    this.tables.clear();
  }
}

export function createMemoryD1(): MemoryD1Database {
  return new MemoryD1Database();
}
