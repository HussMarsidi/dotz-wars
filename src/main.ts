import { attachPointerInput } from "./input/input";
import { Renderer } from "./render/renderer";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	CLICK_DRAG_THRESHOLD,
	DOT_RADIUS,
	TICK_DT,
} from "./shared/config";
import type { GameState, Rect } from "./shared/types";
import {
	applyClickSelection,
	applyMarqueeSelection,
	pointHitsCircle,
} from "./sim/selection";
import { createInitialState } from "./sim/state";
import {
	interpolateState,
	issueMoveOrder,
	stateHasSelection,
	step,
} from "./sim/step";

async function main(): Promise<void> {
	const host = document.getElementById("app");
	if (host === null) {
		throw new Error("#app mount point missing");
	}

	let previous: GameState = createInitialState();
	let current: GameState = previous;
	let accumulator = 0;
	let marquee: Rect | null = null;

	const renderer = await Renderer.create(host);
	const map = renderer.map;

	const redraw = (alpha = 1) => {
		const viewState =
			alpha >= 1 ? current : interpolateState(previous, current, alpha);
		renderer.sync(viewState, marquee);
	};

	attachPointerInput(
		renderer.canvas,
		BOARD_WIDTH,
		BOARD_HEIGHT,
		CLICK_DRAG_THRESHOLD,
		{
			onClick: (position) => {
				marquee = null;
				const hitDot = current.dots.some((dot) =>
					pointHitsCircle(position, dot.position, DOT_RADIUS),
				);
				if (!hitDot && stateHasSelection(current)) {
					const next = issueMoveOrder(current, position, map, DOT_RADIUS);
					previous = current;
					current = next;
					redraw();
					return;
				}
				previous = current;
				current = applyClickSelection(current, position, DOT_RADIUS);
				redraw();
			},
			onMarquee: (rect) => {
				marquee = rect;
				previous = current;
				current = applyMarqueeSelection(current, rect, DOT_RADIUS);
				redraw();
			},
			onMarqueeEnd: (rect) => {
				marquee = null;
				previous = current;
				current = applyMarqueeSelection(current, rect, DOT_RADIUS);
				redraw();
			},
		},
	);

	let lastTime = performance.now();
	renderer.app.ticker.add(() => {
		const now = performance.now();
		const frameDt = Math.min((now - lastTime) / 1000, 0.25);
		lastTime = now;

		accumulator += frameDt;
		while (accumulator >= TICK_DT) {
			previous = current;
			current = step(current, map, DOT_RADIUS, TICK_DT);
			accumulator -= TICK_DT;
		}

		redraw(accumulator / TICK_DT);
	});

	redraw();
}

void main();
