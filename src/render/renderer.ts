import { Application, Container, Graphics } from "pixi.js";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	SELECTION_FILL_ALPHA,
	SELECTION_FILL_COLOR,
	SELECTION_STROKE_COLOR,
} from "../shared/config";
import type { DotId, GameState, Rect } from "../shared/types";
import { createDotView, syncDotView } from "./dot-view";

export type MarqueeView = Rect | null;

/**
 * Owns the Pixi app + stage. Draws state; never decides selection.
 */
export class Renderer {
	readonly app: Application;
	readonly canvas: HTMLCanvasElement;

	private readonly dotsLayer: Container;
	private readonly marqueeGfx: Graphics;
	private readonly dotViews = new Map<DotId, Graphics>();

	private constructor(app: Application) {
		this.app = app;
		this.canvas = app.canvas;

		this.dotsLayer = new Container();
		this.marqueeGfx = new Graphics();
		app.stage.addChild(this.dotsLayer);
		app.stage.addChild(this.marqueeGfx);
	}

	static async create(host: HTMLElement): Promise<Renderer> {
		const app = new Application();
		await app.init({
			width: BOARD_WIDTH,
			height: BOARD_HEIGHT,
			background: "#111111",
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});
		host.appendChild(app.canvas);
		return new Renderer(app);
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

		this.drawMarquee(marquee);
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
