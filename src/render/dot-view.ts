import { Container, Graphics, Text } from "pixi.js";
import {
	ATTACK_ANIM_DURATION,
	DOT_RADIUS,
	FORMATION_BADGE_COLOR,
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
	MORALE_BAR_COLOR,
	MORALE_BAR_GAP,
	MORALE_BAR_LOW,
	ROUTING_TINT,
	ENCIRCLED_RING_COLOR,
	ENCIRCLED_RING_WIDTH,
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
	diplomat: "D",
};

export type DotView = {
	readonly root: Container;
	readonly body: Graphics;
	readonly fx: Graphics;
	readonly hpBar: Graphics;
	readonly label: Text;
	readonly groupBadge: Text;
	readonly formationBadge: Text;
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
	const groupBadge = new Text({
		text: "",
		style: {
			fontFamily: "ui-sans-serif, system-ui, sans-serif",
			fontSize: 9,
			fontWeight: "700",
			fill: 0xfff59d,
			align: "left",
			stroke: { color: 0x000000, width: 2 },
		},
	});
	groupBadge.anchor.set(0.5, 1);
	groupBadge.visible = false;
	const formationBadge = new Text({
		text: "",
		style: {
			fontFamily: "ui-sans-serif, system-ui, sans-serif",
			fontSize: 9,
			fontWeight: "700",
			fill: FORMATION_BADGE_COLOR,
			align: "right",
			stroke: { color: 0x000000, width: 2 },
		},
	});
	formationBadge.anchor.set(0.5, 1);
	formationBadge.visible = false;
	root.addChild(body);
	root.addChild(fx);
	root.addChild(hpBar);
	root.addChild(label);
	root.addChild(groupBadge);
	root.addChild(formationBadge);
	const view = { root, body, fx, hpBar, label, groupBadge, formationBadge };
	syncDotView(view, unit);
	return view;
}

export function syncDotView(
	view: DotView,
	unit: Unit,
	groupLabel = "",
	formationLabel = "",
	encircled = false,
): void {
	const baseColor =
		unit.state === "routing"
			? mixColor(TEAM_COLORS[unit.teamId], ROUTING_TINT, 0.55)
			: TEAM_COLORS[unit.teamId];
	const fill =
		unit.hitFlash > 0
			? mixColor(baseColor, 0xffffff, unit.hitFlash / HIT_FLASH_DURATION)
			: baseColor;

	const lunge = meleeLungeOffset(unit);

	view.body.clear();
	view.body.circle(lunge.x, lunge.y, DOT_RADIUS).fill(fill);
	if (unit.selected) {
		view.body.circle(lunge.x, lunge.y, DOT_RADIUS).stroke({
			width: SELECTION_RING_WIDTH,
			color: SELECTION_RING_COLOR,
		});
	}
	if (encircled) {
		view.body.circle(lunge.x, lunge.y, DOT_RADIUS + 3).stroke({
			width: ENCIRCLED_RING_WIDTH,
			color: ENCIRCLED_RING_COLOR,
			alpha: 0.9,
		});
	}
	if (unit.state === "routing") {
		view.body.alpha = 0.85;
	} else {
		view.body.alpha = 1;
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

	if (groupLabel.length > 0) {
		view.groupBadge.text = groupLabel;
		view.groupBadge.visible = true;
		view.groupBadge.position.set(
			lunge.x - DOT_RADIUS + 2,
			lunge.y - DOT_RADIUS + 1,
		);
	} else {
		view.groupBadge.text = "";
		view.groupBadge.visible = false;
	}

	if (formationLabel.length > 0) {
		view.formationBadge.text = formationLabel;
		view.formationBadge.visible = true;
		view.formationBadge.position.set(
			lunge.x + DOT_RADIUS - 2,
			lunge.y - DOT_RADIUS + 1,
		);
	} else {
		view.formationBadge.text = "";
		view.formationBadge.visible = false;
	}

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
	const x = -HP_BAR_WIDTH / 2;
	const hpY = HP_BAR_OFFSET_Y;
	const moraleY = hpY + HP_BAR_HEIGHT + MORALE_BAR_GAP;

	const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
	gfx.rect(x, hpY, HP_BAR_WIDTH, HP_BAR_HEIGHT).fill(HP_BAR_BG);
	const hpFill =
		hpRatio > 0.5 ? HP_BAR_HIGH : hpRatio > 0.25 ? HP_BAR_MID : HP_BAR_LOW;
	if (hpRatio > 0) {
		gfx.rect(x, hpY, HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT).fill(hpFill);
	}

	const moraleRatio = Math.max(0, Math.min(1, unit.morale / unit.maxMorale));
	gfx.rect(x, moraleY, HP_BAR_WIDTH, HP_BAR_HEIGHT).fill(HP_BAR_BG);
	const moraleFill = moraleRatio > 0.35 ? MORALE_BAR_COLOR : MORALE_BAR_LOW;
	if (moraleRatio > 0) {
		gfx
			.rect(x, moraleY, HP_BAR_WIDTH * moraleRatio, HP_BAR_HEIGHT)
			.fill(moraleFill);
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
