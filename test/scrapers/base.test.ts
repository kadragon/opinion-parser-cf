import { describe, expect, it } from "vitest";
import { parseDate, toKstIso } from "../../src/scrapers/base";

describe("parseDate", () => {
	it("parses YYYY.MM.DD HH:MM as KST", () => {
		const result = parseDate("2026.03.14 00:34");
		expect(result).toBe("2026-03-14T00:34:00+09:00");
	});

	it("parses YYYY-MM-DD HH:MM as KST", () => {
		const result = parseDate("2026-03-13 18:11");
		expect(result).toBe("2026-03-13T18:11:00+09:00");
	});

	it("parses YYYY-MM-DD HH:MM:SS as KST", () => {
		const result = parseDate("2026-03-14 00:34:56");
		expect(result).toBe("2026-03-14T00:34:56+09:00");
	});

	it("parses date-only as KST midnight", () => {
		const result = parseDate("2026-03-14");
		expect(result).toBe("2026-03-14T00:00:00+09:00");
	});

	it("parses date-only with dots as KST midnight", () => {
		const result = parseDate("2026.03.14");
		expect(result).toBe("2026-03-14T00:00:00+09:00");
	});

	it("parses RFC 2822 date (from RSS) and converts to KST", () => {
		// Fri, 13 Mar 2026 23:30:00 +0900 → already KST
		const result = parseDate("Fri, 13 Mar 2026 23:30:00 +0900");
		expect(result).toBe("2026-03-13T23:30:00+09:00");
	});

	it("parses ISO date with Z and converts to KST", () => {
		// 2026-03-14T00:00:00Z → KST is +9h = 09:00
		const result = parseDate("2026-03-14T00:00:00Z");
		expect(result).toBe("2026-03-14T09:00:00+09:00");
	});

	it("returns KST now for invalid date", () => {
		const result = parseDate("invalid");
		expect(result).toMatch(/\+09:00$/);
	});
});

describe("toKstIso", () => {
	it("formats UTC Date as KST", () => {
		const utcDate = new Date("2026-03-14T00:00:00Z");
		const result = toKstIso(utcDate);
		expect(result).toBe("2026-03-14T09:00:00+09:00");
	});
});
