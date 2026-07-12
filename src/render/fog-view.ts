import { Graphics } from "pixi.js";
import {
	FOG_EXPLORED,
	FOG_EXPLORED_ALPHA,
	FOG_EXPLORED_COLOR,
	FOG_UNEXPLORED,
	FOG_UNEXPLORED_ALPHA,
	FOG_UNEXPLORED_COLOR,
	FOG_VISIBLE,
} from "../shared/config";
import type { TeamFog } from "../vision";

/** Draw local-player fog overlay (unexplored dark, explored dim, visible clear). */
export function drawFog(gfx: Graphics, fog: TeamFog): void {
	gfx.clear();
	const half = fog.cellSize * 0.5;
	for (let row = 0; row < fog.rows; row += 1) {
		for (let col = 0; col < fog.cols; col += 1) {
			const tier = fog.cells[row * fog.cols + col] ?? FOG_UNEXPLORED;
			if (tier === FOG_VISIBLE) {
				continue;
			}
			const x = col * fog.cellSize;
			const y = row * fog.cellSize;
			if (tier === FOG_EXPLORED) {
				gfx
					.rect(x, y, fog.cellSize + 0.5, fog.cellSize + 0.5)
					.fill({ color: FOG_EXPLORED_COLOR, alpha: FOG_EXPLORED_ALPHA });
			} else {
				gfx
					.rect(x, y, fog.cellSize + 0.5, fog.cellSize + 0.5)
					.fill({
						color: FOG_UNEXPLORED_COLOR,
						alpha: FOG_UNEXPLORED_ALPHA,
					});
			}
			void half;
		}
	}
}
