import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../map/types";
import { DOT_SPEED } from "../shared/config";
import type { Dot, GameState } from "../shared/types";
import { interpolateState, issueMoveOrder, step } from "./step";

const map: MapDefinition = {
	id: "test",
	width: 200,
	height: 200,
	water: [
		{
			kind: "ellipse",
			center: { x: 150, y: 100 },
			radiusX: 40,
			radiusY: 40,
		},
	],
};

const RADIUS = 10;

function makeDot(partial: Partial<Dot> & Pick<Dot, "id" | "position">): Dot {
	return {
		selected: false,
		speed: DOT_SPEED,
		target: null,
		...partial,
	};
}

function stateOf(...dots: Dot[]): GameState {
	return { dots };
}

describe("issueMoveOrder", () => {
	it("sets target on selected dots when destination is land", () => {
		const state = stateOf(
			makeDot({ id: "a", position: { x: 50, y: 50 }, selected: true }),
			makeDot({ id: "b", position: { x: 60, y: 60 }, selected: false }),
		);
		const next = issueMoveOrder(state, { x: 80, y: 50 }, map, RADIUS);
		expect(next.dots[0]?.target).toEqual({ x: 80, y: 50 });
		expect(next.dots[1]?.target).toBeNull();
	});

	it("ignores orders into water", () => {
		const state = stateOf(
			makeDot({ id: "a", position: { x: 50, y: 50 }, selected: true }),
		);
		const next = issueMoveOrder(state, { x: 150, y: 100 }, map, RADIUS);
		expect(next.dots[0]?.target).toBeNull();
	});

	it("no-ops when nothing selected", () => {
		const state = stateOf(
			makeDot({ id: "a", position: { x: 50, y: 50 }, selected: false }),
		);
		const next = issueMoveOrder(state, { x: 80, y: 50 }, map, RADIUS);
		expect(next).toBe(state);
	});
});

describe("step", () => {
	it("moves toward target at speed * dt", () => {
		const state = stateOf(
			makeDot({
				id: "a",
				position: { x: 0, y: 50 },
				speed: 100,
				target: { x: 100, y: 50 },
			}),
		);
		const next = step(state, map, RADIUS, 0.1);
		expect(next.dots[0]?.position.x).toBeCloseTo(10);
		expect(next.dots[0]?.position.y).toBeCloseTo(50);
		expect(next.dots[0]?.target).toEqual({ x: 100, y: 50 });
	});

	it("clears target on arrival", () => {
		const state = stateOf(
			makeDot({
				id: "a",
				position: { x: 50, y: 50 },
				speed: 100,
				target: { x: 55, y: 50 },
			}),
		);
		const next = step(state, map, RADIUS, 0.1);
		expect(next.dots[0]?.position).toEqual({ x: 55, y: 50 });
		expect(next.dots[0]?.target).toBeNull();
	});

	it("stops at water edge and clears target", () => {
		const state = stateOf(
			makeDot({
				id: "a",
				position: { x: 80, y: 100 },
				speed: 200,
				target: { x: 150, y: 100 },
			}),
		);
		const next = step(state, map, RADIUS, 1);
		expect(next.dots[0]?.target).toBeNull();
		expect(next.dots[0]?.position.x).toBeLessThan(150 - 40);
		// Still on land (circle does not overlap water)
		expect(next.dots[0]?.position.x).toBeGreaterThan(80);
	});
});

describe("interpolateState", () => {
	it("blends positions between ticks", () => {
		const previous = stateOf(
			makeDot({ id: "a", position: { x: 0, y: 0 }, target: { x: 10, y: 0 } }),
		);
		const current = stateOf(
			makeDot({ id: "a", position: { x: 10, y: 0 }, target: { x: 10, y: 0 } }),
		);
		const mid = interpolateState(previous, current, 0.5);
		expect(mid.dots[0]?.position.x).toBeCloseTo(5);
	});
});
