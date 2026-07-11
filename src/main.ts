import { attachPointerInput } from "./input/input";
import { Renderer } from "./render/renderer";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	CLICK_DRAG_THRESHOLD,
	DOT_RADIUS,
} from "./shared/config";
import type { GameState, Rect } from "./shared/types";
import { applyClickSelection, applyMarqueeSelection } from "./sim/selection";
import { createInitialState } from "./sim/state";

async function main(): Promise<void> {
	const host = document.getElementById("app");
	if (host === null) {
		throw new Error("#app mount point missing");
	}

	let state: GameState = createInitialState();
	let marquee: Rect | null = null;

	const renderer = await Renderer.create(host);

	const redraw = () => {
		renderer.sync(state, marquee);
	};

	attachPointerInput(
		renderer.canvas,
		BOARD_WIDTH,
		BOARD_HEIGHT,
		CLICK_DRAG_THRESHOLD,
		{
			onClick: (position) => {
				marquee = null;
				state = applyClickSelection(state, position, DOT_RADIUS);
				redraw();
			},
			onMarquee: (rect) => {
				marquee = rect;
				state = applyMarqueeSelection(state, rect, DOT_RADIUS);
				redraw();
			},
			onMarqueeEnd: (rect) => {
				marquee = null;
				state = applyMarqueeSelection(state, rect, DOT_RADIUS);
				redraw();
			},
		},
	);

	redraw();
}

void main();
