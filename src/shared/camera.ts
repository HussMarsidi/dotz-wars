import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN } from "./config";
import type { Vec2 } from "./types";

/**
 * Screen ↔ world transform. Pure math — render applies x/y/zoom to a container.
 */
export class Camera {
	x = 0;
	y = 0;
	zoom = 1;

	/** Canvas-local screen point → world. */
	screenToWorld(screen: Vec2): Vec2 {
		return {
			x: (screen.x - this.x) / this.zoom,
			y: (screen.y - this.y) / this.zoom,
		};
	}

	panScreen(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}

	/** Zoom keeping the world point under `screen` stable. */
	zoomAt(screen: Vec2, factor: number): void {
		const next = clamp(this.zoom * factor, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
		if (next === this.zoom) {
			return;
		}
		const world = this.screenToWorld(screen);
		this.zoom = next;
		this.x = screen.x - world.x * this.zoom;
		this.y = screen.y - world.y * this.zoom;
	}

	/** Place a world point at the center of a viewport. */
	centerOn(world: Vec2, viewWidth: number, viewHeight: number): void {
		this.x = viewWidth / 2 - world.x * this.zoom;
		this.y = viewHeight / 2 - world.y * this.zoom;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
