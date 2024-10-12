import { FS } from '../../lib';
import { Auth } from '../user-groups';
import { SERVER_URL, PetUtils, getUser as getPetUser, dropUser as dropPetModeUser } from './ps-china-pet-mode';
import { loginMsgs } from './ps-china-forums';

export const MAX_USERS = 500;
export const ALTS_RECORD = 16;

const WHITELISTPATH = 'config/ps-china/whitelist.json';
const REPLAYHEADPATH = 'config/ps-china/replay/replay-head.txt';
const REPLAYTAILPATH = 'config/ps-china/replay/replay-tail.txt';
const DRAFTFORMPATH = 'config/ps-china/draft-form.html';

const IPLOGDIR = 'logs/iplog';
const IPMAPPATH = 'logs/ipmap.json';
const SCORELOGDIR = 'logs/score';
const SCOREPATH = 'config/ps-china/score.json';

if (!FS(IPLOGDIR).existsSync()) FS(IPLOGDIR).mkdir();
if (!FS(SCORELOGDIR).existsSync()) FS(SCORELOGDIR).mkdir();

let userAlts: { [userid: string]: string[] } = JSON.parse(FS(IPMAPPATH).readIfExistsSync() || '{}');
let whitelist: { [userid: string]: number } = JSON.parse(FS(WHITELISTPATH).readIfExistsSync() || '{}');
let scoreTable: { [userid: string]: [string, number, number] } = JSON.parse(FS(SCOREPATH).readIfExistsSync() || '{}');
let scoreLadderBuffer: string;

