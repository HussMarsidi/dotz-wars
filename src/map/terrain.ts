import type { Vec2 } from "../shared/types";
import type { MapDefinition, WaterBody } from "./types";

function pointInEllipse(
	point: Vec2,
	center: Vec2,
	radiusX: number,
	radiusY: number,
): boolean {
	if (radiusX <= 0 || radiusY <= 0) {
		return false;
	}
	const nx = (point.x - center.x) / radiusX;
	const ny = (point.y - center.y) / radiusY;
	return nx * nx + ny * ny <= 1;
}

function pointInWaterBody(point: Vec2, body: WaterBody): boolean {
	switch (body.kind) {
		case "ellipse":
			return pointInEllipse(point, body.center, body.radiusX, body.radiusY);
		default: {
			const _exhaustive: never = body.kind;
			return _exhaustive;
		}
	}
}

/** True if the world point sits inside any water body. */
export function isWater(map: MapDefinition, point: Vec2): boolean {
	for (const body of map.water) {
		if (pointInWaterBody(point, body)) {
			return true;
		}
	}
	return false;
}

/** Land is walkable; water is blocked. Out of bounds is not walkable. */
export function isWalkable(map: MapDefinition, point: Vec2): boolean {
	if (
		point.x < 0 ||
		point.y < 0 ||
		point.x > map.width ||
		point.y > map.height
	) {
		return false;
	}
	return !isWater(map, point);
}

/**
 * True if a circle of `radius` around `center` overlaps any water.
 * Used so dots stop before their body enters water.
 */
export function circleOverlapsWater(
	map: MapDefinition,
	center: Vec2,
	radius: number,
): boolean {
	if (radius <= 0) {
		return isWater(map, center);
	}

	// Sample center + cardinal/diagonal rim points — enough for ellipse lakes for now.
	const samples: Vec2[] = [center];
	const d = radius * Math.SQRT1_2;
	const offsets = [
		{ x: radius, y: 0 },
		{ x: -radius, y: 0 },
		{ x: 0, y: radius },
		{ x: 0, y: -radius },
		{ x: d, y: d },
		{ x: -d, y: d },
		{ x: d, y: -d },
		{ x: -d, y: -d },
	];
	for (const offset of offsets) {
		samples.push({ x: center.x + offset.x, y: center.y + offset.y });
	}

	for (const sample of samples) {
		if (isWater(map, sample)) {
			return true;
		}
	}
	return false;
}

/** Circle fully on the board and not overlapping water. */
export function circleFitsOnLand(
	map: MapDefinition,
	center: Vec2,
	radius: number,
): boolean {
	if (
		center.x < radius ||
		center.y < radius ||
		center.x > map.width - radius ||
		center.y > map.height - radius
	) {
		return false;
	}
	return !circleOverlapsWater(map, center, radius);
}

/**
 * Last point on segment [from → to] where the circle still fits on land.
 * If `from` is already blocked, returns `from`.
 */
export function lastWalkableOnSegment(
	map: MapDefinition,
	from: Vec2,
	to: Vec2,
	radius: number,
): Vec2 {
	if (circleFitsOnLand(map, to, radius)) {
		return to;
	}
	if (!circleFitsOnLand(map, from, radius)) {
		return from;
	}

	let lo = 0;
	let hi = 1;
	let best = from;
	for (let i = 0; i < 16; i++) {
		const mid = (lo + hi) / 2;
		const point = {
			x: from.x + (to.x - from.x) * mid,
			y: from.y + (to.y - from.y) * mid,
		};
		if (circleFitsOnLand(map, point, radius)) {
			best = point;
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return best;
}
