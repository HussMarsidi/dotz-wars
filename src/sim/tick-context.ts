import type { GameState } from "../shared/game-state";
import type { DotId } from "../shared/types";
import type { TerritoryField } from "../territory";

/**
 * Shared per-tick context, computed once at the start of `step`.
 *
 * Encirclement / heal / vision sets are empty stubs until Steps 3–4 / 6.
 * Call sites should already thread this object so later phases only fill values.
 */
export type TickContext = {
	readonly territory: TerritoryField;
	/** Units standing on owned cells the encirclement BFS did not reach. */
	readonly encircledIds: ReadonlySet<DotId>;
	/** Units inside a friendly city's heal radius. */
	readonly inHealRadiusIds: ReadonlySet<DotId>;
};

const EMPTY_IDS: ReadonlySet<DotId> = new Set();

/** Build shared context for this tick (stubs empty until later phases). */
export function computeSharedContext(state: GameState): TickContext {
	return {
		territory: state.territory,
		encircledIds: EMPTY_IDS,
		inHealRadiusIds: EMPTY_IDS,
	};
}