export class AdminUtils {
	static adminPM(userid: string, msg: string) {
		const user = Users.get(userid);
		if (!user || !user.connected) return;
		user.send(`|pm|&|${user.tempGroup}${user.name}|/raw <div class="broadcast-green"><b>${msg}</b></div>`);
	}
	static updateUserAlts() {
		const ipCount: { [ip: string]: { [userid: string]: number } } = {};
		const idCount: { [userid: string]: number } = {};
		FS(IPLOGDIR).readdirIfExistsSync().slice(-ALTS_RECORD).forEach(fileName => {
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
			if (id in scoreTable) return id;
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
			const [_, newScore] = this.addScore(mainId, score, msg.replace('{}', ''), false, 'AUTOTOUR');
			if (!isMain) {
				noteMsg += `您的积分账号 ${mainId} `;
				logMsg += `积分账号 ${mainId} `;
			}
			noteMsg += `获得国服积分 ${score} 分`;
			logMsg += `获得国服积分: ${newScore - score} + ${score} = ${newScore}`;
		} else {
			noteMsg += `由于未查到您的积分记录, 请联系管理员为您发放国服积分 ${score} 分。`;
			logMsg += `未查到积分记录, 请管理员核实账号后手动发放 ${score} 分。`
		}
	
		Rooms.global.modlog({ action: logMsg, isGlobal: true });
		Rooms.get('staff')?.add(`|c|&|/log ${logMsg}`).update();
		this.adminPM(userid, noteMsg);
	}
	static getAccumulateScore(userid: string): number {
		if (scoreTable[userid]) {
			return scoreTable[userid][2];
		} else {
			return 0;
		}
	}
	static getAnnualScore(userid: string): number {
		if (scoreTable[userid]) {
			return scoreTable[userid][1];
		} else {
			return 0;
		}
	}
	static getScoreLadderBuffer() {
		const scoreLadder = Object.values(scoreTable).sort(
			(a, b) => (a[1] == b[1]) ? (b[2] - a[2]) : (b[1] - a[1])
		).map(
			([username, annualScore, accumulateScore], idx) =>
				[(idx + 1).toString(), username, annualScore.toString(), accumulateScore.toString()]
		);
		let buf = '';
		buf += `<div class="ladder pad">`;
		buf += `<h3>PS China 积分榜 2024</h3>`;
		buf += `<p><button class="button" name="send" value="/j view-scoreladder"><i class="fa fa-refresh"></i> 刷新</button></p>`;
		buf += AdminUtils.table([], ['', '用户名', '赛年积分', '累计积分'], scoreLadder);
		buf += `</div>`;
		return buf;
	}
	static addScore(
		username: string,
		score: number,
		reason: string = '',
		annual: boolean = false,
		moderator: string = '',
	): number[] {
		let userid = toID(username);
		let lastUsername = username, annualScore = 0, accumulateScore = 0;
		if (userid in scoreTable) {
			[lastUsername, annualScore, accumulateScore] = scoreTable[userid];
		}
		let lastScore = accumulateScore;
		accumulateScore += score;
		if (annual) {
			annualScore += score;
		}
		if (annualScore == 0 && accumulateScore == 0) {
			delete scoreTable[userid];
		} else {
			scoreTable[userid] = [username, annualScore, accumulateScore];
		}
		scoreLadderBuffer = this.getScoreLadderBuffer();
		this.saveScoreTable();
		const logMsg = [
			`${PetUtils.getDate()}`,
			`${lastScore}${score < 0 ? "-" : "+"}${Math.abs(score)}=${accumulateScore}`,
			reason,
			annual ? '计入赛年积分' : '',
			moderator,
		].join(',') + '\n';
		FS(`${SCORELOGDIR}/${toID(userid) || userid}.txt`).appendSync(logMsg);
		return [annualScore, accumulateScore];
	}
	static clearAnnualScore() {
		for (let userid in scoreTable) {
			scoreTable[userid][1] = 0;
		}
		scoreLadderBuffer = this.getScoreLadderBuffer();
		this.saveScoreTable();
	}
	static saveScoreTable() {
		FS(SCOREPATH).safeWriteSync(PetUtils.formatJSON(scoreTable));
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
	static clearGuests(prefix: string = 'msnbot'): number {
		let cnt = 0;
		for (let user of Users.users.values()) {
			if (!user.registered && user.latestHost.startsWith(prefix)) {
				user.disconnectAll();
				cnt++;
			}
		}
		return cnt;
	}
	static table(
		rowNames: (string | number)[], colNames: (string | number)[], content: (string | number)[][],
	): string {
		const tr = (s: string) => `<tr>${s}</tr>`;
		const th = (s: string | number) => `<th>${s}</th>`;
		const td = (s: string | number) => `<td>${s}</td>`;
		const tableBody = content.map(row => row.map(td));
		if (rowNames.length === content.length) {
			rowNames.forEach((rowName, i) => tableBody[i].unshift(th(rowName)));
			colNames.unshift('');
		}
		if (colNames.length === tableBody[0].length) tableBody.unshift(colNames.map(th));
		const tableBodyStr = tableBody.map((row, i) => tr(row.join(''))).join('');
		return `<table>${tableBodyStr}</table>`;
	}
}

scoreLadderBuffer = AdminUtils.getScoreLadderBuffer();

export const commands: Chat.ChatCommands = {

	userlist(target, room, user) {
		this.checkCan('bypassall');
		const userTable: string[][] = [];
		for (let user of Users.users.values()) {
			userTable.push([user.id, user.name, user.ips.join(', ')]);
		}
		const buf = PetUtils.table([], ['ID', 'Name', 'IP List'], userTable, '400px', 'left', 'left', true);
		this.sendReply(`|uhtml|pschinauserlist|${buf}`);
	},
	userlisthelp: [
		`/userlist - 查看内存中的所有用户`,
	],

	clearguests(target, room, user) {
		this.checkCan('lock');
		const releaseCount = AdminUtils.clearGuests();
		this.sendReply(`Released ${releaseCount} unregistered guests.`)
	},
	clearguestshelp: [
		`/clearguests - 切断未注册访客的连接以释放服务器容量`,
	],

	score(target, room, user) {
		let targetId = toID(target) || user.id;
		let msg: string;
		if (targetId in scoreTable) {
			msg = `用户 ${targetId} 赛年积分: ${scoreTable[targetId][1]}; 累计积分: ${scoreTable[targetId][2]}`;
		} else {
			msg = `未找到用户 ${targetId} 的PS国服积分记录`;
		}
		return target.includes('!') ? PetUtils.popup(user, msg) : this.sendReply(msg);
	},
	scorehelp: [
		`/score [user] - 查看user用户(默认为自己)的国服积分`,
	],

	async pschinascore(target, room, user) {
		this.checkCan('lock');
		if (!room || !room.settings.staffRoom) return this.errorReply("在 Staff 房间更新PS国服积分");

		const username = target.split(',')[0]?.trim();
		const score = target.split(',')[1]?.trim();
		const reason = target.split(',')[2]?.trim();
		const tag = target.split(',')[3]?.trim();
		if (!username || !score || !reason || isNaN(parseInt(score))) {
			return this.parse("/pschinascorehelp");
		}
		const delta = parseInt(score);

		const annual = !toID(tag).startsWith('c');
		const annualDelta = annual ? delta : 0;
		const lastAccumulateScore = AdminUtils.getAccumulateScore(toID(username));
		const lastAnnualScore = AdminUtils.getAnnualScore(toID(username));
		if (lastAccumulateScore + delta < 0) return this.errorReply("错误: 累计积分不足。");
		if (annual && lastAnnualScore + delta < 0) return this.errorReply("错误: 赛年积分不足。");

		const [annualScore, accumulateScore] = AdminUtils.addScore(username, delta, reason, annual, user.name);

		const userMsg = `您因为 ${reason} ` +
			`${delta > 0 ? '获得': '失去'}了 ` +
			`${Math.abs(delta)} 积分, ` +
			`${annual ? '' : '不'}计入赛年积分。` +
			`欢迎使用 /score 指令查询国服积分状态。`;
		AdminUtils.adminPM(username, userMsg);
		const logMsg = `用户: ${username}, ` +
			`累计积分: ${lastAccumulateScore} ${delta < 0 ? "-" : "+"} ${Math.abs(delta)} = ${accumulateScore}, ` +
			`赛年积分: ${lastAnnualScore} ${annualDelta < 0 ? "-" : "+"} ${Math.abs(annualDelta)} = ${annualScore}, ` +
			`原因: ${reason}, 操作人: ${user.name}`;
		this.globalModlog(logMsg);
		this.addModAction(logMsg);

		if (lastAccumulateScore === 0 && lastAnnualScore === 0) {
			const alts = AdminUtils.getAlts(toID(username));
			if (!alts) {
				room.add(`|html|<b>注意: 未找到用户 ${username} 的登录记录</b>`);
				return;
			}
			const content: (string | number)[][] = alts.map(alt => [alt]);
			for (let [i, alt] of alts.entries()) {
				content[i].push('&ensp;累计积分:&ensp;');
				content[i].push(alt === toID(username) ? 0 : AdminUtils.getAccumulateScore(alt));
			}
			room.add(`|html|<b>注意: ${username} 此前没有国服积分, 关联账号:</b><br>${PetUtils.table([], [], content, 'auto')}`);
		}
	},
	pschinascorehelp: [
		`/pschinascore [user], [score], [reason], [tag] - 给user用户的国服积分增加score分, 说明原因; ` +
		`消费积分时请将tag设为"C", 此时将不计入赛年积分. Requires: & ~`,
	],

	clearannualscore(target, room, user) {
		this.checkCan('bypassall');
		AdminUtils.clearAnnualScore();
		this.sendReply(`[${PetUtils.getDate()}] 已清空赛年积分。`);
	},
	clearannualscorehelp: [
		`/clearannualscore - 清空所有用户的赛年积分`,
	],

	'scorelog': 'pschinascorelog',
	async pschinascorelog(target, room, user) {
		const targets = target.split(',');
		const userId = toID(targets[0]) || targets[0] || user.id;
		if (userId !== user.id) this.checkCan('lock');
		const limit = parseInt(targets[1]) || 20;
		const logs = FS(`${SCORELOGDIR}/${userId}.txt`).readIfExistsSync();
		if (!logs) return this.errorReply(`未查到用户 ${userId} 在2021年9月1日之后的国服积分记录`);
		const lines = logs.trim().split('\n').slice(-limit).map(line => line.split(',').slice(0, 3).map(s => `&ensp;${s}&ensp;`));
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
	
	pschinadraftset(target, room, user) {
		if (!room || room.roomid !== 'auction') return this.errorReply(`请在 Auction 房间设置赛事信息。`);
		this.checkCan('roommod', null, room);
		if (toID(target) === 'cancel') {
			return user.sendTo(room.roomid, `|uhtmlchange|draft-form|`);
		}
		const args = target.split('|');
		let teamNum = 0;
		if (args.length <= 1) {
			return user.sendTo(room.roomid, `|uhtml|draft-form|${FS(DRAFTFORMPATH).readIfExistsSync()}`);
		} else if (args.length === 8 + 4 * 4) {
			teamNum = 4;
		} else if (args.length === 8 + 6 * 4) {
			teamNum = 6;
		} else {
			this.errorReply('格式错误!');
			return this.parse('/pschinadraftset cancel');
		}
		const teamData = [...new Array(teamNum).keys()].map(i => {
			const retainInfo = args[6 + i * 4 + 3].trim();
			let retains: { [k: string]: number } = {};
			if (!!retainInfo && retainInfo.includes(':')) {
				retains = Object.fromEntries(retainInfo.split(',').map(x => {
					let [k, v] = x.split(':');
					return [toID(k), parseInt(v)];
				}));
			}
			return {
				'name': args[6 + i * 4 + 0],
				'leaders': args[6 + i * 4 + 1].split(',').map(toID),
				'CNName': args[6 + i * 4 + 2],
				'retains': retains,
			};
		});
		// console.log(teamData);
		// console.log('===== 1 =====');
		// console.log(teamData.map(team => [team.name, team.leaders]));
		// console.log('===== 2 =====');
		// console.log(Object.fromEntries(teamData.map(team => [team.name, team.leaders])));
		// console.log('===== 3 =====');
		let draftData = {
			'mode': args[0],
			'initialMoney': parseInt(args[1]),
			'minPlayers': parseInt(args[2]),
			'maxPlayers': parseInt(args[3]),
			'startPrice': parseInt(args[4]),
			'stepPrice': parseInt(args[5]),
			'canSelfNom': false,  // TODO: refactor self-nomination
			'selfNomPrice': 16000,  // TODO: refactor self-nomination
			'defaultTeams': Object.fromEntries(teamData.map(team => [team.name, team.leaders])),
			'CNNames': Object.fromEntries(teamData.map(team => [team.name, team.CNName])),
			'retains': Object.fromEntries(teamData.map(team => [team.name, team.retains])),
			'defaultTier': args[6 + teamNum * 4 + 0],
			'defaultGen': args[6 + teamNum * 4 + 1],
		};
		// console.log(draftData);
		let tmpFile = `avatars/static/tmp-draft-${user.id}-${PetUtils.getDate()}.json`;
		FS(`config/${tmpFile}`).safeWriteSync(JSON.stringify(draftData, null, '\t'));
		user.sendTo(room.roomid, `|html|设置完成! 链接: <a href="${SERVER_URL}/${tmpFile}">${SERVER_URL}/${tmpFile}</a>`);
		this.parse('/pschinadraftset cancel');
	},
};

export const pages: Chat.PageTable = {
	scoreladder(args, user) {
		// /j view-scoreladder
		this.title = `PS China 积分榜`;
		return scoreLadderBuffer;
	}
}
