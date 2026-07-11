import { Application, Container, Graphics } from "pixi.js";
import type { CityId } from "../cities";
import { BATTLEFIELD_MAP } from "../map/battlefield";
import type { MapDefinition } from "../map/types";
import { Camera } from "../shared/camera";
import {
	ATTACK_ARROW_BLINK_DURATION,
	ATTACK_ARROW_BLINK_HZ,
	ATTACK_ARROW_COLOR,
	BOARD_HEIGHT,
	BOARD_WIDTH,
	MOVE_ARROW_ALPHA,
	MOVE_ARROW_COLOR,
	PROJECTILE_COLOR,
	PROJECTILE_RADIUS,
	SELECTION_FILL_ALPHA,
	SELECTION_FILL_COLOR,
	SELECTION_STROKE_COLOR,
} from "../shared/config";
import type { GameState } from "../shared/game-state";
import type { DotId, Rect, Vec2 } from "../shared/types";
import type { Unit } from "../units";
import { type CityView, createCityView, syncCityView } from "./city-view";
import { createDotView, type DotView, syncDotView } from "./dot-view";
import {
	drawFormationPreview,
	type FormationPreview,
} from "./formation-preview";
import { createMapView } from "./map-view";
import { drawTerritory } from "./territory-view";

export type MarqueeView = Rect | null;

const EMPTY_GROUP_LABELS: ReadonlyMap<DotId, string> = new Map();

const ARROW_HEAD_LENGTH = 14;
const ARROW_HEAD_WIDTH = 8;

/**
 * Owns the Pixi app + stage. Draws state; never decides selection.
 */
export class Renderer {
	readonly app: Application;
	readonly canvas: HTMLCanvasElement;
	readonly map: MapDefinition;
	readonly camera: Camera;

	private readonly world: Container;
	private readonly mapLayer: Graphics;
	private readonly territoryGfx: Graphics;
	private readonly citiesLayer: Container;
	private readonly dotsLayer: Container;
	private readonly projectileGfx: Graphics;
	private readonly arrowGfx: Graphics;
	private readonly formationPreviewGfx: Graphics;
	private readonly marqueeGfx: Graphics;
	private readonly cityViews = new Map<CityId, CityView>();
	private readonly dotViews = new Map<DotId, DotView>();

