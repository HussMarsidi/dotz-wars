import { beforeEach, describe, expect, it } from "vitest";
import { createInitialGold } from "../money";
import {
	CITY_PRODUCTION_QUEUE_CAP,
	CITY_SIZE,
	STARTING_GOLD,
	UNIT_COST,
	UNIT_TRAIN_TIME,
} from "../shared/config";
import type { GameState } from "../shared/game-state";
import { emptyTerritory } from "../territory";
import { createCity } from "./city";
import {
	cancelProductionOrder,
	orderProgress,
	orderUnit,
	randomPointInCityBody,
	resetProductionIdsForTests,
	settleQueuesAfterCapture,
	tickProduction,
} from "./production";

function stateWithCity(
	teamId: "blue" | "red" = "blue",
	gold = createInitialGold(),
): GameState {
	return {
		units: [],
		cities: [createCity("blue-n", teamId, { x: 100, y: 100 }, "N")],
		territory: emptyTerritory(1, 1),
		projectiles: [],
		gold,
		diplomatLockout: { blue: 0, red: 0 },
		winner: null,
	};
}

describe("randomPointInCityBody", () => {
	it("stays inside the city body square", () => {
		const city = createCity("c", "blue", { x: 100, y: 200 }, "N");
		const half = CITY_SIZE / 2;
		for (let i = 0; i < 20; i += 1) {
			const point = randomPointInCityBody(city, () => i / 20);
			expect(point.x).toBeGreaterThanOrEqual(city.position.x - half);
			expect(point.x).toBeLessThanOrEqual(city.position.x + half);
			expect(point.y).toBeGreaterThanOrEqual(city.position.y - half);
			expect(point.y).toBeLessThanOrEqual(city.position.y + half);
		}
	});
});

describe("orderUnit", () => {
	beforeEach(() => {
		resetProductionIdsForTests();
	});

	it("deducts gold and enqueues the order", () => {
		const state = stateWithCity();
		const next = orderUnit(state, "blue-n", "grunt");
		expect(next).not.toBeNull();
		expect(next?.gold.blue).toBe(STARTING_GOLD - UNIT_COST.grunt);
		expect(next?.cities[0]?.queue).toHaveLength(1);
		expect(next?.cities[0]?.queue[0]?.kind).toBe("grunt");
		expect(next?.cities[0]?.queue[0]?.trainTime).toBe(UNIT_TRAIN_TIME.grunt);
	});

	it("rejects unaffordable orders", () => {
		const state = stateWithCity("blue", { blue: 10, red: 1000 });
		expect(orderUnit(state, "blue-n", "tank")).toBeNull();
	});

	it("rejects orders for enemy-owned cities", () => {
		const state = stateWithCity("red");
		expect(orderUnit(state, "blue-n", "scout")).toBeNull();
	});

	it("rejects when queue is full", () => {
		let state = stateWithCity("blue", { blue: 10_000, red: 1000 });
		for (let i = 0; i < CITY_PRODUCTION_QUEUE_CAP; i += 1) {
			const next = orderUnit(state, "blue-n", "scout");
			expect(next).not.toBeNull();
			state = next!;
		}
		expect(orderUnit(state, "blue-n", "scout")).toBeNull();
	});
});

describe("cancelProductionOrder", () => {
	beforeEach(() => {
		resetProductionIdsForTests();
	});

	it("refunds full cost when canceling a fresh order", () => {
		const ordered = orderUnit(stateWithCity(), "blue-n", "archer");
		expect(ordered).not.toBeNull();
		const orderId = ordered!.cities[0]!.queue[0]!.id;
		const cancelled = cancelProductionOrder(ordered!, "blue-n", orderId);
		expect(cancelled?.gold.blue).toBe(STARTING_GOLD);
		expect(cancelled?.cities[0]?.queue).toHaveLength(0);
	});

	it("refunds partial cost by remaining progress", () => {
		const ordered = orderUnit(stateWithCity(), "blue-n", "archer");
		expect(ordered).not.toBeNull();
		const city = ordered!.cities[0]!;
		const order = city.queue[0]!;
		const halfDone = {
			...ordered!,
			cities: [
				{
					...city,
					queue: [{ ...order, elapsed: order.trainTime / 2 }],
				},
			],
		};
		const cancelled = cancelProductionOrder(halfDone, "blue-n", order.id);
		expect(cancelled?.gold.blue).toBe(
			STARTING_GOLD - UNIT_COST.archer + Math.floor(UNIT_COST.archer * 0.5),
		);
	});
});

describe("tickProduction", () => {
	beforeEach(() => {
		resetProductionIdsForTests();
	});

	it("advances concurrent orders and spawns when complete", () => {
		let state = stateWithCity("blue", { blue: 10_000, red: 1000 });
		state = orderUnit(state, "blue-n", "scout")!;
		state = orderUnit(state, "blue-n", "grunt")!;

		const mid = tickProduction(state.cities, state.units, 1, () => 0.5);
		expect(mid.cities[0]?.queue).toHaveLength(2);
		expect(mid.units).toHaveLength(0);
		expect(orderProgress(mid.cities[0]!.queue[0]!)).toBeCloseTo(0.5);

		const done = tickProduction(mid.cities, mid.units, 2, () => 0.5);
		expect(done.units).toHaveLength(2);
		expect(done.cities[0]?.queue).toHaveLength(0);
		expect(done.units[0]?.kind).toBe("scout");
		expect(done.units[1]?.kind).toBe("grunt");
	});
});

describe("settleQueuesAfterCapture", () => {
	beforeEach(() => {
		resetProductionIdsForTests();
	});

	it("refunds previous owner and clears queue on flip", () => {
		const ordered = orderUnit(stateWithCity(), "blue-n", "tank");
		expect(ordered).not.toBeNull();
		const prev = ordered!.cities;
		const flipped = [
			{
				...prev[0]!,
				teamId: "red" as const,
				queue: prev[0]!.queue,
			},
		];
		const settled = settleQueuesAfterCapture(prev, flipped, ordered!.gold);
		expect(settled.cities[0]?.queue).toHaveLength(0);
		expect(settled.gold.blue).toBe(STARTING_GOLD);
	});
});
