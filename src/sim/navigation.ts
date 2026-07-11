import { circleFitsOnLand, terrainSpeedMultiplier } from "../map/terrain";
import type { MapDefinition } from "../map/types";
import {
	PATH_GRID_CELL,
	PATH_LAND_SNAP_BUFFER,
	PATH_LAND_SNAP_MAX,
	TERRAIN_SPEED_MULTIPLIER,
} from "../shared/config";
import type { Vec2 } from "../shared/types";

type GridPos = {
	readonly gx: number;
	readonly gy: number;
};

const ORTHOGONAL: readonly GridPos[] = [
	{ gx: 1, gy: 0 },
	{ gx: -1, gy: 0 },
	{ gx: 0, gy: 1 },
	{ gx: 0, gy: -1 },
];

const DIAGONAL: readonly GridPos[] = [
	{ gx: 1, gy: 1 },
	{ gx: 1, gy: -1 },
	{ gx: -1, gy: 1 },
	{ gx: -1, gy: -1 },
];

function key(gx: number, gy: number): number {
	return gy * 100_000 + gx;
}

function cellCenter(
	gx: number,
	gy: number,
	cell: number,
	map: MapDefinition,
): Vec2 {
	return {
		x: Math.min(map.width - 0.001, Math.max(0, (gx + 0.5) * cell)),
		y: Math.min(map.height - 0.001, Math.max(0, (gy + 0.5) * cell)),
	};
}

function worldToCell(
	point: Vec2,
	cell: number,
	cols: number,
	rows: number,
): GridPos {
	return {
		gx: Math.min(cols - 1, Math.max(0, Math.floor(point.x / cell))),
		gy: Math.min(rows - 1, Math.max(0, Math.floor(point.y / cell))),
	};
}

function segmentClear(
	map: MapDefinition,
	from: Vec2,
	to: Vec2,
	radius: number,
	samples = 8,
): boolean {
	for (let i = 0; i <= samples; i++) {
		const t = i / samples;
		const point = {
			x: from.x + (to.x - from.x) * t,
			y: from.y + (to.y - from.y) * t,
		};
		if (!circleFitsOnLand(map, point, radius)) {
			return false;
		}
	}
	return true;
}

function terrainMoveCost(map: MapDefinition, point: Vec2): number {
	const multiplier = terrainSpeedMultiplier(map, point);
	if (multiplier <= 0) {
		return Number.POSITIVE_INFINITY;
	}
	// Prefer faster terrain: land cheaper than forest/mountain.
	return 1 / multiplier;
}

function heuristic(a: GridPos, b: GridPos, cell: number): number {
	const dx = (a.gx - b.gx) * cell;
	const dy = (a.gy - b.gy) * cell;
	return Math.hypot(dx, dy) / TERRAIN_SPEED_MULTIPLIER.land;
}

/**
 * Simplify a polyline by skipping waypoints when the straight segment is clear.
 */
export function simplifyPath(
	map: MapDefinition,
	path: readonly Vec2[],
	radius: number,
): Vec2[] {
	if (path.length <= 2) {
		return [...path];
	}

	const first = path[0];
	if (first === undefined) {
		return [];
	}

	const out: Vec2[] = [first];
	let i = 0;
	while (i < path.length - 1) {
		let furthest = i + 1;
		for (let j = path.length - 1; j > i + 1; j--) {
			const a = path[i];
			const b = path[j];
			if (a === undefined || b === undefined) {
				continue;
			}
			if (segmentClear(map, a, b, radius)) {
				furthest = j;
				break;
			}
		}
		const next = path[furthest];
		if (next === undefined) {
			break;
		}
		out.push(next);
		i = furthest;
	}
	return out;
}

/**
 * Nearest point where the unit circle fits on land with a small water buffer.
 * Used when start/goal sit on or too close to water so movement can continue.
 */
