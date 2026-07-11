import type { Graphics } from "pixi.js";
import {
	TEAM_COLORS,
	TERRITORY_BORDER_ALPHA,
	TERRITORY_BORDER_COLOR,
	TERRITORY_BORDER_WIDTH,
	TERRITORY_TINT_ALPHA,
} from "../shared/config";
import type { TerritoryField, TerritoryOwner } from "../territory";

/**
 * Draws ownership tint + hard seam borders.
 * Tint is slightly transparent; borders mark where ownership flips.
 */
export function drawTerritory(gfx: Graphics, field: TerritoryField): void {
	gfx.clear();

	const { cellSize, cols, rows, owners } = field;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const owner = owners[row * cols + col] ?? "neutral";
			if (owner === "neutral") {
				continue;
			}
			gfx
				.rect(col * cellSize, row * cellSize, cellSize, cellSize)
				.fill({ color: TEAM_COLORS[owner], alpha: TERRITORY_TINT_ALPHA });
		}
	}

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const owner = owners[row * cols + col] ?? "neutral";
			const x = col * cellSize;
			const y = row * cellSize;

			if (col + 1 < cols) {
				const right = owners[row * cols + (col + 1)] ?? "neutral";
				if (seam(owner, right)) {
					gfx
						.moveTo(x + cellSize, y)
						.lineTo(x + cellSize, y + cellSize)
						.stroke({
							width: TERRITORY_BORDER_WIDTH,
							color: TERRITORY_BORDER_COLOR,
							alpha: TERRITORY_BORDER_ALPHA,
						});
				}
			}

			if (row + 1 < rows) {
				const below = owners[(row + 1) * cols + col] ?? "neutral";
				if (seam(owner, below)) {
					gfx
						.moveTo(x, y + cellSize)
						.lineTo(x + cellSize, y + cellSize)
						.stroke({
							width: TERRITORY_BORDER_WIDTH,
							color: TERRITORY_BORDER_COLOR,
							alpha: TERRITORY_BORDER_ALPHA,
						});
				}
			}
		}
	}
}

function seam(a: TerritoryOwner, b: TerritoryOwner): boolean {
	return a !== b;
}
