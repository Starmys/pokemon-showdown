import { join } from 'path';
import RandomGen7Teams from '../../data/random-battles/gen7/teams';
import RandomGen8Teams from '../../data/random-battles/gen8/teams';
import RandomTeams from '../../data/random-battles/gen9/teams';
import { Utils } from '../../lib';
import { PRNG } from '../../sim';
import { PetUtils, Pet } from './ps-china-pet-mode';
import { getCommonBattles } from '../chat-commands/info';

const POKESPRITES = 'https://play.pokemonshowdown.com/sprites/ani';
const POKESPRITESSHINY = 'https://play.pokemonshowdown.com/sprites/ani-shiny';

export class BattleGrounds extends Rooms.RoomGame<BGPlayer> {
	override readonly gameid = 'battlegrounds' as ID;
	override timer: NodeJS.Timeout | null = null;
	battleInterval: NodeJS.Timeout | null = null;
	isauto: boolean;
	turn: number;
	maxTime = 240;
	maxPlayer = 8;
	BGBattleRooms: { [userid: string]: GameRoom | null } = {};
	randomTeams: RandomTeams;
	randomGen8Teams: RandomGen8Teams;
	randomGen7Teams: RandomGen7Teams;
	dex: ModdedDex;
	prng: PRNG;
	gameNumber: number;
	state = 'signups';
	level1Pokemons: string[];
	level2Pokemons: string[];
	level3Pokemons: string[];
	level4Pokemons: string[];
	level5Pokemons: string[];
	level6Pokemons: string[];
	spectators: { [k: string]: number } = Object.create(null);
	onbattle = false;

