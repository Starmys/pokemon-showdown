export const Conditions: {[k: string]: ModdedConditionData} = {
	elite: {
		name: 'Elite',
		noCopy: true,
		duration: 0,
		onStart(pokemon) {
			
			const ratio = 2;
			this.add('-activate', pokemon, 'move: elite');
			this.add('-start', pokemon, 'elite');
			pokemon.maxhp = Math.floor(pokemon.maxhp * ratio);
			pokemon.hp = Math.floor(pokemon.hp * ratio);
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
			pokemon.storedStats.atk = Math.floor(pokemon.storedStats.atk * 1.3);
			pokemon.storedStats.spa = Math.floor(pokemon.storedStats.spa * 1.3);
		},
		onBeforeSwitchOut(pokemon) {
			pokemon.removeVolatile('elite');
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, 'elite');
			pokemon.hp = Math.ceil(pokemon.hp * pokemon.baseMaxhp / pokemon.maxhp)
			pokemon.maxhp = pokemon.baseMaxhp;
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
		},
	},
	halo: {
		name: 'Halo',
		noCopy: true,
		duration: 0,
		onStart(pokemon) {
			this.add('-activate', pokemon, 'move: halo');
			this.add('-start', pokemon, 'halo');
			pokemon.storedStats.atk = Math.floor(pokemon.storedStats.atk * 1.2);
			pokemon.storedStats.spa = Math.floor(pokemon.storedStats.spa * 1.2);
			pokemon.storedStats.def = Math.floor(pokemon.storedStats.def * 1.2);
			pokemon.storedStats.spd = Math.floor(pokemon.storedStats.spd * 1.2);
			pokemon.storedStats.spe = Math.floor(pokemon.storedStats.spe * 1.2);
		},
	},
	raindance: {
		inherit: true,
		onFieldStart(field, source, effect) {

			if (effect?.effectType === 'Rule' && source.side === this.p2) {
				this.effectState.duration = 0;
			}
			if (effect?.effectType === 'Ability' ) {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'RainDance', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-weather', 'RainDance');
			}
			
		},
	},
	sunnyday: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Rule' && source.side === this.p2) {
				this.effectState.duration = 0;
			}
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'SunnyDay', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-weather', 'SunnyDay');
			}

		},
	},
	sandstorm: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Rule' && source.side === this.p2) {
				this.effectState.duration = 0;
			}
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Sandstorm', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-weather', 'Sandstorm');
			}

		},
		onWeather(target,source,effect) {
			if (effect && effect.id === 'sandstorm') {
				if (target.m.sanddamage)
					this.damage(target.baseMaxhp / 16 * target.m.sanddamage);
				else
					this.damage(target.baseMaxhp / 16);
			}
		},
	},
	hail: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Rule' && source.side === this.p2) {
				this.effectState.duration = 0;
			}
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Hail', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-weather', 'Hail');
			}

		},
		onWeather(target, source, effect) {
			if (effect && effect.id === 'hail')
				this.damage(target.baseMaxhp / 16);
		},
	},
	guardianshield: {
		name: 'Guardian Shield',
		duration: 0,
		onAnyModifyDamage(damage, source, target, move) {
			if (target !== source && this.effectState.target.hasAlly(target)) {
				if (!move.infiltrates && !move.flags['contact']) {
					this.debug('Guardian Shield weaken');
					return this.chainModify(0.8);
				}
			}
		},
		onSideStart(side) {
			this.add('-sidestart', side, 'Guardian Shield');
		},
		onSideResidualOrder: 26,
		onSideResidualSubOrder: 1,
		onSideEnd(side) {
			this.add('-sideend', side, 'Guardian Shield');
		},
	},
	focusroom: {
		name: 'Focus Room',
		effectType: 'Weather',
		duration: 0,
	
		onDamage(damage, target, source, effect) {
			if (target&&target.hp === target.maxhp && damage >= target.hp && effect && effect.effectType === 'Move' && target.side===this.p2) {
				if (target.useItem()) {
					return target.hp - 1;
				}
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Focus Room', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Focus Room');
			}
			this.add('-message', 'Focus Room is radiated.');
		},
		
		onFieldResidualOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'Focus Room');
			this.add('-message', 'The Focus Room subsided.');
		},
	},
	guerrilla: {
		name: 'Guerrilla',
		effectType: 'Weather',
		duration: 0,

		onWeatherModifyDamage(damage,source ,target, move) {
			if (damage && source && source.side === this.p2 && !move.isZ)
				return this.chainModify(0.2);
		},
		onModifySecondaries(secondaries, target, source, move) {
			if (move.hit >= 2) {

				return secondaries.filter(effect => effect.volatileStatus !== 'flinch');
			}
		},
		onModifyMovePriority:100,
		onModifyMove(move, pokemon, target) {
			if (['endeavor', 'fling', 'iceball', 'rollout'].includes(move.id)) return;
			if (move.flags['charge']) return;
			if (move.category !== 'Status'&&!move.isZ && (!move.multihit || move.multihit === 1) && pokemon.side === this.p2)
				move.multihit = 5;
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Guerrilla', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Guerrilla');
			}
			this.add('-message', 'Guerrilla is radiated.');
		},

		onFieldResidualOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'Guerrilla');
			this.add('-message', 'The Guerrilla subsided.');
		},
	},
	boxingarea: {
		name: 'Boxing Area',
		effectType: 'Weather',
		duration: 0,
		
		onModifyMove(move, pokemon, target) {
			if (move.category !== 'Status' && !move.isZ && move.type === "Fighting" && pokemon.side === this.p2) {
				move.basePower *= 0.75;
				move.self = {
					boosts: {atk:1}
				};
				if (!move.ignoreImmunity) move.ignoreImmunity = {};
				if (move.ignoreImmunity !== true) {
					move.ignoreImmunity['Fighting'] = true;
				}

			}

		},
	

	
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Boxing Area', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Boxing Area');
			}
			this.add('-message', 'Boxing Area is radiated.');
		},

		onFieldResidualOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'Boxing Area');
			this.add('-message', 'The Boxing Area subsided.');
		},
	},
	purgatory: {
		name: 'Purgatory',
		effectType: 'Weather',
		duration: 0,

		
		onModifyMove(move, pokemon, target) {
			if (move.category !== 'Status' && !move.isZ && move.type === "Fire" && pokemon.side === this.p2) {
				move.sideCondition = 'firepledge';
			}

		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Purgatory', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Purgatory');
			}
			this.add('-message', 'Purgatory is radiated.');
		},

		onFieldResidualOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'Purgatory');
			this.add('-message', 'The Purgatory subsided.');
		},
	},
	rainbow: {
		name: 'Rainbow',
		effectType: 'Weather',
		duration: 0,


		onModifyMove(move, pokemon, target) {
			if (move.category !== 'Status' && !move.isZ && move.type === "Water" && pokemon.side === this.p2) {
				if (move.self)
					move.self.sideCondition = 'waterpledge';
				else
					move.self = { sideCondition: 'waterpledge' };
			}

		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Rainbow', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Rainbow');
			}
			this.add('-message', 'Rainbow is radiated.');
		},

		onFieldResidualOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'Rainbow');
			this.add('-message', 'The Rainbow subsided.');
		},
	},
	mercyaura: {
		name: 'Mercy Aura',
		effectType: 'Weather',
		duration: 0,
		onEffectivenessPriority: -1,
		onEffectiveness(typeMod, target, type, move) {
			if (target)
				if (target.side === this.p1)
					if (move.type === 'Grass') {
						if (['Fire', 'Bug', 'Poison', 'Steel', 'Dragon', 'Flying'].includes(type)) return 0;
					}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Mercy Aura', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Mercy Aura');
			}
			this.add('-message', 'Mercy Aura is radiated.');
		},
		
		
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Mercy Aura', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Mercy Aura');
			this.add('-message', 'The Mercy Aura subsided.');
		},
	},
	ballaura: {
		name: 'Ball Aura',
		effectType: 'Weather',
		duration: 0,
		onEffectivenessPriority: -1,
		onEffectiveness(typeMod, target, type, move) {
			if (target)
				if (target.side === this.p1)
					if (move.type === 'Electric') {
						if (['Ground'].includes(type)) return -1;
					}
		},

		onModifyMove(move, pokemon, target) {
			if (pokemon.side === this.p2)
				if (move.type === 'Electric') {
					move.ignoreImmunity = true;
					move.ignoreAbility = true;
				}

		},

		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Ball Aura', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Ball Aura');
			}
			this.add('-message', 'Ball Aura is radiated.');


		},

		onWeatherModifyDamage(relayVar: number, source: Pokemon, target: Pokemon, move) {
			if (source.side === this.p2) {
				if (move.type === 'Electric' && this.prng.next(5)===1) {
					if (!target.status) target.setStatus('par', source, move, true);
				}
				return this.chainModify(1.2);
			}
		},

		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Ball Aura', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Ball Aura');
			this.add('-message', 'The Mercy Aura subsided.');
		},
	},
	dragonsmajesty: {
		name: "Dragon's Majesty",
		effectType: 'Weather',
		duration: 0,
		onEffectivenessPriority: -1,
		


		onTryMove(source, target, move) {
			if (source.side === this.p2 && move.name.toLowerCase() !== 'struggle') {
				let pp = 0, maxpp = 0;
				if (source.hasType('Dragon') && !move.isZ && move.target !== 'foeSide') {

					for (const eachMove of source.getMoves()) {
						if (eachMove.pp && eachMove.maxpp) {
							if (eachMove.pp < eachMove.maxpp - 1) return;
							pp += eachMove.pp;
							maxpp += eachMove.maxpp
						}
					}

					if (pp >= maxpp - 1) {
						this.attrLastMove('[still]');

						this.actions.useMoveInner('Clangorous Soulblaze', source);
						return null;
					}
				}
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Dragon's Majesty", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Dragon's Majesty");
			}
			this.add('-message', "Dragon's Majesty is radiated.");
		},
		
		
		

		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Dragon's Majesty", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "dragon's majesty");
			this.add('-message', "The Dragon's Majesty subsided.");
		},
	},
	gardenshield: {
		name: "Garden Shield",
		effectType: 'Weather',
		duration: 0,
		onDamagingHit(damage, target, source, effect) {
			if (target.hasType('Fairy') && target.side === this.p2) {
				if (effect.category === "Physical") {
					this.boost({ def: 1 }, target)
				}
				if (effect.category === "Special") {
					this.boost({ spd: 1 }, target)
				}
			}
		},
		onCriticalHit(target, source, move) {
			if (target.side === this.p2)
				return false;
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Garden Shield", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Garden Shield");
			}
			this.add('-message', "Garden Shield is radiated.");
		},
	

		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Garden Shield", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "Garden Shield");
			this.add('-message', "The Garden Shield subsided.");
		},

	},
	acidrain: {
		name: 'Acid Rain',
		effectType: 'Weather',
		duration: 0,
		
		onWeatherModifyDamage(relayVar: number, source: Pokemon, target: Pokemon, move) {
			if (move.type === 'Poison') {
				this.debug('Acid Rain Day poison boost');
				return this.chainModify(1.5);
			}
			if (move.type === 'Psychic') {
				this.debug('Acid Rain psychic suppress');
				return this.chainModify(0.5);
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Acid Rain', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Acid Rain');
			}
			this.add('-message', 'Acid Rain began to fall.');
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Acid Rain', '[upkeep]');
			this.eachEvent('Weather');
		},
		onWeather(target,source,effect) {
			if (effect&&effect.id === 'acidrain') {
				if (!target.hasType('Poison') && target.side === this.p1) {
					this.damage(target.baseMaxhp / 16);
					this.add('-message', 'The Acid Rain hurt the Pokemon.');
				}
			}
		},
		onFieldEnd() {
			this.add('-fieldend', 'Acid Rain');
			this.add('-message', 'The Acid Rain subsided.');
		},
	},
	iceberg: {
		name: 'Iceberg',
		effectType: 'Weather',
		duration: 0,

		
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Iceberg', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Iceberg');
			}
			this.add('-message', 'Iceberg began to fall.');
		},
		onModifyDefPriority: 10,
		onModifyDef(def, pokemon) {
			if (pokemon.hasType('Ice') ) {
				return this.modify(def, 1.5);
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Iceberg', '[upkeep]');
			this.eachEvent('Weather');
		},
		onWeather(target,source,effect) {
			if (effect&&effect.id === 'iceberg') {
				if (target.hasType('Ice') && target.side === this.p2) {
					this.heal(target.baseMaxhp / 8);
					this.add('-message', 'The Iceberg heal the Pokemon.');
				}
				if (!target.hasType('Ice') && target.side === this.p1) {
					this.damage(target.baseMaxhp / 16);
					this.add('-message', 'The Iceberg hurt the Pokemon.');
				}
			}
		},
		onFieldEnd() {
			this.add('-fieldend', 'Iceberg');
			this.add('-message', 'The Iceberg subsided.');
		},
	},
	buginterfere: {
		name: 'Bug Interfere',
		noCopy: true,
		duration: 0,
		onStart(pokemon) {
			this.add('-activate', pokemon, 'Bug Interfere');
			this.add('-start', pokemon, 'Bug Interfere');
			this.boost({ atk: -1, spa: -1, def: -1, spd:-1,spe:-1 }, pokemon, pokemon.foes()[0])
		},
	},
	infestation: {
		name: "Infestation",
		effectType: 'Weather',
		duration: 0,
		onModifyMovePriority: 1000,
		onModifyMove(move, pokemon, target) {
			if (move.category !== 'Status' && pokemon.side === this.p2 && pokemon.hasType('Bug')&&target) {
				if (!move.secondaries) move.secondaries = [];
				move.secondaries.push({ chance: 100, volatileStatus: 'buginterfere' });

			}
		},
		
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Infestation", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Infestation");
			}
			this.add('-message', "Infestation is radiated.");
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Infestation", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "Infestation");
			this.add('-message', "The Infestation subsided.");
		},
	},
	gangterritory: {
		name: "Gang Territory",
		effectType: 'Weather',
		duration: 0,
		onModifyMovePriority: 1000,
		onModifyMove(move, pokemon, target) {
			if (move.category !== 'Status' && move.type === 'Dark' && pokemon.side === this.p2) {
				if (move.basePower) move.basePower += 15;
				move.stab=2
			}
		},

		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Gang Territory", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Gang Territory");
			}
			this.add('-message', "Gang Territory is radiated.");
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Gang Territory", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "Gang Territory");
			this.add('-message', "The Gang Territory subsided.");
		},
	},
	deltastream: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-weather', 'DeltaStream', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-weather', 'DeltaStream');
			}
		},
	},
	hyakkiyakou: {
		name: "Hyakkiyakou",
		effectType: 'Weather',
		duration: 0,
		onModifyMovePriority: 1000,
		onModifyMove(move, pokemon, target) {
			if (move.type === 'Ghost' && pokemon.side === this.p2) {
				if (move.basePower) move.basePower *=1.5;
				move.infiltrates = true;
			}
		},
		onDeductPP(target, source) {
			if (source.side === this.p2 && this.activeMove?.type === 'Ghost')
				return 3;
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Hyakkiyakou", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Hyakkiyakou");
			}
			this.add('-message', "Hyakkiyakou is radiated.");
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Hyakkiyakou", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "Hyakkiyakou");
			this.add('-message', "The Hyakkiyakou subsided.");
		},
	},
	normalstrong: {
		name: "Normal Strong",
		effectType: 'Weather',
		duration: 0,
		onModifyTypePriority: 0,
		onModifyType(move, pokemon) {
			if (pokemon.hasType('Normal') && pokemon.side === this.p2) {
				const noModifyType = [
					'hiddenpower', 'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'struggle', 'technoblast', 'terrainpulse', 'weatherball',
				];

				if (!(move.isZ && move.category !== 'Status') && !noModifyType.includes(move.id)) {
					move.type = 'Normal';
					move.normalizeBoosted = true;
				}
			}
		},
		onModifyMovePriority: -5,
		onModifyMove(move, pokemon, target) {
			if (pokemon.side === this.p2 && pokemon.hasType('Normal')) {
				if (!move.ignoreImmunity) move.ignoreImmunity = {};
				if (move.ignoreImmunity !== true) {
					move.ignoreImmunity['Normal'] = true;
				}
			}
		},
		onBasePowerPriority: 1000,
		onBasePower(basePower, pokemon, target, move) {
			if (move.normalizeBoosted) return this.chainModify([4915, 4096]);
		},
		onModifyPriority(priority, pokemon, target, move) {
			if (pokemon.side === this.p2 && pokemon.hasType('Normal')&&move?.category === 'Status') {
				return priority + 1;
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', "Normal Strong", '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', "Normal Strong");
			}
			this.add('-message', "Normal Strong is radiated.");
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', "Normal Strong", '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', "Normal Strong");
			this.add('-message', "The Normal Strong subsided.");
		},
	},
	eightdiagramtactics: {
		name: 'Eight-Diagram Tactics',
		effectType: 'Weather',
		duration: 0,
		onEffectivenessPriority: -1,
		onEffectiveness(typeMod, target, type, move) {
			if (target)
				if (target.side === this.p2 && target.hasType('Ground')) {
					if (typeMod < 0)
						return 1;
					if (typeMod > 0)
						return -1;
				}
		},
		onModifyAtkPriority: -101,
		onModifyAtk(atk, pokemon) {
			if (pokemon.side === this.p2 && pokemon.hasType('Ground'))
				return this.chainModify(1.2);
		},
		onModifySpAPriority: -101,
		onModifySpA(spa, pokemon) {
			if (pokemon.side === this.p2 && pokemon.hasType('Ground'))
				return this.chainModify(1.2);
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Eight-Diagram tactics', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Eight-Diagram tactics');
			}
			this.add('-message', 'Eight-Diagram tactics is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Eight-Diagram tactics', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Eight-Diagram tactics');
			this.add('-message', 'The Eight-Diagram tactics subsided.');
		},
	},
	surcharge: {
		name: 'Surcharge',
		effectType: 'Weather',
		duration: 0,
		
		
		onModifyMovePriority: 100,
		onModifyMove(move, pokemon, target) {
			if (['endeavor', 'fling', 'iceball', 'rollout'].includes(move.id)) return;
			if (move.flags['charge']) return;
			if (move.category !== 'Status' && !move.isZ && (!move.multihit || move.multihit === 1) && pokemon.side === this.p2) {
				if (move.self) {
					if (!move.secondaries) move.secondaries = [];
					move.secondaries.push({ chance: 100, self: { volatileStatus: 'mustrecharge' } });
				}
				else
					move.self = { volatileStatus: 'mustrecharge', };
				move.basePower *= 3;                                         
			}

		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Surcharge', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Surcharge');
			}
			this.add('-message', 'Surcharge is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Surcharge', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Surcharge');
			this.add('-message', 'The Surcharge subsided.');
		},
	},
	timeacceleration: {
		name: 'Time Acceleration',
		effectType: 'Weather',
		duration: 0,


		onModifySpe(spe, pokemon) {
			if (pokemon.side !== this.p2) return;
			return this.chainModify(1.3);
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Time Acceleration', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Time Acceleration');
			}
			this.add('-message', 'Time Acceleration is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Time Acceleration', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Time Acceleration');
			this.add('-message', 'The Time Acceleration subsided.');
		},
	},
	fairyhalper: {
		name: 'Fairy Halper',
		effectType: 'Weather',
		duration: 0,


		onAfterMoveSecondary(target, source, move) {
			if (source.side === this.p2 && move.category !== "Status" && target && target.hp > 0 ) {
				this.damage(target.maxhp*0.1, target, source);
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Fairy Halper', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Fairy Halper');
			}
			this.add('-message', 'Fairy Halper is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Fairy Halper', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Fairy Halper');
			this.add('-message', 'The Fairy Halper subsided.');
		},
	},
	misfortunemirror: {
		name: 'Misfortune Mirror',
		effectType: 'Weather',
		duration: 0,
		

		onFaint(pokemon) {
			if (pokemon.side === this.p2) {
				this.boost({ accuracy: -1, evasion: -1 }, pokemon.foes()[0], pokemon);
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Misfortune Mirror', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Misfortune Mirror');
			}
			this.add('-message', 'Misfortune Mirror is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Misfortune Mirror', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Misfortune Mirror');
			this.add('-message', 'The Misfortune Mirror subsided.');
		},
	},
	healingarea: {
		name: 'Healing Area',
		effectType: 'Weather',
		duration: 0,

		onSwitchOut(pokemon) {
			if (pokemon.side === this.p2)
				pokemon.heal(pokemon.baseMaxhp / 10);
		},
		
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Healing Area', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Healing Area');
			}
			this.add('-message', 'Healing Area is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Healing Area', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Healing Area');
			this.add('-message', 'The Healing Area subsided.');
		},
	},
	trueshotaura: {
		name: 'Trueshot Aura',
		effectType: 'Weather',
		duration: 0,

		onWeatherModifyDamage(damage, source, target, move) {
			if (source && source.side === this.p2 && !move.flags['contact'])
				return this.chainModify(1.2);
		},

		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Trueshot Area', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Trueshot Area');
			}
			this.add('-message', 'Trueshot Area is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Trueshot Area', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Trueshot Area');
			this.add('-message', 'The Trueshot Area subsided.');
		},
	},
	psychoanalysis: {
		name: 'Psychoanalysis',
		effectType: 'Weather',
		duration: 0,

		onModifyMovePriority: 100,
		onModifyMove(move, pokemon, target) {

			if (move.category !== 'Status' && move.type ==='Psychic' && pokemon.side === this.p2) {
				
					if (!move.secondaries) move.secondaries = [];
				move.secondaries.push({ chance: 50, volatileStatus: 'confusion', });
				}
		},
		onAfterMove(source, target, move) {
			if (source && source.side === this.p2 && source.hp > 0 && source.types.includes('Psychic')) {
				this.heal(source.maxhp * 0.1, source, source);
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Psychoanalysis', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Psychoanalysis');
			}
			this.add('-message', 'Psychoanalysis is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Psychoanalysis', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Psychoanalysis');
			this.add('-message', 'The Psychoanalysis subsided.');
		},
	},
	statuspush: {
		name: 'Status Push',
		effectType: 'Weather',
		duration: 0,

		onAfterMoveSecondary(target, source, move) {
			if (move.category !== "Status" && target && target.side === this.p1) {
				if (this.prng.next(5) === 0) {
					target.setStatus(this.sample(['brn', 'par', 'slp', 'frz', 'psn']), target);
				}
			}
		},
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'Status Push', '[from] ability: ' + effect, '[of] ' + source);
			} else {
				this.add('-fieldstart', 'Status Push');
			}
			this.add('-message', 'Status Push is radiated.');
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Status Push', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Status Push');
			this.add('-message', 'The Status Push subsided.');
		},
	},
	stope: {
		name: 'Stope',
		effectType: 'Weather',
		duration: 0,

		
		onWeather(target, source, effect) {
			if (effect && effect.id === 'stope') {
				if (target.hasType('Rock') && target.side === this.p2) {
					let i = this.sample([1, 2, 3, 4]);
					switch (i) {
					case 1:
						this.boost(this.sample([{ atk: 1 }, { def: 1 }, { spa: 1 }, { spd: 1 }, { spe: 1 }]), target);
						break;
					case 2:
						this.heal(target.baseMaxhp / 6, target);
						break;
					case 3:
						if (this.field.isWeather('sandstorm')) {
							if (target.foes().length >= 1) {
								if (target.foes()[0].m.sanddamage) {
									target.foes()[0].m.sanddamage *= 2;
								} else {
									target.foes()[0].m.sanddamage = 2;
								}
							} else {
								this.field.setWeather('sandstorm');
							}
						}
						break;
					case 4:
						break;
					}
				}

			}
		},


		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Stope', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-fieldend', 'Stope');
			this.add('-message', 'The Stope subsided.');
		},
	},
};
