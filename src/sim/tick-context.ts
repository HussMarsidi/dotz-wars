import type { GameState } from "../shared/game-state";
import type { DotId } from "../shared/types";
import {
	computeEncirclement,
	type EncirclementResult,
	type TerritoryField,
} from "../territory";

/**
 * Shared per-tick context, computed once at the start of `step`.
 * Heal / vision sets stay empty until Steps 4 / 6.
 */
export type TickContext = {
	readonly territory: TerritoryField;
	readonly encircledIds: ReadonlySet<DotId>;
	readonly encirclement: EncirclementResult;
	/** Units inside a friendly city's heal radius (Step 4). */
	readonly inHealRadiusIds: ReadonlySet<DotId>;
};

const EMPTY_IDS: ReadonlySet<DotId> = new Set();

/** Build shared context for this tick from the latest ownership field. */
export function computeSharedContext(state: GameState): TickContext {
	const encirclement = computeEncirclement(
		state.territory,
		state.cities,
		state.units,
	);
	return {
		territory: state.territory,
		encircledIds: encirclement.encircledIds,
		encirclement,
		inHealRadiusIds: EMPTY_IDS,
	};
}
