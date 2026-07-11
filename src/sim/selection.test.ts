import { describe, expect, it } from "vitest";
import type { GameState } from "../shared/game-state";
import type { Rect } from "../shared/types";
import type { Unit } from "../units";
import { Grunt } from "../units";
import {
	applyClickSelection,
	applyMarqueeSelection,
	circleOverlapsRect,
	clearSelection,
	pointHitsCircle,
	selectUnitsInRect,
} from "./selection";

const RADIUS = 10;

function unit(id: string, x: number, y: number, selected = false): Unit {
	return Grunt.spawn(id, "blue", { x, y }).copy({ selected });
}

function rect(x: number, y: number, width: number, height: number): Rect {
	return { x, y, width, height };
}

function stateOf(...units: Unit[]): GameState {
	return { units, cities: [], projectiles: [], winner: null };
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

describe("selectUnitsInRect", () => {
	const units = [
		unit("inside", 50, 50),
		unit("outside", 200, 200),
		unit("edge", 110, 50),
	];

	it("selects units inside; leaves outside unselected", () => {
		const selected = selectUnitsInRect(units, rect(0, 0, 100, 100), RADIUS);
		expect(selected.has("inside")).toBe(true);
		expect(selected.has("outside")).toBe(false);
		expect(selected.has("edge")).toBe(true);
	});

	it("empty rectangle selects nothing", () => {
		const selected = selectUnitsInRect(units, rect(40, 40, 0, 0), RADIUS);
		expect(selected.size).toBe(0);
	});
});

describe("applyMarqueeSelection", () => {
	it("updates selected flags without moving positions", () => {
		const state = stateOf(unit("a", 50, 50, false), unit("b", 200, 200, true));
		const next = applyMarqueeSelection(state, rect(0, 0, 100, 100), RADIUS);

		expect(next.units[0]?.id).toBe("a");
		expect(next.units[0]?.selected).toBe(true);
		expect(next.units[0]?.position).toEqual({ x: 50, y: 50 });
		expect(next.units[1]?.id).toBe("b");
		expect(next.units[1]?.selected).toBe(false);
		expect(next.units[1]?.position).toEqual({ x: 200, y: 200 });
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
	it("selects the clicked unit", () => {
		const state = stateOf(unit("a", 50, 50), unit("b", 200, 200, true));
		const next = applyClickSelection(state, { x: 55, y: 50 }, RADIUS);
		expect(next.units[0]?.selected).toBe(true);
		expect(next.units[1]?.selected).toBe(false);
	});

	it("clears selection when clicking empty space", () => {
		const state = stateOf(unit("a", 50, 50, true));
		const next = applyClickSelection(state, { x: 0, y: 0 }, RADIUS);
		expect(next.units[0]?.selected).toBe(false);
	});

	it("picks the closest overlapping circle", () => {
		const state = stateOf(unit("far", 50, 50), unit("near", 55, 50));
		const next = applyClickSelection(state, { x: 58, y: 50 }, RADIUS);
		expect(next.units[0]?.selected).toBe(false);
		expect(next.units[1]?.selected).toBe(true);
	});
});

describe("clearSelection", () => {
	it("clears all selected flags", () => {
		const state = stateOf(unit("a", 50, 50, true), unit("b", 200, 200, true));
		const next = clearSelection(state);
		expect(next.units[0]?.selected).toBe(false);
		expect(next.units[1]?.selected).toBe(false);
	});
});
