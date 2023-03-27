import { Abilities } from "../../abilities";

export const Pokedex: {[k: string]: ModdedSpeciesData} = {
	/*
	// Example
	id: {
		inherit: true, // Always use this, makes the pokemon inherit its default values from the parent mod (gen7)
		baseStats: {hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100}, // the base stats for the pokemon
	},
	*/
	// ACakeWearingAHat
	shop: {
		num:1000,
		name: "Shop",
		types: ["Normal"],
		abilities: {	0: "Illuminate" },
		baseStats: { hp: 1, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
		heightm: 0.3,
		weightkg: 2,
		eggGroups: ["Undiscovered"],
	},
	spearow: {
		inherit: true,
		types: ["Dark", "Flying"],

	},
	fearow: {
		inherit: true,
		types: ["Dark", "Flying"],
		
	},
	ekans: {
		inherit: true,
		types:["Dark","Poison"],
	},
	arbok: {
		inherit: true,
		types: ["Dark", "Poison"],
	},
	psyduck: {
		inherit: true,
		types: ["Water", "Psychic"],
	},
	golduck: {
		inherit: true,
		types: ["Water", "Psychic"],
	},
	kricketune: {
		inherit: true,
		abilities: {0: "bugtohero", H: "Technician"},
	},
	kricketunehero: {
		num: 401,
		name: "Kricketune-Hero",
		baseSpecies: "kricketune",
		forme: "Hero",
		types: ["Bug"],
		baseStats: {hp: 77, atk: 160, def: 97, spa: 119, spd: 97, spe: 100},
		abilities: {0: "bugtohero"},
		heightm: 1,
		weightkg: 25.5,
		color: "Red",
		evos: ["Kricketune"],
		eggGroups: ["Bug"],
		requiredAbility: "Bug to Hero",
		battleOnly: "kricketune",
	},

};
