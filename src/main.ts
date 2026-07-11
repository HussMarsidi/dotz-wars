import { attachPointerInput, type PointerMode } from "./input/input";
import { Renderer } from "./render/renderer";
import {
	CAMERA_ZOOM_WHEEL_FACTOR,
	CLICK_DRAG_THRESHOLD,
	DOT_RADIUS,
	TICK_DT,
} from "./shared/config";
import type { GameState, Rect } from "./shared/types";
import { attachShortcuts } from "./shortcuts";
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
import { mountToolbar } from "./ui/toolbar";

async function main(): Promise<void> {
	const host = document.getElementById("app");
	if (host === null) {
		throw new Error("#app mount point missing");
	}

	let previous: GameState = createInitialState();
	let current: GameState = previous;
	let accumulator = 0;
	let marquee: Rect | null = null;
	let mode: PointerMode = "select";

	const renderer = await Renderer.create(host);
	const map = renderer.map;

	const redraw = (alpha = 1) => {
		const viewState =
			alpha >= 1 ? current : interpolateState(previous, current, alpha);
		renderer.sync(viewState, marquee);
	};

	const setMode = (next: PointerMode) => {
		mode = next;
		toolbar.setMode(next);
		renderer.canvas.style.cursor = next === "pan" ? "grab" : "default";
	};

	const toolbar = mountToolbar(host, {
		onModeChange: setMode,
	});

	attachShortcuts({
		setSelectMode: () => setMode("select"),
		setPanMode: () => setMode("pan"),
	});

	attachPointerInput({
		canvas: renderer.canvas,
		camera: renderer.camera,
		getMode: () => mode,
		clickThresholdWorld: CLICK_DRAG_THRESHOLD,
		zoomWheelFactor: CAMERA_ZOOM_WHEEL_FACTOR,
		handlers: {
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
			onPan: (delta) => {
				renderer.camera.panScreen(delta.x, delta.y);
				renderer.applyCamera();
			},
			onZoom: (screen, factor) => {
				renderer.camera.zoomAt(screen, factor);
				renderer.applyCamera();
			},
		},
	});

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

	setMode("select");
	redraw();
}

void main();
