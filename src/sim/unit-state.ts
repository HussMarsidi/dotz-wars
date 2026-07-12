import { MORALE_ROUTING_EXIT } from "../shared/config";
import type { DotId } from "../shared/types";
import type { Unit, UnitState } from "../units";
import { findPriorityEnemy } from "./combat";

/**
 * Derive combat/movement state.
 * Morale ≤ 0 forces Routing. Stays routing until morale reaches the exit
 * threshold (regen while fleeing would otherwise restore control instantly).
 */
export function deriveUnitState(
	unit: Unit,
	living: readonly Unit[],
	marchingIds: ReadonlySet<DotId>,
): UnitState {
	if (!unit.isAlive) {
		return unit.state;
	}

	if (unit.morale <= 0) {
		return "routing";
	}

	if (unit.state === "routing" && unit.morale < MORALE_ROUTING_EXIT) {
		return "routing";
	}

	if (
		unit.canAttack &&
		findPriorityEnemy(unit, living, unit.attackRange) !== null
	) {
		return "fighting";
	}

	if (
		marchingIds.has(unit.id) ||
		unit.target !== null ||
		unit.path.length > 0
	) {
		return "marching";
	}

	return "idle";
}

/** Stamp each living unit's `state` field from post-behavior positions. */
export function resolveUnitStates(
	units: readonly Unit[],
	marchingIds: ReadonlySet<DotId>,
): readonly Unit[] {
	const living = units.filter((unit) => unit.isAlive);
	return units.map((unit) => {
		const next = deriveUnitState(unit, living, marchingIds);
		if (next === unit.state) {
			return unit;
		}
		const cleared =
			next === "routing" && unit.selected
				? unit.copy({ state: next, selected: false })
				: unit.copy({ state: next });
		return cleared;
	});
}
