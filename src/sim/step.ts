import type { City } from "../cities";
import {
	circleFitsOnLand,
	lastWalkableOnSegment,
	terrainSpeedMultiplier,
} from "../map/terrain";
import type { MapDefinition } from "../map/types";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	PATH_WAYPOINT_REACH,
} from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { TeamId, Vec2 } from "../shared/types";
import {
	applyTerritoryDrain,
	collectSources,
	computeTerritory,
} from "../territory";
import type { OrderKind, Unit } from "../units";
import { checkCityWinner, tickCapture } from "./capture";
import { tickCombat, tickProjectiles } from "./combat";
import { findPath } from "./navigation";
import { separateUnits } from "./separation";

function hasSelection(state: GameState): boolean {
	return state.units.some((unit) => unit.selected);
}

/** True when any selected units exist (for RTS move-vs-deselect). */
export function stateHasSelection(state: GameState): boolean {
	return hasSelection(state);
}

function clearMove(unit: Unit): Unit {
	return unit.copy({
		target: null,
		path: [],
		orderKind: "move",
		orderAge: 0,
	});
}

/**
 * Issue a move/attack order to `destination` for all selected units.
 * Builds a path around water; units that cannot path keep their previous order.
 */
export function issueMoveOrder(
	state: GameState,
	destination: Vec2,
	map: MapDefinition,
	radius: number,
	orderKind: OrderKind = "move",
): GameState {
	if (!hasSelection(state)) {
		return state;
	}
	if (!circleFitsOnLand(map, destination, radius)) {
		return state;
	}

	return {
		...state,
		units: state.units.map((unit) => {
			if (!unit.selected) {
				return unit;
			}
			const path = findPath(map, unit.position, destination, radius);
			if (path === null || path.length === 0) {
				return unit;
			}
			return unit.copy({
				target: destination,
				path,
				orderKind,
				orderAge: 0,
			});
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
	unit: Unit,
	waypoint: Vec2,
	map: MapDefinition,
	radius: number,
	dt: number,
): StepResult {
	const dx = waypoint.x - unit.position.x;
	const dy = waypoint.y - unit.position.y;
	const dist = Math.hypot(dx, dy);
	if (dist <= PATH_WAYPOINT_REACH) {
		return { position: waypoint, reached: true, blocked: false };
	}

	const stepDist = unit.speed * terrainSpeedMultiplier(map, unit.position) * dt;
	if (stepDist <= 0) {
		return { position: unit.position, reached: false, blocked: true };
	}

	const reach = Math.min(stepDist, dist);
	const next = {
		x: unit.position.x + (dx / dist) * reach,
		y: unit.position.y + (dy / dist) * reach,
	};

	if (circleFitsOnLand(map, next, radius)) {
		const reached = dist - reach <= PATH_WAYPOINT_REACH;
		return {
			position: reached ? waypoint : next,
			reached,
			blocked: false,
		};
	}

	const edge = lastWalkableOnSegment(map, unit.position, next, radius);
	return { position: edge, reached: false, blocked: true };
}

function repathOrStop(
	unit: Unit,
	position: Vec2,
	map: MapDefinition,
	radius: number,
): Unit {
	if (unit.target === null) {
		return clearMove(unit.copy({ position }));
	}
	const path = findPath(map, position, unit.target, radius);
	if (path === null || path.length === 0) {
		return clearMove(unit.copy({ position }));
	}
	return unit.copy({ position, path });
}

function advanceUnit(
	unit: Unit,
	map: MapDefinition,
	radius: number,
	dt: number,
): Unit {
	if (!unit.isAlive) {
		return unit;
	}
	if (unit.target === null || unit.path.length === 0) {
		if (unit.target !== null || unit.path.length > 0) {
			return clearMove(unit);
		}
		return unit;
	}

	const waypoint = unit.path[0];
	if (waypoint === undefined) {
		return clearMove(unit);
	}
	const { position, reached, blocked } = advanceToward(
		unit,
		waypoint,
		map,
		radius,
		dt,
	);

	if (reached) {
		const rest = unit.path.slice(1);
		if (rest.length === 0) {
			return clearMove(unit.copy({ position }));
		}
		return unit.copy({ position, path: rest });
	}

	if (blocked) {
		return repathOrStop(unit, position, map, radius);
	}

	return unit.copy({ position });
}

/** Drop dead units from the board. */
function removeDead(units: readonly Unit[]): readonly Unit[] {
	return units.filter((unit) => unit.isAlive);
}

/** One team owns every city → that team wins. */
export function checkWinner(cities: readonly City[]): TeamId | null {
	return checkCityWinner(cities);
}

/** Projectile id counter lives outside state for now (sim-local). */
let nextProjectileId = 1;

/** Advance one simulation tick: move, separate, combat, projectiles, deaths, wipe. */
export function step(
	state: GameState,
	map: MapDefinition,
	radius: number,
	dt: number,
): GameState {
	if (state.winner !== null) {
		return state;
	}

	const moved = state.units.map((unit) => {
		const next = advanceUnit(unit, map, radius, dt);
		if (next.target === null) {
			return next;
		}
		return next.copy({ orderAge: next.orderAge + dt });
	});
	const separated = separateUnits(moved, map, radius);

	const combat = tickCombat(separated, state.projectiles, dt, nextProjectileId);
	nextProjectileId = combat.nextProjectileId;

	const flights = tickProjectiles(combat.units, combat.projectiles, dt);
	const afterCombat = removeDead(flights.units);
	const cities = tickCapture(state.cities, afterCombat, dt);
	const sourcesForDrain = collectSources(cities, afterCombat);
	const drained = applyTerritoryDrain(afterCombat, sourcesForDrain, dt);
	const living = removeDead(drained);
	const territory = computeTerritory(
		BOARD_WIDTH,
		BOARD_HEIGHT,
		collectSources(cities, living),
	);
	const winner = checkWinner(cities);

	return {
		units: living,
		cities,
		territory,
		projectiles: flights.projectiles,
		winner,
	};
}

/** Linear blend of positions for render interpolation between ticks. */
export function interpolateState(
	previous: GameState,
	current: GameState,
	alpha: number,
): GameState {
	const prevById = new Map(previous.units.map((unit) => [unit.id, unit]));
	const prevProj = new Map(
		previous.projectiles.map((projectile) => [projectile.id, projectile]),
	);

	return {
		winner: current.winner,
		cities: current.cities,
		territory: current.territory,
		units: current.units.map((unit) => {
			const prev = prevById.get(unit.id);
			if (prev === undefined) {
				return unit;
			}
			return unit.copy({
				position: {
					x: prev.position.x + (unit.position.x - prev.position.x) * alpha,
					y: prev.position.y + (unit.position.y - prev.position.y) * alpha,
				},
			});
		}),
		projectiles: current.projectiles.map((projectile) => {
			const prev = prevProj.get(projectile.id);
			if (prev === undefined) {
				return projectile;
			}
			return {
				...projectile,
				position: {
					x:
						prev.position.x + (projectile.position.x - prev.position.x) * alpha,
					y:
						prev.position.y + (projectile.position.y - prev.position.y) * alpha,
				},
			};
		}),
	};
}
