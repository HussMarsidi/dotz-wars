import { type City, orderProgress, type ProductionOrderId } from "../cities";
import { canAfford, goldOf, type TeamGold } from "../money";
import {
	CITY_PRODUCTION_QUEUE_CAP,
	LOCAL_TEAM,
	UNIT_COST,
	UNIT_TRAIN_TIME,
} from "../shared/config";
import type { UnitKind } from "../units";

const BUY_KINDS: readonly UnitKind[] = [
	"scout",
	"grunt",
	"archer",
	"diplomat",
	"tank",
];

function kindLabel(kind: UnitKind): string {
	switch (kind) {
		case "scout":
			return "Scout";
		case "grunt":
			return "Grunt";
		case "archer":
			return "Archer";
		case "diplomat":
			return "Diplomat";
		case "tank":
			return "Tank";
		default: {
			const _exhaustive: never = kind;
			return _exhaustive;
		}
	}
}

export type CityMenuHandlers = {
	readonly onBuy: (kind: UnitKind) => void;
	readonly onCancel: (orderId: ProductionOrderId) => void;
	readonly onClose: () => void;
};

export type CityMenuController = {
	readonly sync: (options: {
		readonly visible: boolean;
		readonly city: City | null;
		readonly gold: TeamGold;
	}) => void;
	readonly hide: () => void;
	readonly isOpen: () => boolean;
	readonly destroy: () => void;
};

/**
 * DOM overlay for buying units at a selected owned city.
 * Queue progress lives here only — not drawn on the city in-world.
 */
export function mountCityMenu(
	host: HTMLElement,
	handlers: CityMenuHandlers,
): CityMenuController {
	const panel = document.createElement("div");
	panel.className = "city-menu";
	panel.hidden = true;

	const title = document.createElement("div");
	title.className = "city-menu__title";
	title.textContent = "City";

	const status = document.createElement("div");
	status.className = "city-menu__status";

	const buyRow = document.createElement("div");
	buyRow.className = "city-menu__row";

	const buyButtons = new Map<UnitKind, HTMLButtonElement>();
	for (const kind of BUY_KINDS) {
		const button = document.createElement("button");
		button.type = "button";
		button.dataset.kind = kind;
		button.addEventListener("click", () => {
			if (button.disabled) {
				return;
			}
			handlers.onBuy(kind);
		});
		buyButtons.set(kind, button);
		buyRow.appendChild(button);
	}

	const queueTitle = document.createElement("div");
	queueTitle.className = "city-menu__subtitle";
	queueTitle.textContent = "Queue";

	const queueList = document.createElement("div");
	queueList.className = "city-menu__queue";

	const closeBtn = document.createElement("button");
	closeBtn.type = "button";
	closeBtn.textContent = "Close";
	closeBtn.addEventListener("click", () => handlers.onClose());

	const actionsRow = document.createElement("div");
	actionsRow.className = "city-menu__row";
	actionsRow.appendChild(closeBtn);

	panel.append(title, status, buyRow, queueTitle, queueList, actionsRow);
	host.appendChild(panel);

	return {
		sync({ visible, city, gold }) {
			if (!visible || city === null) {
				panel.hidden = true;
				return;
			}

			title.textContent = `City ${city.label}`;
			status.textContent = `Queue ${city.queue.length}/${CITY_PRODUCTION_QUEUE_CAP}`;

			const balance = goldOf(gold, LOCAL_TEAM);
			const queueFull = city.queue.length >= CITY_PRODUCTION_QUEUE_CAP;

			for (const [kind, button] of buyButtons) {
				const cost = UNIT_COST[kind];
				const time = UNIT_TRAIN_TIME[kind];
				button.textContent = `${kindLabel(kind)} · ${cost}g · ${time}s`;
				button.disabled = queueFull || !canAfford(gold, LOCAL_TEAM, cost);
				button.title = button.disabled
					? queueFull
						? "Queue full"
						: `Need ${cost}g (have ${balance})`
					: `Train ${kindLabel(kind)}`;
			}

			queueList.replaceChildren();
			if (city.queue.length === 0) {
				const empty = document.createElement("div");
				empty.className = "city-menu__queue-empty";
				empty.textContent = "No units training";
				queueList.appendChild(empty);
			} else {
				for (const order of city.queue) {
					const row = document.createElement("div");
					row.className = "city-menu__queue-item";

					const label = document.createElement("div");
					label.className = "city-menu__queue-label";
					const progress = orderProgress(order);
					const remaining = Math.max(0, order.trainTime - order.elapsed);
					label.textContent = `${kindLabel(order.kind)} · ${Math.round(progress * 100)}% · ${remaining.toFixed(1)}s`;

					const bar = document.createElement("div");
					bar.className = "city-menu__queue-bar";
					const fill = document.createElement("div");
					fill.className = "city-menu__queue-bar-fill";
					fill.style.width = `${progress * 100}%`;
					bar.appendChild(fill);

					const cancel = document.createElement("button");
					cancel.type = "button";
					cancel.textContent = "Cancel";
					cancel.addEventListener("click", () => handlers.onCancel(order.id));

					row.append(label, bar, cancel);
					queueList.appendChild(row);
				}
			}

			panel.hidden = false;
		},
		hide() {
			panel.hidden = true;
		},
		isOpen() {
			return !panel.hidden;
		},
		destroy() {
			panel.remove();
		},
	};
}
