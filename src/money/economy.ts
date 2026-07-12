import type { City } from "../cities";
import type { ResourceNode } from "../map/types";
import {
	CITY_INCOME_PER_SEC,
	RESOURCE_CONNECTOR_SHARE,
	RESOURCE_INCOME_PER_SEC,
	UNIT_UPKEEP_PER_SEC,
} from "../shared/config";
import type { TeamId } from "../shared/types";
import type { TerritoryField } from "../territory";
import { ownerAt } from "../territory";
import type { Unit } from "../units";
import type { TeamGold } from "./money";

/** Clamp team balances at 0 (never negative). */
export function clampGold(gold: TeamGold): TeamGold {
	return {
		blue: Math.max(0, gold.blue),
		red: Math.max(0, gold.red),
	};
}

export function cityIncomeRate(cities: readonly City[], teamId: TeamId): number {
	let n = 0;
	for (const city of cities) {
		if (city.teamId === teamId) {
			n += 1;
		}
	}
	return n * CITY_INCOME_PER_SEC;
}

export function connectorIncomeRate(
	resources: readonly ResourceNode[],
	field: TerritoryField,
	teamId: TeamId,
): number {
	let rate = 0;
	const slice = RESOURCE_INCOME_PER_SEC * RESOURCE_CONNECTOR_SHARE;
	for (const resource of resources) {
		for (const connector of resource.connectors) {
			if (ownerAt(field, connector) === teamId) {
				rate += slice;
			}
		}
	}
	return rate;
}

export function upkeepRate(units: readonly Unit[], teamId: TeamId): number {
	let rate = 0;
	for (const unit of units) {
		if (!unit.isAlive || unit.teamId !== teamId) {
			continue;
		}
		rate += UNIT_UPKEEP_PER_SEC[unit.kind];
	}
	return rate;
}

export function netIncomeRate(
	cities: readonly City[],
	units: readonly Unit[],
	resources: readonly ResourceNode[],
	field: TerritoryField,
	teamId: TeamId,
): number {
	return (
		cityIncomeRate(cities, teamId) +
		connectorIncomeRate(resources, field, teamId) -
		upkeepRate(units, teamId)
	);
}

/**
 * Continuous city + connector income, then unit upkeep. Clamps at 0.
 */
export function tickEconomy(
	gold: TeamGold,
	cities: readonly City[],
	units: readonly Unit[],
	resources: readonly ResourceNode[],
	field: TerritoryField,
	dt: number,
): TeamGold {
	const next: { blue: number; red: number } = {
		blue: gold.blue,
		red: gold.red,
	};
	for (const teamId of ["blue", "red"] as const) {
		next[teamId] = Math.max(
			0,
			next[teamId] + netIncomeRate(cities, units, resources, field, teamId) * dt,
		);
	}
	return next;
}
