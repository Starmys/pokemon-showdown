import { PRNG } from "../../sim";
import { BOTID, PetUtils } from "./ps-china-pet-mode";
import { sample, getRougeSet } from "../../data/mods/rouge/moves";
import { PokemonPool } from "../../config/rouge/pokemon-pool";
import { ChampionTeams } from "../../config/rouge/champion-teams";
import { Enemies } from "../../config/rouge/enemies";
import { RougeUtils } from "../../data/mods/rouge/rulesets";

export class Rouge {

	static specialInitMons = ['Pidgey', 'Quagsire','Umbreon']
	static initButtons = [
		[1, 5, 8, 11, 14, 17, 20, 23,26],
		[2, 6, 9, 12, 15, 18, 21, 24,27],
		[3, 7, 10, 13, 16, 19, 22, 25,28],
		[4]
	].map(x => x.map(x => PetUtils.button(`/rouge start ${x}`, '', PetUtils.iconStyle(RougeUtils.initMons[x - 1]))).join('')).join('<br>');
	static specialInitButtons = [PetUtils.button(`/rouge start ${RougeUtils.initMons.length + 1}`, '', PetUtils.iconStyle(Rouge.specialInitMons[0])), PetUtils.button(`/rouge start ${RougeUtils.initMons.length + 2}`, '', PetUtils.iconStyle(Rouge.specialInitMons[1])), PetUtils.button(`/rouge start ${RougeUtils.initMons.length+3}`, '', PetUtils.iconStyle(Rouge.specialInitMons[2]))].join('');
	static leadbButtons = [2, 3, 4, 5, 6].map(x => PetUtils.button(`/rouge chooselead ${x}`, `${x}`)).join('');
	static banEvobButtons = [1, 2, 3, 4, 5, 6].map(x => PetUtils.button(`/rouge choosebanevoable ${x}`, `${x}`)).join('');
	static difficult=['正常','困难'];
	static prng: PRNG = new PRNG();
	static createBattle(
		user: User, bot: User, userTeam: string, botTeam: string, format: string, hidden: boolean | undefined,
		delayedStart: boolean | 'multi' | undefined = false
	): GameRoom | null {
		if (rougeBattleRooms[user.id]) {
			try {
				rougeBattleRooms[user.id]?.destroy();
			} catch {

			} finally {
				delete rougeBattleRooms[user.id];
			}
		}
		rougeBattleRooms[user.id] = Rooms.createBattle({
			format: format,
			players: [
				{
					user: bot,
					team: botTeam,
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
		});
		return rougeBattleRooms[user.id];
	}
	static inBattle(userid: string): string | undefined {
		const battleWithBot = (roomid: string) => {
			const battle = Rooms.get(roomid)?.battle;
			return battle && (battle.p1.id === BOTID || battle.p2.id === BOTID) &&
				(battle.p1.id === userid || battle.p2.id === userid) && !battle.ended;
		}
		const user = Users.get(userid);
		if (!user) return undefined;
		return [...user.inRooms].find(x => toID(x).indexOf('rougemod') >= 0 && battleWithBot(x));
	}
}
const rougeBattleRooms: { [userid: string]: GameRoom | null } = {};
export const commands: Chat.ChatCommands = {

	rouge: {
		'': 'user',
		user(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用rouge系统");
			user.sendTo(room.roomid, `|uhtmlchange|rouge-welcome|`);
			let buttons = [];
			buttons.push(['<b>欢迎来到宝可梦不归洞穴探险!</b>']);
			buttons.push([
				PetUtils.button('/rouge start', '出发'),
				PetUtils.button('/rouge clearcache', '清除存档'),
				PetUtils.button('/rouge showrougeteam', '查看队伍'), 
				PetUtils.button('/rouge chooselead', '更改首发'),
				PetUtils.button('/rouge choosebanevoable', '禁止进化'),
				PetUtils.button('/rouge showpassrecord', '查看成就'),
				PetUtils.button('/rouge choosediff', '更改难度'),
			]);
			user.sendTo(room.roomid, `|uhtml|rouge-welcome|${buttons.map(line => line.join(' ')).join('<br>')}`);
		},

		'next': 'start',
		start(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用rouge系统");
			if (Rouge.inBattle(user.id)) {
				return user.popup(`|html|<div style="text-align: center">您不能再上一局对战未完成的情况下进行下一局对战</div>`);
			}
			this.parse('/rouge clear');

			let rougeProps = RougeUtils.loadRougeProps(user.id);
			let isRebegin = !(rougeProps && rougeProps.length > 1) || rougeProps[1] !== rougeProps[2]
			if (!target && isRebegin) {
				let beginstr = `|uhtml|rouge|<b>请选择开局精灵:</b><br/>${Rouge.initButtons}<br/>`;
				if (RougeUtils.checkPassRecord(user.id))
					beginstr += `<b>特殊开局: </b><br/ > ${Rouge.specialInitButtons}`;
				return user.sendTo(room.roomid, beginstr);
			}

			const bot = Users.get(BOTID);
			if (!bot) {
				return user.popup(`|html|<div style="text-align: center">机器人离线了</div>`);
			}

			let userTeam: string, botTeam: string;
			if (rougeProps && rougeProps.length > 2 && !isRebegin) {
				let wave = Number(rougeProps[1]);
				if (wave !== 21 && wave !== 38) {
					wave = (4 + wave * 6) / 10;
					botTeam = getRougeSet(sample(Enemies[Math.floor(wave)], Math.min(Math.max(1, Math.floor((1 + wave) * 0.6)), 6), Rouge.prng), Rouge.prng);
				} else {
					botTeam = Rouge.prng.sample(ChampionTeams[Math.ceil(wave / 21 )- 1]);
				}
				userTeam = rougeProps[0]
				RougeUtils.addWave(user.id);
			} else {
				let role = Number(target) || 1;
				switch (role) {
					case 0: userTeam = 'Keldeo-Resolute||Azure Flute|justified|secretsword,surf,Calm Mind,airslash|Hasty|,4,,252,,252|||||'; break;
					case 1: userTeam = getRougeSet(PokemonPool.Charmander, Rouge.prng); break;
					case 2: userTeam = getRougeSet(PokemonPool.Squirtle, Rouge.prng); break;
					case 3: userTeam = getRougeSet(PokemonPool.Bulbasaur, Rouge.prng); break;
					case 4: userTeam = Rouge.prng.random(2) === 1 ? getRougeSet(PokemonPool.Pikachu, Rouge.prng) : getRougeSet(PokemonPool["Pikachu-Original"], Rouge.prng); break;
					case 5: userTeam = getRougeSet(PokemonPool.Cyndaquil, Rouge.prng); break;
					case 6: userTeam = getRougeSet(PokemonPool.Totodile, Rouge.prng); break;
					case 7: userTeam = getRougeSet(PokemonPool.Chikorita, Rouge.prng); break;
					case 8: userTeam = getRougeSet(PokemonPool.Torchic, Rouge.prng); break;
					case 9: userTeam = getRougeSet(PokemonPool.Mudkip, Rouge.prng); break;
					case 10: userTeam = getRougeSet(PokemonPool.Treecko, Rouge.prng); break;
					case 11: userTeam = getRougeSet(PokemonPool.Chimchar, Rouge.prng); break;
					case 12: userTeam = getRougeSet(PokemonPool.Piplup, Rouge.prng); break;
					case 13: userTeam = getRougeSet(PokemonPool.Turtwig, Rouge.prng); break;
					case 14: userTeam = getRougeSet(PokemonPool.Tepig, Rouge.prng); break;
					case 15: userTeam = getRougeSet(PokemonPool.Oshawott, Rouge.prng); break;
					case 16: userTeam = getRougeSet(PokemonPool.Snivy, Rouge.prng); break;
					case 17: userTeam = getRougeSet(PokemonPool.Fennekin, Rouge.prng); break;
					case 18: userTeam = getRougeSet(PokemonPool.Froakie, Rouge.prng); break;
					case 19: userTeam = getRougeSet(PokemonPool.Chespin, Rouge.prng); break;
					case 20: userTeam = getRougeSet(PokemonPool.Litten, Rouge.prng); break;
					case 21: userTeam = getRougeSet(PokemonPool.Popplio, Rouge.prng); break;
					case 22: userTeam = getRougeSet(PokemonPool.Rowlet, Rouge.prng); break;
					case 23: userTeam = getRougeSet(PokemonPool.Scorbunny, Rouge.prng); break;
					case 24: userTeam = getRougeSet(PokemonPool.Sobble, Rouge.prng); break;
					case 25: userTeam = getRougeSet(PokemonPool.Grookey, Rouge.prng); break;
					case 26: userTeam = getRougeSet(PokemonPool.Fuecoco, Rouge.prng); break;
					case 27: userTeam = getRougeSet(PokemonPool.Quaxly, Rouge.prng); break;
					case 28: userTeam = getRougeSet(PokemonPool.Sprigatito, Rouge.prng); break;
					case 29: userTeam = getRougeSet(PokemonPool.Cscl, Rouge.prng); break;
					case 30: userTeam = getRougeSet(PokemonPool["Daiwa Scarlet"], Rouge.prng); break;
					case 31: userTeam = getRougeSet(PokemonPool.Wind777, Rouge.prng); break;
					default: return user.sendTo(room.roomid, `|html|<b>该角色暂未公布</b><br>`);
				}
				RougeUtils.setInitial(user.id, role);
				botTeam = getRougeSet(Rouge.prng.sample(Enemies[0]), Rouge.prng);
				RougeUtils.updateUserTeam(user.id, userTeam, true);
			}
			let format='gen9rougemod @@@pschinarougemode';
			if(RougeUtils.getDifficulty(user.id)===1){
				format='gen9rougemod @@@pschinarougemode,pschinarougehardmode'
			}
			let battle=Rouge.createBattle(user, bot, userTeam, botTeam, format, undefined);
			if(!battle){
				RougeUtils.reduceWave(user.id);
			}
			
		},

		clearcache(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			if (Rouge.inBattle(user.id)) {
				return user.popup(`|html|<div style="text-align: center">您不能在对战中删除队伍</div>`);
			}
			if (target) {
				RougeUtils.updateUserTeam(user.id, '');
				user.sendTo(room!.roomid, `|uhtml|rouge|<b>您已删除您的队伍</b><br>`);
			} else {
				user.sendTo(room!.roomid, `|uhtml|rouge|<b>确认删除队伍吗?</b> ${PetUtils.boolButtons('/rouge clearcache !', '/rouge clear')}<br>`);
			}
		},

		showrougeteam(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			let rougeProps = RougeUtils.loadRougeProps(user.id);
			if (rougeProps && rougeProps[0])
				this.popupReply(Teams.export(Teams.unpack(rougeProps[0])!) + "\n 遗物：" + rougeProps[3] + "\n 生命：" + rougeProps[5]);
			else
				return user.sendTo(room!.roomid, `|html|<b>您没有队伍</b><br>`);
		},

		chooselead(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			if (Rouge.inBattle(user.id)) {
				return user.popup(`|html|<div style="text-align: center">请先完成对战再改首发</div>`);
			}
			let num = Number(target) - 1
			if (num && Number.isInteger(num) && num <= 5 && num >= 1) {
				let x = RougeUtils.changeLead(user.id, num);
				if (x)
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>选择成功</b><br>`);
				else
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>您在该位置没有精灵</b><br>`);
			} else {
				this.parse('/rouge clear');
				return user.sendTo(room!.roomid, `|uhtml|rouge|<b>请选择要改成首发的位置：</b><br>${Rouge.leadbButtons}`);
			}
		},
		choosebanevoable(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			if (Rouge.inBattle(user.id)) {
				return user.popup(`|html|<div style="text-align: center">请先完成对战再禁止进化</div>`);
			}
			let num = Number(target) - 1
			if (Number.isInteger(num) && num <= 5 && num >= 0) {
				let x = RougeUtils.setBanEvoable(user.id, num);
				if (x)
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>选择成功</b><br>`);
				else
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>您在该位置没有精灵</b><br>`);
			} else {
				this.parse('/rouge clear');
				return user.sendTo(room!.roomid, `|uhtml|rouge|<b>请选择要禁止进化的精灵的位置：</b><br>${Rouge.banEvobButtons}`);
			}
		},
		choosediff(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			if (Rouge.inBattle(user.id)) {
				return user.popup(`|html|<div style="text-align: center">请先完成对战再改难度</div>`);
			}
			let num = Number(target)
			if ( num && Number.isInteger(num) && num <= 2 && num >= 1) {
				let x = RougeUtils.setDifficulty(user.id, num-1);
				if (x)
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>当前难度改为${Rouge.difficult[num-1]}</b><br>`);
				else
					return user.sendTo(room!.roomid, `|uhtml|rouge|<b>选择失败</b><br>`);
			} else {
				this.parse('/rouge clear');
				return user.sendTo(room!.roomid, `|uhtml|rouge|<b>请选择难度：</b><br>${PetUtils.button(`/rouge choosediff 1`,Rouge.difficult[0] )+PetUtils.button(`/rouge choosediff 2`,Rouge.difficult[1] )}
				 <br> 困难难度下敌人全属性都得到了增强并且学会了钛晶化和极巨化。`);
			}
		},
		showpassrecord(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			let userRecord = RougeUtils.getPassRecord(user.id) || { 'cave': Array(RougeUtils.initMons.length).fill(0), 'void': Array(RougeUtils.initMons.length).fill(0) };

			let buf = '';
			buf += '<details><summary><b>您的成就</b></summary>';
			buf += PetUtils.table(
				RougeUtils.initMons,
				['Cave', 'Void'],
				[...new Array(RougeUtils.initMons.length).keys()].map(i => [userRecord['cave'][i]||0, userRecord['void'][i]]||0),
				'200px',
				'center',
				'center',
				true
			);
			buf += '</details>';
			user.sendTo(room!.roomid, `|uhtmlchange|rouge-record|`);
			user.sendTo(room!.roomid, `|uhtml|rouge-record|${buf}`);
		},

		clear(target, room, user) {
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			user.sendTo(room.roomid, `|uhtmlchange|rouge|`);
		},
		fullpassrecord(target, room, user) {
			if (!user.registered) return PetUtils.popup(user, "请先注册账号!");
			if (!room) return PetUtils.popup(user, "请在房间里使用Rouge系统");
			this.checkCan('bypassall');
			let rougeUser = RougeUtils.getUser(user.id);
			if (rougeUser) {
				rougeUser.passrecord = { 'cave': Array(RougeUtils.initMons.length).fill(1), 'void': Array(RougeUtils.initMons.length).fill(1) };
				RougeUtils.saveUser(user.id, rougeUser);
			}
		},
	},

}
