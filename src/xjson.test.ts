import { describe, expect, it } from "vitest";

import { parse, stringify } from "./xjson.js";

function roundtrip<T>(value: T): unknown {
  return parse(stringify(value));
}

describe("xjson primitives", () => {
  it("preserves plain JSON values", () => {
    expect(roundtrip(null)).toBe(null);
    expect(roundtrip(true)).toBe(true);
    expect(roundtrip(false)).toBe(false);
    expect(roundtrip(0)).toBe(0);
    expect(roundtrip(42)).toBe(42);
    expect(roundtrip(-1.5)).toBe(-1.5);
    expect(roundtrip("hello")).toBe("hello");
    expect(roundtrip("")).toBe("");
  });

  it("preserves undefined", () => {
    expect(stringify(undefined)).toBe('"$undefined"');
    expect(roundtrip(undefined)).toBe(undefined);
    expect(roundtrip({ a: undefined })).toEqual({ a: undefined });
  });

  it("preserves NaN", () => {
    expect(stringify(NaN)).toBe('"$NaN"');
    expect(roundtrip(NaN)).toBeNaN();
  });

  it("preserves Infinity and -Infinity", () => {
    expect(stringify(Infinity)).toBe('"$Infinity"');
    expect(stringify(-Infinity)).toBe('"$-Infinity"');
    expect(roundtrip(Infinity)).toBe(Infinity);
    expect(roundtrip(-Infinity)).toBe(-Infinity);
  });

  it("preserves -0", () => {
    expect(stringify(-0)).toBe('"$-0"');
    const result = roundtrip(-0);
    expect(Object.is(result, -0)).toBe(true);
  });

  it("does not tag +0", () => {
    expect(stringify(0)).toBe("0");
    expect(Object.is(roundtrip(0), 0)).toBe(true);
  });
});

describe("xjson bigint", () => {
  it("preserves bigint values", () => {
    expect(stringify(123n)).toBe('"$n123"');
    expect(roundtrip(123n)).toBe(123n);
    expect(roundtrip(-456n)).toBe(-456n);
    expect(roundtrip(0n)).toBe(0n);
  });

  it("preserves huge bigints beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = 9007199254740993n;
    expect(roundtrip(huge)).toBe(huge);
  });
});

describe("xjson Date", () => {
  it("preserves Date instances", () => {
    const d = new Date("2024-03-15T12:34:56.789Z");
    const result = roundtrip(d) as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(d.getTime());
  });

  it("serializes Date with $D tag", () => {
    const d = new Date("2024-01-01T00:00:00.000Z");
    expect(stringify(d)).toBe('"$D2024-01-01T00:00:00.000Z"');
  });

  it("preserves Dates nested in objects and arrays", () => {
    const input = {
      at: new Date("2024-01-01T00:00:00.000Z"),
      list: [new Date(0)],
    };
    const out = roundtrip(input) as typeof input;
    expect(out.at).toBeInstanceOf(Date);
    expect(out.at.getTime()).toBe(input.at.getTime());
    expect(out.list[0]).toBeInstanceOf(Date);
    expect(out.list[0]!.getTime()).toBe(0);
  });
});

describe("xjson Uint8Array", () => {
  it("preserves Uint8Array contents", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255]);
    const out = roundtrip(bytes) as Uint8Array;
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([0, 1, 2, 3, 254, 255]);
  });

  it("preserves empty Uint8Array", () => {
    const out = roundtrip(new Uint8Array()) as Uint8Array;
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(0);
  });

  it("preserves Buffer as Uint8Array", () => {
    const buf = Buffer.from("hello", "utf8");
    const out = roundtrip(buf) as Uint8Array;
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(out).toString("utf8")).toBe("hello");
  });

  it("uses $B tag with base64", () => {
    const bytes = new Uint8Array([104, 105]); // "hi"
    expect(stringify(bytes)).toBe('"$BaGk="');
  });
});

describe("xjson $-escape for literal strings", () => {
  it("escapes strings that start with $", () => {
    expect(stringify("$foo")).toBe('"$$foo"');
    expect(roundtrip("$foo")).toBe("$foo");
  });

  it("escapes strings that collide with tags", () => {
    expect(roundtrip("$undefined")).toBe("$undefined");
    expect(roundtrip("$NaN")).toBe("$NaN");
    expect(roundtrip("$Infinity")).toBe("$Infinity");
    expect(roundtrip("$-Infinity")).toBe("$-Infinity");
    expect(roundtrip("$-0")).toBe("$-0");
    expect(roundtrip("$D2024-01-01T00:00:00.000Z")).toBe(
      "$D2024-01-01T00:00:00.000Z",
    );
    expect(roundtrip("$n42")).toBe("$n42");
    expect(roundtrip("$Bxyz")).toBe("$Bxyz");
  });

  it("handles strings of just $ and $$", () => {
    expect(roundtrip("$")).toBe("$");
    expect(roundtrip("$$")).toBe("$$");
    expect(roundtrip("$$foo")).toBe("$$foo");
  });

  it("does not escape strings that don't start with $", () => {
    expect(stringify("foo")).toBe('"foo"');
    expect(stringify("has $ in middle")).toBe('"has $ in middle"');
  });
});

describe("xjson composite values", () => {
  it("roundtrips a mixed object", () => {
    const input = {
      str: "plain",
      dollar: "$escaped",
      num: 1,
      neg0: -0,
      nan: NaN,
      inf: Infinity,
      ninf: -Infinity,
      big: 10n,
      when: new Date("2024-06-01T00:00:00.000Z"),
      bytes: new Uint8Array([1, 2, 3]),
      maybe: undefined,
      nested: {
        list: [undefined, NaN, "$x", new Date(0)],
      },
    };

    const out = roundtrip(input) as typeof input;
    expect(out.str).toBe("plain");
    expect(out.dollar).toBe("$escaped");
    expect(out.num).toBe(1);
    expect(Object.is(out.neg0, -0)).toBe(true);
    expect(out.nan).toBeNaN();
    expect(out.inf).toBe(Infinity);
    expect(out.ninf).toBe(-Infinity);
    expect(out.big).toBe(10n);
    expect(out.when).toBeInstanceOf(Date);
    expect(out.when.getTime()).toBe(input.when.getTime());
    expect(Array.from(out.bytes)).toEqual([1, 2, 3]);
    expect(out.maybe).toBeUndefined();
    expect(out.nested.list[0]).toBeUndefined();
    expect(out.nested.list[1]).toBeNaN();
    expect(out.nested.list[2]).toBe("$x");
    expect((out.nested.list[3] as Date).getTime()).toBe(0);
  });

  it("preserves undefined array holes as explicit undefined", () => {
    const input = [1, undefined, 3];
    const out = roundtrip(input) as unknown[];
    expect(out).toEqual([1, undefined, 3]);
    expect(out.length).toBe(3);
  });
});

describe("xjson stringify options", () => {
  it("passes the space argument to JSON.stringify", () => {
    expect(stringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    expect(stringify({ a: 1 }, "\t")).toBe('{\n\t"a": 1\n}');
  });
});
