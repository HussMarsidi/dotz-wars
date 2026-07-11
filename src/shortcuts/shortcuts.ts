/**
 * Central shortcut registry — add bindings here to keep keys easy to audit.
 * Keys are lowercase `KeyboardEvent.key` values.
 */

export type ShortcutAction = "setSelectMode" | "setPanMode" | "clearSelection";

export type ShortcutBinding = {
	readonly key: string;
	readonly action: ShortcutAction;
	readonly label: string;
};

export const SHORTCUT_BINDINGS: readonly ShortcutBinding[] = [
	{ key: "a", action: "setSelectMode", label: "Select" },
	{ key: "s", action: "setPanMode", label: "Drag" },
	{ key: "escape", action: "clearSelection", label: "Deselect" },
] as const;

export type ShortcutHandlers = {
	readonly [K in ShortcutAction]: () => void;
};

/** Listen for registered shortcuts. Ignores events from editable fields. */
export function attachShortcuts(handlers: ShortcutHandlers): () => void {
	const byKey = new Map(
		SHORTCUT_BINDINGS.map((binding) => [binding.key, binding.action]),
	);

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable)
		) {
			return;
		}

		const action = byKey.get(event.key.toLowerCase());
		if (action === undefined) {
			return;
		}
		event.preventDefault();
		handlers[action]();
	};

	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}
