import {
	MORALE_DRAIN_PER_SEC,
	MORALE_REGEN_PER_SEC,
} from "../shared/config";
import type { Unit } from "../units";
import { findPriorityEnemy } from "./combat";

/**
 * Drain morale while an enemy is in attack range; regen otherwise.
 * Encirclement idle-drain is Step 3 — not applied here.
 * Diplomats never take combat drain (they never fight).
 */
export function tickMorale(units: readonly Unit[], dt: number): readonly Unit[] {
	const living = units.filter((unit) => unit.isAlive);

	return units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
		}

		const inContact =
			unit.canAttack &&
			findPriorityEnemy(unit, living, unit.attackRange) !== null;

		if (inContact) {
			const next = Math.max(0, unit.morale - MORALE_DRAIN_PER_SEC * dt);
			if (next === unit.morale) {
				return unit;
			}
			return unit.copy({ morale: next });
		}

		const next = Math.min(
			unit.maxMorale,
			unit.morale + MORALE_REGEN_PER_SEC * dt,
		);
		if (next === unit.morale) {
			return unit;
		}
		return unit.copy({ morale: next });
	});
}
