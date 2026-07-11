import { Graphics } from "pixi.js";
import { DOT_COLOR, DOT_RADIUS, DOT_SELECTED_COLOR } from "../shared/config";
import type { Dot } from "../shared/types";

/** Maps a sim dot → a Graphics circle. Render-only; never mutates sim. */
export function createDotView(dot: Dot): Graphics {
	const view = new Graphics();
	syncDotView(view, dot);
	return view;
}

export function syncDotView(view: Graphics, dot: Dot): void {
	const color = dot.selected ? DOT_SELECTED_COLOR : DOT_COLOR;
	view.clear();
	view.circle(0, 0, DOT_RADIUS).fill(color);
	view.position.set(dot.position.x, dot.position.y);
}
