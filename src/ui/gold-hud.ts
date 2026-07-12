import { goldOf, netIncomeRate } from "../money";
import type { MapDefinition } from "../map/types";
import { LOCAL_TEAM } from "../shared/config";
import type { GameState } from "../shared/game-state";

export type GoldHudController = {
	readonly sync: (state: GameState, map: MapDefinition) => void;
	readonly destroy: () => void;
};

/**
 * Top-left gold readout for the local player team (+ net income/sec).
 */
export function mountGoldHud(host: HTMLElement): GoldHudController {
	const el = document.createElement("div");
	el.className = "gold-hud";
	el.setAttribute("aria-live", "polite");
	host.appendChild(el);

	const sync = (state: GameState, map: MapDefinition) => {
		const gold = goldOf(state.gold, LOCAL_TEAM);
		const net = netIncomeRate(
			state.cities,
			state.units,
			map.resources,
			state.territory,
			LOCAL_TEAM,
		);
		const sign = net >= 0 ? "+" : "";
		el.textContent = `Gold: ${Math.floor(gold)} (${sign}${net.toFixed(1)}/s)`;
	};

	return {
		sync,
		destroy: () => {
			el.remove();
		},
	};
}
