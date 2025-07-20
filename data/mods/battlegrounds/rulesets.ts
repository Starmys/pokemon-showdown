import { FS } from "../../../lib";
import { Teams, Pokemon } from "../../../sim";
// import { championreward, evolution, sample } from "./moves";
import { PokemonPool } from "../../../config/rouge/pokemon-pool";
import { RewardPool, WeightPool, updateWeightPool } from "../../../config/rouge/reward-pool";
import { RougeDesc } from "../../../config/rouge/descs";
import type { ChoiceRequest } from '../../../sim/side';


const turnInterval = 8;

function choicemove(battle: Battle, activePoke: Pokemon, foeActivePoke: Pokemon) {
	activePoke.side.clearChoice();
	const side = activePoke.side;
	const foeSide =foeActivePoke.side;
	const activemoves = activePoke.getMoves().filter(movedata => !!movedata.pp && movedata.id !== "sleeptalk").map(movedata => movedata.id).map(moveid => Dex.moves.get(moveid));
	//const activemoves=activePoke.moves.filter(movedata => !!activePoke.getMoveData(movedata)?.pp&&this.toID(movedata)!=="sleeptalk").map(movedata => movedata.move).map(moveid=>Dex.moves.get(moveid))
	const checkImmune = (move: Move): boolean => {
		//const move = Dex.moves.get(moveid);
		if (move.id === 'thousandarrows') return true;
		if (!Dex.getImmunity(move.type, foeActivePoke)) return false;
		switch (Dex.toID(activePoke.ability)) {
			case 'moldbreaker':
			case 'turboblaze':
			case 'teravolt':
				return true;
		}
		switch (move.id) {
			case 'sunsteelstrike':
			case 'searingsunrazesmash':
			case 'moongeistbeam':
			case 'menacingmoonrazemaelstrom':
			case 'photongeyser':
			case 'lightthatburnsthesky':
			case 'gmaxdrumsolo':
			case 'gmaxfireball':
			case 'gmaxhydrosnipe':
				return true;
		}
		if (move.flags['powder'] && foeActivePoke.hasType('Grass')) return false;
		if (move.flags['bullet'] && foeActivePoke.hasAbility('Bulletproof')) return false;
		if (move.flags['sound'] && foeActivePoke.hasAbility('Soundproof')) return false;
		if (move.flags['wind'] && foeActivePoke.hasAbility('Wind Rider')) return false;
		if (move.target !== 'self') {
			switch (move.type) {
				case 'Grass':
					return !foeActivePoke.hasAbility(['sapsipper']);
				case 'Fire':
					return !foeActivePoke.hasAbility(['flashfire']);
				case 'Water':
					return !foeActivePoke.hasAbility(['stormdrain', 'waterabsorb', 'dryskin']);
				case 'Electric':
					return !foeActivePoke.hasAbility(['voltabsorb', 'motordrive', 'lightningrod']);
				case 'Ground':
					return !foeActivePoke.hasAbility(['Levitate', 'Earth Eater']);
				case 'Fighting':
					return !foeActivePoke.hasAbility(['hide']);
			}
		}
		return true;
	};
	const isHealMove = (move: Move) => {

		return move.flags['heal'] && !move.basePower;

	};
	// isStatusMove will not filter 1pp moves, cause it's  exclusive move of champion pokemon
	const isStatusMove = (move: Move) => {
		//const move = Dex.moves.get(moveid);
		//return move.category === 'Status' || move.pp===1;
		return move.category === 'Status';
	};

	let event: 'mega' | 'zmove' | 'ultra' | 'dynamax' | 'terastallize' | '' = activePoke.canMegaEvo ? 'mega' : '';
	if (!event && battle.toID(activePoke.ability) !== 'shopman') {
		// this.add('html',`${this.p1.pokemonLeft}        ${this.p1.team.length}`)
		//调整极巨化和钛晶化概率的变量
		let p = side.team.length > 1 ? 1 : 0;
		if (activePoke.hp > activePoke.maxhp / 2)
			p *= 2;
		else if (activePoke.hp < activePoke.maxhp / 4)
			p /= 2;
		else if (activePoke.canTerastallize && battle.randomChance(2 * p, (side.pokemonLeft - 2) * (9 - side.team.length) * 2) && !activePoke.volatiles['dynamax'])
			event = 'terastallize';
	}
	const forceSwitch = activePoke.fainted
	const boostlv = eval(Object.values(activePoke.boosts).join('+'));
	const boostSwicth = boostlv + 13 < battle.random(12) + 1 && !activePoke.volatiles['dynamax'];
	const abilitySwitch = activePoke.hasAbility(['truant', 'normalize']) && !activePoke.volatiles['dynamax'];
	const itemSwitch = activePoke.hasItem(['choicescarf', 'choiceband', 'choicespecs']) &&
		activePoke.lastMove && !checkImmune(activePoke.lastMove) && !activePoke.volatiles['dynamax'];
	// Switch
	if (activePoke.side.activeRequest?.forceSwitch || forceSwitch || abilitySwitch || itemSwitch || boostSwicth) {
		const alive = activePoke.side.pokemon.filter(
			x => !x.isActive && !x.fainted
		).map(x => x.name);
		if (alive.length > 0) {
			side.chooseSwitch(battle.prng.sample(alive));
		}
		if (battle.allChoicesDone()) {
			battle.commitChoices();
			battle.sendUpdates();
		}
	}
	// Spectral Thief
	if (!side.isChoiceDone() && !activePoke.volatiles['dynamax']) {
		const foeBoost = eval(Object.values(foeActivePoke.boosts).filter(x => x > 0).join('+'));
		if (!foeActivePoke.hasType('Normal') && foeBoost >= 2) {
			if (activePoke.hasMove('spectralthief')) {
				side.chooseMove('spectralthief', 0, event);
			} else {
				const thief = side.pokemon.find(x => {
					return !x.fainted && x.hasMove('spectralthief');
				});
				if (thief) side.chooseSwitch(thief.name);

			}
		}
	}
	// sleeptalk
	if (!side.isChoiceDone() && activePoke.moves.includes("Sleep Talk")) {
		if (activePoke.status === 'slp' && activePoke.statusState.time > 1) {
			side.chooseMove("Sleep Talk", 0, event);
		}
	}
	// Heal
	if (!side.isChoiceDone() && !activePoke.volatiles['dynamax']) {
		const hpRate = activePoke.hp / activePoke.maxhp;
		const healPress = activePoke.speed > foeActivePoke.speed ? 1 : 2;
		const healRate = Math.pow(1 - hpRate, 3) + 3 * Math.pow(1 - hpRate, 2) * hpRate * healPress;
		if (battle.prng.randomChance(healRate * 1000, 1000)) {
			const healingMove = activemoves.find(isHealMove);
			if (healingMove) {
				side.chooseMove(healingMove.name, 0, event);
			}
		}
	}
	// Other Moves
	if (!side.isChoiceDone()) {
		let expectMove;
		let movesNotHeal = activemoves.filter(move => !isHealMove(move));
		if (battle.randomChance(5, 6)) {
			movesNotHeal = movesNotHeal.filter(move => checkImmune(move));
		}
		// const movesNotImmune = movesNotHeal.filter(move => checkImmune(move));
		// const movesNotStatus = movesNotImmune.filter(move => !isStatusMove(move));
		const chooseMove = (move: Move | undefined = undefined, forceDamagingMove: boolean = false) => {
			if (!move || !isStatusMove(move) || forceDamagingMove) {
				let moves = movesNotHeal.filter(move => !isStatusMove(move));
				if (moves.length <= 0) {
					return;
				}
				if (battle.randomChance(2, 3)) {
					const movePowers = moves.map(move => {
						let Effectiveness;
						if (!Dex.getImmunity(move.type, foeActivePoke)) {
							Effectiveness = 0;
						} else {
							Effectiveness = Math.pow(2, Dex.getEffectiveness(move.type, foeActivePoke));
						}
						let power = move.basePower;
						if (move.basePowerCallback) {
							power = 80;

						}
						if (move.priority > 0 && activePoke.speed < foeActivePoke.speed) {
							power += 50;
						}

						if (move.flags['heal']) {
							power += 15;
						}
						let stab = 1;
						if (activePoke.getTypes().includes(move.type) || activePoke.getTypes(false, true).includes(move.type)) {
							stab = 1.5;
						}
						let accuracy = move.accuracy;
						if (accuracy === true) {
							accuracy = 100;
						}
						const dam = Effectiveness * power * stab * accuracy;
						return Number.isNaN(dam) ? 0 : dam;
					});
					return moves[movePowers.indexOf(Math.max(...movePowers))];
				}
				if (!move) {
					return battle.sample(moves);
				}
				return move;
			} else {
				return move;
			}
		};

		if ((activePoke.boosts.atk >= 6 || activePoke.boosts.spa >= 6 || boostlv >= battle.random(12) + 2 || battle.field.getPseudoWeather('physicalsuppression') || activePoke.volatiles['dynamax'])) {
			expectMove = chooseMove(undefined, true);
		} else if (movesNotHeal.length) {
			expectMove = battle.sample(movesNotHeal);
			expectMove = chooseMove(expectMove);
		} else if (activemoves.length > 0) {
			expectMove = battle.sample(activemoves);
			expectMove = chooseMove(expectMove);
		}
		if (expectMove) {
			side.chooseMove(expectMove.name, 0, event);
		}
	}
	if (!side.isChoiceDone()) side.autoChoose();
	
}

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	battlegroundmode: {
		effectType: 'Rule',
		name: 'Battleground Mode',
		ruleset: [
			'Timer Starting = 600', 'Timer Add Per Turn = 30', 'Timer Max Per Turn = 60', 'Timer Max First Turn = 60',
			'Timeout Auto Choose', 'Dynamax Clause',
		],

		onBeforeTurn(pokemon) {
			// if (this.turn === 1 && pokemon.side === this.p1) {
			// 	let relics = RougeUtils.getRelics(this.toID(this.p2.name)).map(x => x.toLowerCase().replace(/[^a-z0-9]+/g, ''));
			// 	for (let x of relics) {
			// 		relicsEffects[x as keyof typeof relicsEffects](this);
			// 		if (x === 'finalact') break;
			// 	}
			// } else if (pokemon.side === this.p1 && this.prng.random(40) === 1 && !this.field.effectiveWeather()) {
			// 	this.field.setWeather(this.sample(['raindance', 'snow', 'sunnyday', 'sandstorm']));
			// }
		},
		onSwitchInPriority: 2,
		onSwitchIn(pokemon) {
			if (pokemon.set.shiny) {
				pokemon.addVolatile('shiny');
			}
		},
	},
	battlegroundauto: {
		effectType: 'Rule',
		name: 'Battleground Auto',
		onBegin() {
			this.p1.emitRequest = (update: ChoiceRequest) => {
				// this.p1.clearChoice();
				setTimeout(() => {
					// choicemove(this, target, target.side.foe.active[0]);
					if (this.ended) return;
					choicemove(this, this.p1.active[0], this.p2.active[0]);
					choicemove(this, this.p2.active[0], this.p1.active[0]);
					this.commitChoices();
					this.sendUpdates();
				}, turnInterval * 1000);
				return;
			};
			this.p2.emitRequest = (update: ChoiceRequest) => {
				// this.p2.clearChoice();
				return;
			};
			// this.p1.emitRequest = (update: ChoiceRequest) => {
			// 	update = update || this.p1.activeRequest;
			// 	this.send('sideupdate', `${this.p1.id}\n|request|${JSON.stringify(update)}`);
			// 	this.p1.activeRequest = update;
			// 	// @ts-ignore

			// };
			// this.p2.emitRequest = (update: ChoiceRequest) => {
			// 	update = update || this.p2.activeRequest;
			// 	this.send('sideupdate', `${this.p1.id}\n|request|${JSON.stringify(update)}`);
			// 	this.p2.activeRequest = update;
			// 	// @ts-ignore

			// };
			// this.add('html', `<div class="broadcast-green"><strong>训练家${userName}开始挑战${gymName}道馆!</strong></div>`);
			
			// setTimeout(() => {
			// 	choicemove(this, this.p1.active[0], this.p2.active[0]);
			// 	choicemove(this, this.p2.active[0], this.p1.active[0]);
			// 	this.commitChoices();
			// 	this.sendUpdates();
				
			// }, turnInterval * 1000);
		},
		onResidual(target, source, effect) {
			if (target.side === this.p1) return;
			// setTimeout(() => {
			// 	// choicemove(this, target, target.side.foe.active[0]);
			// 	choicemove(this, this.p1.active[0], this.p2.active[0]);
			// 	choicemove(this, this.p2.active[0], this.p1.active[0]);
			// 	this.commitChoices();
			// 	this.sendUpdates();
			// }, turnInterval * 1000);
		},
		onBeforeTurn(pokemon) {
			if (this.turn === 1 && pokemon.side === this.p1) {
				this.field.addPseudoWeather('Hard Mode');
			}
		},
	},
	standardnatdex: {
		ruleset: [
			'Obtainable', '+Unobtainable', '+Past', 'Sketch Post-Gen 7 Moves', 'Nickname Clause', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause',
		],
		inherit: true
	}

};
