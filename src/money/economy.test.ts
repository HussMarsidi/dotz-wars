import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { CITY_INCOME_PER_SEC } from "../shared/config";
import { emptyTerritory } from "../territory";
import { Grunt } from "../units";
import { cityIncomeRate, tickEconomy, upkeepRate } from "./economy";
import { createInitialGold } from "./money";

describe("tickEconomy", () => {
	it("adds city income over time", () => {
		const cities = [createCity("c", "blue", { x: 0, y: 0 }, "N")];
		const gold = createInitialGold();
		const next = tickEconomy(gold, cities, [], [], emptyTerritory(1, 1), 1);
		expect(next.blue).toBeCloseTo(gold.blue + CITY_INCOME_PER_SEC);
	});

	it("deducts upkeep and never goes negative", () => {
		const units = [
			Grunt.spawn("a", "blue", { x: 0, y: 0 }),
			Grunt.spawn("b", "blue", { x: 10, y: 0 }),
		];
		const gold = { blue: 0.1, red: 0 };
		const next = tickEconomy(gold, [], units, [], emptyTerritory(1, 1), 10);
		expect(next.blue).toBe(0);
		expect(upkeepRate(units, "blue")).toBeGreaterThan(0);
	});

	it("counts owned cities for income rate", () => {
		const cities = [
			createCity("a", "blue", { x: 0, y: 0 }, "A"),
			createCity("b", "red", { x: 1, y: 0 }, "B"),
		];
		expect(cityIncomeRate(cities, "blue")).toBe(CITY_INCOME_PER_SEC);
	});
});