	static level1pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst < 475 && specie.natDexTier === 'RU' && specie.baseForme !== 'Pikachu').map(x => x.name);
	static level2pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst >= 475 && specie.bst < 535 && specie.natDexTier === 'RU').map(x => x.name)
	static level3pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst >= 535 && specie.natDexTier === 'RU').map(x => x.name);
	static level4pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst < 450 && specie.natDexTier === 'UU').map(x => x.name);
	static level5pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst < 450 && (specie.natDexTier === 'OU' || specie.natDexTier === '(OU)')).map(x => x.name);
	static level6pool = Dex.forFormat('[Gen 9] National Dex').species.all().filter(specie => specie.bst < 450 && (specie.natDexTier === 'Uber' || specie.natDexTier === '(Uber)' || specie.natDexTier === 'AG')).map(x => x.name);
	static gameMaxMoney = 10;
	

	constructor(room: Room,isauto :boolean = true){
		super(room);
		this.isauto = isauto;
		this.turn = 0;
		this.prng = new PRNG();
		this.randomTeams = new RandomTeams('[Gen 9] National Dex', this.prng);
		this.randomGen8Teams = new RandomGen8Teams('[Gen 9] National Dex', this.prng);
		this.randomGen7Teams = new RandomGen7Teams('[Gen 9] National Dex', this.prng);
		this.dex = Dex.forFormat('[Gen 9] National Dex')
		this.gameNumber = room.nextGameNumber();
		this.level1Pokemons = this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level1pool, 8);
		this.level2Pokemons = this.level1Pokemons.concat(this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level2pool, 9));
		this.level3Pokemons = this.level2Pokemons.concat(this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level3pool, 10));
		this.level4Pokemons = this.level3Pokemons.concat(this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level4pool, 11));
		this.level5Pokemons = this.level4Pokemons.concat(this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level5pool, 12));
		this.level6Pokemons = this.level5Pokemons.concat(this.randomTeams.multipleSamplesNoReplace(BattleGrounds.level6pool, 13));

		this.sendToRoom(`|uhtml|battlegrounds-${this.gameNumber}|<div class="broadcast-blue"><p style="font-size: 14pt; text-align: center">A new game of <strong>口袋酒馆</strong> is starting!</p><p style="font-size: 9pt; text-align: center"><button class="button" name="send" value="/battlegrounds join"><strong>加入游戏</strong></button> <button class="button" name="send" value="">观看但点了没用</button></p><p>当前人数： 0/8</div>`, true);
	}

	static fastPop(list: any[], index: number) {
		// If an array doesn't need to be in order, replacing the
		// element at the given index with the removed element
		// is much, much faster than using list.splice(index, 1).
		const length = list.length;
		if (index < 0 || index >= list.length) {
			// sanity check
			throw new Error(`Index ${index} out of bounds for given array`);
		}

		const element = list[index];
		list[index] = list[length - 1];
		list.pop();
		return element;
	}
	
	createBattle(
		user: User, user2: User, userTeam: string, user2Team: string, format: string, hidden: boolean | undefined,
		delayedStart: boolean | 'multi' | undefined = false
	): GameRoom | null {
		if (this.BGBattleRooms[user.id]) {
			try {
				this.BGBattleRooms[user.id]?.destroy();
			} catch {

			} finally {
				delete this.BGBattleRooms[user.id];
			}
		}
		this.BGBattleRooms[user.id] = Rooms.createBattle({
			format: format,
			players: [
				{
					user: user2,
					team: user2Team,
					rating: 0,
					hidden: hidden,
					inviteOnly: false,
				},{
					user: user,
					team: userTeam,
					rating: 0,
					hidden: hidden,
					inviteOnly: false,
				}
			],
			rated: 0,
			challengeType: 'unrated',
			delayedStart: delayedStart,
			parentid: this.roomid,
		});
		return this.BGBattleRooms[user.id];
	}

	getPlayerPairing(): BGPlayer[][] {
		// 复制数组以避免修改原数组
		const copy = [...this.players];
		// Fisher-Yates 洗牌算法实现数组随机排序
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		
		const result: BGPlayer[][] = [];
		// 每次取两个元素组成一组，直到数组为空
		while (copy.length > 0) {
			const group = copy.splice(0, 2); // 从数组开头取出2个元素
			result.push(group);
		}
		return result;
	}

	makeBattle(users: BGPlayer[]){
		if (users.length !== 2) {
			return;
		}
		let format='gen9battlegrounds @@@battlegroundemode';
		if(this.isauto){
			format='gen9battlegrounds @@@battlegroundmode,battlegroundauto'
		}
		let [user1, user2] = users
		let battle=this.createBattle(user1.user, user2.user, user1.getTeamSet(), user2.getTeamSet(), format, undefined);
		this.onbattle = true
		if (battle) {
			battle.setParent(this.room)
			// battle.game.onBattleWin = (room: GameRoom, winnerid: ID) => {
			// 	if  (!room.battle) return;
			// 	let loser = room.battle.players.filter(user => user.id !== winnerid)[0];
			// 	if (!loser) return;
			// 	let BGloser = this.getPlayer(loser.id);
			// 	let BGwinner = this.getPlayer(winnerid);
			// 	if(!BGloser || !BGwinner) return;
			// 	if (!room.battle.score) return;
			// 	let left = Math.abs(room.battle.score[0] - room.battle.score[1])
			// 	let lastHitpoint = BGloser.hitpoint;
			// 	BGloser.hitpoint -= BGwinner.level + left;
			// 	// |uhtml|battlegrounds-${this.gameNumber}|
			// 	console.log('111111111111111111');
			// 	this.sendToRoom(`${BGwinner.user.name}(${BGwinner.hitpoint}) win ${BGloser.user.id}(${lastHitpoint} -> ${BGloser.hitpoint})`)
			// 	if (BGloser.hitpoint <= 0) {
			// 		this.sendToRoom(`${BGloser.user.id} 战败了`);
			// 		this.spectators[BGloser.user.id] = 1;
			// 		this.players = this.players.filter(x => x !== BGloser);
					
			// 	}

			// }
		}
		
		
	}
	override onBattleWin(room: GameRoom, winnerid: ID){
		if  (!room.battle) return;
		let loser = room.battle.players.filter(user => user.id !== winnerid)[0];
		if (!loser) return;
		let BGloser = this.getPlayer(loser.id);
		let BGwinner = this.getPlayer(winnerid);
		if(!BGloser || !BGwinner) return;
		if (!room.battle.score) return;
		let left = Math.abs(room.battle.score[0] - room.battle.score[1])
		let lastHitpoint = BGloser.hitpoint;
		BGloser.hitpoint -= BGwinner.level + left;
		// |uhtml|battlegrounds-${this.gameNumber}|
		console.log('111111111111111111');
		this.sendToRoom(`|uhtml|battlegrounds-${this.gameNumber}|<div style="font-size: 16pt; text-align: center"><b>${BGwinner.user.name}(${BGwinner.hitpoint}) win ${BGloser.user.id}(${lastHitpoint} -> ${BGloser.hitpoint})</b></div>`)
		if (BGloser.hitpoint <= 0) {
			this.sendToRoom(`${BGloser.user.id} 战败了`);
			this.spectators[BGloser.user.id] = 1;
			this.players = this.players.filter(x => x !== BGloser);
			
		}

	}

	makePlayer(user: User) {
		return new BGPlayer(user, this);
	}

	getPlayer(user: User | string) {
		if (typeof user === 'string'){
			return this.playerTable[user];
			// return this.players.find( x => x.user.id === user);
		} else {
			return this.playerTable[user.id];
			// return this.players.find( x => x.user.id === user.id);
		}
		
	}

	battleBegin() {
		// this.turn += 1;
		for (const player of this.players) {
			player.clearMsg()
		}
		for (let players of this.getPlayerPairing()) {
			if(players.length === 2) {
				this.makeBattle(players);
			}
			
		}

		let context = `|uhtml|battlegrounds-${this.gameNumber}|<div>`
		for (let room of Object.values(this.BGBattleRooms)) {
			context += `<a href="/${room?.roomid}" class="blocklink">&laquo;<strong>${room?.p1} vs ${room?.p2}</strong>&raquo;</a><br>`;
			// this.sendToRoom(`<a href="/${room?.roomid}" class="blocklink">&laquo;<strong>${room?.p1} vs ${room?.p2}</strong>&raquo;</a><br>`,true);
			// this.sendToRoom(`<li><a href="/${room?.roomid}" class="blocklink">&laquo;<strong>${room?.roomid}</strong>&raquo;<small style="float:right"></small></a></li>`);
		}
		context += '</div>'
		this.sendToRoom(context,true);
		this.battleInterval = setInterval(() => {
			for (let room of Object.values(this.BGBattleRooms)){
				if(!room?.battle?.ended) return;
			}
			if (this.battleInterval) clearInterval(this.battleInterval);
			this.nextTurn()
		}, 2 * 1000);
	}


	checkWin() {
		if (this.players.length === 1) {
			this.win(this.players[0]);
			return true;
		}
		return false;
	}

	win(winner : BGPlayer) {
		this.sendToRoom(`|uhtml|battlegrounds-${this.gameNumber}|<p style="font-size: 16pt; text-align: center"><b>恭喜 ${winner.user.name}(${winner.hitpoint}) 获得最后的胜利</b></p>`)
		this.destroy();
	}

	nextTurn() {
		if (this.checkWin()) {
			return;
		}
		this.turn += 1;
		for (const player of this.players) {
			if (player.maxMoney < BattleGrounds.gameMaxMoney) player.maxMoney += 1;
			player.money = player.maxMoney;
			player.upgradeCost -= 1;
			player.ready = false;
			player.refreshShop(player.freeze);
			
		}
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			for (const player of this.players) {
				if (!player.ready){
					player.makeready();
				}
			}
		}, this.maxTime* 1000);
		this.onbattle = false;
		// if (this.battleTimer) clearTimeout(this.battleTimer);
	}

	sendToRoom(msg: string, overrideSuppress = false) {
		if (overrideSuppress) {
			this.room.add(msg).update();
		} else {
			// send to the players first
			for (const player of this.players) {
				player.sendRoom(msg);
			}

			// send to spectators
			// for (const i in this.spectators) {
			// 	if (i in this.playerTable) continue; // don't double send to users already in the game.
			// 	const user = Users.getExact(i);
			// 	if (user) user.sendTo(this.roomid, msg);
			// }
		}
	}

	override joinGame(user: User) {
		if (user.id in this.playerTable) {
			throw new Chat.ErrorMessage("你已经加入酒馆.");
		}
		if (this.players.length >= this.maxPlayer){
			throw new Chat.ErrorMessage("人满了.");
		}
		if (this.state === 'signups' && this.addPlayer(user)) {
			this.sendToRoom(`|uhtmlchange|battlegrounds-${this.gameNumber}|<div class="broadcast-blue"><p style="font-size: 14pt; text-align: center">A new game of <strong>口袋酒馆</strong> is starting!</p><p style="font-size: 9pt; text-align: center"><button class="button" name="send" value="/battlegrounds join"><strong>加入游戏</strong></button> <button class="button" name="send" value="">观看但点了没用</button></p><p>当前人数： ${this.players.length}/8</div>`, true);
			this.sendToRoom(`${user.name} has joined the game of battlegrounds.`);
			return true;
		}
		return false;
	}
	

	onStart(isAutostart?: boolean) {
		if (this.playerCount < 2) {
			if (isAutostart) {
				this.room.add("The game of UNO was forcibly ended because there aren't enough users.");
				this.destroy();
				return false;
			} else {
				throw new Chat.ErrorMessage("There must be at least 2 players to start a game of UNO.");
			}
		}
		this.sendToRoom(`|uhtmlchange|battlegrounds-${this.gameNumber}|<div><p style="font-size: 14pt; text-align: center">游戏开始</p></div>`,true);
		for (let player of this.players) {
			player.refreshShop();
		}
		this.timer = setTimeout(() => {
			for (const player of this.players) {
				if (!player.ready){
					player.makeready();
				}
			}
		}, this.maxTime* 1000);
	}

	checkready() {
		for (let player of this.players) {
			if (!player.ready) return;
		}
		this.battleBegin();
	}

}
class BGPlayer extends Rooms.RoomGamePlayer<BattleGrounds> {
	user: User;
	bag: BGpokemon[];
	team: BGpokemon[];
	hitpoint: number;
	level : number;
	money: number;
	maxMoney: number;
	override game: BattleGrounds;
	upgradeCost = 5;
	shopPokemons: BGpokemon[] = []
	pokemons :string[] = []
	freeze: boolean = false
	ready: boolean = false

