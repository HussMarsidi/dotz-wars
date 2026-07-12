import { partialRefundAmount, refund, spend, type TeamGold } from "../money";
import {
	CITY_PRODUCTION_QUEUE_CAP,
	CITY_SIZE,
	DIPLOMAT_CAP,
	LOCAL_TEAM,
	UNIT_COST,
	UNIT_TRAIN_TIME,
} from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { TeamId, Vec2 } from "../shared/types";
import { spawnUnit, type Unit, type UnitKind } from "../units";
import {
	type City,
	type CityId,
	copyCity,
	type ProductionOrder,
	type ProductionOrderId,
} from "./city";

let nextOrderSeq = 1;
let nextSpawnSeq = 1;

export function resetProductionIdsForTests(): void {
	nextOrderSeq = 1;
	nextSpawnSeq = 1;
}

function nextOrderId(): ProductionOrderId {
	const id = `prod-${nextOrderSeq}`;
	nextOrderSeq += 1;
	return id;
}

function nextSpawnedUnitId(teamId: TeamId, kind: UnitKind): string {
	const id = `${teamId}-trained-${kind}-${nextSpawnSeq}`;
	nextSpawnSeq += 1;
	return id;
}

/** Progress 0..1 for a production order. */
export function orderProgress(order: ProductionOrder): number {
	if (order.trainTime <= 0) {
		return 1;
	}
	return Math.min(1, order.elapsed / order.trainTime);
}

/** Random point inside the city body square (CITY_SIZE). */
export function randomPointInCityBody(
	city: City,
	random: () => number = Math.random,
): Vec2 {
	const half = CITY_SIZE / 2;
	return {
		x: city.position.x - half + random() * CITY_SIZE,
		y: city.position.y - half + random() * CITY_SIZE,
	};
}

function findCity(cities: readonly City[], cityId: CityId): City | undefined {
	return cities.find((city) => city.id === cityId);
}

function diplomatCountForTeam(state: GameState, teamId: TeamId): number {
	let count = 0;
	for (const unit of state.units) {
		if (unit.isAlive && unit.teamId === teamId && unit.kind === "diplomat") {
			count += 1;
		}
	}
	for (const city of state.cities) {
		if (city.teamId !== teamId) {
			continue;
		}
		for (const order of city.queue) {
			if (order.kind === "diplomat") {
				count += 1;
			}
		}
	}
	return count;
}

/**
 * Queue a unit at an owned local-team city. Deducts gold up front.
 * Returns null if unaffordable, queue full, wrong owner, or unknown city/kind.
 */
export function orderUnit(
	state: GameState,
	cityId: CityId,
	kind: UnitKind,
): GameState | null {
	const city = findCity(state.cities, cityId);
	if (city === undefined) {
		return null;
	}
	if (city.teamId !== LOCAL_TEAM) {
		return null;
	}
	if (city.queue.length >= CITY_PRODUCTION_QUEUE_CAP) {
		return null;
	}

	if (kind === "diplomat") {
		if (state.diplomatLockout[LOCAL_TEAM] > 0) {
			return null;
		}
		if (diplomatCountForTeam(state, LOCAL_TEAM) >= DIPLOMAT_CAP) {
			return null;
		}
	}

	const cost = UNIT_COST[kind];
	const trainTime = UNIT_TRAIN_TIME[kind];
	const nextGold = spend(state.gold, LOCAL_TEAM, cost);
	if (nextGold === null) {
		return null;
	}

	const order: ProductionOrder = {
		id: nextOrderId(),
		kind,
		cost,
		trainTime,
		elapsed: 0,
	};

	return {
		...state,
		gold: nextGold,
		cities: state.cities.map((c) =>
			c.id === cityId ? copyCity(c, { queue: [...c.queue, order] }) : c,
		),
	};
}

/**
 * Cancel a queued/in-progress order. Partial refund by remaining progress.
 */
export function cancelProductionOrder(
	state: GameState,
	cityId: CityId,
	orderId: ProductionOrderId,
): GameState | null {
	const city = findCity(state.cities, cityId);
	if (city === undefined) {
		return null;
	}
	if (city.teamId !== LOCAL_TEAM) {
		return null;
	}

	const order = city.queue.find((item) => item.id === orderId);
	if (order === undefined) {
		return null;
	}

	const amount = partialRefundAmount(order.cost, orderProgress(order));
	const nextQueue = city.queue.filter((item) => item.id !== orderId);

	return {
		...state,
		gold: refund(state.gold, LOCAL_TEAM, amount),
		cities: state.cities.map((c) =>
			c.id === cityId ? copyCity(c, { queue: nextQueue }) : c,
		),
	};
}

/**
 * When ownership flips, refund remaining progress to the previous owner and clear queue.
 */
export function settleQueuesAfterCapture(
	previous: readonly City[],
	cities: readonly City[],
	gold: TeamGold,
): { readonly cities: readonly City[]; readonly gold: TeamGold } {
	const prevById = new Map(previous.map((city) => [city.id, city]));
	let nextGold = gold;
	const nextCities = cities.map((city) => {
		const prev = prevById.get(city.id);
		if (prev === undefined || prev.teamId === city.teamId) {
			return city;
		}
		if (prev.queue.length === 0) {
			return city.queue.length === 0 ? city : copyCity(city, { queue: [] });
		}
		for (const order of prev.queue) {
			const amount = partialRefundAmount(order.cost, orderProgress(order));
			nextGold = refund(nextGold, prev.teamId, amount);
		}
		return copyCity(city, { queue: [] });
	});
	return { cities: nextCities, gold: nextGold };
}

type TickProductionResult = {
	readonly cities: readonly City[];
	readonly units: readonly Unit[];
};

/**
 * Advance all city queues concurrently. Completed orders spawn inside the city body.
 */
export function tickProduction(
	cities: readonly City[],
	units: readonly Unit[],
	dt: number,
	random: () => number = Math.random,
): TickProductionResult {
	const spawned: Unit[] = [];
	const nextCities = cities.map((city) => {
		if (city.queue.length === 0) {
			return city;
		}

		const remaining: ProductionOrder[] = [];
		for (const order of city.queue) {
			const elapsed = order.elapsed + dt;
			if (elapsed >= order.trainTime) {
				spawned.push(
					spawnUnit(
						order.kind,
						nextSpawnedUnitId(city.teamId, order.kind),
						city.teamId,
						randomPointInCityBody(city, random),
					),
				);
				continue;
			}
			remaining.push({ ...order, elapsed });
		}

		if (
			remaining.length === city.queue.length &&
			remaining.every(
				(order, index) => order.elapsed === city.queue[index]?.elapsed,
			)
		) {
			return city;
		}
		return copyCity(city, { queue: remaining });
	});

	if (spawned.length === 0) {
		return { cities: nextCities, units };
	}
	return { cities: nextCities, units: [...units, ...spawned] };
}
