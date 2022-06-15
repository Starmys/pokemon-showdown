import { FS } from "../../../lib";
import { Teams, Pokemon } from "../../../sim";
import { championreward, sample } from "./moves";
import { Pokemonpool } from "../../../config/rouge/pokemonpool";


type rougePassRecord = {'cave': number[], 'void': number[] };
type rougeUserProperty = {
	'rouge'?: string,
	'rougeinit'?: number,
	'passrecord'?: rougePassRecord
};

const USERPATH = 'config/rouge/user-properties';
if (!FS(USERPATH).existsSync()) FS(USERPATH).mkdir();
export class RougeUtils {
	static initMons = [
		'Charmander', 'Squirtle', 'Bulbasaur', 'Pikachu',
		'Cyndaquil', 'Totodile', 'Chikorita',
		'Torchic', 'Mudkip', 'Treecko',
		'Chimchar', 'Piplup', 'Turtwig',
		'Tepig', 'Oshawott', 'Snivy',
		'Fennekin', 'Froakie', 'Chespin',
		'Litten', 'Popplio', 'Rowlet',
		'Scorbunny', 'Sobble', 'Grookey'
	];
	static initMonsAndEvos = Dex.species.all().filter(x => RougeUtils.initMons.includes(x.name) || RougeUtils.initMons.includes(x.prevo) || (x.prevo && RougeUtils.initMons.includes(Dex.species.get(x.prevo)?.prevo))).map(x => x.name);
	static checkUser(userid: string): boolean {
		return FS(`${USERPATH}/${Dex.toID(userid)}.json`).existsSync();
	}

	static getUser(userid: string): rougeUserProperty | undefined {
		if (this.checkUser(userid)) {
			return JSON.parse(FS(`${USERPATH}/${userid}.json`).readIfExistsSync());
		}
	}

	static saveUser(userid: ID, userProperty: rougeUserProperty) {
		FS(`${USERPATH}/${userid}.json`).safeWriteSync(JSON.stringify(userProperty));
	}

	static loadRougeProps(userid: ID): string[] | undefined {
		return this.getUser(userid)?.rouge?.split("&");
	}

	static updateUserTeam(userid: ID, userTeam: string, reset: boolean=false) {
		let userProperty = this.getUser(userid) || {};
		if (userTeam) {
			let rougePropsStr = userProperty['rouge'];
			if (!rougePropsStr || reset)
				userProperty['rouge'] = userTeam.concat('&0&1&&pokemonroom&3');
			else {
				let rougeProps = rougePropsStr.split("&");
				rougeProps[1] = String(Number(rougeProps[1]) + 1);
				rougeProps[0] = userTeam;
				userProperty['rouge'] = rougeProps.join("&");
			}
		} else {
			userProperty['rouge'] = '';
		}
		this.saveUser(userid, userProperty);
	}