	constructor(user: User, game: BattleGrounds) {
		super(user, game);
		this.user = user;
		this.bag = [];
		this.team = [];
		this.hitpoint = 30;
		this.level = 1;
		this.money = 3;
		this.maxMoney = 3;
		this.game = game;
	}
	getTeamSet() {
		if (this.team.length < 1) {
			return "Keldeo-Resolute|||justified|secretsword,surf,Calm Mind,airslash|Hasty|0,0,0,0,0,0||5|||"
		}
		return Teams.pack(this.team.map(x => x.pokemonSet));
	}
	clearMsg() {
		this.user.sendTo(this.game.roomid,"|uhtmlchange|BattleGrounds-player|");
	}
	sendDisplay(msg : string, clear: boolean = false) {
		// if (clear) this.clearMsg();
		this.user.sendTo(this.game.roomid,`|uhtml|BattleGrounds-player|${msg}`);
		
	}

	reSetShopPokemons(freeze : boolean =false) {
		let pool = this.game[`level${this.level}Pokemons` as keyof typeof this.game] as string[];
		let shopPokemons = [];
		let needNum = 2 + this.level
		if (freeze) {
			needNum -= this.shopPokemons.length;
		}
		for(let i = 0; i < needNum; i++) {
			shopPokemons.push(this.game.prng.sample(pool));
		}
		if (freeze) {
			this.shopPokemons.concat(shopPokemons.map(name => new BGpokemon(name, this)));
		} else {
			this.shopPokemons = shopPokemons.map(name => new BGpokemon(name, this));
		}
		
	}

