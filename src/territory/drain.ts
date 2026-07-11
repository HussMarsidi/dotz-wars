import {
	TERRITORY_DRAIN_BUDDY_RADIUS,
	TERRITORY_DRAIN_BUDDY_REDUCTION_MAX,
	TERRITORY_DRAIN_BUDDY_REDUCTION_PER,
	TERRITORY_DRAIN_HP_PER_SEC,
} from "../shared/config";
import type { TeamId, Vec2 } from "../shared/types";
import type { Unit } from "../units";
import { overwhelmAt } from "./field";
import type { InfluenceSource } from "./types";

/**
 * How much nearby living teammates blunt territory drain.
 * 1 = alone (full drain); lower when clustered. Needs several buddies to matter.
 */
export function buddyDrainMultiplier(
	unitId: string,
	teamId: TeamId,
	position: Vec2,
	units: readonly Unit[],
): number {
	let buddies = 0;
	const r2 = TERRITORY_DRAIN_BUDDY_RADIUS * TERRITORY_DRAIN_BUDDY_RADIUS;
	for (const other of units) {
		if (other.id === unitId || !other.isAlive || other.teamId !== teamId) {
			continue;
		}
		const dx = other.position.x - position.x;
		const dy = other.position.y - position.y;
		if (dx * dx + dy * dy <= r2) {
			buddies += 1;
		}
	}
	if (buddies <= 0) {
		return 1;
	}
	const reduction = Math.min(
		TERRITORY_DRAIN_BUDDY_REDUCTION_MAX,
		buddies * TERRITORY_DRAIN_BUDDY_REDUCTION_PER,
	);
	return 1 - reduction;
}

/**
 * HP drain when enemy influence fully covers the unit's at its feet.
 * Rate scales with overwhelm: shallow fringe = slow bleed; deep = fast.
 * Nearby teammates further cut the rate — move as a pack to push deeper.
 * Own / neutral ground (overwhelm 0) is safe.
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
		const buddyMult = buddyDrainMultiplier(
			unit.id,
			unit.teamId,
			unit.position,
			units,
		);
		const loss = TERRITORY_DRAIN_HP_PER_SEC * overwhelm * buddyMult * dt;
		return unit.copy({ hp: Math.max(0, unit.hp - loss) });
	});
}
