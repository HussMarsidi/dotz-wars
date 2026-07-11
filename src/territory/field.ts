import { TERRITORY_CELL, TERRITORY_NEUTRAL_EPSILON } from "../shared/config";
import type { TeamId, Vec2 } from "../shared/types";
import type { InfluenceSource, TerritoryField, TerritoryOwner } from "./types";

/**
 * Influence at distance d: strongest at center, fades to 0 at radius.
 * Quadratic falloff keeps a soft core without soft ownership borders
 * (ownership is still a hard compare of totals).
 */
export function influenceAt(source: InfluenceSource, point: Vec2): number {
	const dx = point.x - source.position.x;
	const dy = point.y - source.position.y;
	const dist = Math.hypot(dx, dy);
	if (dist >= source.radius) {
		return 0;
	}
	const t = 1 - dist / source.radius;
	return source.strength * t * t;
}

function ownerFromInfluence(blue: number, red: number): TerritoryOwner {
	const diff = blue - red;
	if (Math.abs(diff) < TERRITORY_NEUTRAL_EPSILON) {
		return "neutral";
	}
	return diff > 0 ? "blue" : "red";
}

/**
 * Sample the map on a grid: at each cell, sum team influence and assign owner.
 * Territory emerges from projection — no pre-drawn regions.
 */
export function computeTerritory(
	width: number,
	height: number,
	sources: readonly InfluenceSource[],
	cellSize: number = TERRITORY_CELL,
): TerritoryField {
	const cols = Math.max(1, Math.ceil(width / cellSize));
	const rows = Math.max(1, Math.ceil(height / cellSize));
	const owners: TerritoryOwner[] = new Array(cols * rows);
	const half = cellSize * 0.5;

	const blueSources = sources.filter((s) => s.teamId === "blue");
	const redSources = sources.filter((s) => s.teamId === "red");

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const point = {
				x: col * cellSize + half,
				y: row * cellSize + half,
			};
			let blue = 0;
			let red = 0;
			for (const source of blueSources) {
				blue += influenceAt(source, point);
			}
			for (const source of redSources) {
				red += influenceAt(source, point);
			}
			owners[row * cols + col] = ownerFromInfluence(blue, red);
		}
	}

	return { cellSize, cols, rows, width, height, owners };
}

export function emptyTerritory(
	width: number,
	height: number,
	cellSize: number = TERRITORY_CELL,
): TerritoryField {
	return computeTerritory(width, height, [], cellSize);
}

export function teamInfluenceAt(
	sources: readonly InfluenceSource[],
	point: Vec2,
	teamId: TeamId,
): number {
	let sum = 0;
	for (const source of sources) {
		if (source.teamId === teamId) {
			sum += influenceAt(source, point);
		}
	}
	return sum;
}

export function ownerAt(field: TerritoryField, point: Vec2): TerritoryOwner {
	const col = Math.floor(point.x / field.cellSize);
	const row = Math.floor(point.y / field.cellSize);
	if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) {
		return "neutral";
	}
	return field.owners[row * field.cols + col] ?? "neutral";
}

export function isEnemyGround(
	field: TerritoryField,
	point: Vec2,
	teamId: TeamId,
): boolean {
	const owner = ownerAt(field, point);
	if (owner === "neutral") {
		return false;
	}
	return owner !== teamId;
}

/**
 * How hard enemy influence covers this team's at `point`.
 * 0 = own/neutral (safe); → 1 deep in enemy space where own influence is tiny.
 */
export function overwhelmAt(
	sources: readonly InfluenceSource[],
	point: Vec2,
	teamId: TeamId,
): number {
	const own = teamInfluenceAt(sources, point, teamId);
	const enemyTeam: TeamId = teamId === "blue" ? "red" : "blue";
	const enemy = teamInfluenceAt(sources, point, enemyTeam);

	// Enemy must fully cover (own more than us) before drain starts.
	if (enemy <= own + TERRITORY_NEUTRAL_EPSILON) {
		return 0;
	}
	return (enemy - own) / enemy;
}
