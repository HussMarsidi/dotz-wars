import { circleFitsOnLand, terrainSpeedMultiplier } from "../map/terrain";
import type { MapDefinition } from "../map/types";
import { PATH_WAYPOINT_REACH } from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { DotId, Vec2 } from "../shared/types";
import { findPath } from "../sim/navigation";
import type { Unit } from "../units";
import {
	formationSlots,
	normalizeFacing,
	slotsFromLocalOffsets,
	worldToLocalOffset,
} from "./layout";
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

/** Mark move targets without teleporting (preserves current positions). */
function markMembersMoving(
	state: GameState,
	memberIds: readonly DotId[],
	finalTarget: Vec2 | null,
): GameState {
	const idSet = new Set(memberIds);
	return {
		...state,
		units: state.units.map((unit) => {
			if (!idSet.has(unit.id)) {
				return unit;
			}
			return unit.copy({
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
	memberIds?: ReadonlySet<DotId>,
): number {
	const members = livingMembers(state, formation).filter(
		(unit) => memberIds === undefined || memberIds.has(unit.id),
	);
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
	memberIds?: ReadonlySet<DotId>,
): number {
	const members = livingMembers(state, formation).filter(
		(unit) => memberIds === undefined || memberIds.has(unit.id),
	);
	if (members.length === 0) {
		return 0;
	}
	let min = Number.POSITIVE_INFINITY;
	for (const unit of members) {
		min = Math.min(min, terrainSpeedMultiplier(map, unit.position));
	}
	return min;
}

function slotIndexByMember(formation: Formation): Map<DotId, number> {
	const index = new Map<DotId, number>();
	for (let i = 0; i < formation.memberIds.length; i++) {
		const id = formation.memberIds[i];
		if (id !== undefined) {
			index.set(id, i);
		}
	}
	return index;
}

/**
 * Path a detached unit toward its slot (or nearest land by the team if the
 * slot is in water). Returns the updated unit.
 */
function chaseSlot(
	unit: Unit,
	slot: Vec2,
	anchor: Vec2,
	map: MapDefinition,
	radius: number,
): Unit {
	const goal = circleFitsOnLand(map, slot, radius) ? slot : anchor;
	const path = findPath(map, unit.position, goal, radius);
	if (path === null || path.length === 0) {
		return unit.copy({
			target: null,
			path: [],
			orderKind: "move",
		});
	}
	const last = path[path.length - 1] ?? goal;
	return unit.copy({
		target: last,
		path,
		orderKind: "move",
		orderAge: 0,
	});
}

function applyDetachedChases(
	state: GameState,
	formation: Formation,
	slots: readonly Vec2[],
	detachedIds: ReadonlySet<DotId>,
	anchor: Vec2,
	map: MapDefinition,
	radius: number,
): GameState {
	const indexes = slotIndexByMember(formation);
	return {
		...state,
		units: state.units.map((unit) => {
			if (!detachedIds.has(unit.id)) {
				return unit;
			}
			const idx = indexes.get(unit.id);
			if (idx === undefined) {
				return unit;
			}
			const slot = slots[idx];
			if (slot === undefined) {
				return unit;
			}
			return chaseSlot(unit, slot, anchor, map, radius);
		}),
	};
}

function captureMemberOffsets(
	state: GameState,
	formation: Formation,
	anchor: Vec2,
	facing: Vec2,
): Vec2[] {
	const byId = new Map(state.units.map((unit) => [unit.id, unit] as const));
	return formation.memberIds.map((id) => {
		const unit = byId.get(id);
		if (unit === undefined) {
			return { x: 0, y: 0 };
		}
		return worldToLocalOffset(unit.position, anchor, facing);
	});
}

function idealMemberOffsets(formation: Formation, facing: Vec2): Vec2[] {
	const ideal = formationSlots(
		formation.shape,
		formation.memberIds.length,
		formation.spacing,
		{ x: 0, y: 0 },
		facing,
	);
	return ideal.map((slot) =>
		worldToLocalOffset(slot, { x: 0, y: 0 }, facing),
	);
}

export type IssueFormationMoveOptions = {
	/**
	 * When true, snap members into ideal shape slots (create / reshape / reface).
	 * Default false: keep current positions so a move order does not jump.
	 */
	readonly assemble?: boolean;
};

/**
 * Start a rigid formation march to `destination`.
 * By default members keep their current relative layout (no snap jump).
 * Pass `{ assemble: true }` to snap into the ideal shape first.
 * Slots that sit on water peel those members off to path around and rejoin.
 */
export function issueFormationMove(
	state: GameState,
	registry: FormationRegistry,
	formation: Formation,
	destination: Vec2,
	map: MapDefinition,
	radius: number,
	facing?: Vec2,
	options?: IssueFormationMoveOptions,
): GameState {
	const assemble = options?.assemble ?? false;
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

	const memberOffsets = assemble
		? idealMemberOffsets(formation, resolvedFacing)
		: captureMemberOffsets(state, formation, centroid, resolvedFacing);

	const startSlots = slotsFromLocalOffsets(
		memberOffsets,
		centroid,
		resolvedFacing,
	);

	const dist = Math.hypot(
		resolvedDestination.x - centroid.x,
		resolvedDestination.y - centroid.y,
	);
	if (dist <= PATH_WAYPOINT_REACH) {
		registry.setMarch(formation.id, null);
		if (!assemble) {
			return state;
		}
		return placeMembersAtSlots(
			state,
			formation.memberIds,
			slotsFromLocalOffsets(
				memberOffsets,
				resolvedDestination,
				resolvedFacing,
			),
			null,
		);
	}

	const detachedIds: DotId[] = [];
	const lockedIds: DotId[] = [];
	const lockedSlots: Vec2[] = [];
	for (let i = 0; i < formation.memberIds.length; i++) {
		const id = formation.memberIds[i];
		const slot = startSlots[i];
		if (id === undefined || slot === undefined) {
			continue;
		}
		if (circleFitsOnLand(map, slot, radius)) {
			lockedIds.push(id);
			lockedSlots.push(slot);
		} else {
			detachedIds.push(id);
		}
	}

	const march: FormationMarch = {
		anchor: centroid,
		target: resolvedDestination,
		path,
		facing: resolvedFacing,
		detachedIds,
		memberOffsets,
	};
	registry.setMarch(formation.id, march);

	let next = assemble
		? placeMembersAtSlots(
				state,
				lockedIds,
				lockedSlots,
				resolvedDestination,
			)
		: markMembersMoving(state, lockedIds, resolvedDestination);
	if (detachedIds.length > 0) {
		next = applyDetachedChases(
			next,
			formation,
			startSlots,
			new Set(detachedIds),
			centroid,
			map,
			radius,
		);
	}
	return next;
}

/**
 * Advance every marching formation: move the shared anchor at min speed,
 * keep facing along the march, and lock members to their captured offsets.
 * Water-blocked slots peel those members; they path around and rejoin.
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

		const detached = new Set(march.detachedIds);
		const lockedIds = new Set(
			formation.memberIds.filter((id) => !detached.has(id)),
		);

		const speed =
			lockedIds.size > 0
				? formationMinSpeed(next, formation, lockedIds)
				: formationMinSpeed(next, formation);
		const terrain =
			lockedIds.size > 0
				? formationTerrainMultiplier(next, formation, map, lockedIds)
				: Math.max(terrainSpeedMultiplier(map, march.anchor), 0.01);
		const stepDist = speed * terrain * dt;

		let anchor = march.anchor;
		let path = [...march.path];
		let facing = march.facing;
		let arrived = false;

		if (stepDist > 0) {
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
					// Anchor blocked — hold position; detached units still path.
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
		}

		const slots = slotsFromLocalOffsets(march.memberOffsets, anchor, facing);

		const unitById = new Map(next.units.map((unit) => [unit.id, unit]));
		const nextDetached = new Set<DotId>();
		const lockedPlaceIds: DotId[] = [];
		const lockedPlaceSlots: Vec2[] = [];

		for (let i = 0; i < formation.memberIds.length; i++) {
			const id = formation.memberIds[i];
			const slot = slots[i];
			if (id === undefined || slot === undefined) {
				continue;
			}

			const slotOk = circleFitsOnLand(map, slot, radius);
			if (!slotOk) {
				nextDetached.add(id);
				continue;
			}

			const unit = unitById.get(id);
			if (unit === undefined) {
				continue;
			}

			if (detached.has(id)) {
				const dist = Math.hypot(
					unit.position.x - slot.x,
					unit.position.y - slot.y,
				);
				if (dist <= PATH_WAYPOINT_REACH) {
					lockedPlaceIds.push(id);
					lockedPlaceSlots.push(slot);
				} else {
					nextDetached.add(id);
				}
				continue;
			}

			lockedPlaceIds.push(id);
			lockedPlaceSlots.push(slot);
		}

		if (arrived) {
			registry.setMarch(formation.id, null);
			registry.updateFacing(formation.id, facing);
			next = placeMembersAtSlots(
				next,
				lockedPlaceIds,
				lockedPlaceSlots,
				null,
			);
			if (nextDetached.size > 0) {
				next = applyDetachedChases(
					next,
					formation,
					slots,
					nextDetached,
					anchor,
					map,
					radius,
				);
			}
		} else {
			registry.setMarch(formation.id, {
				anchor,
				target: march.target,
				path,
				facing,
				detachedIds: [...nextDetached],
				memberOffsets: march.memberOffsets,
			});
			next = placeMembersAtSlots(
				next,
				lockedPlaceIds,
				lockedPlaceSlots,
				march.target,
			);
			if (nextDetached.size > 0) {
				next = applyDetachedChases(
					next,
					formation,
					slots,
					nextDetached,
					anchor,
					map,
					radius,
				);
			}
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
