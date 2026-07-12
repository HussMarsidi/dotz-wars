import type { City } from "../cities";
import type { FormationRegistry } from "../formation";
import type { MapDefinition } from "../map/types";
import type { Unit } from "../units";
import {
	bfsPathHome,
	type EncirclementResult,
	nearestReachedCellCenter,
	type TerritoryField,
} from "../territory";
import { findPriorityEnemy } from "./combat";
import { findPath } from "./navigation";

function nearestFriendlyCity(unit: Unit, cities: readonly City[]): City | null {
	let best: City | null = null;
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
			best = city;
		}
	}
	return best;
}

function applyFleeOrder(unit: Unit, path: readonly { x: number; y: number }[]): Unit {
	if (path.length === 0) {
		return unit.copy({ selected: false });
	}
	const last = path[path.length - 1];
	if (last === undefined) {
		return unit.copy({ selected: false });
	}
	return unit.copy({
		selected: false,
		target: last,
		path,
		orderKind: "move",
		orderAge: 0,
	});
}

/**
 * Routing units flee home.
 * Prefer encirclement-BFS path when on reached ground; otherwise head toward
 * the nearest reached cell (or friendly city via pathfind / straight-line).
 *
 * While an enemy is in attack range, clear orders so combat can fire in place.
 */
export function ensureRoutingFleePaths(
	units: readonly Unit[],
	cities: readonly City[],
	map: MapDefinition,
	radius: number,
	field: TerritoryField,
	encirclement: EncirclementResult,
	formations?: FormationRegistry,
): readonly Unit[] {
	const living = units.filter((unit) => unit.isAlive);
	const brokenIds: string[] = [];

	const next = units.map((unit) => {
		if (!unit.isAlive || unit.state !== "routing") {
			return unit;
		}

		brokenIds.push(unit.id);

		const enemy = findPriorityEnemy(unit, living, unit.attackRange);
		if (enemy !== null) {
			if (
				unit.target === null &&
				unit.path.length === 0 &&
				!unit.selected
			) {
				return unit;
			}
			return unit.copy({
				selected: false,
				target: null,
				path: [],
				orderKind: "move",
				orderAge: 0,
			});
		}

		const bfsPath = bfsPathHome(
			field,
			encirclement,
			unit.teamId,
			unit.position,
		);
		if (bfsPath !== null && bfsPath.length > 0) {
			return applyFleeOrder(unit, bfsPath);
		}

		const bridge = nearestReachedCellCenter(
			field,
			encirclement,
			unit.teamId,
			unit.position,
		);
		const goal =
			bridge ?? nearestFriendlyCity(unit, cities)?.position ?? null;
		if (goal === null) {
			return unit.copy({ selected: false });
		}

		const path = findPath(map, unit.position, goal, radius);
		if (path !== null && path.length > 0) {
			return applyFleeOrder(unit, path);
		}

		return applyFleeOrder(unit, [goal]);
	});

	if (formations !== undefined && brokenIds.length > 0) {
		formations.breakMembers(brokenIds);
	}

	return next;
}
