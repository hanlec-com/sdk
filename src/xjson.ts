/**
 * @file EXtended JSON. Uses replacer/reviver pair that preserves JS types
 * across serialization.
 *
 * Inspired by React Flight's `$`-prefix tagging scheme. Tagged strings:
 *
 *   $D<iso>        Date
 *   $n<digits>     BigInt
 *   $B<base64>     Uint8Array / Buffer
 *   $Infinity      Infinity
 *   $-Infinity     -Infinity
 *   $NaN           NaN
 *   $-0            -0
 *   $undefined     undefined
 *   $$...          escaped literal string that starts with $
 */

/**
 * Converts a JavaScript value to an EXtended JavaScript Object Notation (XJSON)
 * string.
 */
export function stringify(value: any, space?: string | number): string {
  return JSON.stringify(value, replacer, space);
}

/**
 * Converts an EXtended JavaScript Object Notation (XJSON) string into an
 * object.
 */
export function parse(text: string): any {
  return JSON.parse(text, reviver);
}

export function replacer(
  this: Record<string, unknown>,
  _key: string,
  value: unknown,
): unknown {
  if (typeof value === "bigint") {
    return `$n${value}`;
  }

  if (typeof value === "undefined") {
    return "$undefined";
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) return "$NaN";
    if (value === Infinity) return "$Infinity";
    if (value === -Infinity) return "$-Infinity";
    if (Object.is(value, -0)) return "$-0";
  }

  // Date — `this[_key]` is the raw value before `.toJSON()` converts it
  const raw = this[_key];
  if (raw instanceof Date) {
    return `$D${value as string}`;
  }

  if (raw instanceof Uint8Array) {
    return `$B${Buffer.from(raw).toString("base64")}`;
  }

  // Escape strings that start with $ so the reviver doesn't mis-tag them
  if (typeof value === "string" && value.startsWith("$")) {
    return `$${value}`;
  }

  return value;
}

export function reviver(_key: string, value: unknown): unknown {
  if (typeof value !== "string" || !value.startsWith("$")) {
    return value;
  }

  if (value === "$undefined") return undefined;
  if (value === "$NaN") return NaN;
  if (value === "$Infinity") return Infinity;
  if (value === "$-Infinity") return -Infinity;
  if (value === "$-0") return -0;

  const tag = value[1];

  if (tag === "D") return new Date(value.slice(2));
  if (tag === "n") return BigInt(value.slice(2));
  if (tag === "B") {
    const bytes = Buffer.from(value.slice(2), "base64");
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  // $$... → unescape to $...
  if (tag === "$") return value.slice(1);

  return value;
}
