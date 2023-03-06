import { FS } from '../../lib';
import { Auth } from '../user-groups';
import { SERVER_URL, PetUtils, getUser as getPetUser, dropUser as dropPetModeUser } from './ps-china-pet-mode';
import { loginMsgs } from './ps-china-forums';

export const MAX_USERS = 500;

const WHITELISTPATH = 'config/ps-china/whitelist.json';
const REPLAYHEADPATH = 'config/ps-china/replay/replay-head.txt';
const REPLAYTAILPATH = 'config/ps-china/replay/replay-tail.txt';

const IPLOGDIR = 'logs/iplog';
const IPMAPPATH = 'logs/ipmap.json';
const SCORELOGDIR = 'logs/score';

if (!FS(IPLOGDIR).existsSync()) FS(IPLOGDIR).mkdir();
if (!FS(SCORELOGDIR).existsSync()) FS(SCORELOGDIR).mkdir();

let userAlts: { [userid: string]: string[] } = JSON.parse(FS(IPMAPPATH).readIfExistsSync() || '{}');
let whitelist: { [userid: string]: number } = JSON.parse(FS(WHITELISTPATH).readIfExistsSync() || '{}');
let addingScore: boolean = false;

export class AdminUtils {
	static adminPM(userid: string, msg: string) {
		const user = Users.get(userid);
		if (!user || !user.connected) return;
		user.send(`|pm|&|${user.tempGroup}${user.name}|/raw <div class="broadcast-green"><b>${msg}</b></div>`);
	}
	static updateUserAlts() {
		const ipCount: { [ip: string]: { [userid: string]: number } } = {};
		const idCount: { [userid: string]: number } = {};
		FS(IPLOGDIR).readdirIfExistsSync().slice(-16).forEach(fileName => {
			FS(`${IPLOGDIR}/${fileName}`).readIfExistsSync().split('\n').forEach(line => {
				const entry = line.split(',');
				if (entry.length !== 3) return;
				const userid = toID(entry[0]);
				const ip = entry[2];
				if (['0.0.0.0', '127.0.0.1'].includes(ip) || ip.startsWith('192.168.')) return;
				if (['shared', 'proxy'].includes(IPTools.getHostType('', ip))) return;
				if (!ipCount[ip]) ipCount[ip] = {};
				if (!ipCount[ip][userid]) ipCount[ip][userid] = 0;
				ipCount[ip][userid]++;
				if (!idCount[userid]) idCount[userid] = 0;
				idCount[userid]++;
			});
		});
		const idEdges: { [userid: string]: { [userid: string]: number } } = {};
		for (let ip in ipCount) {
			for (let id1 in ipCount[ip]) {
				if (!idEdges[id1]) {
					idEdges[id1] = {};
					idEdges[id1][id1] = Infinity;
				}
				for (let id2 in ipCount[ip]) {
					if (!idEdges[id1][id2]) idEdges[id1][id2] = 0;
					idEdges[id1][id2] += ipCount[ip][id1] * ipCount[ip][id2];
				}
			}
		}
		userAlts = {};
		for (let userid in idEdges) {
			userAlts[userid] = Object.keys(idEdges[userid]).sort(
				(id1, id2) => idEdges[userid][id1] < idEdges[userid][id2] ? 1 : -1
			);
		}
		FS(IPMAPPATH).safeWriteSync(PetUtils.formatJSON(userAlts));
	}
	static getAlts(userid: string): string[] | undefined {
		return userAlts[userid];
	}
	static async getMainId(userid: string): Promise<string> {
		for (let id of this.getAlts(userid) || [userid]) {
			if (!!(await this.getScore(id))) return id;
		}
		return '';
	}
	static addEggToMain(userid: string): string {
		return (this.getAlts(userid) || [userid]).find(id => {
			const petUser = getPetUser(id);
			if (petUser.addRandomEgg('3v')) {
				petUser.save();
				return true;
			}
		}) || '';
	}
	static async addScoreToMain(userid: string, score: number, msg: string = '') {
		const mainId = await this.getMainId(userid);
		const isMain = mainId === userid;
	
		msg += ', ';
		let noteMsg = msg.replace('{}', '您');
		let logMsg = '自动定向加分: ' + msg.replace('{}', userid + ' ');
		if (mainId) {
			const scores = await this.addScore(mainId, score, msg.replace('{}', ''));
			if (!isMain) {
				noteMsg += `您的积分账号 ${mainId} `;
				logMsg += `积分账号 ${mainId} `;
			}
			noteMsg += `获得国服积分 ${score} 分`;
			logMsg += `获得国服积分: ${scores[0]} + ${score} = ${scores[1]}`;
		} else {
			noteMsg += `由于未查到您的积分记录, 请联系管理员为您发放国服积分 ${score} 分。`;
			logMsg += `未查到积分记录, 请管理员核实账号后手动发放 ${score} 分。`
		}
	
		Rooms.global.modlog({ action: logMsg, isGlobal: true });
		Rooms.get('staff')?.add(`|c|&|/log ${logMsg}`).update();
		this.adminPM(userid, noteMsg);
	}
	static async getScore(userid: string): Promise<number> {
		// @ts-ignore
		let ladder = await Ladders("gen8ps").getLadder();
		for (let entry of ladder) {
			if (toID(userid) ? (toID(entry[2]) === toID(userid)) : (entry[2] === userid)) {
				return entry[1];
			}
		}
		return 0;
	}
	static async addScore(userid: string, score: number, reason: string = '', formatid: string = 'gen8ps'): Promise<number[]> {
		while (addingScore) await PetUtils.sleep(1);
		addingScore = true;
		// @ts-ignore
		let ladder: (string | number)[][] = await Ladders(formatid).getLadder();
		let userIndex = ladder.length;
		for (let [i, entry] of ladder.entries()) {
			if (toID(userid) ? (toID(entry[2]) === toID(userid)) : (entry[2] === userid)) {
				userIndex = i;
				break;
			}
		}
		if (userIndex === ladder.length) ladder.push([userid, 0, userid, 0, 0, 0, '']);
		let oldScore = +ladder[userIndex][1];
		if (score === 0) {
			addingScore = false;
			return [oldScore, oldScore];
		}
		let newScore = oldScore + score;
		if (newScore < 0) {
			addingScore = false;
			return [];
		}
		ladder[userIndex][1] = newScore;
	
		let newIndex = userIndex;
		while (newIndex > 0 && ladder[newIndex - 1][1] <= newScore) newIndex--;
		while (ladder[newIndex] && ladder[newIndex][1] >= newScore) newIndex++;
		if (newIndex !== userIndex && newIndex !== userIndex + 1) {
			let row = ladder.splice(userIndex, 1)[0];
			if (newIndex > userIndex) newIndex--;
			ladder.splice(newIndex, 0, row);
		}
	
		let lastIndex = ladder.length - 1;
		while (ladder[lastIndex][1] <= 0) lastIndex--;
		ladder.splice(lastIndex + 1, ladder.length);
	
		// @ts-ignore
		await Ladders(formatid).save();
		if (formatid === 'gen8ps') {
			const logMsg = `${PetUtils.getDate()},${oldScore}${score < 0 ? "-" : "+"}${Math.abs(score)}=${newScore},${reason}\n`;
			FS(`${SCORELOGDIR}/${toID(userid) || userid}.txt`).appendSync(logMsg);
		}
		addingScore = false;
		return [oldScore, newScore];
	}
	static saveWhitelist() {
		FS(WHITELISTPATH).safeWriteSync(PetUtils.formatJSON(whitelist));
	}
	static addToWhitelist(userid: string, days: number) {
		userid = toID(userid);
		let expireTime = Date.now() + days * 24 * 60 * 60 * 1000;
		if (Date.now() < expireTime) {
			whitelist[userid] = expireTime;
		} else {
			delete whitelist[userid];
		}
		AdminUtils.saveWhitelist();
	}
	static checkWhitelist(userid: string): boolean {
		userid = toID(userid);
		if (Auth.atLeast(Users.globalAuth.get(userid as ID), '+')) return true;
		if (whitelist[userid]) {
			if (Date.now() < whitelist[userid]) return true;
			delete whitelist[userid];
			AdminUtils.saveWhitelist();
		}
		return false;
	}
	static onUserRename(user: User, connection: Connection, nextId: string): boolean {
		if (Users.onlineCount > MAX_USERS && !Users.get(nextId) && !AdminUtils.checkWhitelist(nextId)) return false;
		let date = new Date();
		let zfill = (x: number) => { return ("0" + x).slice(-2); };
		FS(`logs/iplog/${date.getFullYear()}-${zfill(date.getMonth() + 1)}-${zfill((date.getDate()))}.txt`)
			.append(`${nextId},${zfill(date.getHours())}:${zfill(date.getMinutes())},${connection.ip}\n`);
		if (user.id.startsWith('guest')) {
			Object.entries(loginMsgs).forEach(([k, v]) => user.send(`|pm|${k}|${user.tempGroup}${user.name}|/raw ${v}`));
		} else {
			dropPetModeUser(user.id);
		}
		return true;
	}
	static onUserDisconnect(user: User) {
		dropPetModeUser(user.getLastId());
	}
}

