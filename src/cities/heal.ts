import { CITY_HEAL_HP_PER_SEC, CITY_HEAL_RADIUS } from "../shared/config";
import type { DotId } from "../shared/types";
import type { Unit } from "../units";
import type { City } from "./city";

/**
 * Living units within geometric heal radius of a same-team city.
 * Ownership of the cell under the unit does not matter — city team does.
 */
export function collectInHealRadius(
	cities: readonly City[],
	units: readonly Unit[],
	radius: number = CITY_HEAL_RADIUS,
): ReadonlySet<DotId> {
	const ids = new Set<DotId>();
	const radiusSq = radius * radius;

	for (const unit of units) {
		if (!unit.isAlive) {
			continue;
		}
		for (const city of cities) {
			if (city.teamId !== unit.teamId) {
				continue;
			}
			const dx = unit.position.x - city.position.x;
			const dy = unit.position.y - city.position.y;
			if (dx * dx + dy * dy <= radiusSq) {
				ids.add(unit.id);
				break;
			}
		}
	}

	return ids;
}

/**
 * Restore HP near friendly cities. Instantly refill morale (exits Routing).
 * Encircled units get neither — cut-off pockets cannot use a distant city's aura.
 */
export function tickHealing(
	units: readonly Unit[],
	dt: number,
	inHealRadiusIds: ReadonlySet<DotId>,
	encircledIds: ReadonlySet<DotId>,
): readonly Unit[] {
	if (inHealRadiusIds.size === 0) {
		return units;
	}

	return units.map((unit) => {
		if (!unit.isAlive || !inHealRadiusIds.has(unit.id)) {
			return unit;
		}
		if (encircledIds.has(unit.id)) {
			return unit;
		}

		const nextHp = Math.min(
			unit.maxHp,
			unit.hp + CITY_HEAL_HP_PER_SEC * dt,
		);
		const nextMorale = unit.maxMorale;
		if (nextHp === unit.hp && nextMorale === unit.morale) {
			return unit;
		}
		return unit.copy({ hp: nextHp, morale: nextMorale });
	});
}
