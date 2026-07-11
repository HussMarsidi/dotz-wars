import { Container, Graphics, Text } from "pixi.js";
import {
	ATTACK_ANIM_DURATION,
	DOT_RADIUS,
	HIT_FLASH_DURATION,
	HP_BAR_BG,
	HP_BAR_HEIGHT,
	HP_BAR_HIGH,
	HP_BAR_LOW,
	HP_BAR_MID,
	HP_BAR_OFFSET_Y,
	HP_BAR_WIDTH,
	MELEE_LUNGE_DISTANCE,
	MELEE_SLASH_COLOR,
	SELECTION_RING_COLOR,
	SELECTION_RING_WIDTH,
	TEAM_COLORS,
	UNIT_LABEL_COLOR,
} from "../shared/config";
import type { Unit, UnitKind } from "../units";

const UNIT_LETTER: Record<UnitKind, string> = {
	grunt: "G",
	archer: "A",
	tank: "T",
	scout: "S",
	mage: "M",
};

export type DotView = {
	readonly root: Container;
	readonly body: Graphics;
	readonly fx: Graphics;
	readonly hpBar: Graphics;
	readonly label: Text;
};

/** Maps a sim unit → a view container. Render-only; never mutates sim. */
export function createDotView(unit: Unit): DotView {
	const root = new Container();
	const body = new Graphics();
	const fx = new Graphics();
	const hpBar = new Graphics();
	const label = new Text({
		text: UNIT_LETTER[unit.kind],
		style: {
			fontFamily: "ui-sans-serif, system-ui, sans-serif",
			fontSize: 11,
			fontWeight: "700",
			fill: UNIT_LABEL_COLOR,
			align: "center",
		},
	});
	label.anchor.set(0.5);
	root.addChild(body);
	root.addChild(fx);
	root.addChild(hpBar);
	root.addChild(label);
	const view = { root, body, fx, hpBar, label };
	syncDotView(view, unit);
	return view;
}

export function syncDotView(view: DotView, unit: Unit): void {
	const fill =
		unit.hitFlash > 0
			? mixColor(
					TEAM_COLORS[unit.teamId],
					0xffffff,
					unit.hitFlash / HIT_FLASH_DURATION,
				)
			: TEAM_COLORS[unit.teamId];

	const lunge = meleeLungeOffset(unit);

	view.body.clear();
	view.body.circle(lunge.x, lunge.y, DOT_RADIUS).fill(fill);
	if (unit.selected) {
		view.body.circle(lunge.x, lunge.y, DOT_RADIUS).stroke({
			width: SELECTION_RING_WIDTH,
			color: SELECTION_RING_COLOR,
		});
	}

	view.fx.clear();
	if (
		unit.combatMode === "melee" &&
		unit.attackAnim > 0 &&
		unit.attackDir !== null
	) {
		drawMeleeSlash(view.fx, unit, lunge);
	}

	drawHpBar(view.hpBar, unit);
	view.label.position.set(lunge.x, lunge.y);
	view.root.position.set(unit.position.x, unit.position.y);
}

function meleeLungeOffset(unit: Unit): { x: number; y: number } {
	if (
		unit.combatMode !== "melee" ||
		unit.attackAnim <= 0 ||
		unit.attackDir === null
	) {
		return { x: 0, y: 0 };
	}
	const progress = 1 - unit.attackAnim / ATTACK_ANIM_DURATION;
	const amount = Math.sin(progress * Math.PI) * MELEE_LUNGE_DISTANCE;
	return {
		x: unit.attackDir.x * amount,
		y: unit.attackDir.y * amount,
	};
}

function drawMeleeSlash(
	gfx: Graphics,
	unit: Unit,
	lunge: { x: number; y: number },
): void {
	if (unit.attackDir === null) {
		return;
	}
	const progress = 1 - unit.attackAnim / ATTACK_ANIM_DURATION;
	const alpha = 0.9 * (1 - progress);
	const reach = DOT_RADIUS + 14;
	const px = -unit.attackDir.y;
	const py = unit.attackDir.x;
	const tipX = lunge.x + unit.attackDir.x * reach;
	const tipY = lunge.y + unit.attackDir.y * reach;
	const sweep = 10 * (1 - progress);

	gfx
		.moveTo(lunge.x + px * sweep, lunge.y + py * sweep)
		.lineTo(tipX, tipY)
		.lineTo(lunge.x - px * sweep, lunge.y - py * sweep)
		.stroke({ width: 2.5, color: MELEE_SLASH_COLOR, alpha });
}

function drawHpBar(gfx: Graphics, unit: Unit): void {
	gfx.clear();
	const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
	const x = -HP_BAR_WIDTH / 2;
	const y = HP_BAR_OFFSET_Y;
	gfx.rect(x, y, HP_BAR_WIDTH, HP_BAR_HEIGHT).fill(HP_BAR_BG);
	const fill =
		ratio > 0.5 ? HP_BAR_HIGH : ratio > 0.25 ? HP_BAR_MID : HP_BAR_LOW;
	if (ratio > 0) {
		gfx.rect(x, y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT).fill(fill);
	}
}

function mixColor(a: number, b: number, t: number): number {
	const clamped = Math.max(0, Math.min(1, t));
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * clamped);
	const g = Math.round(ag + (bg - ag) * clamped);
	const bl = Math.round(ab + (bb - ab) * clamped);
	return (r << 16) | (g << 8) | bl;
}
