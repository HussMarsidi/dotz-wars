import { TERRITORY_DRAIN_HP_PER_SEC } from "../shared/config";
import type { Unit } from "../units";
import { overwhelmAt } from "./field";
import type { InfluenceSource } from "./types";

/**
 * HP drain when enemy influence fully covers the unit's at its feet.
 * Rate scales with overwhelm: shallow fringe = slow bleed; deep = fast.
 * Own / neutral ground (overwhelm 0) is safe. Blobs raise own influence and can stop the drain.
 */
export function applyTerritoryDrain(
	units: readonly Unit[],
	sources: readonly InfluenceSource[],
	dt: number,
): readonly Unit[] {
	if (dt <= 0) {
		return units;
	}

	return units.map((unit) => {
		if (!unit.isAlive) {
			return unit;
		}
		const overwhelm = overwhelmAt(sources, unit.position, unit.teamId);
		if (overwhelm <= 0) {
			return unit;
		}
		const loss = TERRITORY_DRAIN_HP_PER_SEC * overwhelm * dt;
		return unit.copy({ hp: Math.max(0, unit.hp - loss) });
	});
}