export const commands: Chat.ChatCommands = {
	async score(target, room, user) {
		let targetUser = target.replace('!', '') || user.id;
		const score = await AdminUtils.getScore(targetUser);
		let msg = score ? `${targetUser} 的PS国服积分是: ${score}` : `未找到用户 ${targetUser} 的PS国服积分记录`;
		return target.includes('!') ? PetUtils.popup(user, msg) : score ? this.sendReply(msg) : this.errorReply(msg);
	},
	scorehelp: [
		`/score [user] - 查看user用户(默认为自己)的国服积分`,
	],

	async pschinascore(target, room, user) {
		this.checkCan('lock');
		if (!room || !room.settings.staffRoom) return this.errorReply("在 Staff 房间更新PS国服积分");

		const userid = target.split(',')[0]?.trim();
		const score = target.split(',')[1]?.trim();
		const reason = target.split(',')[2]?.trim();
		if (!userid || !score || !reason || isNaN(parseInt(score))) {
			return this.parse("/pschinascorehelp");
		}
		const parsedScore = parseInt(score);
		const changeScore = await AdminUtils.addScore(userid, parsedScore, reason);
		if (changeScore.length !== 2) return this.errorReply("错误: 将造成负分。");

		AdminUtils.adminPM(userid, `您因为 ${reason} ${parsedScore > 0 ? '获得': '失去'}了 ${Math.abs(parsedScore)} 国服积分`);
		const message = `用户ID: ${userid}, PS国服积分: ` +
			`${changeScore[0]} ${parsedScore < 0 ? "-" : "+"} ${Math.abs(parsedScore)} = ${changeScore[1]}, ` +
			`原因: ${reason}, 操作人: ${user.name}.`;
		this.globalModlog(message);
		this.addModAction(message);

		if (changeScore[0] === 0) {
			const alts = AdminUtils.getAlts(toID(userid));
			if (!alts) {
				room.add(`|html|<b>注意: 未找到用户 ${userid} 的登录记录</b>`);
				return;
			}
			const content: (string | number)[][] = alts.map(alt => [alt]);
			for (let [i, alt] of alts.entries()) {
				content[i].push('&ensp;积分:&ensp;');
				content[i].push(alt === toID(userid) ? 0 : await AdminUtils.getScore(alt));
			}
			room.add(`|html|<b>注意: ${userid} 此前没有国服积分, 关联账号:</b><br>${PetUtils.table([], [], content, 'auto')}`);
		}
	},
	pschinascorehelp: [
		`/pschinascore [user], [score], [reason] - 给user用户的国服积分增加score分, 说明原因. Requires: & ~`,
	],

	'scorelog': 'pschinascorelog',
	async pschinascorelog(target, room, user) {
		const targets = target.split(',');
		const userId = toID(targets[0]) || targets[0] || user.id;
		if (userId !== user.id) this.checkCan('lock');
		const limit = parseInt(targets[1]) || 20;
		const logs = FS(`${SCORELOGDIR}/${userId}.txt`).readIfExistsSync();
		if (!logs) return this.errorReply(`未查到用户 ${userId} 在2021年9月1日之后的国服积分记录`);
		const lines = logs.trim().split('\n').slice(-limit).map(line => line.split(',').map(s => `&ensp;${s}&ensp;`));
		this.sendReply(`用户 ${userId} 的最近${lines.length}条国服积分记录:`);
		this.sendReply(`|html|${PetUtils.table([], ['日期', '积分', '原因'], lines, 'auto')}`);
	},
	pschinascoreloghelp: [
		`/scorelog [user], [lines] - 查看user用户(默认为自己)的最近lines(默认为20)条国服积分记录`,
	],

	restorereplay(target, room, user) {
		this.checkCan('lock');
		let params = target.split(',');
		if (!params || params.length != 4) {
			return this.parse('/restorereplayhelp');
		}
		let p1 = params[0].toLowerCase().replace(/[^\w\d\s]/g, '').replace(/\s+/g, '');
		let p2 = params[1].toLowerCase().replace(/[^\w\d\s]/g, '').replace(/\s+/g, '');
		let format = params[2].toLowerCase().replace(/[^\w\d\s]/g, '').replace(/\s+/g, '');
		let date = params[3].replace(/\s+/g, '');

		this.globalModlog('REPLAYRESTORE', `${p1}, ${p2}, ${format}, ${date}`, `By ${user.name}.`);
		let dir = `logs/${date.substr(0, 7)}/${format}/${date}`;

		let files = [];
		try {
			files = FS(dir).readdirSync();
		} catch (err: any) {
			if (err.code === 'ENOENT') {
				return this.errorReply("Replay not found.");
			}
			throw err;
		}

		let foundReplay = false;
		const rep_head = FS(REPLAYHEADPATH).readIfExistsSync();
		const rep_tail = FS(REPLAYTAILPATH).readIfExistsSync();
		for (const file of files) {
			const json = FS(`${dir}/${file}`).readIfExistsSync();
			const data = JSON.parse(json);
			if ((toID(data.p1) === p1 && toID(data.p2) === p2) || (toID(data.p1) === p2 && toID(data.p2) === p1)) {
				foundReplay = true;
				const htmlname = file.replace(".log.json", ".html");
				FS(`config/avatars/static/${htmlname}`).safeWriteSync(rep_head + data.log.join('\n') + rep_tail);
				this.sendReply(`${SERVER_URL}/avatars/static/${htmlname}`);
			}
		}
		if (!foundReplay) {
			return this.errorReply("Replay not found.");
		}
	},
	restorereplayhelp: [
		`/restorereplay [player1], [player2], [format], [year]-[month]-[date]`,
	],

	async updatealts() {
		this.checkCan('lock');
		AdminUtils.updateUserAlts();
		this.sendReply('用户关系表更新完成');
	},

	async checkalts(target, room, user) {
		const userId = toID(target) || user.id;
		const userName = target || user.name;
		if (userId !== user.id) this.checkCan('lock');
		const alts = AdminUtils.getAlts(userId);
		if (!alts) return this.sendReply(`未找到用户 ${userName} 的登录记录`);
		this.sendReply(`用户 ${userName} 的关联账号: ${alts.join(', ')}`);
		this.sendReply(`用户 ${userName} 的积分账号: ${await AdminUtils.getMainId(userId)}`);
	},
	checkaltshelp: [
		'/checkalts [user] - 查看user用户(默认为自己)的关联账号'
	],

	'cnwl': 'pschinawhitelist',
	pschinawhitelist: {
		'': 'check',
		check(target, room, user) {
			this.checkCan('lock');
			let now = Date.now();
			let whitelistTable = [];
			let changed = false;
			for (let [userid, expireTime] of Object.entries(whitelist)) {
				if (expireTime < now) {
					delete whitelist[userid];
					changed = true;
				} else {
					let expireTimeStr = new Date(expireTime).toString().split('GMT')[0];
					whitelistTable.push([userid, expireTimeStr]);
				}
			}
			if (changed) AdminUtils.saveWhitelist();
			let buf = '<b>PS China 白名单:</b>';
			if (whitelistTable.length > 0) {
				buf += '<br/>';
				buf += PetUtils.table([], ['PSID', '过期时间'], whitelistTable, '400px', 'center', 'center', true);
			} else {
				buf += ' 目前是空的<br/>';
			}
			buf += `<form data-submitsend="/msgroom ${room!.roomid}, /pschinawhitelist edit {userid},{days}">`;
			buf += `给<input name="userid" style="width: 100px"/>添加`;
			buf += `<input name="days" value="1" style="width: 20px"/>天白名单权限`;
			buf += `<button class="button" type="submit">OK</button>`;
			buf += `</form>`;
			this.sendReply(`|uhtml|pschinawhitelist|${buf}`);
		},

		'add': 'edit',
		'delete': 'edit',
		'remove': 'edit',
		edit(target, room, user) {
			this.checkCan('lock');
			let [userid, daysStr] = target.split(',');
			userid = toID(userid);
			if (!userid) return this.parse('/pschinawhitelist check');
			let days = parseFloat(daysStr);
			if (isNaN(days)) return this.parse('/pschinawhitelist check');
			AdminUtils.addToWhitelist(userid, days);
			this.parse('/pschinawhitelist check');
		},
	},

	'removegroupavatars': 'removegroupavatar',
	removegroupavatar(target, room, user) {
		this.checkCan('bypassall');
		const targetAvatar = target.trim().toLowerCase();
		if (!targetAvatar) return this.parse('/removegroupavatarhelp');
		let hitTarget = false;
		const hits: string[] = [];
		// TODO: startswith(targetAvatar)
		Object.entries(Users.Avatars!.avatars).forEach(([userId, avatarInfo]) => {
			avatarInfo.allowed.forEach(avatar => {
				if (avatar === targetAvatar) {
					hitTarget = true;
					hits.push(userId);
				}
			});
		});
		if (hitTarget) {
			hits.forEach(userId => this.parse(`/removeavatar ${userId}, ${targetAvatar}`));
		} else {
			this.errorReply(`未找到团队头像: ${targetAvatar}`)
		}
	},
	removegroupavatarhelp: [
		'/removegroupavatar [avatar] - 删除团队头像'
	],
};