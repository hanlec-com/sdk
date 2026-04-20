import { request } from "./request.js";
import * as XJSON from "./xjson.js";

interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
}

/**
 * Tagged template literal for SQL queries.
 *
 * ```ts
 * const users = await sql`SELECT * FROM users WHERE id = ${id}`;
 * ```
 */
export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  let query = strings[0]!;
  for (let i = 0; i < values.length; i++) {
    query += `$${i + 1}` + strings[i + 1]!;
  }

  const res = await request("/sql", {
    method: "POST",
    body: { query, params: values },
  });

  const body = XJSON.parse(await res.text()) as QueryResult<T>;
  return body.rows;
}

/** @internal */
export async function sqlRaw(query: string): Promise<void> {
  await request("/sql", {
    method: "POST",
    body: { query, params: [] },
  });
}
