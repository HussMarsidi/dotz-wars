import type { GameState } from "../shared/game-state";
import type { DotId } from "../shared/types";
import { selectByIds } from "./selection";

export type ControlGroupSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ControlGroups = Map<ControlGroupSlot, readonly DotId[]>;

export function createControlGroups(): ControlGroups {
	return new Map();
}

export function isControlGroupSlot(value: number): value is ControlGroupSlot {
	return Number.isInteger(value) && value >= 1 && value <= 9;
}

/** Parse `"1"`…`"9"` → slot; otherwise null. */
export function parseControlGroupKey(key: string): ControlGroupSlot | null {
	if (key.length !== 1) {
		return null;
	}
	const slot = Number(key);
	return isControlGroupSlot(slot) ? slot : null;
}

/**
 * Replace group `slot` with currently selected living units.
 * Empty selection clears the group.
 */
export function assignControlGroup(
	groups: ControlGroups,
	slot: ControlGroupSlot,
	state: GameState,
): void {
	const ids = state.units
		.filter((unit) => unit.selected && unit.isAlive)
		.map((unit) => unit.id);
	if (ids.length === 0) {
		groups.delete(slot);
		return;
	}
	groups.set(slot, ids);
}

/**
 * Drop dead / missing ids from a group. Returns remaining living ids.
 */
export function pruneControlGroup(
	groups: ControlGroups,
	slot: ControlGroupSlot,
	state: GameState,
): readonly DotId[] {
	const stored = groups.get(slot);
	if (stored === undefined) {
		return [];
	}
	const livingIds = new Set(
		state.units.filter((unit) => unit.isAlive).map((unit) => unit.id),
	);
	const kept = stored.filter((id) => livingIds.has(id));
	if (kept.length === 0) {
		groups.delete(slot);
		return [];
	}
	groups.set(slot, kept);
	return kept;
}

/**
 * Select living members of `slot`. No-op if the group is empty after pruning.
 */
export function selectControlGroup(
	state: GameState,
	groups: ControlGroups,
	slot: ControlGroupSlot,
): GameState {
	const ids = pruneControlGroup(groups, slot, state);
	if (ids.length === 0) {
		return state;
	}
	return selectByIds(state, new Set(ids));
}

/**
 * Map each unit id → sorted group numbers it belongs to (e.g. "1" or "1,3").
 * Used for the top-left badge on dots.
 */
export function controlGroupLabels(
	groups: ReadonlyMap<ControlGroupSlot, readonly DotId[]>,
): ReadonlyMap<DotId, string> {
	const slotsById = new Map<DotId, ControlGroupSlot[]>();
	for (const [slot, ids] of groups) {
		for (const id of ids) {
			const list = slotsById.get(id);
			if (list === undefined) {
				slotsById.set(id, [slot]);
			} else {
				list.push(slot);
			}
		}
	}
	const labels = new Map<DotId, string>();
	for (const [id, slots] of slotsById) {
		slots.sort((a, b) => a - b);
		labels.set(id, slots.join(","));
	}
	return labels;
}
