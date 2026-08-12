import { describe, expect, it } from "vitest";

import {
  parseImportRow,
  readCsv,
  readHeader,
} from "@/domain/services/actualService";

/**
 * The CSV import contract.
 *
 * Exported from the service purely so these can be asserted without a database
 * or a transaction — every rejection message a user will ever see comes from
 * these three functions, and none of them needs a connection to prove.
 */

const CATEGORIES = new Map([
  ["marketing", "cat_mkt"],
  ["payroll", "cat_pay"],
]);

describe("readCsv", () => {
  it("reads the brief's example file", () => {
    const rows = readCsv(
      ["month,category,amount", "2026-01,Marketing,4800", "2026-01,Payroll,20500"].join(
        "\n"
      )
    );

    expect(rows.map((row) => row.cells)).toEqual([
      ["month", "category", "amount"],
      ["2026-01", "Marketing", "4800"],
      ["2026-01", "Payroll", "20500"],
    ]);
  });

  it("keeps a comma inside a quoted field", () => {
    const [row] = readCsv('a,"one, two",c');

    expect(row.cells).toEqual(["a", "one, two", "c"]);
  });

  it("keeps a newline inside a quoted field and still counts lines truthfully", () => {
    // The case a line-splitting parser cannot handle: the record spans lines 2
    // and 3, so the next row must be reported as line 4 rather than 3.
    const rows = readCsv(
      ['month,category,amount', '2026-01,"Multi\nline",100', "2026-02,Payroll,200"].join(
        "\n"
      )
    );

    expect(rows[1].cells[1]).toBe("Multi\nline");
    expect(rows[2].line).toBe(4);
  });

  it("strips a UTF-8 BOM so the header still matches", () => {
    // Excel writes one. Without `bom: true` the first cell arrives as
    // "﻿month" and the header check rejects a perfectly good file.
    const [row] = readCsv("﻿month,category,amount");

    expect(row.cells[0]).toBe("month");
  });

  it("skips blank lines rather than reporting them as bad rows", () => {
    const rows = readCsv("month,category,amount\n\n2026-01,Marketing,10\n\n");

    expect(rows).toHaveLength(2);
  });

  it("refuses a file it cannot parse", () => {
    // An unclosed quote swallows everything after it, so there is no partial
    // result worth reporting — the whole file is refused.
    expect(() => readCsv('month,category,amount\n2026-01,"unclosed,10')).toThrow(
      /could not be read as CSV/i
    );
  });
});

describe("readHeader", () => {
  it("accepts the documented order", () => {
    expect(readHeader(["month", "category", "amount"])).toEqual({
      month: 0,
      category: 1,
      amount: 2,
    });
  });

  it("accepts the labels in any order", () => {
    // The point of reading by name. A positional parser would load every row
    // with the month and the category swapped and never say so.
    expect(readHeader(["category", "month", "amount"])).toEqual({
      month: 1,
      category: 0,
      amount: 2,
    });
  });

  it("ignores case and surrounding space", () => {
    expect(readHeader(["Amount", " MONTH ", "Category"])).toEqual({
      month: 1,
      category: 2,
      amount: 0,
    });
  });

  it("tolerates a trailing comma", () => {
    expect(readHeader(["month", "category", "amount", ""])).toEqual({
      month: 0,
      category: 1,
      amount: 2,
    });
  });

  it.each([
    [["month", "amount"], /missing category/i],
    [["month", "category", "amount", "note"], /unexpected note/i],
    [["month", "month", "amount"], /repeated month/i],
    [["2026-01", "Marketing", "4800"], /missing month, category, amount/i],
  ])("rejects %j", (cells, message) => {
    expect(() => readHeader(cells as string[])).toThrow(message);
  });

  it("names the requirement in the message, not just the fault", () => {
    // The user has to be able to fix the file from the error alone.
    expect(() => readHeader(["month"])).toThrow(/month, category and amount/i);
  });
});

describe("parseImportRow", () => {
  const columns = { month: 0, category: 1, amount: 2 };

  it("parses a valid row", () => {
    expect(parseImportRow(["2026-01", "Marketing", "4800"], columns, CATEGORIES)).toEqual(
      { ok: true, categoryId: "cat_mkt", month: "2026-01", amount: 4_800 }
    );
  });

  it("matches a category name case-insensitively", () => {
    const row = parseImportRow(["2026-01", "MARKETING", "10"], columns, CATEGORIES);

    expect(row).toMatchObject({ ok: true, categoryId: "cat_mkt" });
  });

  it("reads columns through the header map, not by position", () => {
    const reversed = { month: 1, category: 0, amount: 2 };
    const row = parseImportRow(["Payroll", "2026-02", "19800"], reversed, CATEGORIES);

    expect(row).toEqual({
      ok: true,
      categoryId: "cat_pay",
      month: "2026-02",
      amount: 19_800,
    });
  });

  it("rounds to cents", () => {
    const row = parseImportRow(["2026-01", "Marketing", "10.005"], columns, CATEGORIES);

    expect(row).toMatchObject({ amount: 10.01 });
  });

  it.each([
    [["2026-13", "Marketing", "10"], /not a month/i, "an impossible month"],
    [["", "Marketing", "10"], /not a month/i, "a blank month"],
    [["2026-01", "Nonexistent", "10"], /no active category/i, "an unknown category"],
    [["2026-01", "Marketing", "abc"], /not an amount/i, "a non-numeric amount"],
    [["2026-01", "Marketing", "-5"], /not an amount/i, "a negative amount"],
    [["2026-01", "Marketing", ""], /not an amount/i, "a blank amount"],
    [["2026-01", "Marketing"], /not an amount/i, "a missing amount column"],
  ])("rejects %j — %s", (cells, message) => {
    const row = parseImportRow(cells as string[], columns, CATEGORIES);

    expect(row.ok).toBe(false);
    expect(row.ok === false && row.reason).toMatch(message as RegExp);
  });

  it("quotes the offending value back so the row can be found and fixed", () => {
    const row = parseImportRow(["2026-99", "Marketing", "10"], columns, CATEGORIES);

    expect(row.ok === false && row.reason).toContain("2026-99");
  });
});