	getcontext() {
		let shopbutton = this.shopPokemons.map((x,i) => PetUtils.button(`/battlegrounds show shop,${i}`, ``, PetUtils.iconStyle(x.species),this.pokemons.filter(y => y === x.species).length >= 2?true:false)).join('');
		let teambutton = this.team.map((x,i) => PetUtils.button(`/battlegrounds show team,${i}`, ``, PetUtils.iconStyle(x.species))).join('');
		let bagbutton = this.bag.map((x,i) => PetUtils.button(`/battlegrounds show bag,${i}`, ``, PetUtils.iconStyle(x.species))).join('');
		let context =   [
			`<p style="font-size: 14pt">shop &nbsp;&nbsp;&nbsp; level : ${this.level} &nbsp;&nbsp;&nbsp; ${PetUtils.button('/battlegrounds upgrade','升级')}升级花费:${this.upgradeCost}<br>`,
			`${shopbutton}&nbsp;&nbsp;${PetUtils.button('/battlegrounds refresh','刷新')};&nbsp;${PetUtils.button('/battlegrounds freeze',this.freeze ? '解锁' : '锁定')}${this.freeze ? '已锁定' : ''}<br>`,
			`<b>队伍</b>:&nbsp;${teambutton} <br><b>背包</b>:&nbsp;${bagbutton} <br><b>金币：${this.money}/${this.maxMoney}</b></p> `,
			`${PetUtils.button('/battlegrounds ready',this.ready? '取消准备': '准备')}`,
		].join('')
		return context;
	}

