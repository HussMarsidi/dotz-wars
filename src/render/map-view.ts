import { Graphics } from "pixi.js";
import type { MapDefinition } from "../map/types";
import { LAND_COLOR, WATER_COLOR } from "../shared/config";

/** Draws a map definition as procedural Graphics (land fill + water ellipses). */
export function createMapView(map: MapDefinition): Graphics {
	const gfx = new Graphics();
	drawMap(gfx, map);
	return gfx;
}

export function drawMap(gfx: Graphics, map: MapDefinition): void {
	gfx.clear();
	gfx.rect(0, 0, map.width, map.height).fill(LAND_COLOR);

	for (const body of map.water) {
		switch (body.kind) {
			case "ellipse":
				gfx
					.ellipse(body.center.x, body.center.y, body.radiusX, body.radiusY)
					.fill(WATER_COLOR);
				break;
			default: {
				const _exhaustive: never = body.kind;
				void _exhaustive;
			}
		}
	}
}