	private constructor(app: Application, map: MapDefinition) {
		this.app = app;
		this.canvas = app.canvas;
		this.map = map;
		this.camera = new Camera();
		this.camera.setWorldSize(map.width, map.height);

		this.world = new Container();
		this.mapLayer = createMapView(map);
		this.territoryGfx = new Graphics();
		this.citiesLayer = new Container();
		this.dotsLayer = new Container();
		this.projectileGfx = new Graphics();
		this.arrowGfx = new Graphics();
		this.formationPreviewGfx = new Graphics();
		this.marqueeGfx = new Graphics();
		this.world.addChild(this.mapLayer);
		this.world.addChild(this.territoryGfx);
		this.world.addChild(this.citiesLayer);
		this.world.addChild(this.dotsLayer);
		this.world.addChild(this.projectileGfx);
		this.world.addChild(this.arrowGfx);
		this.world.addChild(this.formationPreviewGfx);
		this.world.addChild(this.marqueeGfx);
		app.stage.addChild(this.world);

		this.camera.zoom = 0.55;
		this.camera.centerOn(
			{ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
			app.screen.width,
			app.screen.height,
		);
		this.applyCamera();

		app.renderer.on("resize", () => {
			this.camera.setViewSize(app.screen.width, app.screen.height);
			this.applyCamera();
		});
	}

	static async create(
		host: HTMLElement,
		map: MapDefinition = BATTLEFIELD_MAP,
	): Promise<Renderer> {
		const app = new Application();
		await app.init({
			resizeTo: host,
			background: "#1a1f16",
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});
		host.appendChild(app.canvas);
		return new Renderer(app, map);
	}

	applyCamera(): void {
		this.world.position.set(this.camera.x, this.camera.y);
		this.world.scale.set(this.camera.zoom);
	}

	sync(
		state: GameState,
		marquee: MarqueeView,
		groupLabels?: ReadonlyMap<DotId, string>,
		formationPreview: FormationPreview | null = null,
		formationLabels?: ReadonlyMap<DotId, string>,
	): void {
		drawTerritory(this.territoryGfx, state.territory);
		this.syncCities(state);
		this.syncDots(
			state,
			groupLabels ?? EMPTY_GROUP_LABELS,
			formationLabels ?? EMPTY_GROUP_LABELS,
		);
		this.drawProjectiles(state);
		this.drawMoveArrows(state);
		drawFormationPreview(this.formationPreviewGfx, formationPreview);
		this.drawMarquee(marquee);
	}

	private syncCities(state: GameState): void {
		const seen = new Set<CityId>();

		for (const city of state.cities) {
			seen.add(city.id);
			let view = this.cityViews.get(city.id);
			if (view === undefined) {
				view = createCityView(city);
				this.cityViews.set(city.id, view);
				this.citiesLayer.addChild(view.root);
			} else {
				syncCityView(view, city);
			}
		}

		for (const [id, view] of this.cityViews) {
			if (!seen.has(id)) {
				this.citiesLayer.removeChild(view.root);
				view.root.destroy({ children: true });
				this.cityViews.delete(id);
			}
		}
	}

	private syncDots(
		state: GameState,
		groupLabels: ReadonlyMap<DotId, string>,
		formationLabels: ReadonlyMap<DotId, string>,
	): void {
		const seen = new Set<DotId>();

		for (const unit of state.units) {
			seen.add(unit.id);
			const groupLabel = groupLabels.get(unit.id) ?? "";
			const formationLabel = formationLabels.get(unit.id) ?? "";
			let view = this.dotViews.get(unit.id);
			if (view === undefined) {
				view = createDotView(unit);
				this.dotViews.set(unit.id, view);
				this.dotsLayer.addChild(view.root);
				syncDotView(view, unit, groupLabel, formationLabel);
			} else {
				syncDotView(view, unit, groupLabel, formationLabel);
			}
		}

		for (const [id, view] of this.dotViews) {
			if (!seen.has(id)) {
				this.dotsLayer.removeChild(view.root);
				view.root.destroy({ children: true });
				this.dotViews.delete(id);
			}
		}
	}

	private drawProjectiles(state: GameState): void {
		this.projectileGfx.clear();
		for (const projectile of state.projectiles) {
			this.projectileGfx
				.circle(projectile.position.x, projectile.position.y, PROJECTILE_RADIUS)
				.fill(PROJECTILE_COLOR);
		}
	}

	private drawMoveArrows(state: GameState): void {
		this.arrowGfx.clear();
		for (const unit of state.units) {
			if (unit.target === null) {
				continue;
			}
			const { color, alpha } = arrowStyle(unit);
			if (alpha <= 0.05) {
				continue;
			}
			drawArrow(this.arrowGfx, unit.position, unit.target, color, alpha);
		}
	}

	private drawMarquee(marquee: MarqueeView): void {
		this.marqueeGfx.clear();
		if (marquee === null) {
			return;
		}

		const left = Math.min(marquee.x, marquee.x + marquee.width);
		const top = Math.min(marquee.y, marquee.y + marquee.height);
		const width = Math.abs(marquee.width);
		const height = Math.abs(marquee.height);
		if (width === 0 || height === 0) {
			return;
		}

		this.marqueeGfx
			.rect(left, top, width, height)
			.fill({ color: SELECTION_FILL_COLOR, alpha: SELECTION_FILL_ALPHA })
			.stroke({ width: 1, color: SELECTION_STROKE_COLOR });
	}
}

function arrowStyle(unit: Unit): { color: number; alpha: number } {
	if (unit.orderKind !== "attack") {
		return { color: MOVE_ARROW_COLOR, alpha: MOVE_ARROW_ALPHA };
	}

	let alpha = MOVE_ARROW_ALPHA;
	if (unit.orderAge < ATTACK_ARROW_BLINK_DURATION) {
		// Hard blink for the first few seconds so attack orders read clearly.
		const phase = unit.orderAge * ATTACK_ARROW_BLINK_HZ;
		const on = phase % 1 < 0.55;
		alpha = on ? MOVE_ARROW_ALPHA : 0.12;
	}
	return { color: ATTACK_ARROW_COLOR, alpha };
}

function drawArrow(
	gfx: Graphics,
	from: Vec2,
	to: Vec2,
	color: number,
	alpha: number,
): void {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const len = Math.hypot(dx, dy);
	if (len < 1) {
		return;
	}

	const ux = dx / len;
	const uy = dy / len;
	const head = Math.min(ARROW_HEAD_LENGTH, len * 0.35);
	const baseX = to.x - ux * head;
	const baseY = to.y - uy * head;
	const px = -uy;
	const py = ux;

	gfx.moveTo(from.x, from.y);
	gfx.lineTo(baseX, baseY);
	gfx.stroke({ width: 2, color, alpha });

	gfx
		.poly([
			to.x,
			to.y,
			baseX + px * ARROW_HEAD_WIDTH,
			baseY + py * ARROW_HEAD_WIDTH,
			baseX - px * ARROW_HEAD_WIDTH,
			baseY - py * ARROW_HEAD_WIDTH,
		])
		.fill({ color, alpha });
}
