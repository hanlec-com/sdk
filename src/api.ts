import * as XJSON from "./xjson.js";

const SDKI_URL = process.env.HANLEC_SDKI_URL!;
if (!SDKI_URL) throw new Error("Define HANLEC_SDKI_URL");

const ACCESS_TOKEN = process.env.HANLEC_ACCESS_TOKEN;
if (!ACCESS_TOKEN) throw new Error("Define HANLEC_ACCESS_TOKEN.");

/** @internal */
export interface RequestOptions {
  method?: string;
  headers?: HeadersInit;
  params?: Record<string, string | undefined>;
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
}

/** @internal */
export async function request(
  path: string,
  opts?: RequestOptions,
): Promise<Response> {
  const headers = new Headers(opts?.headers);
  headers.set("authorization", `Bearer ${ACCESS_TOKEN}`);

  const { body, contentType } = prepareBody(opts?.body);
  if (contentType && !headers.has("content-type")) {
    headers.set("content-type", contentType);
  }

  const url = new URL(SDKI_URL);
  url.pathname = url.pathname + path;
  if (opts?.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers,
    body,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  return res;
}

function prepareBody(body: RequestOptions["body"]): {
  body: BodyInit | null | undefined;
  contentType: string | null;
} {
  if (body == null) return { body, contentType: null };
  if (typeof body === "string") {
    return { body, contentType: "text/plain" };
  }
  if (body instanceof Blob) {
    return { body, contentType: body.type ?? "application/octet-stream" };
  }
  if (body instanceof URLSearchParams) {
    return { body, contentType: "application/x-www-form-urlencoded" };
  }
  if (body instanceof ReadableStream) {
    return { body, contentType: "application/octet-stream" };
  }
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return { body, contentType: "application/octet-stream" };
  }
  return { body: XJSON.stringify(body), contentType: "application/json" };
}
