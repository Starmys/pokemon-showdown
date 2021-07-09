export const Conditions: {[k: string]: ConditionData} = {
	dynamax2: {
		name: 'Dynamax2',
		noCopy: true,
		duration: 0,
		onStart(pokemon) {
			pokemon.removeVolatile('minimize');
			pokemon.removeVolatile('substitute');
			if (pokemon.volatiles['torment']) {
				delete pokemon.volatiles['torment'];
				this.add('-end', pokemon, 'Torment', '[silent]');
			}
			if (['cramorantgulping', 'cramorantgorging'].includes(pokemon.species.id) && !pokemon.transformed) {
				pokemon.formeChange('cramorant');
			}
			this.add('-start', pokemon, 'Dynamax');
			if (pokemon.gigantamax) this.add('-formechange', pokemon, pokemon.species.name + '-Gmax');
			if (pokemon.baseSpecies.name === 'Shedinja') return;

			// Changes based on dynamax level, 2 is max (at LVL 10)
			const ratio = 30;

			pokemon.maxhp = Math.floor(pokemon.maxhp * ratio);
			pokemon.hp = Math.floor(pokemon.hp * ratio);
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
		},
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'flinch') return null;
			if (status.id === 'taunt') return null;
			if (status.id === 'encore') return null;
			if (status.id === 'curse') return null;
			if (status.id === 'confusion') return null;
			if (status.id === 'disable') return null;
			if (status.id === 'partiallytrapped') return null;
			if (status.id === 'torment') return null;
			if (status.id === 'attract') return null;
			if (status.id === 'perishsong') return null;
			if (status.id === 'leechseed') return null;
			if (status.id === 'electrify') return null;
			if (status.id === 'choicelock') return null;
			if (status.id === 'powder') return null;
		},
		onBeforeSwitchOutPriority: -1,
		onBeforeSwitchOut(pokemon) {
			pokemon.removeVolatile('dynamax');
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.id === 'behemothbash' || move.id === 'behemothblade' || move.id === 'dynamaxcannon') {
				return this.chainModify(2);
			}
		},
		onDragOutPriority: 2,
		onDragOut(pokemon) {
			this.add('-block', pokemon, 'Dynamax');
			return null;
		},
		onTryHit(source, target, move) {
			if (target !== source && (move.id === 'endeavor' || move.id === 'sheercold' || move.id === 'fissure' || move.id === 'guillotine' || move.id === 'horndrill' || move.id === 'superfang' || move.id === 'naturesmadness' || move.id === 'guardianofalola' || move.id === 'painsplit')) {
				return null;
			}
		},
		
		onResidualPriority: -100,
		onEnd(pokemon) {
			this.add('-end', pokemon, 'Dynamax');
			if (pokemon.baseSpecies.name === 'Shedinja') return;
			pokemon.hp = pokemon.getUndynamaxedHP();
			pokemon.maxhp = pokemon.baseMaxhp;
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
		},
		onBoost(boost, target, source, effect) {
			if (source && target === source) return;
			let showMsg = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
					showMsg = true;
				}
			}
			if (showMsg && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
				this.add("-fail", target, "unboost", "[from] ability: Boss Aura", "[of] " + target);
			}
		},
	},
};