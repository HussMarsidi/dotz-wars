import { BOARD_HEIGHT, BOARD_WIDTH } from "../shared/config";
import type { MapDefinition } from "./types";

/**
 * Default battlefield: green land with a few light-blue water bodies.
 * Procedural shapes (not a grid) — enough for walkability + look.
 */
export const BATTLEFIELD_MAP: MapDefinition = {
	id: "battlefield",
	width: BOARD_WIDTH,
	height: BOARD_HEIGHT,
	water: [
		// Wide river / inlet across the lower-left
		{
			kind: "ellipse",
			center: { x: 180, y: 420 },
			radiusX: 220,
			radiusY: 70,
		},
		// Lake on the right
		{
			kind: "ellipse",
			center: { x: 620, y: 180 },
			radiusX: 110,
			radiusY: 90,
		},
		// Small pond near bottom-right
		{
			kind: "ellipse",
			center: { x: 520, y: 480 },
			radiusX: 55,
			radiusY: 40,
		},
	],
};
