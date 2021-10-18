import { FS } from '../../lib';
import { PetUtils, getUser } from './ps-china-pet-mode';

const TOURCONFIGPATH = 'config/ps-china/tour-config.json';
const REPLAYHEADPATH = 'config/ps-china/replay/replay-head.txt';
const REPLAYTAILPATH = 'config/ps-china/replay/replay-tail.txt';

const IPLOGDIR = 'logs/iplog';
const IPMAPPATH = 'logs/ipmap.json';
const TOURLOGDIR = 'logs/tour';
const SCORELOGDIR = 'logs/score';

if (!FS(IPLOGDIR).existsSync()) FS(IPLOGDIR).mkdir();
if (!FS(TOURLOGDIR).existsSync()) FS(TOURLOGDIR).mkdir();
if (!FS(SCORELOGDIR).existsSync()) FS(SCORELOGDIR).mkdir();

let userAlts: { [userid: string]: string[] } = JSON.parse(FS(IPMAPPATH).readIfExistsSync() || '{}');

function adminPM(userid: string, msg: string) {
	const user = Users.get(userid);
	if (!user || !user.connected) return;
	user.send(`|pm|&|${user.tempGroup}${user.name}|/raw <div class="broadcast-green"><b>${msg}</b></div>`);
}

function searchTourTree(node: AnyObject): { [playerid: string]: string[] } {
	const result: { [playerid: string]: string[] } = {};
	const playerId = toID(node.team);
	if (node.children) {
		node.children.forEach((child: AnyObject) => {
			const childResult = searchTourTree(child);
			Object.assign(result, childResult);
		});
		const foeId = node.children.map((child: AnyObject) => toID(child.team)).find((childId: string) => childId !== playerId);
		result[playerId].push(foeId);
	} else {
		result[playerId] = [];
	}
	return result;
}

function parseTourLog(bracket: AnyObject | null): AnyObject {
	try {
		const playerWins = searchTourTree(bracket!.rootNode);
		const sortedPlayerWins: { [playerid: string]: string[] } = {};
		const players = Object.keys(playerWins);
		players.sort((p1, p2) => playerWins[p1].length > playerWins[p2].length ? 1 : -1);
		players.forEach(player => sortedPlayerWins[player] = playerWins[player]);
		return sortedPlayerWins;
	} catch (err) {
		return bracket || {};
	}
}

function getTourFormat(): string | undefined {
	try {
		const date = new Date();
		const tourConfig: {[hour: string]: string} = JSON.parse(FS(TOURCONFIGPATH).readIfExistsSync())[date.getDay()];
		for (let hour in tourConfig) {
			const hourDiff = (date.getTime() - (parseInt(hour) - 8) * 1000 * 60 * 60) / (1000 * 60 * 60) % 24;
			if (hourDiff < 1 || hourDiff > 23) return tourConfig[hour];
		}
	} catch (err) {
		return;
	}
}

function getScoreTourClass() {
	return class ScoreTournament extends Tournaments.Tournament {

		onTournamentEnd() {
			super.onTournamentEnd();
			const bracketData = this.getBracketData();
			const logDir = `${TOURLOGDIR}/${PetUtils.getDate()}`;
			if (!FS(logDir).existsSync()) FS(logDir).mkdirSync();
			const tourLog = parseTourLog(bracketData);
			FS(`${logDir}/${toID(this.name)}.json`).safeWriteSync(PetUtils.formatJSON(tourLog));
			updateUserAlts();
			addTourScore(this.name, tourLog);
			const winnerId = toID(bracketData?.rootNode?.team);
			const mainId = addEggToMain(winnerId);
			if (mainId) {
				const winnerNote = mainId === winnerId ? '' : `的宠物系统账号 ${mainId} `;
				adminPM(winnerId, `恭喜夺冠! 您${winnerNote}获得了一个蛋!`);
				Rooms.get('staff')?.add(`|c|&|/log 自动奖品发放: ${winnerId} ${winnerNote}获得了一个蛋`).update();
			} else {
				Rooms.get('staff')?.add(`|c|&|/log 自动奖品发放: 未找到冠军 ${winnerId} 的宠物系统账号`).update();
			}
		}

	}
}

