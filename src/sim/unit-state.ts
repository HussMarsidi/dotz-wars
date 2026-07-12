import type { DotId } from "../shared/types";
import type { Unit, UnitState } from "../units";
import { findPriorityEnemy } from "./combat";

/**
 * Derive combat/movement state from existing signals.
 * `routing` is never returned here — morale lands in Step 2.
 */
export function deriveUnitState(
	unit: Unit,
	living: readonly Unit[],
	marchingIds: ReadonlySet<DotId>,
): UnitState {
	if (!unit.isAlive) {
		return unit.state;
	}

	if (findPriorityEnemy(unit, living, unit.attackRange) !== null) {
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
		return unit.copy({ state: next });
	});
}
