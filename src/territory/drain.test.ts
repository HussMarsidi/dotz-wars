import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import { TERRITORY_DRAIN_HP_PER_SEC } from "../shared/config";
import { Grunt } from "../units";
import { applyTerritoryDrain } from "./drain";
import {
	cityAsSource,
	collectSources,
	overwhelmAt,
	unitAsSource,
} from "./index";

describe("overwhelmAt", () => {
	it("is 0 on own ground and rises deeper into enemy influence", () => {
		const city = createCity("c", "red", { x: 0, y: 0 }, "N");
		const sources = [cityAsSource(city)];
		expect(overwhelmAt(sources, { x: 0, y: 0 }, "blue")).toBeCloseTo(1);
		expect(overwhelmAt(sources, { x: 0, y: 0 }, "red")).toBe(0);
	});

	it("is lower near the fringe than at the enemy city center", () => {
		const city = createCity("c", "red", { x: 0, y: 0 }, "N");
		const deepUnit = Grunt.spawn("d", "blue", { x: 20, y: 0 });
		const fringeUnit = Grunt.spawn("f", "blue", { x: 160, y: 0 });
		const deep = overwhelmAt(
			[cityAsSource(city), unitAsSource(deepUnit)],
			deepUnit.position,
			"blue",
		);
		const fringe = overwhelmAt(
			[cityAsSource(city), unitAsSource(fringeUnit)],
			fringeUnit.position,
			"blue",
		);
		expect(deep).toBeGreaterThan(fringe);
		expect(fringe).toBeGreaterThan(0);
	});
});

describe("applyTerritoryDrain", () => {
	it("does not drain on own ground", () => {
		const city = createCity("c", "blue", { x: 100, y: 100 }, "N");
		const unit = Grunt.spawn("u", "blue", { x: 100, y: 100 });
		const sources = collectSources([city], [unit]);
		const next = applyTerritoryDrain([unit], sources, 1);
		expect(next[0]?.hp).toBe(unit.hp);
	});

	it("drains faster deep in enemy territory than near the fringe", () => {
		const city = createCity("c", "red", { x: 0, y: 0 }, "N");
		const deepUnit = Grunt.spawn("d", "blue", { x: 20, y: 0 });
		const fringeUnit = Grunt.spawn("f", "blue", { x: 160, y: 0 });
		const deepSources = collectSources([city], [deepUnit]);
		const fringeSources = collectSources([city], [fringeUnit]);
		const deepNext = applyTerritoryDrain([deepUnit], deepSources, 1);
		const fringeNext = applyTerritoryDrain([fringeUnit], fringeSources, 1);
		const deepLoss = deepUnit.hp - (deepNext[0]?.hp ?? 0);
		const fringeLoss = fringeUnit.hp - (fringeNext[0]?.hp ?? 0);
		expect(deepLoss).toBeGreaterThan(fringeLoss);
		expect(fringeLoss).toBeGreaterThan(0);
		expect(deepLoss).toBeLessThanOrEqual(TERRITORY_DRAIN_HP_PER_SEC + 0.01);
	});

	it("does not drain when influences are balanced (neutral)", () => {
		const blue = createCity("b", "blue", { x: 105, y: 205 }, "N");
		const red = createCity("r", "red", { x: 305, y: 205 }, "N");
		const unit = Grunt.spawn("u", "blue", { x: 205, y: 205 });
		const sources = collectSources([blue, red], [unit]);
		expect(overwhelmAt(sources, unit.position, "blue")).toBe(0);
		const next = applyTerritoryDrain([unit], sources, 1);
		expect(next[0]?.hp).toBe(unit.hp);
	});
});