	refreshShop(freeze : boolean =false) {
		this.reSetShopPokemons(freeze);
		this.freeze = false;
		this.sendDisplay(`<div style="height: 300px"> ${this.getcontext()}</div>`, true);
	}

	freezeShop() {
		this.freeze = !this.freeze;
		this.sendDisplay(`<div style="height: 300px">${this.getcontext()}</div>`, true);
	}

	makeready() {
		this.ready = !this.ready;
		if (this.ready) {
			this.game.checkready();
		}
		this.sendDisplay(`<div style="height: 300px">${this.getcontext()}</div>`, true);
	}

	show(type: string,index :number) {
		let showDesc = true;
		let setTitle = '<br>';
		let pokeDiv = ``;
		const st = (x: string) => `<b>${x}</b>`;
		const th = (x: string | number, a: string = '') => `<th style="${a ? `text-align: ${a}; ` : ''}padding: 0">${x}</th>`;
		const td = (x: string | number, a: string = 'center') => `<td style="${a ? `text-align: ${a}; ` : ''}padding: 0">${x}</td>`;
		setTitle = st(setTitle);
		let setButtons:string[] = [];
		let set :PokemonSet;
		if (type === 'shop') {
			if (!this.shopPokemons[index]) return;
			set = this.shopPokemons[index].pokemonSet;
			setButtons = [
				PetUtils.button(`/battlegrounds buy ${index}`, '购买'),
				PetUtils.button(`/battlegrounds buytobag ${index}`, '买入背包'),
				
			]
			if (this.pokemons.filter(x => x === this.shopPokemons[index].species).length >= 2) {
				setButtons = [
					PetUtils.button(`/battlegrounds buy ${index}`, '三连'),
				]
			}
		} else if (type === 'team') {
			if (!this.team[index]) return;
			set = this.team[index].pokemonSet;
			setButtons = [
				PetUtils.button(`/battlegrounds lead ${index}`, '首发'),
				PetUtils.button(`/battlegrounds sell ${index}`, '出售'),
				PetUtils.button(`/battlegrounds boost ${index}`, '强化'),
			]
		} else {
			if (!this.bag[index]) return;
			set = this.bag[index].pokemonSet;
			setButtons = [
				PetUtils.button(`/battlegrounds dispatch ${index}`, '上场'),
				PetUtils.button(`/battlegrounds sell ${index + 6}`, '出售'),
			]
		}

		const bst = Dex.species.get(set.species).baseStats;
		const statsKeys = set?Object.keys(set.evs):'';
		const statsTable = PetUtils.table(
			['种族&ensp;', '个体&ensp;', '努力&ensp;'],
			['HP', '攻击', '防御', '特攻', '特防', '速度'],
			[
				Object.values(bst),
				Object.values(set.ivs),
				Object.values(set.evs)
			],
			'auto'
		);
		const setName = [toID(set.species), toID(set.species.split('-')[0])].includes(toID(set.name)) ? '' : `${set.name}&emsp;`;
		const lines = [
			`${setName}${st('种类')} ${set.species}&emsp;${Pet.typeIcons[set.species]}${set.shiny ? '☆' : ''}`,
			`${st('性别')} ${{'M': '♂', 'F': '♀'}[set.gender] || '∅'}&emsp;${st('亲密度')} ${set.happiness}`,
			`${st('等级')} ${Math.floor(set.level)} (${Math.floor((set.level - Math.floor(set.level)) * 100)}%)&emsp;` + 
			`${st('道具')} ${set.item ? PetUtils.button(``, '&emsp;', PetUtils.itemStyle(set.item)) : '无'}`,
			`${st('性格')} ${set.nature}&emsp;${st('特性')} ${set.ability}`,
			`${st('技能')} ${set.moves.join('&nbsp;')}`
		]
		// const spriteURL = `${set.shiny ? POKESPRITESSHINY : POKESPRITES}/${Pet.spriteId(set.species, set.gender)}.gif`;
		const spriteURL = `${set.shiny ? POKESPRITESSHINY : POKESPRITES}/${toID(set.species)}.gif`;
		const sprite = `background: transparent url(${spriteURL}) no-repeat 90% 10% relative;`
		pokeDiv = `<div style="line-height: 35px">${setTitle}</div>`;
		if (showDesc) {
			pokeDiv += `<div style=" display: inline-block; width: 50px; ` +
				`line-height: ${224 / setButtons.length}px; vertical-align: top;` +
				`">${setButtons.join('<br>')}</div>` +
				`<div style="${sprite} display: inline-block; line-height: 28px; width: 300px;` +
				`">${lines.map(x => `${x}`).join('<br>')}<br>${statsTable}`;
		}
		pokeDiv = `<div style="width: 350px; position: relative; display: inline-block;">${pokeDiv}</div>`;
		let context = this.getcontext()
		this.sendDisplay(`<div style="height: 300">${context}${pokeDiv}</div>`, true);
	}
	combo(species: string) {
		let pokemon1 = this.team.find(x => x.species === species);
		if (!pokemon1) pokemon1 = this.bag.find(x => x.species === species);
		if (!pokemon1) throw new Chat.ErrorMessage("BattleGrounds combo wrong");
		let pokemon2 = this.team.find(x => x.species === species && x !== pokemon1);
		if (pokemon2) {
			// todo
			this.team = this.team.filter(x => x !== pokemon2);
		} else {
			pokemon2 = this.bag.find(x => x.species === species && x !== pokemon1);
			if (!pokemon2) throw new Chat.ErrorMessage("BattleGrounds combo wron2");
			this.team = this.bag.filter(x => x !== pokemon2);
		}
		pokemon1.pokemonSet.shiny = true;
			

	}
	buy(index: number) {
		if (!this.shopPokemons[index]) return;
		
		if (this.money < 3) return PetUtils.popup(this.user, '没有足够金币');
		let pokemon = this.shopPokemons[index];
		if(this.pokemons.filter(x => x === pokemon.species).length >= 2) {
			BattleGrounds.fastPop(this.shopPokemons, index)
			this.combo(pokemon.species);
		} else {
			if (this.team.length >= 6) return PetUtils.popup(this.user, '队伍已满');
			this.team.push(pokemon);
			this.pokemons.push(pokemon.species);
			BattleGrounds.fastPop(this.shopPokemons, index)
		}
		this.money -= 3
		this.sendDisplay(`<div style="height: 300">${this.getcontext()}</div>`, true);
	}

