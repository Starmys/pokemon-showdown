import { FS } from "../../../lib";
import { Teams, Pokemon } from "../../../sim";
import { championreward, evolution, sample } from "./moves";
import { PokemonPool } from "../../../config/rouge/pokemon-pool";
import { RewardPool, WeightPool, updateWeightPool } from "../../../config/rouge/reward-pool";
import { RougeDesc } from "../../../config/rouge/descs";
import RandomTeams from "../../random-battles/rouge/teams";


type rougePassRecord = { 'cave': number[], 'void': number[] };
type rougeUserProperty = {
	'rouge'?: string,
	'rougeinit'?: number,
	'passrecord'?: rougePassRecord
	'difficulty'?:number
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
		'Scorbunny', 'Sobble', 'Grookey',
		'Fuecoco','Quaxly','Sprigatito'
	];
	static initMonsAndEvos = Dex.species.all().filter(x => RougeUtils.initMons.includes(x.name) || RougeUtils.initMons.includes(x.prevo) || (x.prevo && RougeUtils.initMons.includes(Dex.species.get(x.prevo)?.prevo))).map(x => x.name);
	static unlock = {
		caveBody: ['Get Duraludon', 'Get Wingull', 'Get Electabuzz', 'Get Necrozma', 'Get Skrelp', 'Get Vullaby', 'Get Mew', 'Get Yanma', 'Get Lillipup', 'Get Caterpie', 'Get Iron Moth', 'Get Slither Wing', 'Get Bellsprout', 'Get Mareep', 'Get Tympole', 'Get Tentacool', 'Get Scraggy', 'Get Nacli', 'Get Mankey', 'Get Capsakid', 'Get Frigibax', 'Get Tinkatink', 'Get Tandemaus', 'Get Pawniard', 'Get Iron Valiant', 'Get Terrakion','Get Iron Thorns','Get Roaring Moon',],
		voidBody: ['Gain Champion Belt', 'Become Haven', 'Become Overcharge', 'Promote A Pokemon', 'Get Smoke Trigger', 'Become Adaptability', 'Gain Holographic Projection', 'Get Thruster', 'Become Born Of Explosion', 'Gain Pack Light', 'Gain Replication', 'Gain Enchantments', 'Get Custap Element', 'Gain Flame Shield', 'Gain Heroic Sword', 'Gain Physical Suppression', 'Become Szpenguin', 'Gain Contrary Blade', 'Become Spiky Body', 'Learn Fake Shot', 'Gain Melody Of Siren', 'Get Micro Master', 'Learn Mew Ball', 'Learn Parry', 'Learn Sketch', 'Learn Population Bomb', 'Learn Speed Impact', 'Gain Conjuring Show'],
		index: {
			"pokemonroom": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,],
			"pokemonroom2": [],
			'commonroom': [3],
			'commonroom2': [],
			'itemroom': [4,7,12,21],
			'itemroom2': [],
			'moveroom': [19,22,23,24,25,26],
			'moveroom2': [],
			'abilityroom': [1,2,5,8,16,18],
			'abilityroom2': [],
			'eliteroom': [0,6,9,10,11,13,14,15,17,20,27],
			'eliteroom2': [],
			'championroom': [],
			'championroom2':[],
		}
	}
	static checkUser(userid: string): boolean {
		return FS(`${USERPATH}/${Dex.toID(userid)}.json`).existsSync();
	}

	static getUser(userid: string | rougeUserProperty): rougeUserProperty | undefined {
		if (typeof userid === 'string'){
			if (this.checkUser(userid)) {
				return JSON.parse(FS(`${USERPATH}/${userid}.json`).readIfExistsSync());
			}
		} else {
			return userid
		}
		
	}

	static saveUser(userid: ID, userProperty: rougeUserProperty) {
		FS(`${USERPATH}/${userid}.json`).safeWriteSync(JSON.stringify(userProperty));
	}

	static loadRougeProps(userid: ID): string[] | undefined {
		return this.getUser(userid)?.rouge?.split("&");
	}

	static updateUserTeam(userid: ID, userTeam: string, reset: boolean = false,upWave: boolean=true) {
		let userProperty = this.getUser(userid) || {};
		if (userTeam) {
			let rougePropsStr = userProperty['rouge'];
			if (!rougePropsStr || reset)
				userProperty['rouge'] = userTeam.concat('&0&1&&pokemonroom&3');
			else {
				let rougeProps = rougePropsStr.split("&");
				//  判断是否进行下一波
				if(upWave){
					rougeProps[1] = String(Number(rougeProps[1]) + 1);
				}
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
	static reduceWave(userid: ID): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			rougeProps[2] = String(Number(rougeProps[2]) - 1);
			userProperty['rouge'] = rougeProps.join('&');
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}
	static getNextWave(userid: ID | rougeUserProperty): number {
		let userProperty;
		if (typeof userid === 'string')
			userProperty = this.getUser(userid);
		else
			userProperty = userid;
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

	static getRoom(userid: ID | rougeUserProperty): string {
		if (typeof userid === 'string')
			return this.getUser(userid)?.rouge?.split("&")[4] || '';
		else
			return userid?.rouge?.split("&")[4] || '';
	}
	
	static getRoomAndRelics(userid: ID | rougeUserProperty): (string|string[])[] {
		let str = this.getUser(userid)?.rouge?.split("&")
		if (str){
			return [str[4] || '', str[3].split(',')||[]];
		} else {
			return ['' , []]
		}
	}

	static getRelics(userid: ID | rougeUserProperty): string[] {
		let relicsStr
		if (typeof userid === 'string')
			relicsStr = this.getUser(userid)?.rouge?.split("&")[3];
		else
			relicsStr = userid?.rouge?.split("&")[3];
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
	static setBanEvoable(userid: ID, num: number): boolean {
		if (!num) return false;
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['rouge'].split("&");
			let team = Teams.unpack(rougeProps[0]!);
			if (team && team[num]) {
				team[num].happiness=undefined
				rougeProps[0] = Teams.pack(team);
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
			if (passNum < this.initMons.length) {
				let passRecord = userProperty['passrecord'] || { 'cave': Array(this.initMons.length).fill(0), 'void': Array(this.initMons.length).fill(0) };
				if (passRecord[passOption][passNum])
					passRecord[passOption][passNum]++;
				else
					passRecord[passOption][passNum]=1;
				userProperty['passrecord'] = passRecord;
				this.saveUser(userid, userProperty);
				return true;
			}
		} else {
			return false;
		}
		return false;
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
				if (parseInt(rougeProps[2]) === 1) {
					life-=0.5
				} else if (rougeProps[4] && rougeProps[4] === 'championroom') {
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
	static addLives(userid: ID, life: number = 1): boolean {
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
		if (!pokemon.hp) return false;
		if (pokemon.itemState.knockedOff) return false;
		if (typeof item === 'string') item = pokemon.battle.dex.items.get(item);
		pokemon.item = item.id;
		const oldItem = pokemon.getItem();
		const oldItemState = pokemon.itemState;
		pokemon.item = item.id;
		if (oldItem.exists) pokemon.battle.singleEvent('End', oldItem, oldItemState, pokemon);
		pokemon.itemState = pokemon.battle.initEffectState({id: item.id, target: pokemon});
		if (item.id) {
			pokemon.battle.singleEvent('Start', item, pokemon.itemState, pokemon, source, effect);
		}
		return true;
	}
	static checkPassRecord(userid: ID): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty?.rouge) {
			let rougeProps = userProperty['passrecord'];
			if (rougeProps?.void) {
				for (let i = 0; i < this.initMons.length; i++) {
					if (!rougeProps.void[i])
						return false;
				}
				return true;
			}
			else {
				return false;
			}
		} else {
			return false;
		}
	}
	static setDifficulty(userid: ID, difficulty: number): boolean {
		let userProperty = this.getUser(userid);
		if (userProperty) {
			userProperty['difficulty'] = difficulty;
			this.saveUser(userid, userProperty);
			return true;
		} else {
			return false;
		}
	}

	static getDifficulty(userid: ID): number | undefined {
		
		return this.getUser(userid)?.difficulty ||0;
	}

}

export const relicsEffects = {
	'artirain': (battle: Battle) => {
		battle.field.setWeather('raindance', battle.p2.active[0]);
		battle.add('message', 'your Artirain makes it rain');
	},
	'artihail': (battle: Battle) => {
		battle.field.setWeather('hail', battle.p2.active[0]);
		battle.add('message', 'your Artihail makes it hail');
	},
	'artisnow': (battle: Battle) => {
		battle.field.setWeather('snow', battle.p2.active[0]);
		battle.add('message', 'your Artisnow makes it snow');
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
		for (let pokemon of battle.p1.pokemon.filter(pokemon => pokemon.ability !== 'shopman')) {
			if (battle.random(4) === 0) {
				const newitem = battle.sample(['Toxic Orb', 'Flame Orb', 'Sticky Barb', 'Lagging Tail', 'Ring Target', 'Iron Ball', 'Black Sludge'])
				const item = RougeUtils.setItem(pokemon, newitem);
				if (item)
					battle.add('message', `${pokemon}'s item is replaced ${newitem} by you`);
			}
		}

	},
	'infestation2': (battle: Battle) => {
		battle.field.addPseudoWeather("infestation2");
		battle.add('message', 'your infestation2 makes infestation2 start');
	},
	'gangguarantee': (battle: Battle) => {
		battle.field.addPseudoWeather("Gang Territory");
		battle.add('message', 'your Gang Guarantee makes Gang Territory start');
	},
	'triforce': (battle: Battle) => {
		battle.field.setWeather("DeltaStream", battle.p2.active[0]);
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
	'overdriver': (battle: Battle) => {
		battle.field.addPseudoWeather("Surcharge");
		battle.add('message', 'your overdriver makes Surcharge start');
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
						def: -1,
						spa: -1,
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
		RougeUtils.addLives(battle.toID(battle.p2.name), 0.2);
	},
	'stope': (battle: Battle) => {
		battle.field.addPseudoWeather("stope");
		battle.add('message', 'Stope start');
	},
	'championbelt': (battle: Battle) => {
		battle.field.addPseudoWeather("championbelt");
		battle.add('message', 'Champion Belt start');
		let pokemon = battle.sample(battle.p1.pokemon.filter(x => battle.toID(x.ability) !== 'shopman'));
		pokemon.m.innate = 'elite';
		if (pokemon.isActive) {
			pokemon.addVolatile('elite');
		}

	},
	'holographicprojection': (battle: Battle) => {
		if (RougeUtils.getRoom(battle.toID(battle.p2.name)) !== 'championroom') {
			let pokemon = battle.sample(battle.p1.pokemon.filter(x => battle.toID(x.ability) !== 'shopman'));
			let newpoke = new Pokemon(pokemon.set, battle.p2)
			battle.p2.pokemon.push(newpoke);
			battle.p2.pokemonLeft++;
			newpoke.position = battle.p2.pokemon.length - 1;
			newpoke.canTerastallize = null;
			battle.add('message', 'Holographic Projection action');
		}
	},
	'packlight': (battle: Battle) => {
		battle.field.addPseudoWeather("packlight");
		battle.add('message', 'Pack Light start');
	},
	'replication': (battle: Battle) => {
		let pokemon = battle.p2.active[0];
		if (pokemon && battle.p2.pokemon.length < 6) {
			let newpokemon = new Pokemon(pokemon.set, battle.p2)
			battle.p2.pokemon.push(newpokemon);
			battle.p2.pokemonLeft++;
			newpokemon.maxhp = Math.floor(newpokemon.maxhp * 0.5);
			newpokemon.hp = Math.floor(newpokemon.hp * 0.5);
			newpokemon.position = battle.p2.pokemon.length - 1;
			newpokemon.canTerastallize = null;
			battle.add('message', 'Replication action');
		} else {
			battle.add('message', 'your team is full');
		}
	},
	'enchantments': (battle: Battle) => {
		battle.field.addPseudoWeather("enchantments");
		battle.add('message', 'Enchantments start');
	},
	'flameshield': (battle: Battle) => {
		battle.field.addPseudoWeather("flameshield");
		battle.add('message', 'Flame Shield start');
	},
	'heroicsword': (battle: Battle) => {
		if (!battle.p2.addSlotCondition(battle.p2.active[0], 'futuremove')) return false;
		Object.assign(battle.p2.slotConditions[battle.p2.active[0].position]['futuremove'], {
			move: 'heroicsword',
			source: battle.p1.active[0],
			moveData: {
				id: 'heroicsword',
				name: "Heroic Sword",
				accuracy: true,
				basePower: 0,
				category: "Special",
				priority: 0,
				flags: {  heal: 1 },
				effectType: 'Move',
				isFutureMove: true,
				type: 'Steel',
				heal: [3, 4],
			},
		});
		battle.add('message', "you chose Heroic Sword as its destiny!");
	},
	'physicalsuppression': (battle: Battle) => {
		battle.field.addPseudoWeather("physicalsuppression");
		battle.add('message', 'Physical Suppression start');
	},
	'contraryblade': (battle: Battle) => {
		battle.field.addPseudoWeather("contraryblade");
		for(const pokemon of battle.p2.pokemon){
			if(pokemon.species.bst<=350 || pokemon.species.bst>600){
				pokemon.m.innate = 'weakness';
			}
		}
		battle.add('message', 'Contrary Blade start');
	},
	'melodyofsiren': (battle: Battle) => {
		battle.field.addPseudoWeather("melodyofsiren");
		battle.add('message', 'Melody Of Siren start');
	},
	'conjuringshow': (battle: Battle) => {
		battle.field.addPseudoWeather("conjuringshow");
		battle.add('message', 'Conjuring Show start');
	},
	'finalact': (battle: Battle) => {
		for(let pokemon of battle.p2.pokemon ){
			pokemon.maxhp*=2;
			pokemon.hp*=2;
		}
		battle.add('message', 'Final Act action');
	},
	'piercingattack': (battle: Battle) => {
		battle.field.addPseudoWeather("piercingattack");
		battle.add('message', 'Piercing Attack start');
	},
	'cockatriceeye': (battle: Battle) => {
		battle.field.addPseudoWeather("cockatriceeye");
		battle.add('message', 'Cockatrice Eye start');
	},
	'fallrise': (battle: Battle) => {
		battle.field.addPseudoWeather("fallrise");
		battle.add('message', 'Fall Rise start');
	},
	'orderwayup': (battle: Battle) => {
		battle.field.addPseudoWeather("orderwayup");
		battle.add('message', 'Order Way Up start');
	},
	'expofspring': (battle: Battle) => {
		if(battle.random()<=battle.p2.pokemon.length/6){
			const pokemons=battle.p2.pokemon.filter(x=>x.set.level<110)
			if(pokemons.length){
				const pokemon=battle.sample(pokemons);
				pokemon.set.level+=1;
				battle.add('message', `${pokemon.name} level up `);
			}
		}
	},
	'teratypesword':(battle: Battle) => {
		for(let pokemon of battle.p2.pokemon){
			if(!pokemon.canTerastallize){
				pokemon.teraType=battle.sample(pokemon.moves.map(move => Dex.moves.get(move).type));
				pokemon.canTerastallize=pokemon.teraType;
			}
		}
	},
	'teratypeshield':(battle: Battle) => {
		const types=battle.dex.types
		for(let pokemon of battle.p2.pokemon){
			if(!pokemon.canTerastallize){
				
				const weelnessTypes:string[] = [];
				const possibleTypes = [];
				for (const type of types.names()) {
					const typeCheck = battle.dex.getEffectiveness(type,pokemon);
					if (typeCheck >0) {
						weelnessTypes.push(type);
					}
				}
				for (const type of types.all()) {
					for (const weelnessType of weelnessTypes){
						if(type.damageTaken[weelnessType]>=2){
							possibleTypes.push(type.name);
							break;
						}
					}
				}
				pokemon.teraType=battle.sample(possibleTypes);
				pokemon.canTerastallize=pokemon.teraType; 
			}
		}
	},
	'movereaction': (battle: Battle) => {
		battle.field.addPseudoWeather("movereaction");
		battle.add('message', 'Move Reaction start');
	},
	'wrathwell': (battle: Battle) => {
		battle.field.addPseudoWeather("wrathwell");
		battle.add('message', 'Wrathwell start');
	},
};


function checkWin(pokemonOnFaint: Pokemon, sides: Side[]): Side | undefined {
	const aliveSides = sides.filter(side => {
		return side.pokemon.filter(pokemon => !pokemon.fainted && pokemon.name != 'Reward').length > (pokemonOnFaint.side.id === side.id ? 1 : 0);
	});
	if (aliveSides.length === 1) return aliveSides[0];
}

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	pschinarougemode: {
		effectType: 'Rule',
		name: 'PS China Rouge Mode',
		ruleset: [
			'Timer Starting = 600', 'Timer Add Per Turn = 30', 'Timer Max Per Turn = 60', 'Timer Max First Turn = 60',
			'Timeout Auto Choose', 'Dynamax Clause', 'Terastal Clause',
		],
		onBegin() {
			// this.p1.pokemon = this.p1.pokemon.concat([new Pokemon(Teams.unpack('Shop|||shopman|Retransmission Moves Pool,getsuperband,getsuperspecs,getsuperscarf,Learn Extreme Speed,skip|Careful|252,4,,,252,|||||')![0], this.p2)]);
			let user = RougeUtils.getUser(this.toID(this.p2.name))
			if (!user) return;
			let [room, relics] = RougeUtils.getRoomAndRelics(this.toID(this.p2.name));
			if (!room) room = 'pokemonroom'
			// @ts-ignore
			let reward = (RewardPool[room] as string[]).concat();
			let reward2 = (RewardPool[(room + '2') as keyof typeof RewardPool] as string[]).concat();
			let rewardWeight: Record<string, number> = {...WeightPool[(room + 'weight') as keyof typeof WeightPool]};
			if (room as string in updateWeightPool) {
				// @ts-ignore
				updateWeightPool[room](this, rewardWeight, relics);
			}
			
			if (room === 'pokemonroom') {
				for (let i of RougeUtils.unlock.index[room as keyof typeof RougeUtils.unlock.index]) {
					if (user?.passrecord?.cave[i])
						reward.push(RougeUtils.unlock.caveBody[i])
				}
			} else {
				for (let i of RougeUtils.unlock.index[room as keyof typeof RougeUtils.unlock.index]) {
					if (user?.passrecord?.void[i])
						reward.push(RougeUtils.unlock.voidBody[i])
				}
			}
			if (room === 'eliteroom') {
				this.prng.sample(this.p1.pokemon).m.innate = 'elite';
				for (let x of relics) {
					x = 'Gain ' + x;
					if (x in rewardWeight){
						rewardWeight[x] = 0
					}
				}
			}
			if (room === 'championroom') {
				if (RougeUtils.getNextWave(user) === 14)
					this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + reward.join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
				else
					this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + reward2.join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|moveroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|abilityroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp|eliteroom|shopman|splash|Hardy||M|0,0,0,0,0,0|S|5|')![0], this.p1));
				this.p1.pokemon.push(new Pokemon(Teams.unpack('Shopowner|Magikarp||shopman|splash|Hardy||M|0,0,0,0,0,0||5|')![0], this.p1));
			} else {
				//const rand = this.prng.random(9);
				// let firstreward = 'skip,';
				let firstreward = 'Refresh Reward,';
				// if (rand < 4)
				// 	firstreward = 'Evo A Pokemon,';
				// else if (rand < 8)
				// 	firstreward = 'Refresh Reward,';
				// else
				// 	firstreward = 'Evo All,';

				this.p1.pokemon.push(new Pokemon(Teams.unpack('Reward|Shop||shopman|' + firstreward + sample(reward, 3, this.prng, rewardWeight).join(',') + '|Careful|252,4,,,252,|||||')![0], this.p2));
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
					const activemoves=activePoke.getMoves().filter(movedata => !!movedata.pp&&movedata.id!=="sleeptalk").map(movedata => movedata.id).map(moveid=>Dex.moves.get(moveid))
					//const activemoves=activePoke.moves.filter(movedata => !!activePoke.getMoveData(movedata)?.pp&&this.toID(movedata)!=="sleeptalk").map(movedata => movedata.move).map(moveid=>Dex.moves.get(moveid))
					const checkImmune = (move: Move): boolean => {
						//const move = Dex.moves.get(moveid);
						if (move.id==='thousandarrows') return true
						if (!Dex.getImmunity(move.type,foeActivePoke)) return false;
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
									return !foeActivePoke.hasAbility(['Levitate','Earth Eater']);
								case 'Fighting':
									return !foeActivePoke.hasAbility(['hide']);
							}
						}
						return true;
					}
					const isHealMove = (move:  Move) => {

						return move.flags['heal'] && !move.basePower;
						
					}
					// isStatusMove will not filter 1pp moves, cause it's  exclusive move of champion pokemon
					const isStatusMove = (move: Move) => {
						//const move = Dex.moves.get(moveid);
						//return move.category === 'Status' || move.pp===1;
						return move.category === 'Status';
					}
					
					let event:'mega' | 'zmove' | 'ultra' | 'dynamax' | 'terastallize' | ''  = activePoke.canMegaEvo ? 'mega' : '';
					if(!event && this.toID(activePoke.ability)!=='shopman'){
						// this.add('html',`${this.p1.pokemonLeft}        ${this.p1.team.length}`)
						//调整极巨化和钛晶化概率的变量
						let p=this.p1.team.length>1?1:0;
						if(activePoke.hp>activePoke.maxhp/2)
							p*=2;
						else if(activePoke.hp<activePoke.maxhp/4)
							p/=2;
						if(!this.p1.dynamaxUsed&&this.randomChance(2*p,(this.p1.pokemonLeft-2)*(9-this.p1.team.length)*2)&&!this.p1.isChoiceDone()){
							activePoke.addVolatile('dynamax');
							this.p1.dynamaxUsed=true;
						}
						else if(activePoke.canTerastallize&&this.randomChance(2*p,(this.p1.pokemonLeft-2)*(9-this.p1.team.length)*2)&&!activePoke.volatiles['dynamax'])
							event='terastallize';
					}
					const boostlv = eval(Object.values(activePoke.boosts).join('+'));
					const boostSwicth = boostlv + 13 < this.random(12) + 1&&!activePoke.volatiles['dynamax'];
					const abilitySwitch = activePoke.hasAbility(['truant', 'normalize'])&&!activePoke.volatiles['dynamax'];
					const itemSwitch = activePoke.hasItem(['choicescarf', 'choiceband', 'choicespecs']) &&
						activePoke.lastMove && !checkImmune(activePoke.lastMove)&&!activePoke.volatiles['dynamax'];
					// Switch
					if (update.forceSwitch || abilitySwitch || itemSwitch || boostSwicth) {
						const alive = this.p1.pokemon.filter(
							x => !x.isActive && !x.fainted && x.name != 'Reward' && x.name != 'Shopowner'
						).map(x => x.name);
						if (alive.length > 0) {
							this.p1.chooseSwitch(this.prng.sample(alive));
						} else if (activePoke.fainted) {
							// 店长出场
							const Shopowner = this.p1.pokemon.findIndex(x => {
								return !x.fainted && x.name == 'Shopowner';
							})
							if (Shopowner !== -1)
								// this.p1.autoChoose();
								this.p1.chooseSwitch(String(Shopowner + 1));
						}
						if (this.allChoicesDone()) {
							this.commitChoices();
							this.sendUpdates();
						}
					}
					// 换商店
					if (activePoke.name == 'Shopowner' && foeActivePoke.name != 'Reward') {
						this.p1.clearChoice();
						this.p1.chooseSwitch('Reward');
						if (this.allChoicesDone()) {
							this.commitChoices();
							this.sendUpdates();
						}
					}
					// Spectral Thief
					if (!this.p1.isChoiceDone()&&!activePoke.volatiles['dynamax']) {
						const foeBoost = eval(Object.values(foeActivePoke.boosts).filter(x => x > 0).join('+'));
						if (!foeActivePoke.hasType('Normal') && foeBoost >= 2) {
							if (activePoke.hasMove('spectralthief')) {
								this.p1.chooseMove('spectralthief', 0, event);
							} else {
								const thief = this.p1.pokemon.find(x => {
									return !x.fainted && x.hasMove('spectralthief');
								});
								if (thief) this.p1.chooseSwitch(thief.name);
								
							}
						}
					}
					// sleeptalk
					if (!this.p1.isChoiceDone()&&activePoke.moves.includes("Sleep Talk")){
						if(activePoke.status==='slp'&&activePoke.statusState.time>1){
							this.p1.chooseMove("Sleep Talk", 0, event);
						}
					}
					// Heal
					if (!this.p1.isChoiceDone()&&!activePoke.volatiles['dynamax']) {
						const hpRate = activePoke.hp / activePoke.maxhp;
						const healPress = activePoke.speed > foeActivePoke.speed ? 1 : 2;
						const healRate = Math.pow(1 - hpRate, 3) + 3 * Math.pow(1 - hpRate, 2) * hpRate * healPress;
						if (this.prng.randomChance(healRate * 1000, 1000)) {
							const healingMove = activemoves.find(isHealMove);
							if (healingMove){
								this.p1.chooseMove(healingMove.name, 0, event);
							} 
						}
					}
					// Other Moves
					if (!this.p1.isChoiceDone()) {
						let expectMove;
						let movesNotHeal = activemoves.filter(move => !isHealMove(move));
						if (this.randomChance(4,5)){
							movesNotHeal=movesNotHeal.filter(move => checkImmune(move));
						}
						// const movesNotImmune = movesNotHeal.filter(move => checkImmune(move));
						// const movesNotStatus = movesNotImmune.filter(move => !isStatusMove(move));
						const chooseMove = (move: Move|undefined=undefined, forceDamagingMove:boolean=false)=> {
							if (!move||!isStatusMove(move)||forceDamagingMove){
								let moves = movesNotHeal.filter(move => !isStatusMove(move))
								if(moves.length<=0){
									return;
								}
								if(this.randomChance(1,3)){
									const movePowers=moves.map(move=>{
										let Effectiveness;
										if (!Dex.getImmunity(move.type,foeActivePoke)){
											Effectiveness=0;
										}else{
											Effectiveness=Math.pow(2,Dex.getEffectiveness(move.type,foeActivePoke));
										}
										let power=move.basePower
										if(move.basePowerCallback){
											power=80;
											
										}
										if(move.priority>0&&activePoke.speed < foeActivePoke.speed){
											power+=50;
										}
										
										if(move.flags['heal']){
											power+=15;
										}
										let stab=1
										if(activePoke.getTypes().includes(move.type)||activePoke.getTypes(false,true).includes(move.type)){
											stab=1.5;
										}
										let accuracy=move.accuracy
										if(accuracy===true){
											accuracy=100
										}
										const dam=Effectiveness*power*stab*accuracy
										return Number.isNaN(dam)?0:dam;			
									})
									return moves[movePowers.indexOf(Math.max(...movePowers))];
								}
								if(!move){
									return this.sample(moves);
								}
								return move;
							}else{
								return move;
							}
						}
						
						if ((activePoke.boosts.atk >= 6 || activePoke.boosts.spa >= 6 || boostlv >= this.random(12) + 2 || this.field.getPseudoWeather('physicalsuppression')||activePoke.volatiles['dynamax'])) {
							expectMove=chooseMove(undefined,true);
						}else if (movesNotHeal.length) {
							expectMove=this.sample(movesNotHeal);
							expectMove=chooseMove(expectMove);
						} else if (activemoves.length > 0) {
							expectMove=this.sample(activemoves);
							expectMove=chooseMove(expectMove);
						}
						if(expectMove){
							this.p1.chooseMove(expectMove.name, 0, event);
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
				let relics = RougeUtils.getRelics(this.toID(this.p2.name)).map(x => x.toLowerCase().replace(/[^a-z0-9]+/g, ''));
				for (let x of relics) {
					relicsEffects[x as keyof typeof relicsEffects](this);
					if (x === 'finalact') break;
				}
			} else if (pokemon.side === this.p1 && this.prng.random(40) === 1 && !this.field.effectiveWeather()) {
				this.field.setWeather(this.sample(['raindance', 'snow', 'sunnyday', 'sandstorm']));
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
			if (pokemon.m.innate === 'weakness'){
				if (pokemon.side === this.p2)
					pokemon.addVolatile('Reweakness');
			}
			if (pokemon.name === 'Reward'){
				for (let move of pokemon.moves) {
					if (move === 'refreshreward') {
						continue;
					}
					let moveDesc =RougeDesc[move as keyof typeof RougeDesc];
					if (moveDesc) {
						this.add('html', `<div class="infobox"><details><summary>${moveDesc.name}</summary>${moveDesc.desc}</details></div>`);
					}
				}
				
			}
		},
		onAnyFaintPriority: 100,
		onFaint(pokemon) {
			if (pokemon.name == 'Shopowner') {
				if (this.p2.active[0].name != 'Reward')
					this.add('html', '<div class="broadcast-green">你把老板杀死了，老板生气了惩罚你跳过了奖励环节</div>');
				if (!pokemon.item) {
					let nextwave = RougeUtils.getNextWave(this.toID(this.p2.name)) || 1;
					RougeUtils.updateUserTeam(
						this.toID(this.p2.name),
						Teams.pack(this.p2.team.map(x => {
							//x.level = Math.min((1 + nextwave) * 10, 100);
							if( nextwave<=9 && x.level<(1 + nextwave) * 10 && x.level<110) x.level+=10;
							if (x.evs.hp < 252) x.evs.hp += 4;
							if (x.evs.atk < 252) x.evs.atk += 4;
							if (x.evs.def < 252) x.evs.def += 4;
							if (x.evs.spa < 252) x.evs.spa += 4;
							if (x.evs.spd < 252) x.evs.spd += 4;
							if (x.evs.spe < 252) x.evs.spe += 4;
							if(x.happiness!=undefined){
								x.happiness-=10;
								if(x.happiness<=0)
									evolution(x,this)
							} 
							return x;
						}))
					);
					this.add('html', '<button class="button" name="send" value="/rouge next">Next Wave</button>');
					this.win(this.p2)
				} else {
					championreward(this.p2.active[0], pokemon.item as 'moveroom' | 'abilityroom' | 'eliteroom')
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
								RougeUtils.updateUserTeam(this.toID(this.p2.name),Teams.pack(this.p2.team),false,false);
								this.add('html', '<button class="button" name="send" value="/rouge next">Try again</button>');
							}
							break;
					}
				}else if(pokemon.side === this.p1){
					const active=this.p2.active[0]
					if(active &&active.set.happiness){
						active.set.happiness-=5
					}
				}
			}
			// if (!this.p1.pokemonLeft) {
			// 	this.p1.pokemon = [new Pokemon('Blissey||leftovers|naturalcure|aromatherapy,icebeam,softboiled,calmmind|Bold|,,252,,252,|F|,0,,,,|||', this.p1)];
			// 	this.p1.pokemonLeft+=1
			// }
		},
	},
	pschinarougehardmode: {
		effectType: 'Rule',
		name: 'PS China Rouge Hard Mode',
		onBegin() {
			this.p1.dynamaxUsed=false;
			for(let pokemon of this.p1.pokemon){
				if(!pokemon.canTerastallize){
					pokemon.teraType=this.sample(pokemon.moves.map(move => Dex.moves.get(move).type));
					pokemon.canTerastallize=pokemon.teraType;
				}
			}
			
		},
		onBeforeTurn(pokemon) {
			if (this.turn === 1 && pokemon.side === this.p1) {
				this.field.addPseudoWeather('Hard Mode');
			} 
		},
	},
	standardnatdex:{
		ruleset: [
			'Obtainable', '+Unobtainable', '+Past', 'Sketch Post-Gen 7 Moves',  'Nickname Clause', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause',
		],
		inherit:true
	}

};
