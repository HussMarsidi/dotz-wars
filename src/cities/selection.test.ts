import { describe, expect, it } from "vitest";
import { createCity } from "./city";
import { findOwnedCityAtPoint } from "./selection";

describe("findOwnedCityAtPoint", () => {
	const blue = createCity("blue-n", "blue", { x: 100, y: 100 }, "N");
	const red = createCity("red-n", "red", { x: 500, y: 100 }, "N");
	const cities = [blue, red];

	it("hits owned city capture box", () => {
		expect(findOwnedCityAtPoint(cities, { x: 150, y: 100 })?.id).toBe("blue-n");
	});

	it("ignores enemy cities", () => {
		expect(findOwnedCityAtPoint(cities, { x: 500, y: 100 })).toBeNull();
	});

	it("misses outside the capture box", () => {
		expect(findOwnedCityAtPoint(cities, { x: 400, y: 100 })).toBeNull();
	});
});
