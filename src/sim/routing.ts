import type { City } from "../cities";
import type { FormationRegistry } from "../formation";
import type { MapDefinition } from "../map/types";
import type { Unit } from "../units";
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

/**
 * Routing units flee toward the nearest friendly city.
 * No encirclement BFS yet (Step 3) — pathfind, else clear path and
 * `advanceUnit` will not move until a path exists; we fall back to a
 * single-waypoint straight-line target when pathfind fails.
 *
 * While an enemy is in attack range, clear orders so combat can fire
 * in place (ordinary Fighting resolution while still `routing`).
 */
export function ensureRoutingFleePaths(
	units: readonly Unit[],
	cities: readonly City[],
	map: MapDefinition,
	radius: number,
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

		const city = nearestFriendlyCity(unit, cities);
		if (city === null) {
			return unit.copy({ selected: false });
		}

		const path = findPath(map, unit.position, city.position, radius);
		if (path !== null && path.length > 0) {
			const last = path[path.length - 1] ?? city.position;
			return unit.copy({
				selected: false,
				target: last,
				path,
				orderKind: "move",
				orderAge: 0,
			});
		}

		// Straight-line fallback until BFS home paths exist (Step 3).
		return unit.copy({
			selected: false,
			target: city.position,
			path: [city.position],
			orderKind: "move",
			orderAge: 0,
		});
	});

	if (formations !== undefined && brokenIds.length > 0) {
		formations.breakMembers(brokenIds);
	}

	return next;
}
