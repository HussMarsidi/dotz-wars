import type { Dot, DotId, GameState, Rect, Vec2 } from "../shared/types";

type NormalizedRect = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

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

/** Apply marquee selection flags. Positions unchanged (ready for later movement). */
export function applyMarqueeSelection(
	state: GameState,
	rect: Rect,
	radius: number,
): GameState {
	const selectedIds = selectDotsInRect(state.dots, rect, radius);
	return {
		dots: state.dots.map((dot) => ({
			...dot,
			selected: selectedIds.has(dot.id),
		})),
	};
}