	buyToBag(index: number) {
		if (!this.shopPokemons[index]) return;
		if (this.bag.length >= 6) return PetUtils.popup(this.user, '队伍已满');
		if (this.money < 3) return PetUtils.popup(this.user, '没有足够金币');
		let pokemon = this.shopPokemons[index];
		if(this.pokemons.filter(x => x === pokemon.species).length >= 2) {
			BattleGrounds.fastPop(this.shopPokemons, index)
			this.combo(pokemon.species);
		} else {
			this.bag.push(pokemon);
			this.pokemons.push(pokemon.species);
			BattleGrounds.fastPop(this.shopPokemons, index)
		}
		this.money -= 3
		this.sendDisplay(`<div style="height: 300">${this.getcontext()}</div>`, true);
	}

	exchangePosition(index1:number, index2:number) {
		if (!this.team[index1] || this.team[index2]) {
			return PetUtils.popup(this.user, '交换失败');
		}
		if (index1 === index2) return;
		const temp = this.team[index1];
		this.team[index1] = this.team[index2];
		this.team[index2] = temp;
	}
	sell(index: number) {
		if (index >= 6) {
			index -= 6
			if (!this.bag[index]) {
				return PetUtils.popup(this.user, '出售失败');
			}
			this.money += 1
			BattleGrounds.fastPop(this.bag, index);
		} else {
			if (!this.team[index]) {
				return PetUtils.popup(this.user, '出售失败');
			}
			this.money += 1
			BattleGrounds.fastPop(this.team, index);
		}
		this.sendDisplay(`<div style="height: 300">${this.getcontext()}</div>`, true);
	}
	dispatch(index: number) {
		if (!this.bag[index]) {
			return PetUtils.popup(this.user, '出售失败');
		}
		this.team.push(this.bag[index]);
		BattleGrounds.fastPop(this.bag, index);
		this.sendDisplay(`<div style="height: 300">${this.getcontext()}</div>`, true);
	}
	upgrade() {
		if (this.money < this.upgradeCost) return PetUtils.popup(this.user, '没有足够金币');
		this.money -= this.upgradeCost;
		this.upgradeCost = 5 + this.level;
		this.level += 1
		this.sendDisplay(`<div style="height: 300">${this.getcontext()}</div>`, true);
	}
}

