import { MORALE_REGEN_PER_SEC } from "../shared/config";
import type { Unit } from "../units";

/**
 * Regen morale over time.
 * Combat morale loss comes only from incoming hits (`receiveHit`).
 * Attacking does not drain your own morale.
 * Encirclement idle-drain is Step 3 (`MORALE_DRAIN_PER_SEC` reserved there).
 */
export function tickMorale(units: readonly Unit[], dt: number): readonly Unit[] {
	return units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
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
