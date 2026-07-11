import {
	circleFitsOnLand,
	lastWalkableOnSegment,
	terrainSpeedMultiplier,
} from "../map/terrain";
import type { MapDefinition } from "../map/types";
import { PATH_WAYPOINT_REACH } from "../shared/config";
import type { Dot, GameState, Vec2 } from "../shared/types";
import { findPath } from "./navigation";

function hasSelection(state: GameState): boolean {
	return state.dots.some((dot) => dot.selected);
}

/** True when any selected dots exist (for RTS move-vs-deselect). */
export function stateHasSelection(state: GameState): boolean {
	return hasSelection(state);
}

function clearMove(dot: Dot): Dot {
	return { ...dot, target: null, path: [] };
}

/**
 * Issue a move order to `destination` for all selected dots.
 * Builds a path around water; dots that cannot path keep their previous order.
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
		dots: state.dots.map((dot) => {
			if (!dot.selected) {
				return dot;
			}
			const path = findPath(map, dot.position, destination, radius);
			if (path === null || path.length === 0) {
				return dot;
			}
			return { ...dot, target: destination, path };
		}),
	};
}

type StepResult = {
	readonly position: Vec2;
	readonly reached: boolean;
	/** True when movement was cut short by blocked terrain. */
	readonly blocked: boolean;
};

function advanceToward(
	dot: Dot,
	waypoint: Vec2,
	map: MapDefinition,
	radius: number,
	dt: number,
): StepResult {
	const dx = waypoint.x - dot.position.x;
	const dy = waypoint.y - dot.position.y;
	const dist = Math.hypot(dx, dy);
	if (dist <= PATH_WAYPOINT_REACH) {
		return { position: waypoint, reached: true, blocked: false };
	}

	const stepDist = dot.speed * terrainSpeedMultiplier(map, dot.position) * dt;
	if (stepDist <= 0) {
		return { position: dot.position, reached: false, blocked: true };
	}

	const reach = Math.min(stepDist, dist);
	const next = {
		x: dot.position.x + (dx / dist) * reach,
		y: dot.position.y + (dy / dist) * reach,
	};

	if (circleFitsOnLand(map, next, radius)) {
		const reached = dist - reach <= PATH_WAYPOINT_REACH;
		return {
			position: reached ? waypoint : next,
			reached,
			blocked: false,
		};
	}

	const edge = lastWalkableOnSegment(map, dot.position, next, radius);
	return { position: edge, reached: false, blocked: true };
}

function repathOrStop(
	dot: Dot,
	position: Vec2,
	map: MapDefinition,
	radius: number,
): Dot {
	if (dot.target === null) {
		return clearMove({ ...dot, position });
	}
	const path = findPath(map, position, dot.target, radius);
	if (path === null || path.length === 0) {
		return clearMove({ ...dot, position });
	}
	return { ...dot, position, path };
}

function advanceDot(
	dot: Dot,
	map: MapDefinition,
	radius: number,
	dt: number,
): Dot {
	if (dot.target === null || dot.path.length === 0) {
		if (dot.target !== null || dot.path.length > 0) {
			return clearMove(dot);
		}
		return dot;
	}

	const waypoint = dot.path[0];
	if (waypoint === undefined) {
		return clearMove(dot);
	}
	const { position, reached, blocked } = advanceToward(
		dot,
		waypoint,
		map,
		radius,
		dt,
	);

	if (reached) {
		const rest = dot.path.slice(1);
		if (rest.length === 0) {
			return { ...dot, position, target: null, path: [] };
		}
		return { ...dot, position, path: rest };
	}

	if (blocked) {
		return repathOrStop(dot, position, map, radius);
	}

	return { ...dot, position };
}

/** Advance one simulation tick: follow paths, terrain speed, avoid water. */
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