function updateUserAlts() {
	const ipCount: { [ip: string]: { [userid: string]: number } } = {};
	const idCount: { [userid: string]: number } = {};
	FS(IPLOGDIR).readdirIfExistsSync().slice(-16).forEach(fileName => {
		FS(`${IPLOGDIR}/${fileName}`).readIfExistsSync().split('\n').forEach(line => {
			const entry = line.split(',');
			if (entry.length !== 3) return;
			const userid = toID(entry[0]);
			const ip = entry[2];
			if (ip === '127.0.0.1' || ['shared', 'proxy'].includes(IPTools.getHostType('', ip))) return;
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
			for (let id2 in ipCount[ip]) {
				if (!idEdges[id1]) idEdges[id1] = {};
				if (!idEdges[id1][id2]) idEdges[id1][id2] = 0;
				idEdges[id1][id2] += ipCount[ip][id1] * ipCount[ip][id2];
			}
		}
	}
	userAlts = {};
	for (let userid in idEdges) {
		userAlts[userid] = Object.keys(idEdges[userid]).sort((id1, id2) => idEdges[userid][id1] < idEdges[userid][id2] ? 1 : -1);
	}
	FS(IPMAPPATH).safeWriteSync(PetUtils.formatJSON(userAlts));
}

export function getAlts(userid: string): string[] | undefined {
	return userAlts[userid];
}

export async function getMainId(userid: string): Promise<string> {
	for (let id of getAlts(userid) || [userid]) {
		if (!!(await getScore(id))) return id;
	}
	return '';
}

function addEggToMain(userid: string): string {
	return (getAlts(userid) || [userid]).find(id => {
		const petUser = getUser(id);
		if (petUser.addRandomEgg('3v')) {
			petUser.save();
			return true;
		}
	}) || '';
}

function addTourScore(tourname: string, tourLog: AnyObject) {
	try {
		Object.keys(tourLog).forEach((userId, i) => {
			const wins = tourLog[userId].length;
			let score = [0, 5, 10, 20, 30, 50, 70, 100][wins] || 0;
			if (score > 0) {
				setTimeout(() => {
					addScoreToMain(userId, score, `{}在 ${tourname} 淘汰赛中连胜 ${wins} 轮`);
				}, 100 * i);
			}
		})
	} catch (err) {
		Rooms.get('staff')?.add(`|c|&|/log ${tourname} 淘汰赛自动加分失败`).update();
	}
}

async function addScoreToMain(userid: string, score: number, msg: string = '') {
	const mainId = await getMainId(userid);
	const isMain = mainId === userid;

	msg += ', ';
	let noteMsg = msg.replace('{}', '您');
	let logMsg = '自动定向加分: ' + msg.replace('{}', userid + ' ');
	if (mainId) {
		const scores = await addScore(mainId, score, msg.replace('{}', ''));
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
	adminPM(userid, noteMsg);
}

async function getScore(userid: string): Promise<number> {
	// @ts-ignore
	let ladder = await Ladders("gen8ps").getLadder();
	for (let entry of ladder) {
		if (toID(userid) ? (toID(entry[2]) === toID(userid)) : (entry[2] === userid)) {
			return entry[1];
		}
	}
	return 0;
}

let addingScore: boolean = false;

export async function addScore(userid: string, score: number, reason: string = '', formatid: string = 'gen8ps'): Promise<number[]> {
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

export const commands: Chat.ChatCommands = {
	async score(target, room, user) {
		let targetUser = target.replace('!', '') || user.id;
		const score = await getScore(targetUser);
		let msg = score ? `${targetUser} 的PS国服积分是：${score}` : `未找到用户 ${targetUser} 的PS国服积分记录`;
		return target.includes('!') ? PetUtils.popup(user, msg) : score ? this.sendReply(msg) : this.errorReply(msg);
	},

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
		const changeScore = await addScore(userid, parsedScore, reason);
		if (changeScore.length !== 2) return this.errorReply("错误：将造成负分。");

		adminPM(userid, `您因为 ${reason} ${parsedScore > 0 ? '获得': '失去'}了 ${Math.abs(parsedScore)} 国服积分`);
		const message = `用户ID: ${userid}, PS国服积分: ` +
			`${changeScore[0]} ${parsedScore < 0 ? "-" : "+"} ${Math.abs(parsedScore)} = ${changeScore[1]}, ` +
			`原因: ${reason}, 操作人: ${user.name}.`;
		this.globalModlog(message);
		this.addModAction(message);

		if (changeScore[0] === 0) {
			const alts = getAlts(toID(userid));
			if (!alts) {
				room.add(`|html|<b>注意: 未找到用户 ${userid} 的登录记录</b>`);
				return;
			}
			const content: (string | number)[][] = alts.map(alt => [alt]);
			for (let [i, alt] of alts.entries()) {
				content[i].push('&ensp;积分:&ensp;');
				content[i].push(alt === toID(userid) ? 0 : await getScore(alt));
			}
			room.add(`|html|<b>注意: ${userid} 此前没有国服积分, 关联账号:</b><br>${PetUtils.table([], [], content, 'auto')}`);
		}
	},
	pschinascorehelp: [
		`Usage: /pschinascore user, score, reason - 给user用户的国服积分增加score分, 说明原因. Requires: & ~`,
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
		`Usage: /scorelog user, lines - 查看user用户(默认为自己)的最近lines(默认为20)条国服积分记录`
	],

	restorereplay(target, room, user) {
		this.checkCan('lockdown');
		let params = target.split(',');
		if (!params || params.length != 4) {
			return this.sendReply('Usage: /restorereplay player1, player2, format, year-month-date');
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
				this.sendReply(`http://39.96.50.192:8000/avatars/static/${htmlname}`);
			}
		}
		if (!foundReplay) {
			return this.errorReply("Replay not found.");
		}
	},

	't': 'scoretour',
	scoretour(target, room, user) {
		this.checkCan('gdeclare');
		if (!room || room.roomid !== 'skypillar') return this.errorReply("请在 Sky Pillar 房间举办积分淘汰赛");
		if (room.tour) return this.errorReply("请等待正在进行的淘汰赛结束");
		const formatid = getTourFormat();
		if (!formatid) return this.errorReply("日程表中没有正要举行的比赛");
		this.parse(`/globaldeclare Sky Pillar房间 ${formatid} 淘汰赛将于5分钟后开始, 获胜1、2、3、4、5、6轮分别奖励5、10、20、30、50、70积分, 冠军可获得宠物系统特殊奖励`);
		this.parse(`/tour create ${formatid}, elimination`);
		this.parse(`/tour playercap 64`);
		this.parse(`/tour autostart 5`);
		this.parse(`/tour forcetimer on`);
		this.parse(`/tour autodq 2`);
		this.parse(`!formats ${formatid}`);
		const tour = room.getGame(Tournaments.Tournament);
		if (!tour) return this.errorReply("淘汰赛创建失败");
		tour.onTournamentEnd = getScoreTourClass().prototype.onTournamentEnd;
	},

	async updatealts() {
		this.checkCan('gdeclare');
		updateUserAlts();
		this.sendReply('用户关系表更新完成');
	},

	async checkalts(target) {
		this.checkCan('gdeclare');
		const targetId = toID(target);
		if (!targetId) return this.sendReply('Usage: /checkalts user - 查看user用户的关联账号');
		const alts = getAlts(targetId);
		if (!alts) return this.sendReply(`未找到用户 ${target} 的登录记录`);
		this.sendReply(`用户 ${target} 的关联账号: ${alts.join(', ')}`);
		this.sendReply(`用户 ${target} 的积分账号: ${await getMainId(targetId)}`);
	},
};