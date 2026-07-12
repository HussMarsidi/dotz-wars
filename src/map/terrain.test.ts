import { describe, expect, it } from "vitest";
import { BATTLEFIELD_MAP } from "./battlefield";
import {
	circleFitsOnLand,
	circleOverlapsWater,
	getTerrainAt,
	isWalkable,
	isWater,
	lastWalkableOnSegment,
	terrainSpeedMultiplier,
} from "./terrain";
import type { MapDefinition } from "./types";

const tiny: MapDefinition = {
	id: "tiny",
	width: 100,
	height: 100,
	regions: [
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 50, y: 50 },
			radiusX: 20,
			radiusY: 10,
		},
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 20, y: 20 },
			radiusX: 12,
			radiusY: 12,
		},
		{
			terrain: "mountain",
			shape: "ellipse",
			center: { x: 80, y: 80 },
			radiusX: 12,
			radiusY: 12,
		},
	],
	resources: [],
};

describe("getTerrainAt / speed", () => {
	it("defaults to land and reports overlays", () => {
		expect(getTerrainAt(tiny, { x: 5, y: 5 })).toBe("land");
		expect(getTerrainAt(tiny, { x: 20, y: 20 })).toBe("forest");
		expect(getTerrainAt(tiny, { x: 80, y: 80 })).toBe("mountain");
		expect(getTerrainAt(tiny, { x: 50, y: 50 })).toBe("water");
	});

	it("uses config multipliers", () => {
		expect(terrainSpeedMultiplier(tiny, { x: 5, y: 5 })).toBe(1);
		expect(terrainSpeedMultiplier(tiny, { x: 20, y: 20 })).toBe(0.7);
		expect(terrainSpeedMultiplier(tiny, { x: 80, y: 80 })).toBe(0.45);
		expect(terrainSpeedMultiplier(tiny, { x: 50, y: 50 })).toBe(0);
	});

	it("water wins over forest when overlapping", () => {
		const overlap: MapDefinition = {
			id: "overlap",
			width: 100,
			height: 100,
			regions: [
				{
					terrain: "forest",
					shape: "ellipse",
					center: { x: 50, y: 50 },
					radiusX: 30,
					radiusY: 30,
				},
				{
					terrain: "water",
					shape: "ellipse",
					center: { x: 50, y: 50 },
					radiusX: 10,
					radiusY: 10,
				},
			],
			resources: [],
		};
		expect(getTerrainAt(overlap, { x: 50, y: 50 })).toBe("water");
		expect(getTerrainAt(overlap, { x: 70, y: 50 })).toBe("forest");
	});
});

describe("isWater", () => {
	it("hits ellipse center and misses outside", () => {
		expect(isWater(tiny, { x: 50, y: 50 })).toBe(true);
		expect(isWater(tiny, { x: 70, y: 50 })).toBe(true);
		expect(isWater(tiny, { x: 71, y: 50 })).toBe(false);
		expect(isWater(tiny, { x: 50, y: 61 })).toBe(false);
	});
});

describe("isWalkable", () => {
	it("rejects water and out-of-bounds; accepts land/forest/mountain", () => {
		expect(isWalkable(tiny, { x: 10, y: 50 })).toBe(true);
		expect(isWalkable(tiny, { x: 20, y: 20 })).toBe(true);
		expect(isWalkable(tiny, { x: 80, y: 80 })).toBe(true);
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
		expect(circleOverlapsWater(tiny, { x: 80, y: 50 }, 10)).toBe(true);
		expect(circleOverlapsWater(tiny, { x: 90, y: 50 }, 10)).toBe(false);
	});
});

describe("circleFitsOnLand / lastWalkableOnSegment", () => {
	it("rejects circles that hang off the board", () => {
		expect(circleFitsOnLand(tiny, { x: 5, y: 50 }, 10)).toBe(false);
		expect(circleFitsOnLand(tiny, { x: 30, y: 80 }, 10)).toBe(true);
	});

	it("returns the last land point before water on a segment", () => {
		const from = { x: 20, y: 50 };
		const to = { x: 50, y: 50 };
		const edge = lastWalkableOnSegment(tiny, from, to, 5);
		expect(edge.x).toBeGreaterThan(from.x);
		expect(edge.x).toBeLessThan(to.x);
		expect(circleFitsOnLand(tiny, edge, 5)).toBe(true);
	});
});
