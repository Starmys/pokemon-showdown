/*
	p1 = Bot Side
	p2, p3, p4 = User Sides
*/

import { FS } from "../../../lib";
import { Teams, Pokemon } from "../../../sim";
import { PetModeBossConfig } from "../../../config/pet-mode/boss-config";

const USERPATH = 'config/pet-mode/user-properties';
const DEPOSITPATH = 'config/pet-mode/deposit';

const bossConfig: { [bossname: string]: {
	'set': string, 'bonus': string
} } = PetModeBossConfig;

function getBossTeam(userid: string): PokemonSet[] {
	const bossName = FS(`${DEPOSITPATH}/${userid}.txt`).readIfExistsSync();
	return Teams.unpack(bossConfig[bossName]?.set || 'Magikarp|||SwiftSwim|Splash|Hardy||M|0,0,0,0,0,0||5|')!;
}

function giveBonus(userid: string, bossname: string) {
	let userProperty = JSON.parse(FS(`${USERPATH}/${userid}.json`).readIfExistsSync());
	if (userProperty['boss'].find(bossname)) return;
	userProperty['boss'].push(bossname);
	userProperty['item'][bossConfig[bossname]['bonus']] = 1;
	FS(`${USERPATH}/${userid}.json`).writeSync(JSON.stringify(userProperty));
}

export const Rulesets: {[k: string]: FormatData} = {

	pschinapetmodeboss: {
		name: 'PS China Pet Mode Boss',
		ruleset: ['Dynamax Clause'],
		onBegin() {
			this.p1.emitRequest = (update: AnyObject) => {
				this.send('sideupdate', `${this.p1.id}\n|request|${JSON.stringify(update)}`);
				this.p1.activeRequest = update;
				// @ts-ignore
				setTimeout(() => {
					for (let i = 0; i < 20; i++) {
						this.p1.chooseMove(this.sample(this.p1.active[0].moves), 0);
						if (this.p1.isChoiceDone()) break;
					}
				}, 10);
			}
			this.p1.team = getBossTeam(Dex.toID(this.p2.name));
			this.p1.pokemon = [new Pokemon(this.p1.team[0], this.p1)];
			this.add('html', `<div class="broadcast-green"><strong>野生的${this.p1.team[0].name}出现了!</strong></div>`);
		},
		onModifyMove(move, pokemon, target) {
			if (move.target === 'allAdjacentFoes' ) {
				if (pokemon.side === this.p1) {
					move.target = 'allAdjacent';
				}
				else {
					move.target = 'normal'; move.num = -1;
				}
			}
			if (move.target === 'randomNormal' && pokemon.side !== this.p1) {
				move.num = -1;
			}
			if (move.target === 'allySide' && move.name !== 'Gear Up' && move.name !=='Magnetic Flux') {
				move.target = 'all';
			}
			if (move.target === 'adjacentFoe' || move.target === 'adjacentAlly') {
				move.target = 'normal';
			}
			if (move.target === 'allies' && pokemon.side === this.p3) {
				move.target = 'self';
			}
		},
		onRedirectTargetPriority: 99,
		onRedirectTarget(target, source, source2, move) {
			if (source.side !== this.p1 && move.num === -1) {
				const t = this.p1.active[0];
				return t;
			}
			if (source.side !== this.p1 && move.num !== -1 && move.target === 'normal') {
				return target;
			}
		},
		onAnyAfterBoost(a, target, source, effect) {
			if (source.lastMove!.isMax && source.side === this.p1 && (target.side === this.p2 || target.side === this.p4)) {
				this.boost(a, this.p3!.active[0]);
			}
		},
		onBattleStart() {
			this.p1.allySide = null;
			this.p2.foe = this.p1;
			this.p3!.foe = this.p1;
			this.p4!.foe = this.p1;
			this.p2.allySide = this.p3!;
			this.p3!.allySide = this.p4!;
			this.p4!.allySide = this.p2;
			this.p3!.sideConditions = this.p2.sideConditions;
			this.p4!.sideConditions = this.p2.sideConditions;
			this.p2.pokemonLeft += this.p3!.pokemonLeft;
			this.p4!.pokemonLeft += this.p3!.pokemonLeft;
		},
		onFaint(pokemon) {
			if (pokemon.side === this.p3) {
				this.p2.pokemonLeft--;
				this.p4!.pokemonLeft--;
			}
			if (pokemon.side === this.p1 && this.sides.slice(1).find(side => side.active.length > 0 && !side.active[0].fainted)) {
				this.sides.slice(1).forEach(side => giveBonus(Dex.toID(side.name), pokemon.name));
				this.add('html', `<div class="broadcast-green"><strong>${pokemon.name}逃走了!</strong></div>`);
				this.add('html', `<div class="broadcast-green"><strong>您获得了${pokemon.name}掉落的道具! 快去盒子查看吧!</strong></div>`);
			}
		},
	}
};
