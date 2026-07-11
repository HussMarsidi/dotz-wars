import type { FormationRegistry } from "../formation";
import type { MapDefinition } from "../map/types";
import { AGGRO_RANGE_MULTIPLIER } from "../shared/config";
import type { Unit } from "../units";
import { findPriorityEnemy } from "./combat";
import { findPath } from "./navigation";

/**
 * Both teams: if an enemy is within aggro (attackRange * multiplier),
 * interrupt current orders, break formation, and path in to fight.
 * Prefers nearly-dead targets (same priority as combat).
 * Stops moving once inside attack range so combat can fire.
 */
export function tickChase(
	units: readonly Unit[],
	map: MapDefinition,
	radius: number,
	formations?: FormationRegistry,
): readonly Unit[] {
	const living = units.filter((unit) => unit.isAlive);
	const chaserIds: string[] = [];

	const next = units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
		}

		const aggro = unit.attackRange * AGGRO_RANGE_MULTIPLIER;
		const enemy = findPriorityEnemy(unit, living, aggro);
		if (enemy === null) {
			return unit;
		}

		chaserIds.push(unit.id);

		const dist = Math.hypot(
			enemy.position.x - unit.position.x,
			enemy.position.y - unit.position.y,
		);

		if (dist <= unit.attackRange) {
			if (
				unit.target === null &&
				unit.path.length === 0 &&
				unit.orderKind === "attack"
			) {
				return unit;
			}
			return unit.copy({
				target: null,
				path: [],
				orderKind: "attack",
				orderAge: 0,
			});
		}

		const path = findPath(map, unit.position, enemy.position, radius);
		if (path === null || path.length === 0) {
			return unit;
		}
		const last = path[path.length - 1] ?? enemy.position;
		return unit.copy({
			target: last,
			path,
			orderKind: "attack",
			orderAge: 0,
		});
	});

	if (formations !== undefined && chaserIds.length > 0) {
		formations.breakMembers(chaserIds);
	}

	return next;
}
