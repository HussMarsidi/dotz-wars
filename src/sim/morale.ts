import {
	MORALE_DRAIN_PER_SEC,
	MORALE_REGEN_PER_SEC,
} from "../shared/config";
import type { DotId } from "../shared/types";
import type { Unit } from "../units";

/**
 * Encircled units drain morale even while idle; others regen.
 * Combat hit morale still comes from `receiveHit` only.
 */
export function tickMorale(
	units: readonly Unit[],
	dt: number,
	encircledIds: ReadonlySet<DotId> = new Set(),
): readonly Unit[] {
	return units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
		}

		if (encircledIds.has(unit.id)) {
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
