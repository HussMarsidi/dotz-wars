import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN } from "./config";
import type { Vec2 } from "./types";

/**
 * Screen ↔ world transform. Pure math — render applies x/y/zoom to a container.
 * Pan/zoom are clamped so the battlefield always covers the viewport
 * (or is centered when the map fits inside the view).
 */
export class Camera {
	x = 0;
	y = 0;
	zoom = 1;

	worldWidth = 0;
	worldHeight = 0;
	viewWidth = 0;
	viewHeight = 0;

	setWorldSize(width: number, height: number): void {
		this.worldWidth = width;
		this.worldHeight = height;
		this.clampToBounds();
	}

	setViewSize(width: number, height: number): void {
		this.viewWidth = width;
		this.viewHeight = height;
		this.clampToBounds();
	}

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
		this.clampToBounds();
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
		this.clampToBounds();
	}

	/** Place a world point at the center of a viewport. */
	centerOn(world: Vec2, viewWidth: number, viewHeight: number): void {
		this.viewWidth = viewWidth;
		this.viewHeight = viewHeight;
		this.x = viewWidth / 2 - world.x * this.zoom;
		this.y = viewHeight / 2 - world.y * this.zoom;
		this.clampToBounds();
	}

	/**
	 * Keep the map covering the viewport. If the scaled map is smaller than
	 * the view on an axis, center that axis instead.
	 */
	clampToBounds(): void {
		if (
			this.worldWidth <= 0 ||
			this.worldHeight <= 0 ||
			this.viewWidth <= 0 ||
			this.viewHeight <= 0
		) {
			return;
		}

		const scaledW = this.worldWidth * this.zoom;
		const scaledH = this.worldHeight * this.zoom;

		if (scaledW <= this.viewWidth) {
			this.x = (this.viewWidth - scaledW) / 2;
		} else {
			this.x = clamp(this.x, this.viewWidth - scaledW, 0);
		}

		if (scaledH <= this.viewHeight) {
			this.y = (this.viewHeight - scaledH) / 2;
		} else {
			this.y = clamp(this.y, this.viewHeight - scaledH, 0);
		}
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
