import { describe, expect, it } from "vitest";
import type { Dot, Rect } from "../shared/types";
import {
	applyClickSelection,
	applyMarqueeSelection,
	circleOverlapsRect,
	pointHitsCircle,
	selectDotsInRect,
} from "./selection";

const RADIUS = 10;

function dot(id: string, x: number, y: number, selected = false): Dot {
	return { id, position: { x, y }, selected };
}

function rect(x: number, y: number, width: number, height: number): Rect {
	return { x, y, width, height };
}

describe("circleOverlapsRect", () => {
	it("selects a circle whose center is inside the rect", () => {
		expect(
			circleOverlapsRect({ x: 50, y: 50 }, RADIUS, rect(0, 0, 100, 100)),
		).toBe(true);
	});

	it("rejects a circle fully outside the rect", () => {
		expect(
			circleOverlapsRect({ x: 200, y: 200 }, RADIUS, rect(0, 0, 100, 100)),
		).toBe(false);
	});

	it("selects when the circle only touches the rect edge", () => {
		// Center 10px right of right edge → distance == radius
		expect(
			circleOverlapsRect({ x: 110, y: 50 }, RADIUS, rect(0, 0, 100, 100)),
		).toBe(true);
	});

	it("rejects when the circle misses the rect by a hair", () => {
		expect(
			circleOverlapsRect({ x: 110.1, y: 50 }, RADIUS, rect(0, 0, 100, 100)),
		).toBe(false);
	});

	it("selects when only the circle rim overlaps a corner", () => {
		// Closest point is (100,100); center at (100+7, 100+7) → dist ≈ 9.9 < 10
		expect(
			circleOverlapsRect({ x: 107, y: 107 }, RADIUS, rect(0, 0, 100, 100)),
		).toBe(true);
	});

	it("handles negative width/height (drag any direction)", () => {
		expect(
			circleOverlapsRect({ x: 50, y: 50 }, RADIUS, rect(100, 100, -100, -100)),
		).toBe(true);
	});

	it("empty / zero-area rect never overlaps", () => {
		expect(circleOverlapsRect({ x: 0, y: 0 }, RADIUS, rect(0, 0, 0, 0))).toBe(
			false,
		);
		expect(
			circleOverlapsRect({ x: 50, y: 50 }, RADIUS, rect(0, 0, 100, 0)),
		).toBe(false);
		expect(
			circleOverlapsRect({ x: 50, y: 50 }, RADIUS, rect(0, 0, 0, 100)),
		).toBe(false);
	});
});

describe("selectDotsInRect", () => {
	const dots = [
		dot("inside", 50, 50),
		dot("outside", 200, 200),
		dot("edge", 110, 50),
	];

	it("selects dots inside; leaves outside unselected", () => {
		const selected = selectDotsInRect(dots, rect(0, 0, 100, 100), RADIUS);
		expect(selected.has("inside")).toBe(true);
		expect(selected.has("outside")).toBe(false);
		expect(selected.has("edge")).toBe(true);
	});

	it("empty rectangle selects nothing", () => {
		const selected = selectDotsInRect(dots, rect(40, 40, 0, 0), RADIUS);
		expect(selected.size).toBe(0);
	});
});

describe("applyMarqueeSelection", () => {
	it("updates selected flags without moving positions", () => {
		const state = {
			dots: [dot("a", 50, 50, false), dot("b", 200, 200, true)],
		};
		const next = applyMarqueeSelection(state, rect(0, 0, 100, 100), RADIUS);

		expect(next.dots[0]).toEqual({
			id: "a",
			position: { x: 50, y: 50 },
			selected: true,
		});
		expect(next.dots[1]).toEqual({
			id: "b",
			position: { x: 200, y: 200 },
			selected: false,
		});
	});
});

describe("pointHitsCircle", () => {
	it("hits center and edge; misses outside", () => {
		expect(pointHitsCircle({ x: 50, y: 50 }, { x: 50, y: 50 }, RADIUS)).toBe(
			true,
		);
		expect(pointHitsCircle({ x: 60, y: 50 }, { x: 50, y: 50 }, RADIUS)).toBe(
			true,
		);
		expect(pointHitsCircle({ x: 60.1, y: 50 }, { x: 50, y: 50 }, RADIUS)).toBe(
			false,
		);
	});
});

describe("applyClickSelection", () => {
	it("selects the clicked dot", () => {
		const state = {
			dots: [dot("a", 50, 50), dot("b", 200, 200, true)],
		};
		const next = applyClickSelection(state, { x: 55, y: 50 }, RADIUS);
		expect(next.dots[0]?.selected).toBe(true);
		expect(next.dots[1]?.selected).toBe(false);
	});

	it("clears selection when clicking empty space", () => {
		const state = {
			dots: [dot("a", 50, 50, true)],
		};
		const next = applyClickSelection(state, { x: 0, y: 0 }, RADIUS);
		expect(next.dots[0]?.selected).toBe(false);
	});

	it("picks the closest overlapping circle", () => {
		const state = {
			dots: [dot("far", 50, 50), dot("near", 55, 50)],
		};
		const next = applyClickSelection(state, { x: 58, y: 50 }, RADIUS);
		expect(next.dots[0]?.selected).toBe(false);
		expect(next.dots[1]?.selected).toBe(true);
	});
});
