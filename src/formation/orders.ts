import { circleFitsOnLand, terrainSpeedMultiplier } from "../map/terrain";
import type { MapDefinition } from "../map/types";
import { PATH_WAYPOINT_REACH } from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { DotId, Vec2 } from "../shared/types";
import { findPath } from "../sim/navigation";
import type { Unit } from "../units";
import { formationSlots, normalizeFacing } from "./layout";
import type { FormationRegistry } from "./registry";
import type { Formation, FormationMarch } from "./types";

/** Centroid of living formation members in `state`. */
export function formationCentroid(
	state: GameState,
	formation: Formation,
): Vec2 | null {
	let x = 0;
	let y = 0;
	let n = 0;
	const idSet = new Set(formation.memberIds);
	for (const unit of state.units) {
		if (!unit.isAlive || !idSet.has(unit.id)) {
			continue;
		}
		x += unit.position.x;
		y += unit.position.y;
		n++;
	}
	if (n === 0) {
		return null;
	}
	return { x: x / n, y: y / n };
}

function placeMembersAtSlots(
	state: GameState,
	memberIds: readonly DotId[],
	slots: readonly Vec2[],
	finalTarget: Vec2 | null,
): GameState {
	const byId = new Map<DotId, Vec2>();
	for (let i = 0; i < memberIds.length; i++) {
		const id = memberIds[i];
		const slot = slots[i];
		if (id === undefined || slot === undefined) {
			continue;
		}
		byId.set(id, slot);
	}

	return {
		...state,
		units: state.units.map((unit) => {
			const slot = byId.get(unit.id);
			if (slot === undefined) {
				return unit;
			}
			return unit.copy({
				position: slot,
				target: finalTarget,
				path: finalTarget === null ? [] : [finalTarget],
				orderKind: "move",
				orderAge: 0,
			});
		}),
	};
}

function livingMembers(state: GameState, formation: Formation): Unit[] {
	const idSet = new Set(formation.memberIds);
	return state.units.filter((unit) => unit.isAlive && idSet.has(unit.id));
}

/** Slowest living member — formation never outruns this. */
export function formationMinSpeed(
	state: GameState,
	formation: Formation,
): number {
	const members = livingMembers(state, formation);
	if (members.length === 0) {
		return 0;
	}
	let min = Number.POSITIVE_INFINITY;
	for (const unit of members) {
		min = Math.min(min, unit.speed);
	}
	return min;
}

/**
 * Worst terrain multiplier under any member (keeps the blob paced by the
 * slowest footing as well as the slowest unit).
 */
export function formationTerrainMultiplier(
	state: GameState,
	formation: Formation,
	map: MapDefinition,
): number {
	const members = livingMembers(state, formation);
	if (members.length === 0) {
		return 0;
	}
	let min = Number.POSITIVE_INFINITY;
	for (const unit of members) {
		min = Math.min(min, terrainSpeedMultiplier(map, unit.position));
	}
	return min;
}

/**
 * Start a rigid formation march to `destination`.
 * Members snap into shape at the current centroid, then the whole group
 * advances at the slowest member's pace while holding slots.
 */
export function issueFormationMove(
	state: GameState,
	registry: FormationRegistry,
	formation: Formation,
	destination: Vec2,
	map: MapDefinition,
	radius: number,
	facing?: Vec2,
): GameState {
	const centroid = formationCentroid(state, formation);
	if (centroid === null) {
		return state;
	}

	const path = findPath(map, centroid, destination, radius);
	if (path === null || path.length === 0) {
		return state;
	}
	const resolvedDestination = path[path.length - 1] ?? destination;

	const resolvedFacing =
		facing !== undefined
			? normalizeFacing(facing)
			: normalizeFacing({
					x: resolvedDestination.x - centroid.x,
					y: resolvedDestination.y - centroid.y,
				});

	registry.updateFacing(formation.id, resolvedFacing);

	const startSlots = formationSlots(
		formation.shape,
		formation.memberIds.length,
		formation.spacing,
		centroid,
		resolvedFacing,
	);

	const dist = Math.hypot(
		resolvedDestination.x - centroid.x,
		resolvedDestination.y - centroid.y,
	);
	if (dist <= PATH_WAYPOINT_REACH) {
		registry.setMarch(formation.id, null);
		return placeMembersAtSlots(
			state,
			formation.memberIds,
			formationSlots(
				formation.shape,
				formation.memberIds.length,
				formation.spacing,
				resolvedDestination,
				resolvedFacing,
			),
			null,
		);
	}

	const march: FormationMarch = {
		anchor: centroid,
		target: resolvedDestination,
		path,
		facing: resolvedFacing,
	};
	registry.setMarch(formation.id, march);

	return placeMembersAtSlots(
		state,
		formation.memberIds,
		startSlots,
		resolvedDestination,
	);
}

