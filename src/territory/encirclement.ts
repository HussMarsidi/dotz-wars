import type { City } from "../cities";
import type { DotId, TeamId, Vec2 } from "../shared/types";
import type { Unit } from "../units";
import { ownerAt } from "./field";
import type { TerritoryField } from "./types";

/** Parent cell index: -1 = city seed, -2 = unreached. */
export const BFS_SEED = -1;
export const BFS_UNREACHED = -2;

export type TeamConnectivity = {
	readonly teamId: TeamId;
	/** Row-major parent index per cell. */
	readonly parent: Int32Array;
};

export type EncirclementResult = {
	readonly encircledIds: ReadonlySet<DotId>;
	readonly blue: TeamConnectivity;
	readonly red: TeamConnectivity;
};

function cellIndex(field: TerritoryField, col: number, row: number): number {
	return row * field.cols + col;
}

function cellCenter(field: TerritoryField, index: number): Vec2 {
	const col = index % field.cols;
	const row = Math.floor(index / field.cols);
	const half = field.cellSize * 0.5;
	return {
		x: col * field.cellSize + half,
		y: row * field.cellSize + half,
	};
}

function clampCell(
	field: TerritoryField,
	point: Vec2,
): { col: number; row: number; index: number } | null {
	const col = Math.floor(point.x / field.cellSize);
	const row = Math.floor(point.y / field.cellSize);
	if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) {
		return null;
	}
	return { col, row, index: cellIndex(field, col, row) };
}

function canTraverse(
	field: TerritoryField,
	index: number,
	teamId: TeamId,
): boolean {
	const owner = field.owners[index] ?? "neutral";
	if (owner === "neutral" || owner === teamId) {
		return true;
	}
	return false;
}

/**
 * Flood from every friendly city through own + neutral cells.
 * Enemy-owned cells block. Returns parent links for path reconstruction.
 */
export function computeTeamConnectivity(
	field: TerritoryField,
	cities: readonly City[],
	teamId: TeamId,
): TeamConnectivity {
	const total = field.cols * field.rows;
	const parent = new Int32Array(total);
	parent.fill(BFS_UNREACHED);

	const queue: number[] = [];
	for (const city of cities) {
		if (city.teamId !== teamId) {
			continue;
		}
		const cell = clampCell(field, city.position);
		if (cell === null) {
			continue;
		}
		if (parent[cell.index] !== BFS_UNREACHED) {
			continue;
		}
		parent[cell.index] = BFS_SEED;
		queue.push(cell.index);
	}

	let head = 0;
	while (head < queue.length) {
		const current = queue[head];
		head += 1;
		if (current === undefined) {
			continue;
		}
		const col = current % field.cols;
		const row = Math.floor(current / field.cols);
		const neighbors = [
			[col + 1, row],
			[col - 1, row],
			[col, row + 1],
			[col, row - 1],
		] as const;
		for (const [nCol, nRow] of neighbors) {
			if (nCol < 0 || nRow < 0 || nCol >= field.cols || nRow >= field.rows) {
				continue;
			}
			const next = cellIndex(field, nCol, nRow);
			if (parent[next] !== BFS_UNREACHED) {
				continue;
			}
			if (!canTraverse(field, next, teamId)) {
				continue;
			}
			parent[next] = current;
			queue.push(next);
		}
	}

	return { teamId, parent };
}

/**
 * Encircled = living unit on a cell it owns that the team BFS never reached.
 * Own-territory pockets only — never on enemy/neutral ground.
 */
export function computeEncirclement(
	field: TerritoryField,
	cities: readonly City[],
	units: readonly Unit[],
): EncirclementResult {
	const blue = computeTeamConnectivity(field, cities, "blue");
	const red = computeTeamConnectivity(field, cities, "red");
	const encircledIds = new Set<DotId>();

	for (const unit of units) {
		if (!unit.isAlive) {
			continue;
		}
		const owner = ownerAt(field, unit.position);
		if (owner !== unit.teamId) {
			continue;
		}
		const cell = clampCell(field, unit.position);
		if (cell === null) {
			continue;
		}
		const connectivity = unit.teamId === "blue" ? blue : red;
		if (connectivity.parent[cell.index] === BFS_UNREACHED) {
			encircledIds.add(unit.id);
		}
	}

	return { encircledIds, blue, red };
}

function connectivityFor(
	result: EncirclementResult,
	teamId: TeamId,
): TeamConnectivity {
	switch (teamId) {
		case "blue":
			return result.blue;
		case "red":
			return result.red;
		default: {
			const _exhaustive: never = teamId;
			return _exhaustive;
		}
	}
}

/**
 * Walk BFS parents from `point` back to a city seed → world waypoints.
 * Returns null if the cell was never reached.
 */
export function bfsPathHome(
	field: TerritoryField,
	result: EncirclementResult,
	teamId: TeamId,
	point: Vec2,
): readonly Vec2[] | null {
	const cell = clampCell(field, point);
	if (cell === null) {
		return null;
	}
	const { parent } = connectivityFor(result, teamId);
	if (parent[cell.index] === BFS_UNREACHED) {
		return null;
	}

	const chain: number[] = [];
	let current: number = cell.index;
	const guard = field.cols * field.rows + 1;
	for (let i = 0; i < guard; i += 1) {
		chain.push(current);
		const p = parent[current];
		if (p === undefined || p === BFS_SEED) {
			break;
		}
		if (p === BFS_UNREACHED) {
			return null;
		}
		current = p;
	}

	// chain = [unitCell → … → citySeed]; skip current cell for next waypoints.
	const hops = chain.slice(1);
	if (hops.length === 0) {
		return [cellCenter(field, cell.index)];
	}
	return hops.map((index) => cellCenter(field, index));
}

/** Nearest BFS-reached cell center for a team (for straight-line approach). */
export function nearestReachedCellCenter(
	field: TerritoryField,
	result: EncirclementResult,
	teamId: TeamId,
	point: Vec2,
): Vec2 | null {
	const { parent } = connectivityFor(result, teamId);
	let best: Vec2 | null = null;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < parent.length; i += 1) {
		if (parent[i] === BFS_UNREACHED) {
			continue;
		}
		const center = cellCenter(field, i);
		const dist = Math.hypot(center.x - point.x, center.y - point.y);
		if (dist < bestDist) {
			bestDist = dist;
			best = center;
		}
	}
	return best;
}
