import {
	FOG_CELL,
	FOG_EXPLORED,
	FOG_UNEXPLORED,
	FOG_VISIBLE,
	VISION_RADIUS_BY_KIND,
	VISION_RADIUS_CITY,
} from "../shared/config";
import type { TeamId, Vec2 } from "../shared/types";
import type { City } from "../cities";
import type { Unit } from "../units";

export type FogTier = typeof FOG_UNEXPLORED | typeof FOG_EXPLORED | typeof FOG_VISIBLE;

export type TeamFog = {
	readonly cellSize: number;
	readonly cols: number;
	readonly rows: number;
	/** Row-major fog tier per cell. */
	readonly cells: Uint8Array;
};

export type FogState = {
	readonly blue: TeamFog;
	readonly red: TeamFog;
};

function emptyTeamFog(width: number, height: number, cellSize: number): TeamFog {
	const cols = Math.max(1, Math.ceil(width / cellSize));
	const rows = Math.max(1, Math.ceil(height / cellSize));
	return {
		cellSize,
		cols,
		rows,
		cells: new Uint8Array(cols * rows), // 0 = unexplored
	};
}

export function createInitialFog(
	width: number,
	height: number,
	cellSize: number = FOG_CELL,
): FogState {
	return {
		blue: emptyTeamFog(width, height, cellSize),
		red: emptyTeamFog(width, height, cellSize),
	};
}

function visionRadiusFor(unit: Unit): number {
	return VISION_RADIUS_BY_KIND[unit.kind];
}

function paintVisible(
	fog: TeamFog,
	center: Vec2,
	radius: number,
	scratch: Uint8Array,
): void {
	const r = radius;
	const rSq = r * r;
	const minCol = Math.max(0, Math.floor((center.x - r) / fog.cellSize));
	const maxCol = Math.min(
		fog.cols - 1,
		Math.floor((center.x + r) / fog.cellSize),
	);
	const minRow = Math.max(0, Math.floor((center.y - r) / fog.cellSize));
	const maxRow = Math.min(
		fog.rows - 1,
		Math.floor((center.y + r) / fog.cellSize),
	);
	const half = fog.cellSize * 0.5;

	for (let row = minRow; row <= maxRow; row += 1) {
		for (let col = minCol; col <= maxCol; col += 1) {
			const cx = col * fog.cellSize + half;
			const cy = row * fog.cellSize + half;
			const dx = cx - center.x;
			const dy = cy - center.y;
			if (dx * dx + dy * dy <= rSq) {
				scratch[row * fog.cols + col] = FOG_VISIBLE;
			}
		}
	}
}

function updateTeamFog(
	previous: TeamFog,
	cities: readonly City[],
	units: readonly Unit[],
	teamId: TeamId,
): TeamFog {
	const scratch = new Uint8Array(previous.cells.length);
	// Start as explored-or-unexplored from previous (visible→explored).
	for (let i = 0; i < previous.cells.length; i += 1) {
		const prev = previous.cells[i] ?? FOG_UNEXPLORED;
		scratch[i] = prev === FOG_UNEXPLORED ? FOG_UNEXPLORED : FOG_EXPLORED;
	}

	for (const city of cities) {
		if (city.teamId !== teamId) {
			continue;
		}
		paintVisible(previous, city.position, VISION_RADIUS_CITY, scratch);
	}
	for (const unit of units) {
		if (!unit.isAlive || unit.teamId !== teamId) {
			continue;
		}
		paintVisible(previous, unit.position, visionRadiusFor(unit), scratch);
	}

	return {
		cellSize: previous.cellSize,
		cols: previous.cols,
		rows: previous.rows,
		cells: scratch,
	};
}

/** Recompute live visibility; promote seen cells to explored. Instant on death. */
export function tickFog(
	fog: FogState,
	cities: readonly City[],
	units: readonly Unit[],
): FogState {
	return {
		blue: updateTeamFog(fog.blue, cities, units, "blue"),
		red: updateTeamFog(fog.red, cities, units, "red"),
	};
}

export function fogOf(fog: FogState, teamId: TeamId): TeamFog {
	switch (teamId) {
		case "blue":
			return fog.blue;
		case "red":
			return fog.red;
		default: {
			const _exhaustive: never = teamId;
			return _exhaustive;
		}
	}
}

export function fogTierAt(fog: TeamFog, point: Vec2): FogTier {
	const col = Math.floor(point.x / fog.cellSize);
	const row = Math.floor(point.y / fog.cellSize);
	if (col < 0 || row < 0 || col >= fog.cols || row >= fog.rows) {
		return FOG_UNEXPLORED;
	}
	const v = fog.cells[row * fog.cols + col] ?? FOG_UNEXPLORED;
	if (v === FOG_VISIBLE) {
		return FOG_VISIBLE;
	}
	if (v === FOG_EXPLORED) {
		return FOG_EXPLORED;
	}
	return FOG_UNEXPLORED;
}
