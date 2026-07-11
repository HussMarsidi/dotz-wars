import { TERRAIN_SPEED_MULTIPLIER } from "../shared/config";
import type { Vec2 } from "../shared/types";
import type { MapDefinition, TerrainKind, TerrainRegion } from "./types";

/** Higher wins when regions overlap. */
const TERRAIN_PRIORITY: Readonly<Record<TerrainKind, number>> = {
	land: 0,
	forest: 1,
	mountain: 2,
	water: 3,
};

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

function pointInRegion(point: Vec2, region: TerrainRegion): boolean {
	switch (region.shape) {
		case "ellipse":
			return pointInEllipse(
				point,
				region.center,
				region.radiusX,
				region.radiusY,
			);
		default: {
			const _exhaustive: never = region.shape;
			return _exhaustive;
		}
	}
}

/** Terrain under a world point (default land). */
export function getTerrainAt(map: MapDefinition, point: Vec2): TerrainKind {
	let best: TerrainKind = "land";
	let bestPriority = TERRAIN_PRIORITY.land;

	for (const region of map.regions) {
		if (!pointInRegion(point, region)) {
			continue;
		}
		const priority = TERRAIN_PRIORITY[region.terrain];
		if (priority > bestPriority) {
			best = region.terrain;
			bestPriority = priority;
		}
	}

	return best;
}

/** True if the world point sits in water. */
export function isWater(map: MapDefinition, point: Vec2): boolean {
	return getTerrainAt(map, point) === "water";
}

/** Land / forest / mountain are walkable; water and OOB are not. */
export function isWalkable(map: MapDefinition, point: Vec2): boolean {
	if (
		point.x < 0 ||
		point.y < 0 ||
		point.x > map.width ||
		point.y > map.height
	) {
		return false;
	}
	return getTerrainAt(map, point) !== "water";
}

/** Speed scale for the terrain under `point` (from config constants). */
export function terrainSpeedMultiplier(
	map: MapDefinition,
	point: Vec2,
): number {
	return TERRAIN_SPEED_MULTIPLIER[getTerrainAt(map, point)];
}

function sampleCircleRim(center: Vec2, radius: number): Vec2[] {
	if (radius <= 0) {
		return [center];
	}
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
	return samples;
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
	for (const sample of sampleCircleRim(center, radius)) {
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
