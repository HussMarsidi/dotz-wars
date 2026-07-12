import { Graphics } from "pixi.js";
import type { MapDefinition, TerrainRegion } from "../map/types";
import {
	FOREST_COLOR,
	LAND_COLOR,
	MOUNTAIN_COLOR,
	WATER_COLOR,
} from "../shared/config";

const DRAW_ORDER: ReadonlyArray<TerrainRegion["terrain"]> = [
	"forest",
	"mountain",
	"water",
];

const TERRAIN_COLOR: Readonly<Record<TerrainRegion["terrain"], number>> = {
	forest: FOREST_COLOR,
	mountain: MOUNTAIN_COLOR,
	water: WATER_COLOR,
};

/** Draws a map definition as procedural Graphics (land + terrain ellipses). */
export function createMapView(map: MapDefinition): Graphics {
	const gfx = new Graphics();
	drawMap(gfx, map);
	return gfx;
}

export function drawMap(gfx: Graphics, map: MapDefinition): void {
	gfx.clear();
	gfx.rect(0, 0, map.width, map.height).fill(LAND_COLOR);

	for (const terrain of DRAW_ORDER) {
		const color = TERRAIN_COLOR[terrain];
		for (const region of map.regions) {
			if (region.terrain !== terrain) {
				continue;
			}
			switch (region.shape) {
				case "ellipse":
					gfx
						.ellipse(
							region.center.x,
							region.center.y,
							region.radiusX,
							region.radiusY,
						)
						.fill(color);
					break;
				default: {
					const _exhaustive: never = region.shape;
					void _exhaustive;
				}
			}
		}
	}

	// Resource nodes + connectors (static map markers).
	for (const resource of map.resources) {
		gfx
			.circle(resource.position.x, resource.position.y, 10)
			.fill({ color: 0xc9a227, alpha: 0.9 });
		for (const connector of resource.connectors) {
			gfx
				.circle(connector.x, connector.y, 5)
				.fill({ color: 0xffe082, alpha: 0.85 });
			gfx
				.moveTo(resource.position.x, resource.position.y)
				.lineTo(connector.x, connector.y)
				.stroke({ width: 1.5, color: 0xffe082, alpha: 0.5 });
		}
	}
}
