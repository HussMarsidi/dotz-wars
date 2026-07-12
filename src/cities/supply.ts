import { CITY_SUPPLY_CAP } from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { City, CityId } from "../cities";
import type { Unit } from "../units";

/** Nearest friendly city for a living unit, or null. */
export function nearestFriendlyCityId(
	unit: Unit,
	cities: readonly City[],
): CityId | null {
	let best: CityId | null = null;
	let bestDist = Number.POSITIVE_INFINITY;
	for (const city of cities) {
		if (city.teamId !== unit.teamId) {
			continue;
		}
		const dist = Math.hypot(
			city.position.x - unit.position.x,
			city.position.y - unit.position.y,
		);
		if (dist < bestDist) {
			bestDist = dist;
			best = city.id;
		}
	}
	return best;
}

/** Living units assigned to this city (nearest friendly) + queued orders. */
export function citySupplyUsed(state: GameState, cityId: CityId): number {
	const city = state.cities.find((c) => c.id === cityId);
	if (city === undefined) {
		return 0;
	}
	let used = city.queue.length;
	for (const unit of state.units) {
		if (!unit.isAlive || unit.teamId !== city.teamId) {
			continue;
		}
		if (nearestFriendlyCityId(unit, state.cities) === cityId) {
			used += 1;
		}
	}
	return used;
}

export function cityHasSupplyRoom(state: GameState, cityId: CityId): boolean {
	return citySupplyUsed(state, cityId) < CITY_SUPPLY_CAP;
}
