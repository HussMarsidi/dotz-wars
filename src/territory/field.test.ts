import { describe, expect, it } from "vitest";
import { createCity } from "../cities";
import {
	CITY_INFLUENCE_RADIUS,
	CITY_INFLUENCE_STRENGTH,
	UNIT_INFLUENCE_RADIUS,
	UNIT_INFLUENCE_STRENGTH,
} from "../shared/config";
import { Grunt } from "../units";
import {
	cityAsSource,
	collectSources,
	computeTerritory,
	influenceAt,
	ownerAt,
	unitAsSource,
} from "./index";

describe("influenceAt", () => {
	it("is strongest at the center and zero at/ beyond radius", () => {
		const source = {
			teamId: "blue" as const,
			position: { x: 0, y: 0 },
			strength: 100,
			radius: 100,
		};
		expect(influenceAt(source, { x: 0, y: 0 })).toBe(100);
		expect(influenceAt(source, { x: 100, y: 0 })).toBe(0);
		expect(influenceAt(source, { x: 50, y: 0 })).toBeCloseTo(25);
	});
});

describe("computeTerritory", () => {
	it("gives a lone city a near-circular owned zone", () => {
		const city = createCity("c", "blue", { x: 200, y: 200 }, "N");
		const field = computeTerritory(400, 400, [cityAsSource(city)], 20);
		expect(ownerAt(field, { x: 200, y: 200 })).toBe("blue");
		expect(
			ownerAt(field, { x: 200 + CITY_INFLUENCE_RADIUS + 20, y: 200 }),
		).toBe("neutral");
	});

	it("marks the seam between equal opposing cities as neutral or flipped by side", () => {
		// Cell centers are at half-cell offsets; place cities so a center sits on the midpoint.
		const blue = createCity("b", "blue", { x: 105, y: 205 }, "N");
		const red = createCity("r", "red", { x: 305, y: 205 }, "N");
		const field = computeTerritory(
			400,
			400,
			[cityAsSource(blue), cityAsSource(red)],
			10,
		);
		expect(ownerAt(field, { x: 105, y: 205 })).toBe("blue");
		expect(ownerAt(field, { x: 305, y: 205 })).toBe("red");
		expect(ownerAt(field, { x: 205, y: 205 })).toBe("neutral");
	});

	it("lets a unit bump ownership past a city baseline", () => {
		const city = createCity("c", "blue", { x: 100, y: 100 }, "N");
		const alone = computeTerritory(400, 400, [cityAsSource(city)], 16);
		const edge = {
			x: 100 + CITY_INFLUENCE_RADIUS * 0.85,
			y: 100,
		};
		expect(ownerAt(alone, edge)).not.toBe("red");

		const unit = Grunt.spawn("u", "red", edge);
		const contested = computeTerritory(
			400,
			400,
			[cityAsSource(city), unitAsSource(unit)],
			16,
		);
		// Unit projection can flip or neutralize ground near the city fringe.
		const after = ownerAt(contested, edge);
		expect(after === "red" || after === "neutral").toBe(true);
	});

	it("collectSources includes cities and living units", () => {
		const city = createCity("c", "blue", { x: 0, y: 0 }, "N");
		const living = Grunt.spawn("a", "red", { x: 10, y: 0 });
		const dead = Grunt.spawn("b", "red", { x: 20, y: 0 }).copy({ hp: 0 });
		const sources = collectSources([city], [living, dead]);
		expect(sources).toHaveLength(2);
		expect(sources[0]?.strength).toBe(CITY_INFLUENCE_STRENGTH);
		expect(sources[0]?.radius).toBe(CITY_INFLUENCE_RADIUS);
		expect(sources[1]?.strength).toBe(UNIT_INFLUENCE_STRENGTH);
		expect(sources[1]?.radius).toBe(UNIT_INFLUENCE_RADIUS);
	});
});
