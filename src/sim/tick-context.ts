import { collectInHealRadius } from "../cities";
import type { GameState } from "../shared/game-state";
import type { DotId } from "../shared/types";
import {
	computeEncirclement,
	type EncirclementResult,
	type TerritoryField,
} from "../territory";

/**
 * Shared per-tick context, computed once at the start of `step`.
 */
export type TickContext = {
	readonly territory: TerritoryField;
	readonly encircledIds: ReadonlySet<DotId>;
	readonly encirclement: EncirclementResult;
	/** Units inside a friendly city's geometric heal radius. */
	readonly inHealRadiusIds: ReadonlySet<DotId>;
};

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
		inHealRadiusIds: collectInHealRadius(state.cities, state.units),
	};
}
