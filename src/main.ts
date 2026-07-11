import { attachPointerInput, type PointerMode } from "./input/input";
import { Renderer } from "./render/renderer";
import {
	CAMERA_ZOOM_WHEEL_FACTOR,
	CLICK_DRAG_THRESHOLD,
	DOT_RADIUS,
	TICK_DT,
} from "./shared/config";
import type { GameState } from "./shared/game-state";
import type { Rect } from "./shared/types";
import { attachShortcuts } from "./shortcuts";
import {
	assignControlGroup,
	controlGroupLabels,
	createControlGroups,
	isControlGroupSlot,
	selectControlGroup,
} from "./sim/control-groups";
import {
	applyClickSelection,
	applyMarqueeSelection,
	clearSelection,
	findUnitAtPoint,
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
	const controlGroups = createControlGroups();

	const renderer = await Renderer.create(host);
	const map = renderer.map;

	const redraw = (alpha = 1) => {
		const viewState =
			alpha >= 1 ? current : interpolateState(previous, current, alpha);
		renderer.sync(viewState, marquee, controlGroupLabels(controlGroups));
	};

	const setMode = (next: PointerMode) => {
		mode = next;
		toolbar.setMode(next);
		renderer.canvas.style.cursor = next === "pan" ? "grab" : "default";
	};

	const deselectAll = () => {
		marquee = null;
		previous = current;
		current = clearSelection(current);
		redraw();
	};

	const toolbar = mountToolbar(host, {
		onModeChange: setMode,
		onClearSelection: deselectAll,
	});

	attachShortcuts(
		{
			setSelectMode: () => setMode("select"),
			setPanMode: () => setMode("pan"),
			clearSelection: deselectAll,
		},
		{
			assignGroup: (slot) => {
				if (!isControlGroupSlot(slot)) {
					return;
				}
				assignControlGroup(controlGroups, slot, current);
				redraw();
			},
			selectGroup: (slot) => {
				if (!isControlGroupSlot(slot)) {
					return;
				}
				marquee = null;
				const next = selectControlGroup(current, controlGroups, slot);
				if (next === current) {
					return;
				}
				previous = current;
				current = next;
				redraw();
			},
		},
	);

	attachPointerInput({
		canvas: renderer.canvas,
		camera: renderer.camera,
		getMode: () => mode,
		clickThresholdWorld: CLICK_DRAG_THRESHOLD,
		zoomWheelFactor: CAMERA_ZOOM_WHEEL_FACTOR,
		handlers: {
			onClick: (position) => {
				marquee = null;

				if (stateHasSelection(current)) {
					const hit = findUnitAtPoint(current.units, position, DOT_RADIUS);
					if (hit === null) {
						const next = issueMoveOrder(
							current,
							position,
							map,
							DOT_RADIUS,
							"move",
						);
						previous = current;
						current = next;
						redraw();
						return;
					}

					const selectedEnemyOfHit = current.units.some(
						(unit) => unit.selected && unit.teamId !== hit.teamId,
					);
					if (selectedEnemyOfHit) {
						const next = issueMoveOrder(
							current,
							hit.position,
							map,
							DOT_RADIUS,
							"attack",
						);
						previous = current;
						current = next;
						redraw();
						return;
					}
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
