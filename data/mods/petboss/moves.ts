export const Moves: {[k: string]: ModdedMoveData} = {
	totemexeggutorattack: {
		/*num: 118,*/
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Totem Exeggutor Attack",
		pp: 40,
		priority: 0,
		multihit: 3,
		flags: {},
		onHit(target, source, effect) {
			const validTargets = this.sides.slice(1).map(side => side.active[0]).filter(pokemon => !pokemon.fainted);
			if (validTargets.length > 0) {
				this.actions.useMove(
					this.prng.sample(['totemleafstorm', 'totemdracometeor', 'totemflamethrower']),
					this.p1.active[0],
					this.prng.sample(validTargets)
				);
			}
		},
		secondary: null,
		target: "self",
		type: "Normal",
		contestType: "Cute",
	},
	totemleafstorm: {
		/*num: 437,*/
		accuracy: 100,
		basePower: 130,
		category: "Special",
		name: "Totem Leaf Storm",
		pp: 15,
		priority: 0,
		onTryMove() {
			this.attrLastMove('[still]');
		},
		onPrepareHit(target, source) {
			this.add('-anim', source, 'Leaf Storm', target);
		},
		flags: { protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		//secondary: {
		//	chance: 100,
		//	boosts: {
		//		spe: -1,
		//	},
		//},

		target: "normal",
		type: "Grass",
		contestType: "Beautiful",
	},
	totemdracometeor: {
		/*num: 434,*/
		accuracy: 100,
		basePower: 130,
		category: "Special",
		name: "Totem Draco Meteor",
		pp: 15,
		priority: 0,
		onTryMove() {
			this.attrLastMove('[still]');
		},
		onPrepareHit(target, source) {
			this.add('-anim', source, 'Draco Meteor', target);
		},
		flags: { protect: 1, mirror: 1 },
		secondary: {
			chance: 100,
			boosts: {
				atk: -1,
			},
		},

		target: "normal",
		type: "Dragon",
		contestType: "Beautiful",
	},
	totemflamethrower: {
		/*num: 53,*/
		accuracy: 100,
		basePower: 90,
		category: "Special",
		name: "Totem Flamethrower",
		pp: 15,
		priority: 0,
		onTryMove() {
			this.attrLastMove('[still]');
		},
		onPrepareHit(target, source) {
			this.add('-anim', source, 'Flamethrower', target);
		},
		flags: { protect: 1, mirror: 1 },
		weather: 'sunnyday',
		secondary: {
			chance: 30,
			status: 'brn',
		},

		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
	},
	lightscreen: {
		inherit: true,
		condition: {
			duration: 5,
			durationCallback(target, source, effect) {
				if (source?.hasItem('lightclay')) {
					return 8;
				}
				return 5;
			},
			onAnyModifyDamage(damage, source, target, move) {
				if (!target.volatiles['dynamax2'] && this.getCategory(move) === 'Special') {
					if (!target.getMoveHitData(move).crit && !move.infiltrates) {
						this.debug('Light Screen weaken');
						if (this.activePerHalf > 1) return this.chainModify([2732, 4096]);
						return this.chainModify(0.5);
					}
				}
			},
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Light Screen');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 2,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Light Screen');
			},
		},
	},
	reflect: {
		inherit: true,
		condition: {
			duration: 5,
			durationCallback(target, source, effect) {
				if (source?.hasItem('lightclay')) {
					return 8;
				}
				return 5;
			},
			onAnyModifyDamage(damage, source, target, move) {
				if (!target.volatiles['dynamax2'] && this.getCategory(move) === 'Physical') {
					if (!target.getMoveHitData(move).crit && !move.infiltrates) {
						this.debug('Reflect weaken');
						if (this.activePerHalf > 1) return this.chainModify([2732, 4096]);
						return this.chainModify(0.5);
					}
				}
			},
			onSideStart(side) {
				this.add('-sidestart', side, 'Reflect');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 1,
			onSideEnd(side) {
				this.add('-sideend', side, 'Reflect');
			},
		},
	},
	gearup: {
		inherit: true,
		onHitSide(side, source, move) {

			const targets = side.allies().concat(side.foes()).filter(target => (
				target.hasAbility(['plus', 'minus']) &&
				(!target.volatiles['maxguard'] || this.runEvent('TryHit', target, source, move))
			));
			if (!targets.length) return false;
			let didSomething = false;
			for (const target of targets) {
				didSomething = this.boost({ atk: 1, spa: 1 }, target, source, move, false, true) || didSomething;
			}
			return didSomething;
		},

	},
	magneticflux: {
		inherit: true,
		onHitSide(side, source, move) {
			const targets = side.allies().concat(side.foes()).filter(ally => (
				ally.hasAbility(['plus', 'minus']) &&
				(!ally.volatiles['maxguard'] || this.runEvent('TryHit', ally, source, move))
			));
			if (!targets.length) return false;

			let didSomething = false;
			for (const target of targets) {
				didSomething = this.boost({ def: 1, spd: 1 }, target, source, move, false, true) || didSomething;
			}
			return didSomething;
		},
	},
	grudge: {
		inherit: true,
		condition: {
			onStart(pokemon) {
				this.add('-singlemove', pokemon, 'Grudge');
			},
			onFaint(target, source, effect) {
				if (!source || source.fainted || !effect) return;
				if (effect.effectType === 'Move' && !effect.isFutureMove && source.lastMove) {
					let move: Move = source.lastMove;
					if (move.isMax && move.baseMove) move = this.dex.moves.get(move.baseMove);
					if (source.volatiles['dynamax2']) {
						this.add('-hint', "Dynamaxed Pokémon are immune to grudge.");
						return;
					}
					for (const moveSlot of source.moveSlots) {
						if (moveSlot.id === move.id) {
							moveSlot.pp = 0;
							this.add('-activate', source, 'move: Grudge', move.name);
						}
					}
				}
			},
			onBeforeMovePriority: 100,
			onBeforeMove(pokemon) {
				this.debug('removing Grudge before attack');
				pokemon.removeVolatile('grudge');
			},
		},
	},
	destinybond: {
		inherit: true,
		condition: {
			onStart(pokemon) {
				this.add('-singlemove', pokemon, 'Destiny Bond');
			},
			onFaint(target, source, effect) {
				if (!source || !effect || target.isAlly(source)) return;
				if (effect.effectType === 'Move' && !effect.isFutureMove) {
					if (source.volatiles['dynamax'] || source.volatiles['dynamax2']) {
						this.add('-hint', "Dynamaxed Pokémon are immune to Destiny Bond.");
						return;
					}
					this.add('-activate', target, 'move: Destiny Bond');
					source.faint();
				}
			},
			onBeforeMovePriority: -1,
			onBeforeMove(pokemon, target, move) {
				if (move.id === 'destinybond') return;
				this.debug('removing Destiny Bond before attack');
				pokemon.removeVolatile('destinybond');
			},
			onMoveAborted(pokemon, target, move) {
				pokemon.removeVolatile('destinybond');
			},
		},
	},
	followme: {
		inherit: true,
		condition: {
			duration: 1,
			onStart(target, source, effect) {
				if (effect?.id === 'zpower') {
					this.add('-singleturn', target, 'move: Follow Me', '[zeffect]');
				} else {
					this.add('-singleturn', target, 'move: Follow Me');
				}
			},
			onFoeRedirectTargetPriority: 1,
			onFoeRedirectTarget(target, source, source2, move) {
				if (!this.effectState.target.isSkyDropped() && this.validTarget(this.effectState.target, source, move.target)) {
					if (move.smartTarget) move.smartTarget = false;
					this.debug("Follow Me redirected target of move");
					return this.effectState.target;
				}
			},
			onAllyRedirectTarget(target, source, source2, move) {
				if (this.effectState.target.side === this.p3)
					if (!this.effectState.target.isSkyDropped() && this.validTarget(this.effectState.target, source, move.target)) {
						if (move.smartTarget) move.smartTarget = false;
						this.debug("Follow Me redirected target of move");
						return this.effectState.target;
					}
			},
		},

	},
	spotlight: {
		inherit: true,
		condition: {
			duration: 1,
			onStart(pokemon) {
				this.add('-singleturn', pokemon, 'move: Spotlight');
			},
			onFoeRedirectTargetPriority: 2,
			onFoeRedirectTarget(target, source, source2, move) {
				if (this.validTarget(this.effectState.target, source, move.target)) {
					this.debug("Spotlight redirected target of move");
					return this.effectState.target;
				}
			},
			onAllyRedirectTarget(target, source, source2, move) {
				if (this.effectState.target.side === this.p3)
					if (!this.effectState.target.isSkyDropped() && this.validTarget(this.effectState.target, source, move.target)) {
						if (move.smartTarget) move.smartTarget = false;
						this.debug("Spotlight redirected target of move");
						return this.effectState.target;
					}
			},
		},

	},
	howl: {
		inherit: true,
		

		onTryMove(pokemon, target, move) {
			if (pokemon.side === this.p2 || pokemon.side ===  this.p4)
				this.boost({ atk: 1 }, this.p3!.active[0], pokemon, move, false, true);
			else {
				this.boost({ atk: 1}, this.p2.active[0], pokemon, move, false, true);
				this.boost({ atk: 1}, this.p4!.active[0], pokemon, move, false, true);
		}
		},
	},
	junglehealing: {
		inherit: true,
		target:'all',
		onHit(pokemon) {
			if (pokemon.volatiles['dynamax2']) return null;
			const success = !!this.heal(this.modify(pokemon.maxhp, 0.25));
			return pokemon.cureStatus() || success;
		},
	},
	lifedew: {
		inherit: true,
	
		onTryMove(pokemon, target, move)  {
			if (pokemon.side === this.p2 || pokemon.side === this.p4)
				this.heal(this.modify(this.p3!.active[0].maxhp, 0.25) ,this.p3!.active[0]);
			else {
				this.heal(this.modify(this.p2.active[0].maxhp, 0.25), this.p2.active[0]);
				this.heal(this.modify(this.p4!.active[0].maxhp, 0.25), this.p4!.active[0]);
			}
		},
	},
	helpinghand: {
		inherit: true,
		target: 'normal',
	},
	coaching: {
		inherit: true,
		target: 'normal',
	},
	aromaticmist: {
		inherit: true,
		target: 'normal',
	},
}