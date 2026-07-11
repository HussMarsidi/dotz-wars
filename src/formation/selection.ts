import type { GameState } from "../shared/game-state";
import type { DotId } from "../shared/types";
import { selectByIds } from "../sim/selection";
import type { FormationRegistry } from "./registry";

/** Expand selection so every formation touched by the pick is fully selected. */
export function expandSelectionToFormations(
	state: GameState,
	registry: FormationRegistry,
	seedIds: ReadonlySet<DotId>,
): GameState {
	const expanded = new Set<DotId>(seedIds);
	for (const id of seedIds) {
		const formation = registry.formationForUnit(id);
		if (formation === undefined) {
			continue;
		}
		for (const memberId of formation.memberIds) {
			expanded.add(memberId);
		}
	}
	return selectByIds(state, expanded);
}

export function selectedUnitIds(state: GameState): DotId[] {
	return state.units
		.filter((unit) => unit.selected && unit.isAlive)
		.map((unit) => unit.id);
}
