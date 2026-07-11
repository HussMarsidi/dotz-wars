export { facingRight, formationSlots, normalizeFacing } from "./layout";
export {
	formationCentroid,
	formationMinSpeed,
	issueFormationMove,
	soleSelectedFormation,
	tickFormationMarches,
} from "./orders";
export {
	createFormationRegistry,
	type FormationRegistry,
	selectionHasFormation,
} from "./registry";
export { expandSelectionToFormations, selectedUnitIds } from "./selection";
export {
	FORMATION_SHAPES,
	type Formation,
	type FormationId,
	type FormationMarch,
	type FormationShape,
	formationShapeLabel,
	formationShapeLetter,
	spacingForShape,
} from "./types";
