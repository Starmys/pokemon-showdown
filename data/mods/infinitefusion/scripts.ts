export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		for (const id in this.data.Learnsets) {
			this.modData('Learnsets', id).eventOnly = false;
		}
		for (const id in this.data.Items) {
			const item = this.data.Items[id];
			if (item.onPlate) {
				this.modData('Items', id).onTakeItem = function (item: Item, pokemon: Pokemon, source: Pokemon) {
					const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
					const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
					if (sourceNums.includes(493) || pokemonNums.includes(493)) {
						return false;
					}
					return true;
				}
			}
			if (item.onDrive) {
				this.modData('Items', id).onTakeItem = function (item: Item, pokemon: Pokemon, source: Pokemon) {
					const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
					const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
					if (sourceNums.includes(649) || pokemonNums.includes(649)) {
						return false;
					}
					return true;
				}
			}
			if (item.onMemory) {
				this.modData('Items', id).onTakeItem = function (item: Item, pokemon: Pokemon, source: Pokemon) {
					const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
					const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
					if (sourceNums.includes(773) || pokemonNums.includes(773)) {
						return false;
					}
					return true;
				}
			}
			if (item.forcedForme) {
				this.modData('Items', id).forcedForme = undefined;
			}
		}
	},
};
