import * as XJSON from "./xjson.js";

const BASE_URL = process.env.HANLEC_BASE_URL ?? "https://hanlec.com";

const ACCESS_TOKEN = process.env.HANLEC_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  throw new Error("Define HANLEC_ACCESS_TOKEN.");
}

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

  let url = `${BASE_URL}/sdki${path}`;
  if (opts?.params) {
    const entries = Object.entries(opts.params).filter(
      (e): e is [string, string] => e[1] !== undefined,
    );
    if (entries.length) url += `?${new URLSearchParams(entries)}`;
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