class BGpokemon {
	pokemonSet: PokemonSet
	growup: string[]
	user: BGPlayer
	species: string
	constructor(pokemon :string, user: BGPlayer) {
		this.user = user;
		let pokeID = toID(pokemon)
		if (user.game.randomTeams.randomSets[pokeID]){
			this.pokemonSet = this.randomSetToSet(user.game.randomTeams.randomSet(pokeID));
		} else if (user.game.randomGen8Teams.randomData[pokeID]){
			this.pokemonSet = this.randomSetToSet(user.game.randomGen8Teams.randomSet(pokeID));
		} else if (user.game.randomGen7Teams.randomSets[pokeID]){
			this.pokemonSet = this.randomSetToSet(user.game.randomGen7Teams.randomSet(pokeID));
		} else {
			this.pokemonSet = this.getCCSet(pokemon);
		}
		user.game.randomTeams.randomSets
		this.growup = [];
		this.species = pokemon;
	}
	randomSetToSet(randomSet: RandomTeamsTypes.RandomSet): PokemonSet{
		return {
				name: randomSet.name,
				species: randomSet.species,
				gender: String(randomSet.gender),
				item: randomSet.item,
				ability: randomSet.ability,
				moves: randomSet.moves,
				evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
				ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
				nature: randomSet.nature || 'Bashful',
				level: 100,
				happiness:randomSet.happiness,
				shiny: false,
			};
	}
	getCCSet(forme: string) {
		const dex = this.user.game.dex;
		const prng = this.user.game.prng
		const natures = dex.natures.all();
		const items = dex.items.all();
		let species = Dex.species.get(forme);
		if (species.isNonstandard) species = Dex.species.get(species.baseSpecies);

		// Random legal item
		let item = '';
		let isIllegalItem;
		let isBadItem;
		// Make sure forme is legal
		if (species.battleOnly) {
			if (typeof species.battleOnly === 'string') {
				species = dex.species.get(species.battleOnly);
			} else {
				species = dex.species.get(prng.sample(species.battleOnly));
			}
			forme = species.name;
		} else if (species.requiredItems && !species.requiredItems.some(req => toID(req) === item)) {
			if (!species.changesFrom) throw new Error(`${species.name} needs a changesFrom value`);
			species = dex.species.get(species.changesFrom);
			forme = species.name;
		}

		// Make sure that a base forme does not hold any forme-modifier items.
		let itemData = dex.items.get(item);
		if (itemData.forcedForme && forme === dex.species.get(itemData.forcedForme).baseSpecies) {
			do {
				itemData = prng.sample(items);
				item = itemData.name;
			} while (
				itemData.gen > 2 ||
				itemData.isNonstandard ||
				(itemData.forcedForme && forme === dex.species.get(itemData.forcedForme).baseSpecies)
			);
		}

		// Random legal ability
		const abilities = Object.values(species.abilities).filter(a => dex.abilities.get(a).gen <= 10);
		const ability: string =  prng.sample(abilities);

		// Four random unique moves from the movepool
		let pool = ['struggle'];
		if (forme === 'Smeargle') {
			pool = dex.moves.all()
				.filter(move => !(move.isNonstandard || move.isZ || move.isMax || move.realMove))
				.map(m => m.id);
		} else {
			pool = [...dex.species.getMovePool(species.id, true)];
		}

		const moves = this.user.game.randomTeams.multipleSamplesNoReplace(pool, 4);

		// Random EVs
		const evs: StatsTable = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 };

		// Random IVs
		const ivs = {
			hp: 31,
			atk: 31,
			def: 31,
			spa: 31,
			spd: 31,
			spe: 31,
		};