/**
 * Advance every marching formation: move the shared anchor at min speed,
 * keep facing along the march, and lock members to slots.
 */
export function tickFormationMarches(
	state: GameState,
	registry: FormationRegistry,
	map: MapDefinition,
	radius: number,
	dt: number,
): GameState {
	let next = state;

	for (const formation of registry.all()) {
		const march = formation.march;
		if (march === null) {
			continue;
		}

		const members = livingMembers(next, formation);
		if (members.length === 0) {
			registry.setMarch(formation.id, null);
			continue;
		}

		const speed = formationMinSpeed(next, formation);
		const terrain = formationTerrainMultiplier(next, formation, map);
		const stepDist = speed * terrain * dt;

		let anchor = march.anchor;
		let path = [...march.path];
		let facing = march.facing;
		let arrived = false;

		if (stepDist <= 0) {
			const slots = formationSlots(
				formation.shape,
				formation.memberIds.length,
				formation.spacing,
				anchor,
				facing,
			);
			next = placeMembersAtSlots(
				next,
				formation.memberIds,
				slots,
				march.target,
			);
			continue;
		}

		let remaining = stepDist;
		while (remaining > 0 && path.length > 0) {
			const waypoint = path[0];
			if (waypoint === undefined) {
				break;
			}
			const dx = waypoint.x - anchor.x;
			const dy = waypoint.y - anchor.y;
			const dist = Math.hypot(dx, dy);
			if (dist <= PATH_WAYPOINT_REACH) {
				anchor = waypoint;
				path = path.slice(1);
				continue;
			}

			facing = normalizeFacing({ x: dx, y: dy });
			const travel = Math.min(remaining, dist);
			const candidate = {
				x: anchor.x + (dx / dist) * travel,
				y: anchor.y + (dy / dist) * travel,
			};

			if (!circleFitsOnLand(map, candidate, radius)) {
				// Stop the march if the anchor is blocked.
				path = [];
				arrived = true;
				break;
			}

			anchor = candidate;
			remaining -= travel;
			if (travel >= dist - PATH_WAYPOINT_REACH) {
				anchor = waypoint;
				path = path.slice(1);
			}
		}

		if (path.length === 0) {
			anchor = march.target;
			arrived = true;
		}

		const slots = formationSlots(
			formation.shape,
			formation.memberIds.length,
			formation.spacing,
			anchor,
			facing,
		);

		if (arrived) {
			registry.setMarch(formation.id, null);
			registry.updateFacing(formation.id, facing);
			next = placeMembersAtSlots(next, formation.memberIds, slots, null);
		} else {
			registry.setMarch(formation.id, {
				anchor,
				target: march.target,
				path,
				facing,
			});
			next = placeMembersAtSlots(
				next,
				formation.memberIds,
				slots,
				march.target,
			);
		}
	}

	return next;
}

/**
 * If the current selection is exactly one formation (all members selected),
 * return it; otherwise null (caller should use a normal move).
 */
export function soleSelectedFormation(
	state: GameState,
	registry: FormationRegistry,
): Formation | null {
	const selected = state.units.filter((unit) => unit.selected && unit.isAlive);
	if (selected.length === 0) {
		return null;
	}
	const first = registry.formationForUnit(selected[0]?.id ?? "");
	if (first === undefined) {
		return null;
	}
	if (selected.length !== first.memberIds.length) {
		return null;
	}
	for (const unit of selected) {
		if (registry.formationForUnit(unit.id)?.id !== first.id) {
			return null;
		}
	}
	return first;
}
