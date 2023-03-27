export const Abilities: {[k: string]: ModdedAbilityData} = {
	// multitype, rkssystem should be implemented in conditions.ts?
	battlebond: {
		inherit: true,
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType !== 'Move') return;
			if (source.abilityState.battleBondTriggered) return;
			const ids = [source.m.headSpecies?.id, source.m.bodySpecies?.id];
			if (ids.includes('greninja') && source.hp && !source.transformed && source.side.foePokemonLeft()) {
				this.add('-activate', source, 'ability: Battle Bond');
				this.boost({atk: 1, spa: 1, spe: 1}, source, source, this.effect);
				source.abilityState.battleBondTriggered = true;
			}
		},
	},
	disguise: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (effect && effect.effectType === 'Move' && ids.includes('mimikyu') && !target.transformed) {
				this.add('-activate', target, 'ability: Disguise');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, source, move) {
			if (!target) return;
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (!ids.includes('mimikyu') || target.transformed) {
				return;
			}
			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move.type)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target || move.category === 'Status') return;
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (!ids.includes('mimikyu') || target.transformed) {
				return;
			}

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move.type)) return;
			return 0;
		},
		onUpdate(pokemon) {
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (ids.includes('mimikyu') && this.effectState.busted) {
				const speciesid = ids.includes('mimikyutotem') ? 'Mimikyu-Busted-Totem' : 'Mimikyu-Busted';
				pokemon.formeChange(speciesid, this.effect, true);
				this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
			}
		},
	},
	flowergift: {
		inherit: true,
		onWeatherChange(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (!pokemon.isActive || !baseSpecies.includes('Cherrim') || pokemon.transformed) return;
			if (!pokemon.hp) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				if (!ids.includes('cherrimsunshine')) {
					pokemon.formeChange('Cherrim-Sunshine', this.effect, false, '[msg]');
				}
			} else {
				if (ids.includes('cherrimsunshine')) {
					pokemon.formeChange('Cherrim', this.effect, false, '[msg]');
				}
			}
		},
		onAllyModifyAtk(atk, pokemon) {
			const ids = [this.effectState.target.m.headSpecies?.id, this.effectState.target.m.bodySpecies?.id];
			if (!ids.includes('cherrim')) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		onAllyModifySpD(spd, pokemon) {
			const ids = [this.effectState.target.m.headSpecies?.id, this.effectState.target.m.bodySpecies?.id];
			if (!ids.includes('cherrim')) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
	},
	forecast: {
		inherit: true,
		onWeatherChange(pokemon) {
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (!ids.includes('castform') || pokemon.transformed) return;
			let forme = null;
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				if (!ids.includes('castformsunny')) forme = 'Castform-Sunny';
				break;
			case 'raindance':
			case 'primordialsea':
				if (!ids.includes('castformrainy')) forme = 'Castform-Rainy';
				break;
			case 'hail':
			case 'snow':
				if (!ids.includes('castformsnowy')) forme = 'Castform-Snowy';
				break;
			default:
				if (pokemon.species.id !== 'castform') forme = 'Castform';
				break;
			}
			if (pokemon.isActive && forme) {
				pokemon.formeChange(forme, this.effect, false, '[msg]');
			}
		},
	},
	gulpmissile: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (!source.hp || !source.isActive || target.transformed || target.isSemiInvulnerable()) return;
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (ids.includes('cramorantgulping') || ids.includes('cramorantgorging')) {
				this.damage(source.baseMaxhp / 4, source, target);
				if (ids.includes('cramorantgulping')) {
					this.boost({def: -1}, source, target, null, true);
				} else {
					source.trySetStatus('par', target, move);
				}
				target.formeChange('cramorant', move);
			}
		},
		// The Dive part of this mechanic is implemented in Dive's `onTryMove` in moves.ts
		onSourceTryPrimaryHit(target, source, effect) {
			const ids = [source.m.headSpecies?.id, source.m.bodySpecies?.id];
			if (
				effect && effect.id === 'surf' && source.hasAbility('gulpmissile') &&
				ids.includes('cramorant') && !source.transformed
			) {
				const forme = source.hp <= source.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
				source.formeChange(forme, effect);
			}
		},
	},
	hungerswitch: {
		inherit: true,
		onResidual(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (!baseSpecies.includes('Morpeko') || pokemon.transformed) return;
			const targetForme = ids.includes('morpeko') ? 'Morpeko-Hangry' : 'Morpeko';
			pokemon.formeChange(targetForme);
		},
	},
	iceface: {
		inherit: true,
		onStart(pokemon) {
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (this.field.isWeather(['hail', 'snow']) &&
				ids.includes('eiscuenoice') && !pokemon.transformed) {
				this.add('-activate', pokemon, 'ability: Ice Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue', this.effect, true);
			}
		},
		onDamage(damage, target, source, effect) {
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (
				effect && effect.effectType === 'Move' && effect.category === 'Physical' &&
				ids.includes('eiscue') && !target.transformed
			) {
				this.add('-activate', target, 'ability: Ice Face');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, type, move) {
			if (!target) return;
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (move.category !== 'Physical' || !ids.includes('eiscue') || target.transformed) return;
			if (target.volatiles['substitute'] && !(move.flags['bypasssub'] || move.infiltrates)) return;
			if (!target.runImmunity(move.type)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target) return;
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (move.category !== 'Physical' || !ids.includes('eiscue') || target.transformed) return;

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move.type)) return;
			return 0;
		},
		onUpdate(pokemon) {
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (ids.includes('eiscue') && this.effectState.busted) {
				pokemon.formeChange('Eiscue-Noice', this.effect, true);
			}
		},
		onWeatherChange(pokemon, source, sourceEffect) {
			// snow/hail resuming because Cloud Nine/Air Lock ended does not trigger Ice Face
			if ((sourceEffect as Ability)?.suppressWeather) return;
			if (!pokemon.hp) return;
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (this.field.isWeather(['hail', 'snow']) &&
				ids.includes('eiscuenoice') && !pokemon.transformed) {
				this.add('-activate', pokemon, 'ability: Ice Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue', this.effect, true);
			}
		},
	},
	powerconstruct: {
		inherit: true,
		onResidual(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (!baseSpecies.includes('Zygarde') || pokemon.transformed || !pokemon.hp) return;
			if (ids.includes('zygardecomplete') || pokemon.hp > pokemon.maxhp / 2) return;
			this.add('-activate', pokemon, 'ability: Power Construct');
			pokemon.formeChange('Zygarde-Complete', this.effect, true);
			// Nihilslave: ehh, i guess we don't really need to do anything in this part?
			pokemon.baseMaxhp = Math.floor(Math.floor(
				2 * pokemon.species.baseStats['hp'] + pokemon.set.ivs['hp'] + Math.floor(pokemon.set.evs['hp'] / 4) + 100
			) * pokemon.level / 100 + 10);
			const newMaxHP = pokemon.volatiles['dynamax'] ? (2 * pokemon.baseMaxhp) : pokemon.baseMaxhp;
			pokemon.hp = newMaxHP - (pokemon.maxhp - pokemon.hp);
			pokemon.maxhp = newMaxHP;
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
		},
	},
	schooling: {
		inherit: true,
		onStart(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (!baseSpecies.includes('Wishiwashi') || pokemon.level < 20 || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (ids.includes('wishiwashi')) {
					pokemon.formeChange('Wishiwashi-School');
				}
			} else {
				if (ids.includes('wishiwashischool')) {
					pokemon.formeChange('Wishiwashi');
				}
			}
		},
		onResidual(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
			if (
				!baseSpecies.includes('Wishiwashi') || pokemon.level < 20 ||
				pokemon.transformed || !pokemon.hp
			) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (ids.includes('wishiwashi')) {
					pokemon.formeChange('Wishiwashi-School');
				}
			} else {
				if (ids.includes('wishiwashischool')) {
					pokemon.formeChange('Wishiwashi');
				}
			}
		},
	},
	shieldsdown: {
		inherit: true,
		onStart(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const formes = [pokemon.m.headSpecies?.forme, pokemon.m.bodySpecies?.forme];
			if (!baseSpecies.includes('Minior') || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 2) {
				if (!formes.includes('Meteor')) {
					pokemon.formeChange('Minior-Meteor');
				}
			} else {
				if (formes.includes('Meteor')) {
					// ignore colors
					pokemon.formeChange('Minior');
				}
			}
		},
		onResidual(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const formes = [pokemon.m.headSpecies?.forme, pokemon.m.bodySpecies?.forme];
			if (!baseSpecies.includes('Minior') || pokemon.transformed || !pokemon.hp) return;
			if (pokemon.hp > pokemon.maxhp / 2) {
				if (!formes.includes('Meteor')) {
					pokemon.formeChange('Minior-Meteor');
				}
			} else {
				if (formes.includes('Meteor')) {
					// ignore colors
					pokemon.formeChange('Minior');
				}
			}
		},
		onSetStatus(status, target, source, effect) {
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (!ids.includes('miniormeteor') || target.transformed) return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Shields Down');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			const ids = [target.m.headSpecies?.id, target.m.bodySpecies?.id];
			if (!ids.includes('miniormeteor') || target.transformed) return;
			if (status.id !== 'yawn') return;
			this.add('-immune', target, '[from] ability: Shields Down');
			return null;
		},
	},
	stancechange: {
		inherit: true,
		onModifyMove(move, attacker, defender) {
			const baseSpecies = [attacker.m.headSpecies?.baseSpecies, attacker.m.bodySpecies?.baseSpecies];
			const names = [attacker.m.headSpecies?.name, attacker.m.bodySpecies?.name];
			if (!baseSpecies.includes('Aegislash') || attacker.transformed) return;
			if (move.category === 'Status' && move.id !== 'kingsshield') return;
			const targetForme = (move.id === 'kingsshield' ? 'Aegislash' : 'Aegislash-Blade');
			if (!names.includes(targetForme)) attacker.formeChange(targetForme);
		},
	},
	zenmode: {
		inherit: true,
		onResidual(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const formes = [pokemon.m.headSpecies?.forme, pokemon.m.bodySpecies?.forme];
			if (!baseSpecies.includes('Darmanitan') || pokemon.transformed) {
				return;
			}
			if (pokemon.hp <= pokemon.maxhp / 2 && !formes.includes('Zen') && !formes.includes('Galar-Zen')) {
				pokemon.addVolatile('zenmode');
			} else if (pokemon.hp > pokemon.maxhp / 2 && (formes.includes('Zen') || formes.includes('Galar-Zen'))) {
				pokemon.addVolatile('zenmode'); // in case of base Darmanitan-Zen
				pokemon.removeVolatile('zenmode');
			}
		},
		onEnd(pokemon) {
			if (!pokemon.volatiles['zenmode'] || !pokemon.hp) return;
			pokemon.transformed = false;
			delete pokemon.volatiles['zenmode'];
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			// i'm lazy
			if (baseSpecies.includes('Darmanitan')) {
				pokemon.formeChange('Darmanitan', this.effect, false, '[silent]');
			}
		},
		condition: {
			onStart(pokemon) {
				if (!pokemon.species.name.includes('Galar')) {
					if (pokemon.species.id !== 'darmanitanzen') pokemon.formeChange('Darmanitan-Zen');
				} else {
					if (pokemon.species.id !== 'darmanitangalarzen') pokemon.formeChange('Darmanitan-Galar-Zen');
				}
			},
			onEnd(pokemon) {
				if (['Zen', 'Galar-Zen'].includes(pokemon.species.forme)) {
					pokemon.formeChange(pokemon.species.battleOnly as string);
				}
			},
		},
	},
	zerotohero: {
		inherit: true,
		onSwitchOut(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const formes = [pokemon.m.headSpecies?.forme, pokemon.m.bodySpecies?.forme];
			if (!baseSpecies.includes('Palafin') || pokemon.transformed) return;
			if (!formes.includes('Hero')) {
				pokemon.formeChange('Palafin-Hero', this.effect, true);
			}
		},
		onSwitchIn() {
			this.effectState.switchingIn = true;
		},
		onStart(pokemon) {
			if (!this.effectState.switchingIn) return;
			this.effectState.switchingIn = false;
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			const formes = [pokemon.m.headSpecies?.forme, pokemon.m.bodySpecies?.forme];
			if (!baseSpecies.includes('Palafin') || pokemon.transformed) return;
			if (!this.effectState.heroMessageDisplayed && formes.includes('Hero')) {
				this.add('-activate', pokemon, 'ability: Zero to Hero');
				this.effectState.heroMessageDisplayed = true;
			}
		},
	},
};