		// Random nature
		const nature = prng.sample(natures).name;

		// Level balance--calculate directly from stats rather than using some silly lookup table
		const mbstmin = 1307; // Sunkern has the lowest modified base stat total, and that total is 807

		let stats = species.baseStats;
		// If Wishiwashi, use the school-forme's much higher stats
		if (species.baseSpecies === 'Wishiwashi') stats = Dex.species.get('wishiwashischool').baseStats;
		// If Terapagos, use Terastal-forme's stats
		if (species.baseSpecies === 'Terapagos') stats = Dex.species.get('terapagosterastal').baseStats;

	

		let level = 100;


		// Random happiness
		const happiness = 255;

		// Random shininess
		const shiny = false;

		const set: PokemonSet = {
			name: species.baseSpecies,
			species: species.name,
			gender: species.gender,
			item,
			ability,
			moves,
			evs,
			ivs,
			nature,
			level,
			happiness,
			shiny,
		};
		
		// Tera type
		if (species.requiredTeraType) set.teraType = species.requiredTeraType;
		if (this.user.game.randomTeams.forceTeraType) {
			set.teraType = this.user.game.randomTeams.forceTeraType;
		} else {
			set.teraType = prng.sample(dex.types.names());
		}
		
		return set
	}
}
export const commands: Chat.ChatCommands = {
	jiuguan: 'battlegrounds',
	battlegrounds:{
		new: 'create',
		make: 'create',
		createpublic: 'create',
		makepublic: 'create',
		createprivate: 'create',
		makeprivate: 'create',
		create(target, room, user, connection, cmd) {
			room = this.requireRoom();
			// this.checkCan('minigame', null, room);
			// if (room.settings.unoDisabled) throw new Chat.ErrorMessage("UNO is currently disabled for this room.");
			if (room.game) throw new Chat.ErrorMessage("There is already a game in progress in this room.");

			// const suppressMessages = cmd.includes('private') || !(cmd.includes('public') || room.roomid === 'gamecorner');
			let isauto = true;
			if (target.trim() === 'noauto'){
				isauto = false
			}
			room.game = new BattleGrounds(room, isauto);
			this.privateModAction(`A game of UNO was created by ${user.name}.`);
			this.modlog('battlegrounds CREATE');
		},
		j: 'join',
		join(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			this.checkChat();
			if (!game.joinGame(user)) throw new Chat.ErrorMessage("Unable to join the game.");

			return this.sendReply("You have joined the game of BattleGrounds.");
		},
		start(target, room, user) {
			room = this.requireRoom();
			// this.checkCan('minigame', null, room);
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			game.onStart();
			this.privateModAction(`The game of BattleGrounds was started by ${user.name}.`);
			this.modlog('BattleGrounds START');
		},

		stop: 'end',
		end(target, room, user) {
			room = this.requireRoom();
			// this.checkCan('minigame', null, room);
			if (!room.game || room.game.gameid !== 'battlegrounds') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game going on in this room.");
			}
			room.game.destroy();
			room.add("The game of BattleGrounds was forcibly ended.").update();
			this.privateModAction(`The game of BattleGrounds was ended by ${user.name}.`);
			this.modlog('BattleGrounds END');
		},
		buy(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let index = parseInt(target);
			player?.buy(index);
		},

		buytobag(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let index = parseInt(target);
			player?.buyToBag(index);
		},

		refresh(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			player?.refreshShop();

		},
		freeze(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			player?.freezeShop();
		},

		ready(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			player?.makeready();
		},

		lead(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let index = parseInt(target)
			player?.exchangePosition(0, index);
		},

		sell(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let index = parseInt(target)
			player?.sell(index);
		},
		upgrade(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			player?.upgrade();
		},
		dispatch(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let index = parseInt(target)
			player?.dispatch(index);
		},
		show(target, room, user) {
			const game = this.requireGame(BattleGrounds);
			if (game.state !== 'signups') {
				throw new Chat.ErrorMessage("There is no BattleGrounds game in signups phase in this room.");
			}
			if(game.onbattle) return PetUtils.popup(user, '对战还没结束，请不要操作');
			let player = game.getPlayer(user);
			let [type, index] = target.split(',');
			player?.show(type, parseInt(index));

		},

	}
}