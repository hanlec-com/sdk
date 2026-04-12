import { request } from "./api.js";

export interface ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListResult {
  keys: { key: string; size: number }[];
  cursor?: string;
  truncated: boolean;
}

/**
 * List objects in storage.
 *
 * ```ts
 * const result = await files.list({ prefix: "uploads/" });
 * ```
 */
export async function list(options?: ListOptions): Promise<ListResult> {
  const res = await request("/files", {
    method: "GET",
    params: {
      prefix: options?.prefix,
      limit: options?.limit?.toString(),
      cursor: options?.cursor,
    },
  });
  return res.json() as Promise<ListResult>;
}

/**
 * Check if a files exists and get its metadata. Returns `null` if not found.
 *
 * ```ts
 * const meta = await files.head("avatar.png");
 * if (meta) console.log(meta.size);
 * ```
 */
export async function head(
  key: string,
): Promise<{ size: number; etag: string; uploaded: string } | null> {
  const res = await request(`/files/${key}`, { method: "HEAD" });
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Get an file from storage. Returns `null` if not found.
 *
 * ```ts
 * const data = await files.get("avatar.png");
 * if (data) console.log(await data.text());
 * ```
 */
export async function get(key: string): Promise<Response | null> {
  const res = await request(`/files/${key}`, { method: "GET" });
  if (res.status === 204) return null;
  return res;
}

/**
 * Upload a file to storage.
 *
 * ```ts
 * await files.put("avatar.png", file);
 * ```
 */
export async function put(key: string, value: string | Blob): Promise<void> {
  await request(`/files/${key}`, { method: "PUT", body: value });
}

/**
 * Delete one or more files from storage.
 *
 * ```ts
 * await files.del("avatar.png");
 * await files.del(["a.png", "b.png"]);
 * ```
 */
export async function del(key: string | string[]): Promise<void> {
  if (Array.isArray(key)) {
    await Promise.all(
      key.map((k) => request(`/files/${k}`, { method: "DELETE" })),
    );
  } else {
    await request(`/files/${key}`, { method: "DELETE" });
  }
}

/**
 * Generate a short-lived public URL for a stored files. Safe to pass to the
 * browser (e.g. as an `<img src>`).
 *
 * ```ts
 * const url = await files.publicUrl("avatar.png");
 * // => "https://hanlec.com/sdki/dl?t=..."
 * ```
 */
export async function publicUrl(key: string): Promise<string> {
  const res = await request(`/files/${key}`, { method: "POST" });
  const data = (await res.json()) as { url: string };
  return data.url;
}
