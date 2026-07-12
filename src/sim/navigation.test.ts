import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../map/types";
import { findPath, simplifyPath } from "./navigation";

const map: MapDefinition = {
	id: "nav-test",
	width: 400,
	height: 200,
	regions: [
		// Vertical water wall with a gap at the bottom — must go around.
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 200, y: 60 },
			radiusX: 30,
			radiusY: 70,
		},
	],
	resources: [],
};

const RADIUS = 8;

describe("findPath", () => {
	it("returns a direct path when the line is clear", () => {
		const path = findPath(
			map,
			{ x: 40, y: 160 },
			{ x: 120, y: 160 },
			RADIUS,
			20,
		);
		expect(path).not.toBeNull();
		expect(path).toEqual([{ x: 120, y: 160 }]);
	});

	it("routes around water instead of crossing it", () => {
		const start = { x: 80, y: 40 };
		const goal = { x: 320, y: 40 };
		const path = findPath(map, start, goal, RADIUS, 20);
		expect(path).not.toBeNull();
		if (path === null) {
			return;
		}
		expect(path.length).toBeGreaterThan(1);

		const points = [start, ...path];
		for (let i = 0; i < points.length - 1; i++) {
			const a = points[i];
			const b = points[i + 1];
			if (a === undefined || b === undefined) {
				continue;
			}
			for (let s = 0; s <= 10; s++) {
				const t = s / 10;
				const p = {
					x: a.x + (b.x - a.x) * t,
					y: a.y + (b.y - a.y) * t,
				};
				const nx = (p.x - 200) / 30;
				const ny = (p.y - 60) / 70;
				expect(nx * nx + ny * ny).toBeGreaterThan(1);
			}
		}

		const last = path[path.length - 1];
		expect(last).toBeDefined();
		expect(last?.x).toBeCloseTo(goal.x, 0);
		expect(last?.y).toBeCloseTo(goal.y, 0);
	});

	it("snaps a water goal to nearby land instead of failing", () => {
		const path = findPath(
			map,
			{ x: 40, y: 160 },
			{ x: 200, y: 60 },
			RADIUS,
			20,
		);
		expect(path).not.toBeNull();
		if (path === null) {
			return;
		}
		const last = path[path.length - 1];
		expect(last).toBeDefined();
		if (last === undefined) {
			return;
		}
		// Snapped inland — not the water center, and clear of the ellipse.
		expect(Math.hypot(last.x - 200, last.y - 60)).toBeGreaterThan(20);
		const nx = (last.x - 200) / 30;
		const ny = (last.y - 60) / 70;
		expect(nx * nx + ny * ny).toBeGreaterThan(1);
	});
});

describe("simplifyPath", () => {
	it("collapses colinear clear waypoints", () => {
		const raw = [
			{ x: 20, y: 160 },
			{ x: 60, y: 160 },
			{ x: 100, y: 160 },
			{ x: 140, y: 160 },
		];
		const simplified = simplifyPath(map, raw, RADIUS);
		expect(simplified.length).toBeLessThan(raw.length);
		expect(simplified[0]).toEqual(raw[0]);
		expect(simplified[simplified.length - 1]).toEqual(raw[raw.length - 1]);
	});
});
