import { type City, settleQueuesAfterCapture, tickProduction } from "../cities";
import type { FormationRegistry } from "../formation";
import { tickFormationMarches } from "../formation";
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
import type { DotId, TeamId, Vec2 } from "../shared/types";
import {
	applyTerritoryDrain,
	collectSources,
	computeTerritory,
} from "../territory";
import type { OrderKind, Unit } from "../units";
import { checkCityWinner, tickCapture } from "./capture";
import { tickChase } from "./chase";
import { tickCombat, tickProjectiles } from "./combat";
import { tickDiplomatLockout } from "./diplomat-lockout";
import { tickMorale } from "./morale";
import { findPath } from "./navigation";
import { ensureRoutingFleePaths } from "./routing";
import { separateUnits } from "./separation";
import { computeSharedContext, type TickContext } from "./tick-context";
import { resolveUnitStates } from "./unit-state";

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

	return {
		...state,
		units: state.units.map((unit) => {
			if (!unit.selected || unit.state === "routing") {
				return unit;
			}
			const path = findPath(map, unit.position, destination, radius);
			if (path === null || path.length === 0) {
				return unit;
			}
			const last = path[path.length - 1] ?? destination;
			return unit.copy({
				target: last,
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

/**
 * Stage: chase + formation march + path movement + separation.
 * Same order/side effects as before the state-machine reshape.
 */
function runMovementBehaviors(
	state: GameState,
	map: MapDefinition,
	radius: number,
	dt: number,
	formations: FormationRegistry | undefined,
	context: TickContext,
): { readonly state: GameState; readonly marchingIds: ReadonlySet<DotId> } {
	const routedUnits = ensureRoutingFleePaths(
		state.units,
		state.cities,
		map,
		radius,
		context.territory,
		context.encirclement,
		formations,
	);
	const chasedUnits = tickChase(routedUnits, map, radius, formations);
	const chased: GameState = { ...state, units: chasedUnits };

	const marched =
		formations === undefined
			? chased
			: tickFormationMarches(chased, formations, map, radius, dt);
	const marchingIds =
		formations === undefined
			? new Set<DotId>()
			: formations.marchingUnitIds();

	const moved = marched.units.map((unit) => {
		if (marchingIds.has(unit.id)) {
			const aged =
				unit.target === null
					? unit
					: unit.copy({ orderAge: unit.orderAge + dt });
			return aged;
		}
		const next = advanceUnit(unit, map, radius, dt);
		if (next.target === null) {
			return next;
		}
		return next.copy({ orderAge: next.orderAge + dt });
	});

	const freeUnits = moved.filter((unit) => !marchingIds.has(unit.id));
	const lockedUnits = moved.filter((unit) => marchingIds.has(unit.id));
	const separatedFree = separateUnits(freeUnits, map, radius);
	const separated = [...separatedFree, ...lockedUnits];

	return {
		state: { ...marched, units: separated },
		marchingIds,
	};
}

/**
 * Stage: direct combat + projectile flight + remove dead.
 * Not yet switched on `unit.state` — Fighting is stamped after the tick.
 */
function runCombatBehaviors(
	state: GameState,
	dt: number,
	encircledIds: ReadonlySet<DotId>,
): GameState {
	const combat = tickCombat(
		state.units,
		state.projectiles,
		dt,
		nextProjectileId,
		encircledIds,
	);
	nextProjectileId = combat.nextProjectileId;

	const flights = tickProjectiles(
		combat.units,
		combat.projectiles,
		dt,
		encircledIds,
	);
	return {
		...state,
		units: removeDead(flights.units),
		projectiles: flights.projectiles,
	};
}

/** Stage: city capture + production queues. */
function runCityBehaviors(state: GameState, dt: number): GameState {
	const captured = tickCapture(state.cities, state.units, dt);
	const settled = settleQueuesAfterCapture(state.cities, captured, state.gold);
	const produced = tickProduction(settled.cities, state.units, dt);
	return {
		...state,
		cities: produced.cities,
		units: produced.units,
		gold: settled.gold,
	};
}

/**
 * Stage: passive effects — territory HP drain + morale (regen / encircle drain).
 * Heal / upkeep hook here in later steps.
 */
function applyPassiveEffects(
	state: GameState,
	dt: number,
	context: TickContext,
): GameState {
	const sourcesForDrain = collectSources(state.cities, state.units);
	const drained = applyTerritoryDrain(state.units, sourcesForDrain, dt);
	const afterMorale = tickMorale(
		removeDead(drained),
		dt,
		context.encircledIds,
	);
	return {
		...state,
		units: afterMorale,
	};
}

/** Recompute ownership field after units/cities settle for the tick. */
function recomputeTerritoryField(state: GameState): GameState {
	return {
		...state,
		territory: computeTerritory(
			BOARD_WIDTH,
			BOARD_HEIGHT,
			collectSources(state.cities, state.units),
		),
	};
}

/**
 * Advance one simulation tick.
 *
 * Stages:
 * 1. compute shared context once (territory + empty stubs)
 * 2. movement (routing flee → chase → formation → path → separate)
 * 3. combat behaviors
 * 4. city capture + production
 * 5. passive effects (territory drain + morale)
 * 6. diplomat replacement lockout
 * 7. recompute territory
 * 8. resolve Idle/Marching/Fighting/Routing
 * 9. win check
 */
export function step(
	state: GameState,
	map: MapDefinition,
	radius: number,
	dt: number,
	formations?: FormationRegistry,
): GameState {
	if (state.winner !== null) {
		return state;
	}

	const context = computeSharedContext(state);
	const unitsBeforeCombat = state.units;

	const moved = runMovementBehaviors(
		state,
		map,
		radius,
		dt,
		formations,
		context,
	);
	const afterCombat = runCombatBehaviors(
		moved.state,
		dt,
		context.encircledIds,
	);
	const afterCities = runCityBehaviors(afterCombat, dt);
	const afterPassives = applyPassiveEffects(afterCities, dt, context);
	const diplomatLockout = tickDiplomatLockout(
		unitsBeforeCombat,
		afterPassives.units,
		state.diplomatLockout,
		dt,
	);
	const withTerritory = recomputeTerritoryField(afterPassives);
	const withStates = {
		...withTerritory,
		diplomatLockout,
		units: resolveUnitStates(withTerritory.units, moved.marchingIds),
	};

	return {
		...withStates,
		winner: checkWinner(withStates.cities),
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
		gold: current.gold,
		diplomatLockout: current.diplomatLockout,
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
