import { circleFitsOnLand, lastWalkableOnSegment } from "../map/terrain";
import type { MapDefinition } from "../map/types";
import type { Dot, GameState, Vec2 } from "../shared/types";

function hasSelection(state: GameState): boolean {
	return state.dots.some((dot) => dot.selected);
}

/** True when any selected dots exist (for RTS move-vs-deselect). */
export function stateHasSelection(state: GameState): boolean {
	return hasSelection(state);
}

/**
 * Issue a move order to `destination` for all selected dots.
 * Destination must fit the circle on land; otherwise state unchanged.
 */
export function issueMoveOrder(
	state: GameState,
	destination: Vec2,
	map: MapDefinition,
	radius: number,
): GameState {
	if (!hasSelection(state)) {
		return state;
	}
	if (!circleFitsOnLand(map, destination, radius)) {
		return state;
	}

	return {
		dots: state.dots.map((dot) =>
			dot.selected ? { ...dot, target: destination } : dot,
		),
	};
}

function advanceDot(
	dot: Dot,
	map: MapDefinition,
	radius: number,
	dt: number,
): Dot {
	if (dot.target === null) {
		return dot;
	}

	const dx = dot.target.x - dot.position.x;
	const dy = dot.target.y - dot.position.y;
	const dist = Math.hypot(dx, dy);
	if (dist === 0) {
		return { ...dot, target: null };
	}

	const stepDist = dot.speed * dt;
	const reach = Math.min(stepDist, dist);
	const next = {
		x: dot.position.x + (dx / dist) * reach,
		y: dot.position.y + (dy / dist) * reach,
	};

	if (circleFitsOnLand(map, next, radius)) {
		const arrived = reach >= dist;
		return {
			...dot,
			position: next,
			target: arrived ? null : dot.target,
		};
	}

	const edge = lastWalkableOnSegment(map, dot.position, next, radius);
	return { ...dot, position: edge, target: null };
}

/** Advance one simulation tick: move dots toward targets, stop at water edge. */
export function step(
	state: GameState,
	map: MapDefinition,
	radius: number,
	dt: number,
): GameState {
	return {
		dots: state.dots.map((dot) => advanceDot(dot, map, radius, dt)),
	};
}

/** Linear blend of positions for render interpolation between ticks. */
export function interpolateState(
	previous: GameState,
	current: GameState,
	alpha: number,
): GameState {
	const prevById = new Map(previous.dots.map((dot) => [dot.id, dot]));
	return {
		dots: current.dots.map((dot) => {
			const prev = prevById.get(dot.id);
			if (prev === undefined) {
				return dot;
			}
			return {
				...dot,
				position: {
					x: prev.position.x + (dot.position.x - prev.position.x) * alpha,
					y: prev.position.y + (dot.position.y - prev.position.y) * alpha,
				},
			};
		}),
	};
}
