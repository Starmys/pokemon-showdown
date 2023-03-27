export const Conditions: {[k: string]: ModdedConditionData} = {
	arceus: {
		inherit: true,
		onType(types, pokemon) {
			if (pokemon.transformed || pokemon.ability !== 'multitype' && this.gen >= 8) return types;
			let arcType: string | undefined = 'Normal';
			if (pokemon.ability === 'multitype') {
				arcType = pokemon.getItem().onPlate;
				if (!arcType) {
					arcType = 'Normal';
				}
			}
			let otherType = arcType;
			let otherSlot = 0;
			if (pokemon.m.headSpecies && pokemon.m.headSpecies.baseSpecies !== 'Arceus') otherType = pokemon.m.headSpecies.types[0];
			if (pokemon.m.bodySpecies && pokemon.m.bodySpecies.baseSpecies !== 'Arceus') {
				otherType = pokemon.m.bodySpecies.types[1] || pokemon.m.bodySpecies.types[0];
				otherSlot = 1;
			}
			if (arcType === otherType) return [arcType];
			if (otherSlot === 0) return [otherType, arcType];
			return [arcType, otherType];
		},
	},
	silvally: {
		inherit: true,
		onType(types, pokemon) {
			if (pokemon.transformed || pokemon.ability !== 'rkssystem' && this.gen >= 8) return types;
			let silType: string | undefined = 'Normal';
			if (pokemon.ability === 'rkssystem') {
				silType = pokemon.getItem().onMemory;
				if (!silType) {
					silType = 'Normal';
				}
			}
			let otherType = silType;
			let otherSlot = 0;
			if (pokemon.m.headSpecies && pokemon.m.headSpecies.baseSpecies !== 'Silvally') otherType = pokemon.m.headSpecies.types[0];
			if (pokemon.m.bodySpecies && pokemon.m.bodySpecies.baseSpecies !== 'Silvally') {
				otherType = pokemon.m.bodySpecies.types[1] || pokemon.m.bodySpecies.types[0];
				otherSlot = 1;
			}
			if (silType === otherType) return [silType];
			if (otherSlot === 0) return [otherType, silType];
			return [silType, otherType];
		},
	},
};
