import type { Camera } from "../shared/camera";
import type { Rect, Vec2 } from "../shared/types";

export type PointerMode = "select" | "pan";

export type PointerHandlers = {
	readonly onClick: (position: Vec2) => void;
	readonly onMarquee: (rect: Rect) => void;
	readonly onMarqueeEnd: (rect: Rect) => void;
	readonly onPan: (screenDelta: Vec2) => void;
	readonly onZoom: (screenPoint: Vec2, factor: number) => void;
};

type PointerState = {
	readonly originScreen: Vec2;
	readonly originWorld: Vec2;
	currentScreen: Vec2;
	currentWorld: Vec2;
	dragging: boolean;
};

/** CSS-pixel coords matching Pixi autoDensity stage space. */
function clientToCssScreen(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
): Vec2 {
	const bounds = canvas.getBoundingClientRect();
	return {
		x: clientX - bounds.left,
		y: clientY - bounds.top,
	};
}

function rectFromDrag(origin: Vec2, current: Vec2): Rect {
	return {
		x: origin.x,
		y: origin.y,
		width: current.x - origin.x,
		height: current.y - origin.y,
	};
}

function distance(a: Vec2, b: Vec2): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.hypot(dx, dy);
}

export type PointerInputOptions = {
	readonly canvas: HTMLCanvasElement;
	readonly camera: Camera;
	readonly getMode: () => PointerMode;
	readonly clickThresholdWorld: number;
	readonly zoomWheelFactor: number;
	readonly handlers: PointerHandlers;
};

/**
 * Pointer → select (click/marquee) or pan, plus wheel zoom.
 * World positions come from the camera; pan deltas are screen CSS pixels.
 */
export function attachPointerInput(options: PointerInputOptions): () => void {
	const {
		canvas,
		camera,
		getMode,
		clickThresholdWorld,
		zoomWheelFactor,
		handlers,
	} = options;

	let pointer: PointerState | null = null;

	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) {
			return;
		}
		const originScreen = clientToCssScreen(
			canvas,
			event.clientX,
			event.clientY,
		);
		const originWorld = camera.screenToWorld(originScreen);
		pointer = {
			originScreen,
			originWorld,
			currentScreen: originScreen,
			currentWorld: originWorld,
			dragging: false,
		};
		canvas.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (pointer === null) {
			return;
		}
		const currentScreen = clientToCssScreen(
			canvas,
			event.clientX,
			event.clientY,
		);
		const currentWorld = camera.screenToWorld(currentScreen);
		const prevScreen = pointer.currentScreen;
		pointer.currentScreen = currentScreen;
		pointer.currentWorld = currentWorld;

		if (getMode() === "pan") {
			if (!pointer.dragging) {
				if (distance(pointer.originScreen, currentScreen) < 3) {
					return;
				}
				pointer.dragging = true;
			}
			handlers.onPan({
				x: currentScreen.x - prevScreen.x,
				y: currentScreen.y - prevScreen.y,
			});
			return;
		}

		if (!pointer.dragging) {
			if (distance(pointer.originWorld, currentWorld) < clickThresholdWorld) {
				return;
			}
			pointer.dragging = true;
		}
		handlers.onMarquee(rectFromDrag(pointer.originWorld, currentWorld));
	};

	const endPointer = (event: PointerEvent) => {
		if (pointer === null) {
			return;
		}
		const currentScreen = clientToCssScreen(
			canvas,
			event.clientX,
			event.clientY,
		);
		const currentWorld = camera.screenToWorld(currentScreen);
		const wasDragging = pointer.dragging;
		const originWorld = pointer.originWorld;
		pointer = null;

		if (getMode() === "pan") {
			return;
		}

		if (wasDragging) {
			handlers.onMarqueeEnd(rectFromDrag(originWorld, currentWorld));
			return;
		}
		handlers.onClick(originWorld);
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const screen = clientToCssScreen(canvas, event.clientX, event.clientY);
		const factor = event.deltaY < 0 ? zoomWheelFactor : 1 / zoomWheelFactor;
		handlers.onZoom(screen, factor);
	};

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerup", endPointer);
	canvas.addEventListener("pointercancel", endPointer);
	canvas.addEventListener("wheel", onWheel, { passive: false });

	return () => {
		canvas.removeEventListener("pointerdown", onPointerDown);
		canvas.removeEventListener("pointermove", onPointerMove);
		canvas.removeEventListener("pointerup", endPointer);
		canvas.removeEventListener("pointercancel", endPointer);
		canvas.removeEventListener("wheel", onWheel);
	};
}
