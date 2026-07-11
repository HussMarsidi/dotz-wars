import { describe, expect, it } from "vitest";
import { BATTLEFIELD_MAP } from "./battlefield";
import { circleOverlapsWater, isWalkable, isWater } from "./terrain";
import type { MapDefinition } from "./types";

const tiny: MapDefinition = {
	id: "tiny",
	width: 100,
	height: 100,
	water: [
		{
			kind: "ellipse",
			center: { x: 50, y: 50 },
			radiusX: 20,
			radiusY: 10,
		},
	],
};

describe("isWater", () => {
	it("hits ellipse center and misses outside", () => {
		expect(isWater(tiny, { x: 50, y: 50 })).toBe(true);
		expect(isWater(tiny, { x: 70, y: 50 })).toBe(true);
		expect(isWater(tiny, { x: 71, y: 50 })).toBe(false);
		expect(isWater(tiny, { x: 50, y: 61 })).toBe(false);
	});
});

describe("isWalkable", () => {
	it("rejects water and out-of-bounds; accepts land", () => {
		expect(isWalkable(tiny, { x: 10, y: 10 })).toBe(true);
		expect(isWalkable(tiny, { x: 50, y: 50 })).toBe(false);
		expect(isWalkable(tiny, { x: -1, y: 10 })).toBe(false);
		expect(isWalkable(tiny, { x: 10, y: 101 })).toBe(false);
	});

	it("battlefield center spawn is on land", () => {
		expect(
			isWalkable(BATTLEFIELD_MAP, {
				x: BATTLEFIELD_MAP.width / 2,
				y: BATTLEFIELD_MAP.height / 2,
			}),
		).toBe(true);
	});
});

describe("circleOverlapsWater", () => {
	it("detects when the rim touches water", () => {
		// Water edge at x=70; circle center at 70+10=80 with r=10 → rim on edge
		expect(circleOverlapsWater(tiny, { x: 80, y: 50 }, 10)).toBe(true);
		expect(circleOverlapsWater(tiny, { x: 90, y: 50 }, 10)).toBe(false);
	});
});
