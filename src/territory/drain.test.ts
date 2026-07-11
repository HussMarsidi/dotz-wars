import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { TERRITORY_DRAIN_HP_PER_SEC } from "../shared/config";
import { Grunt } from "../units";
import { applyTerritoryDrain } from "./drain";
import { cityAsSource, computeTerritory, ownerAt } from "./index";

describe("applyTerritoryDrain", () => {
	it("does not drain on own or neutral ground", () => {
		const city = createCity("c", "blue", { x: 100, y: 100 }, "N");
		const unit = Grunt.spawn("u", "blue", { x: 100, y: 100 });
		const field = computeTerritory(400, 400, [cityAsSource(city)], 16);
		expect(ownerAt(field, unit.position)).toBe("blue");
		const next = applyTerritoryDrain([unit], field, 1);
		expect(next[0]?.hp).toBe(unit.hp);
	});

	it("applies flat HP loss per second on enemy ground", () => {
		const city = createCity("c", "red", { x: 100, y: 100 }, "N");
		const unit = Grunt.spawn("u", "blue", { x: 100, y: 100 });
		const field = computeTerritory(400, 400, [cityAsSource(city)], 16);
		expect(ownerAt(field, unit.position)).toBe("red");
		const next = applyTerritoryDrain([unit], field, 0.5);
		expect(next[0]?.hp).toBeCloseTo(unit.hp - TERRITORY_DRAIN_HP_PER_SEC * 0.5);
	});

	it("does not drain on neutral ground", () => {
		const blue = createCity("b", "blue", { x: 105, y: 205 }, "N");
		const red = createCity("r", "red", { x: 305, y: 205 }, "N");
		const field = computeTerritory(
			400,
			400,
			[cityAsSource(blue), cityAsSource(red)],
			10,
		);
		const mid = { x: 205, y: 205 };
		expect(ownerAt(field, mid)).toBe("neutral");
		const unit = Grunt.spawn("u", "blue", mid);
		const next = applyTerritoryDrain([unit], field, 1);
		expect(next[0]?.hp).toBe(unit.hp);
	});
});
