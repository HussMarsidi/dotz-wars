import type { GameState } from "../shared/game-state";
import type { DotId, Rect, Vec2 } from "../shared/types";
import type { Unit } from "../units";

type NormalizedRect = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

function distanceSquared(a: Vec2, b: Vec2): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

/** Point inside / on the circle edge. */
export function pointHitsCircle(
	point: Vec2,
	center: Vec2,
	radius: number,
): boolean {
	return distanceSquared(point, center) <= radius * radius;
}

function normalizeRect(rect: Rect): NormalizedRect | null {
	const left = Math.min(rect.x, rect.x + rect.width);
	const right = Math.max(rect.x, rect.x + rect.width);
	const top = Math.min(rect.y, rect.y + rect.height);
	const bottom = Math.max(rect.y, rect.y + rect.height);

	if (right - left === 0 || bottom - top === 0) {
		return null;
	}

	return { left, top, right, bottom };
}

/** Closest point on an AABB to `point` (inclusive edges). */
function closestPointOnRect(point: Vec2, rect: NormalizedRect): Vec2 {
	return {
		x: Math.min(Math.max(point.x, rect.left), rect.right),
		y: Math.min(Math.max(point.y, rect.top), rect.bottom),
	};
}

/**
 * Circle (center + radius) overlaps axis-aligned rect, including edge touch.
 * Empty / zero-area rects never hit.
 */
export function circleOverlapsRect(
	center: Vec2,
	radius: number,
	rect: Rect,
): boolean {
	const normalized = normalizeRect(rect);
	if (normalized === null) {
		return false;
	}

	const closest = closestPointOnRect(center, normalized);
	const dx = center.x - closest.x;
	const dy = center.y - closest.y;
	return dx * dx + dy * dy <= radius * radius;
}

/** Which units' circles fall inside / touch the marquee rect. */
export function selectUnitsInRect(
	units: readonly Unit[],
	rect: Rect,
	radius: number,
): ReadonlySet<DotId> {
	const selected = new Set<DotId>();
	for (const unit of units) {
		if (circleOverlapsRect(unit.position, radius, rect)) {
			selected.add(unit.id);
		}
	}
	return selected;
}

/** @deprecated Use selectUnitsInRect. */
export const selectDotsInRect = selectUnitsInRect;

function withSelection(
	state: GameState,
	selectedIds: ReadonlySet<DotId>,
): GameState {
	return {
		...state,
		units: state.units.map((unit) =>
			unit.copy({ selected: selectedIds.has(unit.id) }),
		),
	};
}

/** Select exactly the given unit ids (others deselected). */
export function selectByIds(
	state: GameState,
	selectedIds: ReadonlySet<DotId>,
): GameState {
	return withSelection(state, selectedIds);
}

/**
 * Apply marquee selection flags.
 *
 * TODO: restrict selection to the local player team once AI owns the other side.
 * For now any team is selectable for combat testing.
 */
export function applyMarqueeSelection(
	state: GameState,
	rect: Rect,
	radius: number,
): GameState {
	return withSelection(state, selectUnitsInRect(state.units, rect, radius));
}

/**
 * Click: select the closest hit circle, or clear if the point misses every unit.
 *
 * TODO: restrict selection to the local player team once AI owns the other side.
 */
export function findUnitAtPoint(
	units: readonly Unit[],
	point: Vec2,
	radius: number,
): Unit | null {
	let best: Unit | null = null;
	let bestDist = Number.POSITIVE_INFINITY;

	for (const unit of units) {
		if (!pointHitsCircle(point, unit.position, radius)) {
			continue;
		}
		const dist = distanceSquared(point, unit.position);
		if (dist < bestDist) {
			bestDist = dist;
			best = unit;
		}
	}
	return best;
}

export function applyClickSelection(
	state: GameState,
	point: Vec2,
	radius: number,
): GameState {
	const hit = findUnitAtPoint(state.units, point, radius);
	if (hit === null) {
		return withSelection(state, new Set());
	}
	return withSelection(state, new Set([hit.id]));
}

/** Clear every unit's selected flag. */
export function clearSelection(state: GameState): GameState {
	if (!state.units.some((unit) => unit.selected)) {
		return state;
	}
	return withSelection(state, new Set());
}