function snapToLand(
	map: MapDefinition,
	point: Vec2,
	radius: number,
): Vec2 | null {
	const clearance = radius + PATH_LAND_SNAP_BUFFER;
	if (circleFitsOnLand(map, point, clearance)) {
		return point;
	}

	for (let r = 2; r <= PATH_LAND_SNAP_MAX; r += 2) {
		const samples = Math.max(8, Math.ceil((Math.PI * 2 * r) / 4));
		for (let i = 0; i < samples; i++) {
			const angle = (i / samples) * Math.PI * 2;
			const candidate = {
				x: point.x + Math.cos(angle) * r,
				y: point.y + Math.sin(angle) * r,
			};
			if (circleFitsOnLand(map, candidate, clearance)) {
				return candidate;
			}
		}
	}

	// Fall back to any walkable spot without buffer if buffer search failed.
	for (let r = 2; r <= PATH_LAND_SNAP_MAX; r += 2) {
		const samples = Math.max(8, Math.ceil((Math.PI * 2 * r) / 4));
		for (let i = 0; i < samples; i++) {
			const angle = (i / samples) * Math.PI * 2;
			const candidate = {
				x: point.x + Math.cos(angle) * r,
				y: point.y + Math.sin(angle) * r,
			};
			if (circleFitsOnLand(map, candidate, radius)) {
				return candidate;
			}
		}
	}
	return null;
}

/**
 * Grid A* from `start` to `goal`, avoiding water (circle must fit on land).
 * Returns waypoints including `goal` (not `start`), or `null` if unreachable.
 * Start/goal on or against water are snapped a few pixels inland instead of failing.
 */
export function findPath(
	map: MapDefinition,
	start: Vec2,
	goal: Vec2,
	radius: number,
	cellSize: number = PATH_GRID_CELL,
): Vec2[] | null {
	const snappedStart = circleFitsOnLand(map, start, radius)
		? start
		: snapToLand(map, start, radius);
	if (snappedStart === null) {
		return null;
	}

	const snappedGoal = circleFitsOnLand(
		map,
		goal,
		radius + PATH_LAND_SNAP_BUFFER,
	)
		? goal
		: snapToLand(map, goal, radius);
	if (snappedGoal === null) {
		return null;
	}

	start = snappedStart;
	goal = snappedGoal;

	if (segmentClear(map, start, goal, radius)) {
		return [goal];
	}

	const cell = cellSize;
	const cols = Math.max(1, Math.ceil(map.width / cell));
	const rows = Math.max(1, Math.ceil(map.height / cell));

	const walkable = new Uint8Array(cols * rows);
	const costs = new Float64Array(cols * rows);
	for (let gy = 0; gy < rows; gy++) {
		for (let gx = 0; gx < cols; gx++) {
			const center = cellCenter(gx, gy, cell, map);
			const idx = gy * cols + gx;
			if (circleFitsOnLand(map, center, radius)) {
				walkable[idx] = 1;
				costs[idx] = terrainMoveCost(map, center);
			} else {
				walkable[idx] = 0;
				costs[idx] = Number.POSITIVE_INFINITY;
			}
		}
	}

	const startCell = worldToCell(start, cell, cols, rows);
	const goalCell = worldToCell(goal, cell, cols, rows);

	if (
		walkable[startCell.gy * cols + startCell.gx] === 0 ||
		walkable[goalCell.gy * cols + goalCell.gx] === 0
	) {
		// Snap to nearest walkable if the cell under the point is blocked but
		// the point itself fits (edge case near water).
		const snappedStart = nearestWalkable(startCell, walkable, cols, rows);
		const snappedGoal = nearestWalkable(goalCell, walkable, cols, rows);
		if (snappedStart === null || snappedGoal === null) {
			return null;
		}
		return runAStar(
			map,
			start,
			goal,
			snappedStart,
			snappedGoal,
			walkable,
			costs,
			cols,
			rows,
			cell,
			radius,
		);
	}

	return runAStar(
		map,
		start,
		goal,
		startCell,
		goalCell,
		walkable,
		costs,
		cols,
		rows,
		cell,
		radius,
	);
}

function nearestWalkable(
	origin: GridPos,
	walkable: Uint8Array,
	cols: number,
	rows: number,
): GridPos | null {
	if (walkable[origin.gy * cols + origin.gx] === 1) {
		return origin;
	}
	const maxR = Math.max(cols, rows);
	for (let r = 1; r <= maxR; r++) {
		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) {
					continue;
				}
				const gx = origin.gx + dx;
				const gy = origin.gy + dy;
				if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) {
					continue;
				}
				if (walkable[gy * cols + gx] === 1) {
					return { gx, gy };
				}
			}
		}
	}
	return null;
}

