import { Utils } from '../../lib';
import { PetUtils } from './ps-china-pet-mode';

const PSChinaCommands = {
	'国服积分': {
		'查看国服积分': '/score',
		'查看国服积分记录': '/scorelog',
		'<@> 修改国服积分': '/pschinascore',
		'查看关联账号': '/checkalts',
		'<@> 更新用户关系表 (慎用)': '/updatealts',
	},
	'宠物系统': {
		'入口': '/pet',
		'盒子': '/pet box',
		'商店': '/pet shop',
		'使用精灵球': '/ball',
		'使用超级球': '/ball1',
		'使用高级球': '/ball2',
		'清空个体或努力值': '/pet box resetstat',
		'自走棋': '/autochess',
	},
	'宝可梦不归洞穴探险': {
		'入口': '/rouge',
		'开始或继续游戏': '/rouge start',
		'清除存档': '/rouge clearcache',
		'查看队伍': '/rouge showrougeteam',
		'更改首发': '/rouge chooselead',
		'查看成就': '/rouge showpassrecord',
	},
	'宠物图标': {
		'查看已被占用的宠物图标': '/icon list',
		'查看所有用户对应的宠物图标': '/icon table',
		'<@> 设置宠物图标': '/icon set',
		'<@> 删除宠物图标': '/icon delete',
	},
	'房间赛': {
		'查看下一场房间赛': '/autotour',
		'查看房间赛设置': '/autotour config',
	},
	'其他': {
		'<@> 查找并公开replay': '/restorereplay',
		'<@> 更新 PS China Guide': '/pschinaforums news',
		'将对战链接发送到房间': '/reportto',
		'查看随机对战配置': '/randomset',
		'<&> 天梯decay': '/laddertour decay',
		'[Gen 8] OU 队伍查询': '/teamdb',
		'<&> 更新队伍数据库': '/teamdb update',
		'生成bp33精灵池': '/bp33',
	},
};

export const commands: Chat.ChatCommands = {
	'pschina': 'pschinahelp',
	pschinahelp (target, room, user) {
		const isGlobalMod = user.can('lock');
		let buf = `<b>Pok&eacute;mon Showdown China 指令表</b>`;
		Object.entries(PSChinaCommands).forEach(([section, cmds]) => {
			buf += `<details title="Click to view replays" style="left: 20px; position: relative">`;
			buf += `<summary><b>${section}</b></summary>`;
			const cmdTable: string[][] = [];
			Object.entries(cmds).forEach(([desc, sample]) => {
				if (desc.startsWith('<&>') || desc.startsWith('<@>')) {
					if (isGlobalMod) {
						cmdTable.push([
							`<b>${Utils.escapeHTML(desc[1])}</b>${desc.slice(3)}`,
							`<code>${sample}</code>`
						]);
					}
				} else {
					cmdTable.push([desc, `<code>${sample}</code>`]);
				}
			});
			buf += PetUtils.table([], [], cmdTable, '300px', 'left', 'left', true);
			buf += `</details>`;
		});
		this.sendReply(`|uhtml|ps-china-help|${buf}`);
	},

	reportto(target, room, user) {
		if (!target || !room || !room.battle) return this.parse('/reporttohelp');
		this.checkCan('modchat', null, room);
		const targetRoom = Rooms.get(toID(target));
		if (!targetRoom) return this.errorReply(`未找到房间 ${target}`);
		if (target.endsWith('!')) {
			let buf = `<a href='${room.roomid}'>`;
			buf += `${room.game.title}: `;
			buf += `<username class="username">${room.getPlayer(0).name}</username>`;
			buf += ` v.s. `;
			buf += `<username class="username">${room.getPlayer(1).name}</username>`;
			buf += `</a>`;
			targetRoom.add(`|uhtml|${room.roomid}|${buf}`).update();
			buf = `<username class="username">${user.name}</username> `;
			buf += `<b>已将对战链接公开到 <a href="/${targetRoom.roomid}">${targetRoom.title}</a> 房间</b> `;
			buf += PetUtils.button(`/reportto ${targetRoom.roomid}!`, '更新');
			buf += PetUtils.button(`/reportto ${targetRoom.roomid}~`, '撤回');
			room.add(`|uhtmlchange|report-battle|${buf}`).update();
		} else if (target.endsWith('~')) {
			targetRoom.add(`|uhtmlchange|${room.roomid}|`).update();
			const reportButtons = ['Sky Pillar', 'Shinx']
			.map(roomTitle => `<button class="button" name="send" value="/reportto ${toID(roomTitle)}">${roomTitle}</button>`);
			room.add(`|uhtmlchange|report-battle|<b>将对战链接公开到:</b> ${reportButtons.join('')}`).update();
		} else {
			let buf = `<b>确认将对战链接公开到 <a href="/${targetRoom.roomid}">${targetRoom.title}</a> 房间?</b> `;
			buf += PetUtils.boolButtons(`/reportto ${targetRoom.roomid}!`, `/reportto ${targetRoom.roomid}~`);
			this.sendReply(`|uhtmlchange|report-battle|${buf}`);
		}
	},
	reporttohelp: [
		`/reportto [room] - 将对战链接发送到room房间 (只能在对战房间使用)`,
	],

	bp33(target, room, user, connection, cmd, message) {
		this.checkBroadcast();
		if (target.replace(/gen[1-8]/i, "")) {
			return this.parse('bp33help');
		} else {
			let toParse = message[0] + "randpoke 11";
			if (target.length > 0) {
				let gen = parseInt(target[3]);
				if (gen < 8) {
					for (let i = 8; i > gen; i--) {
						toParse += ", !gen" + i;
					}
					toParse += ", natdex";
				}
			}
			return this.parse(toParse);
		}
	},
	bp33help: [
		`/bp33 gen[1-8] - 指定一个世代随机生成bp33精灵池`,
	],

	randset: 'randomset',
	randomset(target, room, user) {
		const [pokemonString, formatString] = target.split(',');
		this.runBroadcast();

		const format = Dex.formats.get(formatString || room?.battle?.format || 'gen8freeforall');
		if (!format.exists) return this.parse('/randomsethelp');

		const species = Dex.species.get(pokemonString);
		if (!species.exists) return this.parse('/randomsethelp');
		
		const set = Teams.getGenerator(format.id).randomSet(species.id);
		const prettyifiedSet = Utils.escapeHTML(Teams.export([set])).replace(/<br \/>$/, '');
		this.sendReplyBox(`<details><summary><strong>Random set for ${species.name} in ${format.name}</strong></summary>${prettyifiedSet}</details>`);
	},
	randomsethelp: [
		`/randomset [pokemon], [format] - 查找宝可梦pokemon在format分级上的随机对战配置 (分级默认为[Gen 8] Random Battle)`,
	],
};