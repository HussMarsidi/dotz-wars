import type { Vec2 } from "../shared/types";
import type { FormationShape } from "./types";

/** Normalize; default faces +x if zero-length. */
export function normalizeFacing(facing: Vec2): Vec2 {
	const len = Math.hypot(facing.x, facing.y);
	if (len < 1e-6) {
		return { x: 1, y: 0 };
	}
	return { x: facing.x / len, y: facing.y / len };
}

/** Perpendicular "right" relative to facing (y-down world). */
export function facingRight(facing: Vec2): Vec2 {
	return { x: -facing.y, y: facing.x };
}

function localOffsets(
	shape: FormationShape,
	count: number,
	spacing: number,
): Vec2[] {
	if (count <= 0) {
		return [];
	}

	switch (shape) {
		case "line":
			return lineOffsets(count, spacing);
		case "column":
			return columnOffsets(count, spacing);
		case "wedge":
			return wedgeOffsets(count, spacing);
		case "box":
			return boxOffsets(count, spacing);
		default: {
			const _exhaustive: never = shape;
			return _exhaustive;
		}
	}
}

/** Horizontal rank perpendicular to facing, centered on anchor. */
function lineOffsets(count: number, spacing: number): Vec2[] {
	const mid = (count - 1) / 2;
	const out: Vec2[] = [];
	for (let i = 0; i < count; i++) {
		out.push({ x: (i - mid) * spacing, y: 0 });
	}
	return out;
}

/** File along facing: index 0 at front (anchor), others behind. */
function columnOffsets(count: number, spacing: number): Vec2[] {
	const out: Vec2[] = [];
	for (let i = 0; i < count; i++) {
		out.push({ x: 0, y: -i * spacing });
	}
	return out;
}

/**
 * Tip at front; then alternating left/right ranks stepping back.
 * Local +y = forward before rotation into world facing.
 */
function wedgeOffsets(count: number, spacing: number): Vec2[] {
	const out: Vec2[] = [{ x: 0, y: 0 }];
	for (let i = 1; i < count; i++) {
		const rank = Math.ceil(i / 2);
		const side = i % 2 === 1 ? -1 : 1;
		out.push({ x: side * rank * spacing, y: -rank * spacing });
	}
	return out;
}

/** Rough square grid; front row toward +y local (facing). */
function boxOffsets(count: number, spacing: number): Vec2[] {
	const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
	const rows = Math.max(1, Math.ceil(count / cols));
	const out: Vec2[] = [];
	let i = 0;
	for (let row = 0; row < rows && i < count; row++) {
		const inRow = Math.min(cols, count - i);
		const mid = (inRow - 1) / 2;
		for (let col = 0; col < inRow; col++) {
			out.push({
				x: (col - mid) * spacing,
				y: -row * spacing,
			});
			i++;
		}
	}
	return out;
}

/**
 * World-space slot positions.
 * Local layout: +y = forward, +x = right; then rotated so +y aligns with `facing`.
 */
export function formationSlots(
	shape: FormationShape,
	count: number,
	spacing: number,
	anchor: Vec2,
	facing: Vec2,
): Vec2[] {
	const forward = normalizeFacing(facing);
	const right = facingRight(forward);
	const locals = localOffsets(shape, count, spacing);
	return locals.map((local) => ({
		x: anchor.x + right.x * local.x + forward.x * local.y,
		y: anchor.y + right.y * local.x + forward.y * local.y,
	}));
}