function runAStar(
	map: MapDefinition,
	start: Vec2,
	goal: Vec2,
	startCell: GridPos,
	goalCell: GridPos,
	walkable: Uint8Array,
	costs: Float64Array,
	cols: number,
	rows: number,
	cell: number,
	radius: number,
): Vec2[] | null {
	const startKey = key(startCell.gx, startCell.gy);
	const goalKey = key(goalCell.gx, goalCell.gy);

	const cameFrom = new Map<number, number>();
	const gScore = new Map<number, number>([[startKey, 0]]);
	const fScore = new Map<number, number>([
		[startKey, heuristic(startCell, goalCell, cell)],
	]);
	const open: GridPos[] = [startCell];
	const openSet = new Set<number>([startKey]);
	const closed = new Set<number>();

	while (open.length > 0) {
		const head = open[0];
		if (head === undefined) {
			break;
		}
		let bestIndex = 0;
		let bestF = fScore.get(key(head.gx, head.gy)) ?? Number.POSITIVE_INFINITY;
		for (let i = 1; i < open.length; i++) {
			const node = open[i];
			if (node === undefined) {
				continue;
			}
			const f = fScore.get(key(node.gx, node.gy)) ?? Number.POSITIVE_INFINITY;
			if (f < bestF) {
				bestF = f;
				bestIndex = i;
			}
		}

		const current = open.splice(bestIndex, 1)[0];
		if (current === undefined) {
			break;
		}
		const currentKey = key(current.gx, current.gy);
		openSet.delete(currentKey);

		if (currentKey === goalKey) {
			const cells = reconstruct(cameFrom, current);
			const worldPath = cells.map((c) => cellCenter(c.gx, c.gy, cell, map));
			const trimmed = worldPath.length > 0 ? worldPath.slice(1) : [];
			const last = trimmed[trimmed.length - 1];
			if (
				last === undefined ||
				Math.hypot(last.x - goal.x, last.y - goal.y) > 1
			) {
				trimmed.push(goal);
			} else {
				trimmed[trimmed.length - 1] = goal;
			}
			return simplifyPath(map, [start, ...trimmed], radius).slice(1);
		}

		closed.add(currentKey);
		const currentG = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY;

		for (const step of ORTHOGONAL) {
			considerNeighbor(
				current,
				step,
				false,
				currentG,
				goalCell,
				walkable,
				costs,
				cols,
				rows,
				cell,
				cameFrom,
				gScore,
				fScore,
				open,
				openSet,
				closed,
			);
		}
		for (const step of DIAGONAL) {
			considerNeighbor(
				current,
				step,
				true,
				currentG,
				goalCell,
				walkable,
				costs,
				cols,
				rows,
				cell,
				cameFrom,
				gScore,
				fScore,
				open,
				openSet,
				closed,
			);
		}
	}

	return null;
}

function considerNeighbor(
	current: GridPos,
	step: GridPos,
	diagonal: boolean,
	currentG: number,
	goalCell: GridPos,
	walkable: Uint8Array,
	costs: Float64Array,
	cols: number,
	rows: number,
	cell: number,
	cameFrom: Map<number, number>,
	gScore: Map<number, number>,
	fScore: Map<number, number>,
	open: GridPos[],
	openSet: Set<number>,
	closed: Set<number>,
): void {
	const nx = current.gx + step.gx;
	const ny = current.gy + step.gy;
	if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
		return;
	}
	const nKey = key(nx, ny);
	if (closed.has(nKey)) {
		return;
	}
	if (walkable[ny * cols + nx] === 0) {
		return;
	}

	// No cutting corners through blocked cells.
	if (diagonal) {
		if (
			walkable[current.gy * cols + nx] === 0 ||
			walkable[ny * cols + current.gx] === 0
		) {
			return;
		}
	}

	const stepLen = diagonal ? cell * Math.SQRT2 : cell;
	const moveCost = costs[ny * cols + nx] ?? Number.POSITIVE_INFINITY;
	const tentative = currentG + stepLen * moveCost;
	const prev = gScore.get(nKey);
	if (prev !== undefined && tentative >= prev) {
		return;
	}

	cameFrom.set(nKey, key(current.gx, current.gy));
	gScore.set(nKey, tentative);
	fScore.set(nKey, tentative + heuristic({ gx: nx, gy: ny }, goalCell, cell));
	if (!openSet.has(nKey)) {
		openSet.add(nKey);
		open.push({ gx: nx, gy: ny });
	}
}

function reconstruct(
	cameFrom: Map<number, number>,
	current: GridPos,
): GridPos[] {
	const path: GridPos[] = [current];
	let cursor = key(current.gx, current.gy);
	while (cameFrom.has(cursor)) {
		const parent = cameFrom.get(cursor)!;
		const gx = parent % 100_000;
		const gy = Math.floor(parent / 100_000);
		path.push({ gx, gy });
		cursor = parent;
	}
	path.reverse();
	return path;
}
