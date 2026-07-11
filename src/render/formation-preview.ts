import type { Graphics } from "pixi.js";
import { formationSlots } from "../formation/layout";
import type { FormationShape } from "../formation/types";
import {
	DOT_RADIUS,
	FORMATION_FACING_COLOR,
	FORMATION_PREVIEW_ALPHA,
	FORMATION_PREVIEW_COLOR,
} from "../shared/config";
import type { Vec2 } from "../shared/types";

export type FormationPreview = {
	readonly shape: FormationShape;
	readonly count: number;
	readonly spacing: number;
	readonly anchor: Vec2;
	readonly facing: Vec2;
};

export function drawFormationPreview(
	gfx: Graphics,
	preview: FormationPreview | null,
): void {
	gfx.clear();
	if (preview === null) {
		return;
	}

	const slots = formationSlots(
		preview.shape,
		preview.count,
		preview.spacing,
		preview.anchor,
		preview.facing,
	);

	for (const slot of slots) {
		gfx.circle(slot.x, slot.y, DOT_RADIUS).stroke({
			width: 2,
			color: FORMATION_PREVIEW_COLOR,
			alpha: FORMATION_PREVIEW_ALPHA,
		});
	}

	const tip = {
		x: preview.anchor.x + preview.facing.x * (DOT_RADIUS * 3),
		y: preview.anchor.y + preview.facing.y * (DOT_RADIUS * 3),
	};
	gfx.moveTo(preview.anchor.x, preview.anchor.y).lineTo(tip.x, tip.y).stroke({
		width: 2,
		color: FORMATION_FACING_COLOR,
		alpha: FORMATION_PREVIEW_ALPHA,
	});
}
