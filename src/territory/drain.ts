import { TERRITORY_DRAIN_HP_PER_SEC } from "../shared/config";
import type { Unit } from "../units";
import { isEnemyGround } from "./field";
import type { TerritoryField } from "./types";

/**
 * Flat HP drain on enemy-owned ground.
 * Own ground and neutral are safe. A unit's own projection counts toward ownership,
 * so a blob can flip the ground under itself and stop bleeding.
 */
export function applyTerritoryDrain(
	units: readonly Unit[],
	field: TerritoryField,
	dt: number,
): readonly Unit[] {
	const loss = TERRITORY_DRAIN_HP_PER_SEC * dt;
	if (loss <= 0) {
		return units;
	}

	return units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
		}
		if (!isEnemyGround(field, unit.position, unit.teamId)) {
			return unit;
		}
		return unit.copy({ hp: Math.max(0, unit.hp - loss) });
	});
}