	static addWave(userid: ID): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			rougeProps[2] = String(Number(rougeProps[2]) + 1);
			userProperty['rouge'] = rougeProps.join('&');
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static getNextWave(userid: ID): number {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			const wave = Number(userProperty['rouge'].split("&")[2]);
			return wave === 22 ? 14 : Math.floor((4 + wave * 6) / 10);
		} else {
			return 0;
		}
	}

	static addRoom(userid: ID, room: string): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			rougeProps[4] = room;
			userProperty['rouge'] = rougeProps.join('&');
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static getRoom(userid: ID): string {
		return this.getUser(userid)?.rouge?.split("&")[4] || '';
	}

	static getRelics(userid: ID): string[] {
		let relicsStr = this.getUser(userid)?.rouge?.split("&")[3];
		return relicsStr ? relicsStr.split(',') : [];
	}

	static addRelics(userid: ID, relice: string): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			if (rougeProps[3]) {
				rougeProps[3] += ',' + relice;
			} else {
				rougeProps[3] = relice;
			}
			userProperty['rouge'] = rougeProps.join('&');
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static changeLead(userid: ID, num: number): boolean {
		if (!num) return false;
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			let team = rougeProps[0].split(']');
			if (team[num]) {
				let t = team[0];
				team[0] = team[num];
				team[num] = t;
				rougeProps[0] = team.join("]");
				userProperty['rouge'] = rougeProps.join("&");
				this.saveUser(userid, userProperty);
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	static setInitial(userid: ID, init: number): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty) {
			userProperty['rougeinit'] = init;
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static getInitial(userid: ID): number | undefined {
		return this.getUser(userid)?.rougeinit;
	}

	static setPassRecord(userid: ID, passOption: 'cave' | 'void'): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rougeinit) {
			let passNum = userProperty['rougeinit'] - 1;
			let passRecord = userProperty['passrecord'] || { 'cave': Array(25).fill(0), 'void': Array(25).fill(0) };
			passRecord[passOption][passNum]++;
			userProperty['passrecord'] = passRecord;
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static getPassRecord(userid: ID): rougePassRecord | undefined {
		return this.getUser(userid)?.passrecord;
	}
	static getLives(userid: ID): number | undefined {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			if (rougeProps[5]) {
				let life = Number(rougeProps[5]);
				return life;
			} else {
				return 0;
			}
		} else {
			return 0;
		}
	}
	static reduceLives(userid: ID): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			if (rougeProps[5]) {
				let life = Number(rougeProps[5]);
				if (rougeProps[4] && rougeProps[4] === 'championroom') {
					life -= 2;
				} else {
					life--;
				}
				if (life <= 0) {
					return false
				} else {
					rougeProps[5] = String(life);
					rougeProps[2] = String(Number(rougeProps[2]) - 1);
					userProperty['rouge'] = rougeProps.join('&');
					this.saveUser(userid, userProperty);
					return true
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
	static addLives(userid: ID, life: number=1): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			if (rougeProps[5]) {
				rougeProps[5] = String(Number(rougeProps[5]) + life);
				userProperty['rouge'] = rougeProps.join('&');
				this.saveUser(userid, userProperty);
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}
	static setItem(pokemon: Pokemon, item: string | Item, source?: Pokemon, effect?: Effect) {
		if (!pokemon.hp ) return false;
		if (pokemon.itemState.knockedOff) return false;
		if (typeof item === 'string') item = pokemon.battle.dex.items.get(item);

		
		pokemon.item = item.id;
		pokemon.itemState = { id: item.id, target: pokemon };
		if (item.id) {
			pokemon.battle.singleEvent('Start', item, pokemon.itemState, pokemon, source, effect);
		}
		return true;
	}
}

const relicsEffects = {
	'artirain': (battle: Battle) => {
		battle.field.setWeather('raindance', battle.p2.active[0]);
		battle.add('message','your Artirain makes it rain');
	},
	'artihail': (battle: Battle) => {
		battle.field.setWeather('hail', battle.p2.active[0]);
		battle.add('message', 'your Artihail makes it hail');
	},
	'artistorm': (battle: Battle) => {
		battle.field.setWeather('sandstorm', battle.p2.active[0]);
		battle.add('message', 'your Artistorm makes it sandstorm');
	},
	'artisunny': (battle: Battle) => {
		battle.field.setWeather('sunnyday', battle.p2.active[0]);
		battle.add('message', 'your Artisunny makes it sunny');
	},
	'confidentstart': (battle: Battle) => {
		let x = Math.min(RougeUtils.getNextWave(battle.toID(battle.p2.name)) / 5, 3);
		for (let i = 0; i < x; i++)
			battle.boost(battle.sample([{ atk: 1 }, { def: 1 }, { spa: 1 }, { spd: 1 }, { spe: 1 }]), battle.p2.active[0]);
	},
	'artireflect': (battle: Battle) => {
		battle.p2.addSideCondition('reflect');
		battle.add('message', 'your Artireflect makes reflect start on your side for 5 turn');
	},
	'artilightscreen': (battle: Battle) => {
		battle.p2.addSideCondition('lightscreen');
		battle.add('message', 'your Artilightscreen makes lightscreen start on your side for 5 turn');
	},
	'focusdevice': (battle: Battle) => {
		battle.field.addPseudoWeather('Focus Room');
		battle.add('message', 'your Focus Device makes Focus Room start');
	},
	'angelhalo': (battle: Battle) => {
		battle.sample(battle.p2.pokemon).m.innate = 'elite';
	},
	'industrialplant': (battle: Battle) => {
		battle.field.setTerrain('Steel Terrain');
		battle.add('message', 'your Industrial Plant makes Steel Terrain start');
	},
	'eggofcompassion': (battle: Battle) => {
		battle.field.addPseudoWeather('Mercy Aura');
		battle.add('message', 'your Egg Of Compassion makes Mercy Aura start');
	},
	'dancingfloor': (battle: Battle) => {
		battle.field.addPseudoWeather('Ball Aura');
		battle.add('message', 'your Dancing Floor makes Mercy Aura start');
	},
	'dragonthrones': (battle: Battle) => {
		battle.field.addPseudoWeather("Dragon's Majesty");
		battle.add('message', 'your Dragon Thrones makes Mercy Aura start');
	},
	'acupressuremat': (battle: Battle) => {
		battle.actions.useMove('Spikes', battle.p2.active[0]);
		if (battle.p2.active[0].volatiles['choicelock'])
			battle.p2.active[0].removeVolatile('choicelock');
		battle.p2.active[0].abilityState.choiceLock = "";
	},
	'gravitygenerator': (battle: Battle) => {
		battle.field.addPseudoWeather("Gravity", battle.p2.active[0], battle.effect);
		battle.add('message', 'your Gravity Generator makes Gravity start');
	},
	"trickprops": (battle: Battle) => {
		battle.field.addPseudoWeather("Trick Room", battle.p2.active[0], battle.effect);
		battle.add('message', 'your Trick Props makes Trick Room start');
	},
	'soymilk': (battle: Battle) => {
		battle.field.addPseudoWeather("Guerrilla");
		battle.add('message', 'your Soy Milk makes Guerrilla start');
	},
	'ticketofcolosseum': (battle: Battle) => {
		battle.field.addPseudoWeather("Boxing Area");
		battle.add('message', 'your Ticket Of Colosseum makes Guerrilla start');
	},
	'gardenguardian': (battle: Battle) => {
		battle.field.addPseudoWeather("Garden Shield");
		battle.add('message', 'your Garden Guardian makes Garden Shield start');
	},
	'industrialemissions': (battle: Battle) => {
		battle.field.addPseudoWeather("Acid Rain");
		battle.add('message', 'your Industrial Emissions makes Acid Rain start');
	},
	'poletracker': (battle: Battle) => {
		battle.field.addPseudoWeather("Iceberg");
		battle.add('message', 'your Pole Tracker makes Iceberg start');
	},
	'potionofrapidgrowth': (battle: Battle) => {
		battle.actions.useMove('Twining Vine', battle.p2.active[0]);
		if (battle.p2.active[0].volatiles['choicelock'])
			battle.p2.active[0].removeVolatile('choicelock');
		battle.p2.active[0].abilityState.choiceLock = "";
	},
	'combustible': (battle: Battle) => {
		battle.field.addPseudoWeather("Purgatory");
		battle.add('message', 'your combustible makes Purgatory start');
	},
	'sunshower': (battle: Battle) => {
		battle.field.addPseudoWeather("Rainbow");
		battle.add('message', 'your sunshower makes Rainbow start');
	},
	'guardianshield': (battle: Battle) => {
		battle.p2.addSideCondition('Guardian Shield');
		battle.add('message', 'The Guardian Shield start on your side');
	},
	'swordoftrying': (battle: Battle) => {
		battle.damage(battle.p1.active[0].hp - 1, battle.p1.active[0])
		battle.add('message', 'The enemy was tried');
	},
	'sleightofhand': (battle: Battle) => {
		for (let pokemon of battle.p1.pokemon.filter(pokemon => pokemon.ability !=='shopman')) {
			if (battle.random(3) === 0) {
				const newitem = battle.sample(['Toxic Orb', 'Flame Orb', 'Sticky Barb', 'Lagging Tail', 'Ring Target', 'Iron Ball', 'Black Sludge'])
				const item = RougeUtils.setItem(pokemon,newitem);
				if(item)
					battle.add('message', `${pokemon}'s item is replaced ${newitem} by you`);
			}
		}
		
	},
	'infestation': (battle: Battle) => {
		battle.field.addPseudoWeather("infestation");
		battle.add('message', 'your infestation makes infestation start');
	},
	'gangguarantee': (battle: Battle) => {
		battle.field.addPseudoWeather("Gang Territory");
		battle.add('message', 'your Gang Guarantee makes Gang Territory start');
	},
	'triforce': (battle: Battle) => {
		battle.field.setWeather("DeltaStream");
		battle.add('message', 'your Tri Force makes it Strong Wings');
	},
	'falsemoon': (battle: Battle) => {
		battle.field.addPseudoWeather("Hyakkiyakou");
		battle.add('message', 'your False Moon makes Hyakkiyakou start');
	},
	'gunofnerf': (battle: Battle) => {
		battle.field.addPseudoWeather("Normal Strong");
		battle.add('message', 'your Gun of Nerf makes Normal Strong');
	},
	'eightdiagramsdrawing': (battle: Battle) => {
		battle.field.addPseudoWeather("Eight-Diagram Tactics");
		battle.add('message', 'your Eight Diagrams drawing makes Eight-Diagram Tactics');
	},
	'obscenities': (battle: Battle) => {
		battle.p2.clearChoice();
		battle.actions.useMove('Parting Shot', battle.p2.active[0]);
	},
	'overdrive': (battle: Battle) => {
		battle.field.addPseudoWeather("Surcharge");
		battle.add('message', 'your overdrive makes Surcharge start');
	},
	'timejewel': (battle: Battle) => {
		battle.field.addPseudoWeather("Time Acceleration");
		battle.add('message', 'your timejewel makes Time Acceleration start');
	},
	'fairyegg': (battle: Battle) => {
		battle.field.addPseudoWeather("Fairy Halper");
		battle.add('message', 'your fairyegg makes Fairy Halper start');
	},
	'misfortunemirror': (battle: Battle) => {
		battle.field.addPseudoWeather("Misfortune Mirror");
		battle.add('message', 'Misfortune Mirror start');
	},
	'healingarea': (battle: Battle) => {
		battle.field.addPseudoWeather("Healing Area");
		battle.add('message', 'Healing Area start');
	},
	'trueshotaura': (battle: Battle) => {
		battle.field.addPseudoWeather("Trueshot Aura");
		battle.add('message', 'Trueshot Aura start');
	},
	'psychoanalysis': (battle: Battle) => {
		battle.field.addPseudoWeather("Psychoanalysis");
		battle.add('message', 'Psychoanalysis start');
	},
	'futurescope': (battle: Battle) => {
		if (!battle.p1.addSlotCondition(battle.p1.active[0], 'futuremove')) return false;
		Object.assign(battle.p1.slotConditions[battle.p1.active[0].position]['futuremove'], {
			move: 'futurescope',
			source: battle.p2.active[0],
			moveData: {
				id: 'futurescope',
				name: "Future Scope",
				accuracy: 100,
				basePower: 0,
				category: "Special",
				priority: 0,
				flags: {},
				effectType: 'Move',
				isFutureMove: true,
				type: 'Steel',
				secondary: {
					chance: 100,
					boosts: {
						atk: -1,
						def:-1,
						spa:-1,
						spd: -1,
					},
				},
			},
		});
		battle.add('message', "you chose Future Scope as its destiny!");
	},
	'futurecamera': (battle: Battle) => {
		if (!battle.p1.addSlotCondition(battle.p1.active[0], 'futuremove')) return false;
		Object.assign(battle.p1.slotConditions[battle.p1.active[0].position]['futuremove'], {
			move: 'doomdesire',
			source: battle.p2.active[0],
			moveData: {
				id: 'doomdesire',
				name: "Doom Desire",
				accuracy: 100,
				basePower: 140,
				category: "Special",
				priority: 0,
				flags: {},
				effectType: 'Move',
				isFutureMove: true,
				type: 'Steel',
			},
		});
		battle.add('-start', battle.p2.active[0], 'Doom Desire');
		
	},
	'statuspush': (battle: Battle) => {
		battle.field.addPseudoWeather("Status Push");
		battle.add('message', 'Status Push start');
	},
	'lifestream': (battle: Battle) => {
		RougeUtils.addLives(battle.toID(battle.p2.name), 0.25);
	},
};


function checkWin(pokemonOnFaint: Pokemon, sides: Side[]): Side | undefined {
	const aliveSides = sides.filter(side => {
		return side.pokemon.filter(pokemon => !pokemon.fainted && pokemon.name != 'Reward' ).length > (pokemonOnFaint.side.id === side.id ? 1 : 0);
	});
	if (aliveSides.length === 1) return aliveSides[0];
}

export const Rulesets: { [k: string]: FormatData } = {
	pschinarougemode: {
		effectType: 'Rule',
		name: 'PS China Rouge Mode',
		ruleset: ['Dynamax Clause'],
		timer: {
			starting: 600,
			addPerTurn: 30,
			maxPerTurn: 60,
			maxFirstTurn: 60,
			grace: 0,
			timeoutAutoChoose: true,
			dcTimer: false,
			dcTimerBank: false,
		},
		onBegin() {
			// this.p1.pokemon = this.p1.pokemon.concat([new Pokemon(Teams.unpack('Shop|||shopman|Retransmission Moves Pool,getsuperband,getsuperspecs,getsuperscarf,Learn Extreme Speed,skip|Careful|252,4,,,252,|||||')![0], this.p2)]);
			let room = RougeUtils.getRoom(this.toID(this.p2.name)) || 'pokemonroom';
			// @ts-ignore
			let reward = Pokemonpool.Shop[room] as string[];
			let reward2 = Pokemonpool.Shop[(room + '2') as keyof typeof Pokemonpool.Shop] as string[];
			if (room === 'eliteroom') {
				reward = reward.concat();
				reward2 = reward2.concat();
				this.prng.sample(this.p1.pokemon).m.innate = 'elite';
				let relics = RougeUtils.getRelics(this.toID(this.p2.name))
				for (let x of relics) {
					x = 'gain' + x;
					let index = reward.map(x => x.toLowerCase().replace(/[^a-z0-9]+/g, '')).indexOf(x);
					if (index > -1) {
						reward.splice(index, 1); continue;
					}
					let index2 = reward2.map(x => x.toLowerCase().replace(/[^a-z0-9]+/g, '')).indexOf(x);
					if (index2 > -1) {
						reward2.splice(index2, 1); continue;
					}
				}
			}
			if (room === 'championroom'){
				if (RougeUtils.getNextWave(this.toID(this.p2.name))!==19)
					this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + reward.join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
				else
					this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + reward2.join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|moveroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|abilityroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|eliteroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp||shopman|splash|Hardy||M|0,0,0,0,0,0||5|')![0], this.p1));
			} else {
				const rand = this.prng.next(3);
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + (rand === 0 ? 'Evo A Pokemon,' : rand === 1 ? this.prng.next(3)===0? 'Evo All,' : 'Refresh Reward,' : 'skip,') + sample(reward, 3, this.prng, reward2).join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp||shopman|splash|Hardy||M|0,0,0,0,0,0||5|')![0], this.p1));
			}	

			this.p1.pokemonLeft += 6;
			this.p1.emitRequest = (update: AnyObject) => {
				this.send('sideupdate', `${this.p1.id}\n|request|${JSON.stringify(update)}`);
				this.p1.activeRequest = update;
				// @ts-ignore
				setTimeout(() => {
					this.p1.clearChoice();
					const activePoke = this.p1.active[0];
					const foeActivePoke = this.p2.active[0];
					const checkImmune = (moveid: string): boolean => {
						const move = Dex.moves.get(moveid);
						if (foeActivePoke.types.find(type => Dex.types.get(type).damageTaken[move.type] === 3)) return false;
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
							}
						}
						return true;
					}
					const isHealMove = (moveid: string) => {
						const move = Dex.moves.get(moveid);
						return move.flags['heal'] && !move.damage;
					}
					const mega = activePoke.canMegaEvo ? 'mega' : '';
					const boostSwicth = eval(Object.values(activePoke.boosts).join('+'))+12 < this.random(12)+1;
					const abilitySwitch = activePoke.hasAbility(['truant', 'normalize']);
					const itemSwitch = activePoke.hasItem(['choicescarf', 'choiceband', 'choicespecs']) &&
						activePoke.lastMove && !checkImmune(activePoke.lastMove.id);
					// Switch
					if (update.forceSwitch || abilitySwitch || itemSwitch || boostSwicth) {
						const alive = this.p1.pokemon.filter(
							x => !x.isActive && !x.fainted && x.name != 'Reward' && x.name !='Shopowner'
						).map(x => x.name);
						if (alive.length > 0) {
							this.p1.chooseSwitch(this.prng.sample(alive));
						} else if (activePoke.fainted){
							// 店长出场
							const Shopowner =this.p1.pokemon.findIndex(x => {
								return !x.fainted && x.name == 'Shopowner';
							})
							if (Shopowner!==-1)
								// this.p1.autoChoose();
								this.p1.chooseSwitch(String(Shopowner+1));
						}
						if (this.allChoicesDone()) {
							this.commitDecisions();
							this.sendUpdates();
						}
					}
					// 换商店
					if (activePoke.name == 'Shopowner' && foeActivePoke.name != 'Reward') {
						this.p1.clearChoice();
						this.p1.chooseSwitch('Reward');
						if (this.allChoicesDone()) {
							this.commitDecisions();
							this.sendUpdates();
						}
					}
					// Spectral Thief
					if (!this.p1.isChoiceDone()) {
						const foeBoost = eval(Object.values(foeActivePoke.boosts).filter(x => x > 0).join('+'));
						if (!foeActivePoke.hasType('Normal') && foeBoost >= 2) {
							if (activePoke.hasMove('spectralthief')) {
								this.p1.chooseMove('spectralthief', 0, mega);
							} else {
								const thief = this.p1.pokemon.find(x => {
									return !x.fainted && x.hasMove('spectralthief');
								});
								if (thief) this.p1.chooseSwitch(thief.name);
							}
						}
					}
					// Heal
					if (!this.p1.isChoiceDone()) {
						const hpRate = activePoke.hp / activePoke.maxhp;
						const healPress = activePoke.speed > foeActivePoke.speed ? 1 : 2;
						const healRate = Math.pow(1 - hpRate, 3) + 3 * Math.pow(1 - hpRate, 2) * hpRate * healPress;
						if (this.prng.randomChance(healRate * 1000, 1000)) {
							const healingMove = activePoke.moves.find(isHealMove);
							if (healingMove) this.p1.chooseMove(healingMove, 0, mega);
						}
					}
					// Other Moves
					if (!this.p1.isChoiceDone()) {
						const movesHasPP = activePoke.getMoves().filter(movedata => !!movedata.pp).map(movedata => movedata.move);
						const movesNotHeal = movesHasPP.filter(move => !isHealMove(move));
						const movesNotImmune = movesNotHeal.filter(move => checkImmune(move));
						if (movesNotImmune.length > 0) {
							this.p1.chooseMove(this.sample(movesNotImmune), 0, mega);
						} else if (movesNotHeal.length) {
							this.p1.chooseMove(this.sample(movesNotHeal), 0, mega);
						} else if (movesHasPP.length > 0) {
							this.p1.chooseMove(this.sample(movesHasPP), 0, mega);
						}
					}
					if (!this.p1.isChoiceDone()) this.p1.autoChoose();
				}, 10);
			};
			// this.add('html', `<div class="broadcast-green"><strong>训练家${userName}开始挑战${gymName}道馆!</strong></div>`);
		},
		onBattleStart() {

		},
		onBeforeTurn(pokemon) {
			if (this.turn === 1 && pokemon.side === this.p1) {
				let relics = RougeUtils.getRelics(this.toID(this.p2.name));
				for (let x of relics) {
					relicsEffects[x as keyof typeof relicsEffects](this);
				}
			} else if (pokemon.side === this.p1 && this.prng.next(40) === 1 && !this.field.effectiveWeather()) {
				this.field.setWeather(this.sample(['raindance', 'hail', 'sunnyday', 'sandstorm']));
			}
		},
		onSwitchInPriority: 2,
		onSwitchIn(pokemon) {
			if (pokemon.m.innate === 'elite') {
				if (pokemon.side === this.p1)
					pokemon.addVolatile('elite');
				if (pokemon.side === this.p2)
					pokemon.addVolatile('halo');
			}
		},
		onAnyFaintPriority:100,
		onFaint(pokemon) {
			if (pokemon.name == 'Shopowner') {
				if (this.p2.active[0].name != 'Reward')
					this.add('html', '<div class="broadcast-green">你把老板杀死了，老板生气了惩罚你跳过了奖励环节</div>');
			if (!pokemon.item) {
					let nextwave = RougeUtils.getNextWave(this.toID(this.p2.name)) || 1;
					RougeUtils.updateUserTeam(
						this.toID(this.p2.name),
						Teams.pack(this.p2.team.map(x => {
							x.level = Math.min((1 + nextwave) * 10, 100);
							if (x.evs.hp < 252) x.evs.hp += 4;
							if (x.evs.atk < 252) x.evs.atk += 4;
							if (x.evs.def < 252) x.evs.def += 4;
							if (x.evs.spa < 252) x.evs.spa += 4;
							if (x.evs.spd < 252) x.evs.spd += 4;
							if (x.evs.spe < 252) x.evs.spe += 4;
							return x;
						}))
					);
					this.add('html', '<button class="button" name="send" value="/rouge next">Next Wave</button>');
					this.win(this.p2)
				} else {
					championreward(this.p2.active[0], pokemon.item as 'moveroom' | 'abilityroom' |'eliteroom')
				}
			} else {
				if (pokemon.side === this.p2) {
					switch (checkWin(pokemon, this.sides)) {
						case this.p2:

							break;
						case this.p1:
							if (!RougeUtils.reduceLives(this.toID(this.p2.name))) {
								RougeUtils.updateUserTeam(this.toID(this.p2.name), '');
								this.add('html', '<div class="broadcast-green">你战败后眼前一黑，醒来后就回到了家里。</div>');
							} else {
								this.add('html', '<button class="button" name="send" value="/rouge next">Try again</button>');
							}
							break;
					}
				}
			}
			// if (!this.p1.pokemonLeft) {
			// 	this.p1.pokemon = [new Pokemon('Blissey||leftovers|naturalcure|aromatherapy,icebeam,softboiled,calmmind|Bold|,,252,,252,|F|,0,,,,|||', this.p1)];
			// 	this.p1.pokemonLeft+=1
			// }
		},
	},

};
