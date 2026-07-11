import type { TeamGold } from "../money";
import { goldOf } from "../money";
import { LOCAL_TEAM } from "../shared/config";

export type GoldHudController = {
	readonly sync: (gold: TeamGold) => void;
	readonly destroy: () => void;
};

/**
 * Top-left gold readout for the local player team.
 */
export function mountGoldHud(host: HTMLElement): GoldHudController {
	const el = document.createElement("div");
	el.className = "gold-hud";
	el.setAttribute("aria-live", "polite");
	host.appendChild(el);

	const sync = (gold: TeamGold) => {
		el.textContent = `Gold: ${goldOf(gold, LOCAL_TEAM)}`;
	};

	return {
		sync,
		destroy: () => {
			el.remove();
		},
	};
}
