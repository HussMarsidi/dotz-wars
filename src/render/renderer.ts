import { Application, Container, Graphics } from "pixi.js";
import { BATTLEFIELD_MAP } from "../map/battlefield";
import type { MapDefinition } from "../map/types";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	MOVE_ARROW_ALPHA,
	MOVE_ARROW_COLOR,
	SELECTION_FILL_ALPHA,
	SELECTION_FILL_COLOR,
	SELECTION_STROKE_COLOR,
} from "../shared/config";
import type { Dot, DotId, GameState, Rect, Vec2 } from "../shared/types";
import { createDotView, syncDotView } from "./dot-view";
import { createMapView } from "./map-view";

export type MarqueeView = Rect | null;

const ARROW_HEAD_LENGTH = 14;
const ARROW_HEAD_WIDTH = 8;

/**
 * Owns the Pixi app + stage. Draws state; never decides selection.
 */
export class Renderer {
	readonly app: Application;
	readonly canvas: HTMLCanvasElement;
	readonly map: MapDefinition;

	private readonly mapLayer: Graphics;
	private readonly dotsLayer: Container;
	private readonly arrowGfx: Graphics;
	private readonly marqueeGfx: Graphics;
	private readonly dotViews = new Map<DotId, Graphics>();

	private constructor(app: Application, map: MapDefinition) {
		this.app = app;
		this.canvas = app.canvas;
		this.map = map;

		this.mapLayer = createMapView(map);
		this.dotsLayer = new Container();
		this.arrowGfx = new Graphics();
		this.marqueeGfx = new Graphics();
		app.stage.addChild(this.mapLayer);
		app.stage.addChild(this.dotsLayer);
		app.stage.addChild(this.arrowGfx);
		app.stage.addChild(this.marqueeGfx);
	}

	static async create(
		host: HTMLElement,
		map: MapDefinition = BATTLEFIELD_MAP,
	): Promise<Renderer> {
		const app = new Application();
		await app.init({
			width: BOARD_WIDTH,
			height: BOARD_HEIGHT,
			background: "#4a7c3f",
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});
		host.appendChild(app.canvas);
		return new Renderer(app, map);
	}

	sync(state: GameState, marquee: MarqueeView): void {
		const seen = new Set<DotId>();

		for (const dot of state.dots) {
			seen.add(dot.id);
			let view = this.dotViews.get(dot.id);
			if (view === undefined) {
				view = createDotView(dot);
				this.dotViews.set(dot.id, view);
				this.dotsLayer.addChild(view);
			} else {
				syncDotView(view, dot);
			}
		}

		for (const [id, view] of this.dotViews) {
			if (!seen.has(id)) {
				this.dotsLayer.removeChild(view);
				view.destroy();
				this.dotViews.delete(id);
			}
		}

		this.drawMoveArrows(state.dots);
		this.drawMarquee(marquee);
	}

	private drawMoveArrows(dots: readonly Dot[]): void {
		this.arrowGfx.clear();
		for (const dot of dots) {
			if (dot.target === null) {
				continue;
			}
			drawArrow(
				this.arrowGfx,
				dot.position,
				dot.target,
				MOVE_ARROW_COLOR,
				MOVE_ARROW_ALPHA,
			);
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
