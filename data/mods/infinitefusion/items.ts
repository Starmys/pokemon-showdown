export const Items: {[k: string]: ModdedItemData} = {
	// plates, drives, and memories implemented in scripts.ts
	// well, this 3 orbs are actually non-existent in game
	// but there's no harm to keep them
	adamantcrystal: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(483) && (move.type === 'Steel' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
			const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (sourceNums.includes(483) || pokemonNums.includes(483)) {
				return false;
			}
			return true;
		},
		// forcedForme deleted in scripts.ts
	},
	adamantorb: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(483) && (move.type === 'Steel' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
	},
	deepseascale: {
		inherit: true,
		onModifySpD(spd, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(366)) {
				return this.chainModify(2);
			}
		},
	},
	deepseatooth: {
		inherit: true,
		onModifySpA(spa, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(366)) {
				return this.chainModify(2);
			}
		},
	},
	eviolite: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.m.headSpecies?.nfe || pokemon.m.bodySpecies?.nfe) {
				return this.chainModify(1.5);
			}
		},
		onModifySpD(spd, pokemon) {
			if (pokemon.m.headSpecies?.nfe || pokemon.m.bodySpecies?.nfe) {
				return this.chainModify(1.5);
			}
		},
	},
	griseouscore: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(487) && (move.type === 'Ghost' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
			const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (sourceNums.includes(487) || pokemonNums.includes(487)) {
				return false;
			}
			return true;
		},
	},
	griseousorb: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(487) && (move.type === 'Ghost' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
	},
	leek: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(83) || nums.includes(865)) {
				return critRatio + 2;
			}
		},
	},
	lightball: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(25)) {
				return this.chainModify(2);
			}
		},
		onModifySpA(spa, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(25)) {
				return this.chainModify(2);
			}
		},
	},
	luckypunch: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(113)) {
				return critRatio + 2;
			}
		},
	},
	lustrousglobe: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(484) && (move.type === 'Water' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			const sourceNums = [source.m.headSpecies?.num, source.m.bodySpecies?.num];
			const pokemonNums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (sourceNums.includes(484) || pokemonNums.includes(484)) {
				return false;
			}
			return true;
		},
	},
	lustrousorb: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (nums.includes(484) && (move.type === 'Water' || move.type === 'Dragon')) {
				return this.chainModify([4915, 4096]);
			}
		},
	},
	metalpowder: {
		inherit: true,
		onModifyDef(def, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(132) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
	},
	quickpowder: {
		inherit: true,
		onModifySpe(spe, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(132) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
	},
	thickclub: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			const nums = [pokemon.m.headSpecies?.num, pokemon.m.bodySpecies?.num];
			if (nums.includes(104) || nums.includes(105)) {
				return this.chainModify(2);
			}
		},
	},
	souldew: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			const nums = [user.m.headSpecies?.num, user.m.bodySpecies?.num];
			if (
				move && (nums.includes(380) || nums.includes(381)) &&
				(move.type === 'Psychic' || move.type === 'Dragon')
			) {
				return this.chainModify([4915, 4096]);
			}
		},
	},
};
