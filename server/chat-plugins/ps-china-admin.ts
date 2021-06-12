import {FS} from '../../lib';

if (!FS('logs/modlog/iplog').existsSync()) FS('logs/modlog/iplog').mkdir();

export async function addScore(userid: string, score: number): Promise<number[]> {
	let ladder = await Ladders("gen8ps").getLadder();
	let userIndex = ladder.length;
	for (let [i, entry] of ladder.entries()) {
		if (toID(userid) ? (toID(entry[2]) === toID(userid)) : (entry[2] === userid)) {
			userIndex = i;
			break;
		}
	}
	if (userIndex === ladder.length) ladder.push([userid, 0, userid, 0, 0, 0, '']);
	let oldScore = ladder[userIndex][1];
	if (score === 0) return [oldScore, oldScore];
	let newScore = oldScore + score;
	if (newScore < 0) {
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

	Ladders("gen8ps").save();
	return [oldScore, newScore];
}

export const commands: Chat.ChatCommands = {
	async pschinascore(target, room, user) {
		this.checkCan('lock');
		if (!room || !room.settings.staffRoom) {
			this.errorReply("在staff room更新ps国服积分");
			return false;
		}

		const userid = target.split(',')[0]?.trim();  // 等积分转移完成后改用toID()
		const score = target.split(',')[1]?.trim();
		const reason = target.split(',')[2]?.trim();
		if (!userid || !score || !reason || isNaN(parseInt(score))) {
			return this.parse("/pschinascorehelp");
		}
		const parsedScore = parseInt(score);
		const changeScore = await addScore(userid, parsedScore);
		if (changeScore.length !== 2) return this.errorReply("错误：将造成负分。");

		const CNUser = Users.get(userid);
		if (CNUser?.connected) {
			CNUser.popup(`您因为 ${reason} ${parsedScore > 0 ? '获得': '失去'}了 ${Math.abs(parsedScore)} 国服积分`);
		}
		const message = `用户ID: ${userid}, PS国服积分: ` +
			`${changeScore[0]} ${parsedScore < 0 ? "-" : "+"} ${Math.abs(parsedScore)} -> ${changeScore[1]}, ` +
			`原因:${reason}, 操作人:${user.name}.`;
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
	}
};