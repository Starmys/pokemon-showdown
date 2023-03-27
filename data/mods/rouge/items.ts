export const Items: { [k: string]: ModdedItemData } = {
	superband: {
		name: "Super Band",
		spritenum: 68,
		fling: {
			basePower: 10,
		},
		onStart(pokemon) {
			if (pokemon.volatiles['choicelock']) {
				this.debug('removing choicelock: ' + pokemon.volatiles['choicelock']);
			}
			pokemon.removeVolatile('choicelock');
		},
		onModifyMove(move, pokemon) {
			pokemon.addVolatile('choicelock');
		},
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			return this.chainModify(2);
		},
		isChoice: true,
		num: 220,
		gen: 3,
	},
	superscarf: {
		name: "Super Scarf",
		spritenum: 69,
		fling: {
			basePower: 10,
		},
		onStart(pokemon) {
			if (pokemon.volatiles['choicelock']) {
				this.debug('removing choicelock: ' + pokemon.volatiles['choicelock']);
			}
			pokemon.removeVolatile('choicelock');
		},
		onModifyMove(move, pokemon) {
			pokemon.addVolatile('choicelock');
		},
		onModifySpe(spe, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			return this.chainModify(2);
		},
		isChoice: true,
		num: 287,
		gen: 4,
	},
	superspecs: {
		name: "Super Specs",
		spritenum: 70,
		fling: {
			basePower: 10,
		},
		onStart(pokemon) {
			if (pokemon.volatiles['choicelock']) {
				this.debug('removing choicelock: ' + pokemon.volatiles['choicelock']);
			}
			pokemon.removeVolatile('choicelock');
		},
		onModifyMove(move, pokemon) {
			pokemon.addVolatile('choicelock');
		},
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			return this.chainModify(2);
		},
		isChoice: true,
		num: 297,
		gen: 4,
	},
	supervest: {
		name: "Super Vest",
		spritenum: 581,
		fling: {
			basePower: 80,
		},
		onModifySpDPriority: 1,
		onModifySpD(spd) {
			return this.chainModify(2);
		},
		onDisableMove(pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				if (this.dex.moves.get(moveSlot.move).category === 'Status') {
					pokemon.disableMove(moveSlot.id);
				}
			}
		},
		num: 640,
		gen: 6,
	},
	diseviolite: {
		name: "Diseviolite",
		spritenum: 130,
		fling: {
			basePower: 40,
		},
		onModifyDefPriority: 2,
		onModifyDef(def, pokemon) {
				return this.chainModify(1.5);			
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {			
				return this.chainModify(1.5);			
		},
		num: 538,
		gen: 5,
	},
	superquickclaw: {
		onFractionalPriorityPriority: -2,
		onFractionalPriority(priority, pokemon) {
			if (priority <= 0 && this.randomChance(2, 5)) {
				this.add('-activate', pokemon, 'item: Quick Claw');
				return 0.1;
			}
		},
		name: "Super Quick Claw",
		spritenum: 373,
		fling: {
			basePower: 80,
		},
		num: 217,
		gen: 2,
	},
	supermetronome: {
		name: "Super Metronome",
		spritenum: 289,
		fling: {
			basePower: 30,
		},
		onStart(pokemon) {
			pokemon.addVolatile('supermetronome');
		},
		condition: {
			onStart(pokemon) {
				this.effectState.lastMove = '';
				this.effectState.numConsecutive = 0;
			},
			onTryMovePriority: -2,
			onTryMove(pokemon, target, move) {
				if (!pokemon.hasItem('supermetronome')) {
					pokemon.removeVolatile('supermetronome');
					return;
				}
				if (this.effectState.lastMove === move.id && pokemon.moveLastTurnResult) {
					this.effectState.numConsecutive++;
				} else if (pokemon.volatiles['twoturnmove'] && this.effectState.lastMove !== move.id) {
					this.effectState.numConsecutive = 1;
				} else {
					this.effectState.numConsecutive = 0;
				}
				this.effectState.lastMove = move.id;
			},
			onModifyDamage(damage, source, target, move) {
				const dmgMod = [4096, 5324, 6553, 7782, 9011, 10240];
				const numConsecutive = this.effectState.numConsecutive > 5 ? 5 : this.effectState.numConsecutive;
				this.debug(`Current Metronome boost: ${dmgMod[numConsecutive]}/4096`);
				return this.chainModify([dmgMod[numConsecutive], 4096]);
			},
		},
		num: 277,
		gen: 4,
	},
	superlifeorb: {
		name: "Super Life Orb",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onModifyDamage(damage, source, target, move) {
			return this.chainModify([6144, 4096]);
		},
		onAfterMoveSecondarySelf(source, target, move) {
			if (source && source !== target && move && move.category !== 'Status') {
				this.damage(source.baseMaxhp / 10, source, source, this.dex.items.get('lifeorb'));
			}
		},
		num: 270,
		gen: 4,
	},
	intactapple: {
		name: "Intact Apple",
		spritenum: 242,
		fling: {
			basePower: 10,
		},
		onResidualOrder: 5,
		onResidualSubOrder: 4,
		onResidual(pokemon) {
			this.heal(pokemon.baseMaxhp / 8);
		},
		num: 234,
		gen: 2,
	},
	immunityherb: {
		name: "Immunity Herb",
		spritenum: 285,
		fling: {
			basePower: 10,
			
		},
		onDamage(damage, target, source, effect) {

			if (effect.effectType === 'Move'&& target.useItem()) {

				this.add('-useitem', target, this.effect, '[immune]');
				return 0;
				}
			
		},
	},
	supermuscleband: {
		name: "Super Muscle Band",
		spritenum: 297,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 16,
		onBasePower(basePower, user, target, move) {
			if (move.category === 'Physical') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 266,
		gen: 4,
	},
	superwiseglasses: {
		name: "Super Wise Glasses",
		spritenum: 539,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 16,
		onBasePower(basePower, user, target, move) {
			if (move.category === 'Special') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 267,
		gen: 4,
	},
	adaptiveslate: {
		name: "Adaptive Slate",
		spritenum: 539,
		fling: {
			basePower: 10,
		},
		onModifyMove(move) {
			move.stab = 1.8;
		},
		num: 267,
		gen: 4,
	},
	explosivearm: {
		name: "Explosive Arm",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onModifyDamage(damage, source, target, move) {
			return this.chainModify([8192, 4096]);
		},
		onModifyDefPriority: 2,
		onModifyDef(def, pokemon) {
			return this.chainModify(0.5);
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			return this.chainModify(0.5);
		},
		num: 270,
		gen: 4,
	},
	doubleedgedsword: {
		name: "Double-edged Sword",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onModifyDamage(damage, source, target, move) {
			return this.chainModify([10240, 4096]);
		},
		onAfterMoveSecondarySelf(source, target, move) {
			if (source && source !== target && move && move.category !== 'Status') {
				this.directDamage(source.baseMaxhp / 10*3, source, source);
			}
		},
		
		num: 270,
		gen: 4,
	},
	flexibledevice: {
		name: "Flexible Device",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onModifyDamage(damage, source, target, move) {
			return this.chainModify([5324, 4096]);
		},
		onModifySpe(spe, pokemon) {
			return this.chainModify([5324, 4096]);
		},
		onModifyDefPriority: 2,
		onModifyDef(def, pokemon) {
			if ( pokemon.species.name.toLowerCase() === 'kartana') return
			return this.chainModify(0.666);
		},
		onModifySpDPriority: 2,
		onModifySpD(spd, pokemon) {
			if ( pokemon.species.name.toLowerCase() === 'kartana') return
			return this.chainModify(0.666);
		},
		
		num: 270,
		gen: 4,
	},
	painconnector: {
		name: "Pain Connector",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		
		onAnyDamagingHit(damage, target, source, move) {
			if (target.hp&& source && target !== source && move && move.category !== 'Status') {
				this.heal(Math.floor(damage / 2), target, target);
				this.damage(Math.floor(damage / 2), source, source);
			}
		},

		num: 270,
		gen: 4,
	},
	sightlens: {
		name: "Sight Lens",
		spritenum: 537,
		fling: {
			basePower: 10,
		},
		onSourceModifyAccuracyPriority: -2,
		onSourceModifyAccuracy(accuracy) {
			if (typeof accuracy === 'number') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 265,
		gen: 4,
	},
	deepseadew: {
		name: "Deep Sea Dew",
		onModifyMovePriority: -1,
		onModifyMove(move, target) {
			if (move.category !== "Status" && move.basePower >0) {
				if (!move.secondaries) move.secondaries = [];
				for (const secondary of move.secondaries) {
					if (secondary.volatileStatus === 'partiallytrapped') return;
				}
				move.secondaries.push({
					volatileStatus: 'partiallytrapped',
				});
				this.add('-activate', target, 'item: Deep Sea Dew');
			}
		},
		gen: 8,
	},
	seismiclever: {
		name: "Seismic Lever",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onDamagePriority: -20,	
		onFoeDamage(damage, target, source, effect) {
			if (effect.effectType === 'Move')
				return damage + source.level/2
		},

		num: 270,
		gen: 4,
	},
	azureflute: {
		name: "Azure Flute",
		spritenum: 242,
		fling: {
			basePower: 10,
		},
		onResidualOrder: 5,
		onResidualSubOrder: 4,
		onResidual(pokemon) {
			if (this.prng.next(32) === 1) {
				for (let foe of pokemon.foes()) {
					this.add('-activate', pokemon, 'item: Azure Flute');
					foe.faint()
				}
			}
		},
		num: 234,
		gen: 2,
	},
	gladiatorhelmet: {
		onDamage(damage, target, source, effect) {
			if (effect.id === 'recoil') {
				if (!this.activeMove) throw new Error("Battle.activeMove is null");
				if (this.activeMove.id !== 'struggle') return null;
			}
		},
		name: "Gladiator Helmet",
		num: 69,
	},
	superbrightpowder: {
		name: "Super Bright Powder",
		spritenum: 51,
		fling: {
			basePower: 10,
		},
		onModifyAccuracyPriority: -2,
		onModifyAccuracy(accuracy,source,target) {
			if (typeof accuracy !== 'number') return;
			this.debug('brightpowder - decreasing accuracy');
			if (target.volatiles['elite']) return;
			return this.chainModify([3277, 4096]);
		},
		num: 213,
		gen: 2,
	},
	superexpertbelt: {
		name: "Super Expert Belt",
		spritenum: 132,
		fling: {
			basePower: 10,
		},
		onModifyDamage(damage, source, target, move) {
			if (move && target.getMoveHitData(move).typeMod > 0) {
				return this.chainModify([5734, 4096]);
			}
		},
		num: 268,
		gen: 4,
	},
	hugeberry: {
		name: "Huge Berry",
		spritenum: 5,
		isBerry: true,
		naturalGift: {
			basePower: 180,
			type: "Dragon",
		},
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 4 || (pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility('gluttony'))) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon)) return false;
		},
		onEat(pokemon) {
			this.heal(pokemon.baseMaxhp * 0.70);
			
		},
		num: 162,
		gen: 3,
	},
	wonderfulberry: {
		name: "Wonderful Berry",
		spritenum: 78,
		isBerry: true,
		naturalGift: {
			basePower: 180,
			type: "Normal",
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.debug('-50% reduction');
					this.add('-enditem', target, this.effect, '[weaken]');
					return this.chainModify(0.5);
				}
			}
		},
		onEat() { },
		num: 198,
		gen: 4,
	},
	superscopelens: {
		name: "Super Scope Lens",
		fling: {
			basePower: 60,
		},
		spritenum: 475,
		onModifyCritRatio(critRatio, user) {
				return critRatio + 2;
		},
		num: 259,
		gen: 8,
	},
	ggguangscopelens: {
		name: "Ggguang Scope Lens",
		fling: {
			basePower: 60,
		},
		spritenum: 475,
		onModifyCritRatio(critRatio, user) {
				return critRatio + 3;
		},
		num: 259,
		gen: 8,
	},
	ejectstation: {
		name: "Eject Station",
		spritenum: 714,
		fling: {
			basePower: 50,
		},
		onAfterBoost(boost, target, source, effect) {
			if (this.activeMove?.id === 'partingshot') return;
			let eject = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					eject = true;
				}
			}
			if (eject) {
				if (target.hp) {
					if (!this.canSwitch(target.side)) return;
					for (const pokemon of this.getAllActive()) {
						if (pokemon.switchFlag === true) return;
					}
					target.switchFlag = true;
				}
			}
		},
		num: 1119,
		gen: 8,
	},
	Satorinowheelchair: {
		name: "Satori No Wheelchair",
		spritenum: 249,
		fling: {
			basePower: 30,
		},
		onModifyDamage(damage, source, target, move) {
			return this.chainModify([6144, 4096]);
		},
		onModifySpe(spe, pokemon) {
			if (this.field.getPseudoWeather('trickroom'))
				return this.chainModify([8192, 4096]);
			return this.chainModify([2048, 4096]);

		},
		num: 270,
		gen: 4,
	},
	oldsouldew: {
		name: "Old Soul Dew",
		spritenum: 459,
		fling: {
			basePower: 30,
		},
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			return this.chainModify(1.5);

		},
		onModifySpDPriority: 1,
		onModifySpD(spd, pokemon) {
			return this.chainModify(1.5);
		},
		num: 225,
		gen: 3,
	},
	consolationprize: {
		name: "Consolation Prize",
		spritenum: 459,
		fling: {
			basePower: 30,
		},
		onStart(pokemon) {
			let min1: keyof typeof pokemon.storedStats = 'atk';
			let min2: keyof typeof pokemon.storedStats = 'atk';
			for (let x in pokemon.storedStats) {
				if (pokemon.storedStats[x as keyof typeof pokemon.storedStats] < pokemon.storedStats[min1]) {
					min2 = min1;
					min1 = x as keyof typeof pokemon.storedStats;
				} else if (pokemon.storedStats[x as keyof typeof pokemon.storedStats] < pokemon.storedStats[min2]) {
					min2 = x as keyof typeof pokemon.storedStats;
				}
			}
			pokemon.storedStats[min1] *= 1.5;
			pokemon.storedStats[min2] *= 1.5;
		},
		num: 225,
		gen: 3,
	},
	smoketrigger: {
		name: "Smoke Trigger",
		spritenum: 2,
		fling: {
			basePower: 30,
		},
		onDamagingHit(damage, target, source, move) {
			if (move) {
				if (target.useItem()) {
					this.boost({ accuracy: -2 }, source, target, this.effect);
				}
			}
		},
		
		num: 545,
		gen: 5,
	},
	thruster: {
		name: "Thruster",
		spritenum: 2,
		fling: {
			basePower: 30,
		},
		onResidualOrder: 5,
		onResidualSubOrder: 4,
		onResidual(pokemon) {
			if (pokemon.activeTurns) {
				this.boost({ spe: 1 });
			}
		},

		num: 545,
		gen: 5,
	},
	custapElement: {
		name: "Custap Element",
		spritenum: 86,
		onFractionalPriorityPriority: -2,
		onFractionalPriority(priority, pokemon) {
			if (
				priority <= 0 && pokemon.hp <= pokemon.maxhp / 4 
			) {
					this.add('-activate', pokemon, 'item: Custap Element');
					return 0.1;
				}
			
		},
		num: 210,
		gen: 4,
	},
	micromaster: {
		name: "Micro Master",
		spritenum: 86,
		onModifyAtkPriority: 1001,
		onModifyAtk(atk, pokemon) {
			if (pokemon.m.micromaster){
				pokemon.m.micromaster=undefined
				return this.chainModify(2);
			}
		},
		onModifySpAPriority: 1001,
		onModifySpA(spa, pokemon) {
			if (pokemon.m.micromaster){
				pokemon.m.micromaster=undefined
				return this.chainModify(2);
			}
		},
		onBeforeMove(source, target, move) {
			
			if (move.category==='Special' &&source.lastMove?.category === 'Physical'
			||(move.category==='Physical'&&source.lastMove?.category === 'Special'))
		 		source.m.micromaster=true;
		},
	
		num: 210,
		gen: 4,
	},
	
	effortberry: {
		name: "Effort Berry",
		spritenum: 5,
		isBerry: true,
		naturalGift: {
			basePower: 180,
			type: "Dragon",
		},
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 4 || (pokemon.hp <= pokemon.maxhp / 2 && pokemon.hasAbility('gluttony'))) {
				pokemon.eatItem();
			}
		},
		onTryEatItem(item, pokemon) {
			if (!this.runEvent('TryHeal', pokemon)) return false;
		},
		onEat(pokemon) {
			for(let i in pokemon.set.evs){
				pokemon.set.evs[i as keyof typeof pokemon.set.evs]=Math.min( pokemon.set.evs[i as keyof typeof pokemon.set.evs]+16,252);
			}
			
		},
		num: 162,
		gen: 3,
	},
	portableearth: {
		name: "Portable Earth",
		spritenum: 86,
		onBeforeMove(source, target, move) {
			if(move.category!=='Status'&&target&&!target.fainted&&target!==source&&source.useItem()){
				this.damage(Math.floor(source.level*1.5),target,source)
				this.add('message',`${source.name} throw the target and take the damage `)
			}
		},
		num: 210,
		gen: 4,
	},
	giantclothes: {
		name: "Giant Clothes",
		spritenum: 86,
		
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			return this.chainModify(1+pokemon.hp/1000);
		},
		onModifySpAPriority: 1,
		onModifySpA(atk, pokemon) {
			return this.chainModify(1+pokemon.hp/1000);
		},
		onBeforeMove(source, target, move) {
			
			if (move.category==='Special' &&source.lastMove?.category === 'Physical'
			||(move.category==='Physical'&&source.lastMove?.category === 'Special'))
		 		source.m.micromaster=true;
		},
	
		num: 210,
		gen: 4,
	},
	deathspeaker: {
		name: "Death Speaker",
		spritenum: 86,
		
		onHit( target, source, move) {
			target.addVolatile('Perish Song',source);
		},
		num: 210,
		gen: 4,
	},
	damagesimplification: {
		name: "Damage Simplification",
		spritenum: 86,
		
		onModifyMove( move, pokemon, target) {
			if(!move.damageCallback&&move.category!=="Status"){
				if(move.category==="Physical"){
					move.damageCallback=(pokemon,target)=>{
				
						return (move.basePower+pokemon.level+pokemon.storedStats.atk-target.storedStats.def)*Math.pow(2, this.dex.getEffectiveness(move.type,target.types))
					}
				}else{
					move.damageCallback=(pokemon,target)=>{
				
						return (move.basePower+pokemon.level+pokemon.storedStats.spa-target.storedStats.spd)*Math.pow(2, this.dex.getEffectiveness(move.type,target.types))
					}
				}
				
			}
			
		},
		num: 210,
		gen: 4,
	},
	
};
