import { FORMATION_SPACING_BY_SHAPE } from "../shared/config";
import type { DotId, Vec2 } from "../shared/types";

export type FormationShape = "line" | "wedge" | "column" | "box";

export type FormationId = string;

/** Shared march of the formation anchor — members stay locked to slots. */
export type FormationMarch = {
	readonly anchor: Vec2;
	readonly target: Vec2;
	/** Remaining waypoints for the anchor (includes final target). */
	readonly path: readonly Vec2[];
	readonly facing: Vec2;
};

export type Formation = {
	readonly id: FormationId;
	readonly shape: FormationShape;
	readonly spacing: number;
	/** Unit forward vector (world space). */
	readonly facing: Vec2;
	readonly memberIds: readonly DotId[];
	readonly march: FormationMarch | null;
};

export const FORMATION_SHAPES: readonly FormationShape[] = [
	"line",
	"wedge",
	"column",
	"box",
] as const;

export function formationShapeLabel(shape: FormationShape): string {
	switch (shape) {
		case "line":
			return "Line";
		case "wedge":
			return "Wedge";
		case "column":
			return "Column";
		case "box":
			return "Box";
		default: {
			const _exhaustive: never = shape;
			return _exhaustive;
		}
	}
}

export function formationShapeLetter(shape: FormationShape): string {
	switch (shape) {
		case "line":
			return "L";
		case "wedge":
			return "W";
		case "column":
			return "C";
		case "box":
			return "B";
		default: {
			const _exhaustive: never = shape;
			return _exhaustive;
		}
	}
}

export function spacingForShape(shape: FormationShape): number {
	return FORMATION_SPACING_BY_SHAPE[shape];
}
