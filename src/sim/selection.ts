import type { Dot, DotId, GameState, Rect, Vec2 } from "../shared/types";

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

/** Which dots' circles fall inside / touch the marquee rect. */
export function selectDotsInRect(
	dots: readonly Dot[],
	rect: Rect,
	radius: number,
): ReadonlySet<DotId> {
	const selected = new Set<DotId>();
	for (const dot of dots) {
		if (circleOverlapsRect(dot.position, radius, rect)) {
			selected.add(dot.id);
		}
	}
	return selected;
}

function withSelection(
	state: GameState,
	selectedIds: ReadonlySet<DotId>,
): GameState {
	return {
		dots: state.dots.map((dot) => ({
			...dot,
			selected: selectedIds.has(dot.id),
		})),
	};
}

/** Apply marquee selection flags. Positions unchanged (ready for later movement). */
export function applyMarqueeSelection(
	state: GameState,
	rect: Rect,
	radius: number,
): GameState {
	return withSelection(state, selectDotsInRect(state.dots, rect, radius));
}

/**
 * Click: select the closest hit circle, or clear if the point misses every dot.
 * Positions unchanged.
 */
export function applyClickSelection(
	state: GameState,
	point: Vec2,
	radius: number,
): GameState {
	let bestId: DotId | null = null;
	let bestDist = Number.POSITIVE_INFINITY;

	for (const dot of state.dots) {
		if (!pointHitsCircle(point, dot.position, radius)) {
			continue;
		}
		const dist = distanceSquared(point, dot.position);
		if (dist < bestDist) {
			bestDist = dist;
			bestId = dot.id;
		}
	}

	if (bestId === null) {
		return withSelection(state, new Set());
	}
	return withSelection(state, new Set([bestId]));
}
