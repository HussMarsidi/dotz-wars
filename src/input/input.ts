import type { Rect, Vec2 } from "../shared/types";

export type PointerHandlers = {
	readonly onClick: (position: Vec2) => void;
	readonly onMarquee: (rect: Rect) => void;
	readonly onMarqueeEnd: (rect: Rect) => void;
};

type PointerState = {
	readonly origin: Vec2;
	current: Vec2;
	dragging: boolean;
};

function clientToWorld(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
	worldWidth: number,
	worldHeight: number,
): Vec2 {
	const bounds = canvas.getBoundingClientRect();
	return {
		x: ((clientX - bounds.left) / bounds.width) * worldWidth,
		y: ((clientY - bounds.top) / bounds.height) * worldHeight,
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

/**
 * Pointer → plain click / marquee data. Does not decide which dots are selected.
 * Travel under `clickThreshold` is a click; beyond that is a marquee drag.
 */
export function attachPointerInput(
	canvas: HTMLCanvasElement,
	worldWidth: number,
	worldHeight: number,
	clickThreshold: number,
	handlers: PointerHandlers,
): () => void {
	let pointer: PointerState | null = null;

	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0) {
			return;
		}
		const origin = clientToWorld(
			canvas,
			event.clientX,
			event.clientY,
			worldWidth,
			worldHeight,
		);
		pointer = { origin, current: origin, dragging: false };
		canvas.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: PointerEvent) => {
		if (pointer === null) {
			return;
		}
		pointer.current = clientToWorld(
			canvas,
			event.clientX,
			event.clientY,
			worldWidth,
			worldHeight,
		);
		if (!pointer.dragging) {
			if (distance(pointer.origin, pointer.current) < clickThreshold) {
				return;
			}
			pointer.dragging = true;
		}
		handlers.onMarquee(rectFromDrag(pointer.origin, pointer.current));
	};

	const endPointer = (event: PointerEvent) => {
		if (pointer === null) {
			return;
		}
		const current = clientToWorld(
			canvas,
			event.clientX,
			event.clientY,
			worldWidth,
			worldHeight,
		);
		const wasDragging = pointer.dragging;
		const origin = pointer.origin;
		pointer = null;

		if (wasDragging) {
			handlers.onMarqueeEnd(rectFromDrag(origin, current));
			return;
		}
		handlers.onClick(origin);
	};

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerup", endPointer);
	canvas.addEventListener("pointercancel", endPointer);

	return () => {
		canvas.removeEventListener("pointerdown", onPointerDown);
		canvas.removeEventListener("pointermove", onPointerMove);
		canvas.removeEventListener("pointerup", endPointer);
		canvas.removeEventListener("pointercancel", endPointer);
	};
}
