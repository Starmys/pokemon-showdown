export const Abilities: { [k: string]: ModdedAbilityData } = {
	harvest2: {
		isPermanent: true,
		/*isUnbreakable: true,*/
		name: "Harvest2",
		onResidualOrder: 26,
		onResidualSubOrder: 1,
		onStart(pokemon) {
			pokemon.addVolatile('dynamax2');
			//for (const action of this.queue) {
			//	if (action.choice === 'runPrimal' && action.pokemon === source && source.species.id === 'groudon') return;
			//	if (action.choice !== 'runSwitch' && action.choice !== 'runPrimal') break;
			//}
			this.field.setWeather('sunnyday');
		},
		onDamage(damage, target, source, effect) {
			if (effect.effectType !== 'Move') {
				if (effect.effectType === 'Ability') this.add('-activate', source, 'ability: ' + effect.name);
				return false;
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'frz') return false;
			if (type === 'slp') return false;
			if (type === 'par') return false;
			if (type === 'tox') return false;
			if (type === 'psn') return false;
			if (type === 'brn') return false;
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'slp') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Insomnia');
			}
			return false;
			//if (status.id !== 'par') return;
			//if ((effect as Move)?.status) {
			//	this.add('-immune', target, '[from] ability: Limber');
			//}
			//return false;
			//if (status.id !== 'frz') return;
			//if ((effect as Move)?.status) {
			//	this.add('-immune', target, '[from] ability: Limber');
			//}
			//return false;
		},
		onResidual(pokemon) {
			if (this.field.isWeather(['sunnyday', 'desolateland']) || this.randomChance(1, 2)) {
				if (pokemon.hp && !pokemon.item && this.dex.items.get(pokemon.lastItem).isBerry) {
					pokemon.setItem(pokemon.lastItem);
					pokemon.lastItem = '';
					this.add('-item', pokemon, pokemon.getItem(), '[from] ability: Harvest');
				}
			}
		},
		rating: 2.5,
		num: 139,
	},
	minus: {
		inherit: true,
		onModifySpA(spa, pokemon) {
			const a: Pokemon[] = [];
			for (const allyActive of a.concat(pokemon.allies(), pokemon.foes())) {
				if (allyActive.hasAbility(['minus', 'plus'])) {
					return this.chainModify(1.5);
				}
			}
		},
	},
	plus: {
		inherit: true,
		onModifySpA(spa, pokemon) {
			const a: Pokemon[] = [];
			for (const allyActive of a.concat(pokemon.allies(), pokemon.foes())) {
				if (allyActive.hasAbility(['minus', 'plus'])) {
					return this.chainModify(1.5);
				}
			}
		},
	},
	intimidate: {
		inherit: true,
		onStart(pokemon) {
			let activated = false;
			if (pokemon.side === this.p1) {
				for (const target of pokemon.adjacentFoes().concat(pokemon.adjacentAllies())) {
					if (!activated) {
						this.add('-ability', pokemon, 'Intimidate', 'boost');
						activated = true;
					}
					if (target.volatiles['substitute']) {
						this.add('-immune', target);
					} else {
						this.boost({ atk: -1 }, target, pokemon, null, true);
					}
				}
			} else {
				for (const target of this.p1.active) {
					if (!activated) {
						this.add('-ability', pokemon, 'Intimidate', 'boost');
						activated = true;
					}
					if (target.volatiles['substitute']) {
						this.add('-immune', target);
					} else {
						this.boost({ atk: -1 }, target, pokemon, null, true);
					}
				}
			}
		},
	},
}