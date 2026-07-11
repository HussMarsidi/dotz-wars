import { INITIAL_DOT_POSITIONS } from "../shared/config";
import type { Dot, GameState } from "../shared/types";

export function createInitialDots(): Dot[] {
	return INITIAL_DOT_POSITIONS.map((position, index) => ({
		id: `dot-${index}`,
		position,
		selected: false,
	}));
}

export function createInitialState(): GameState {
	return {
		dots: createInitialDots(),
	};
}
