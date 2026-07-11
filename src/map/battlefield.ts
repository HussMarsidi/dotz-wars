import { BOARD_HEIGHT, BOARD_WIDTH } from "../shared/config";
import type { MapDefinition } from "./types";

/**
 * Large battlefield with lakes, forests, and mountain ranges.
 * Procedural ellipses (not a grid). Overlaps resolve by priority in terrain.ts.
 */
export const BATTLEFIELD_MAP: MapDefinition = {
	id: "battlefield",
	width: BOARD_WIDTH,
	height: BOARD_HEIGHT,
	regions: [
		// --- forests ---
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 420, y: 380 },
			radiusX: 280,
			radiusY: 200,
		},
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 1900, y: 500 },
			radiusX: 260,
			radiusY: 220,
		},
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 1100, y: 1280 },
			radiusX: 320,
			radiusY: 160,
		},
		{
			terrain: "forest",
			shape: "ellipse",
			center: { x: 700, y: 1100 },
			radiusX: 180,
			radiusY: 140,
		},
		// --- mountains ---
		{
			terrain: "mountain",
			shape: "ellipse",
			center: { x: 1500, y: 320 },
			radiusX: 240,
			radiusY: 150,
		},
		{
			terrain: "mountain",
			shape: "ellipse",
			center: { x: 1680, y: 480 },
			radiusX: 160,
			radiusY: 120,
		},
		{
			terrain: "mountain",
			shape: "ellipse",
			center: { x: 380, y: 1280 },
			radiusX: 200,
			radiusY: 130,
		},
		{
			terrain: "mountain",
			shape: "ellipse",
			center: { x: 2050, y: 1200 },
			radiusX: 180,
			radiusY: 160,
		},
		// --- water ---
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 320, y: 700 },
			radiusX: 260,
			radiusY: 90,
		},
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 600, y: 740 },
			radiusX: 200,
			radiusY: 70,
		},
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 1400, y: 900 },
			radiusX: 180,
			radiusY: 140,
		},
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 2100, y: 280 },
			radiusX: 140,
			radiusY: 110,
		},
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 900, y: 200 },
			radiusX: 120,
			radiusY: 80,
		},
		{
			terrain: "water",
			shape: "ellipse",
			center: { x: 1750, y: 1400 },
			radiusX: 220,
			radiusY: 80,
		},
	],
};
