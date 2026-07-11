import { describe, expect, it } from "vitest";
import { STARTING_GOLD } from "../shared/config";
import {
	canAfford,
	createInitialGold,
	goldOf,
	partialRefundAmount,
	refund,
	spend,
} from "./money";

describe("createInitialGold", () => {
	it("gives each team the starting amount", () => {
		expect(createInitialGold()).toEqual({
			blue: STARTING_GOLD,
			red: STARTING_GOLD,
		});
	});
});

describe("canAfford / spend", () => {
	it("allows spend when balance covers cost", () => {
		const gold = createInitialGold();
		expect(canAfford(gold, "blue", 100)).toBe(true);
		expect(spend(gold, "blue", 100)).toEqual({
			blue: STARTING_GOLD - 100,
			red: STARTING_GOLD,
		});
	});

	it("rejects spend when short", () => {
		const gold = { blue: 50, red: STARTING_GOLD };
		expect(canAfford(gold, "blue", 75)).toBe(false);
		expect(spend(gold, "blue", 75)).toBeNull();
	});

	it("allows exact balance spend", () => {
		const gold = { blue: 75, red: 0 };
		expect(spend(gold, "blue", 75)).toEqual({ blue: 0, red: 0 });
	});
});

describe("refund / partialRefundAmount", () => {
	it("adds refunded gold", () => {
		const gold = { blue: 100, red: 0 };
		expect(refund(gold, "blue", 40)).toEqual({ blue: 140, red: 0 });
	});

	it("ignores non-positive refund amounts", () => {
		const gold = { blue: 100, red: 0 };
		expect(refund(gold, "blue", 0)).toBe(gold);
		expect(refund(gold, "blue", -10)).toBe(gold);
	});

	it("scales partial refund by remaining progress", () => {
		expect(partialRefundAmount(100, 0)).toBe(100);
		expect(partialRefundAmount(100, 0.5)).toBe(50);
		expect(partialRefundAmount(100, 1)).toBe(0);
		expect(partialRefundAmount(75, 0.33)).toBe(50);
	});
});

describe("goldOf", () => {
	it("reads the team balance", () => {
		const gold = { blue: 10, red: 20 };
		expect(goldOf(gold, "blue")).toBe(10);
		expect(goldOf(gold, "red")).toBe(20);
	});
});
