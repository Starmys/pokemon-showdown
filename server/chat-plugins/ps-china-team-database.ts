import { FS } from "../../lib";
import { NetRequest } from "../../lib/net";
import { escapeHTML } from "../../lib/utils";
import { PetUtils } from "./ps-china-pet-mode";

const SEARCH_CD = 10000;
const MAX_UNSAVED_REPLAYS = 100;
const SAMPLE_TEAM = ['Dragapult', 'Kingambit', 'Volcarona', 'Great Tusk', 'Toxapex', 'Corviknight'];

const TEAM_DATABASE_DIR = 'config/ps-china/team-db';
if (!FS(TEAM_DATABASE_DIR).existsSync()) FS(TEAM_DATABASE_DIR).mkdirpSync();

const REPLAY_URLS_FILE = `${TEAM_DATABASE_DIR}/replay-urls.txt`;
const FAILED_URLS_FILE = `${TEAM_DATABASE_DIR}/failed-urls.txt`;

class TeamDB {

	private teamCodeLength: number;
	private pokeIndex: {[speciesId: string]: number};
	private teams: {
		'teamCode': number[], // Uint32Array does not make it significantly faster
		'players': [{'playerId': string, 'replays': string[]}],
	}[];
	private teamsFile: string;

	private ahead: number; // number of replays ahead of the local file while updating teams

	constructor(formatId: string) {
		const format = Dex.formats.get(formatId);

		const formatFolder = `${TEAM_DATABASE_DIR}/${formatId}`;
		if (!FS(formatFolder).existsSync()) FS(formatFolder).mkdirpSync();
	
		const sigPokesFile = `${formatFolder}/pokes.json`;
		this.teamsFile = `${formatFolder}/teams.json`;
		
		if (!FS(this.teamsFile).existsSync()) FS(this.teamsFile).writeSync('[]');
		this.teams = JSON.parse(FS(this.teamsFile).readSync());
	
		let pokeNum = 0;
		this.pokeIndex = {};
		if (FS(sigPokesFile).existsSync()) {
			JSON.parse(FS(sigPokesFile).readSync()).forEach((speciesId: string) => {
				this.pokeIndex[speciesId] = pokeNum;
				pokeNum += 1;
			})
		} else {
			Dex.forGen(parseInt(formatId[3])).species.all().forEach((species) => {
				if (['OU', 'UUBL', 'UU', 'RUBL', 'RU'].includes(species.tier)) {
					this.pokeIndex[species.id] = pokeNum;
					pokeNum += 1;
				}
			});
			FS(sigPokesFile).writeSync(JSON.stringify(Object.keys(this.pokeIndex), null, '\t'));
		}
		this.teamCodeLength = ((pokeNum - 1) >> 5) + 1;

		this.ahead = 0;
	}

	getTeamCode(team: string[]): number[] {
		let teamCode = new Array(this.teamCodeLength).fill(0);
		for (let speciesId of team) {
			if (this.pokeIndex[speciesId] !== undefined) {
				teamCode[this.pokeIndex[speciesId] >> 5] |= (1 << (this.pokeIndex[speciesId] & 31));
			}
		}
		return teamCode;
	}

	retrieveTeamFromCode(teamCode: number[]): string[] {
		const team = [];
		const pokes = Object.keys(this.pokeIndex);
		for (let secIndex = 0, offset = 0; secIndex < this.teamCodeLength; offset += 32, secIndex++) {
			for (let pokeIdx = 0, secCode = teamCode[secIndex]; secCode; secCode >>>= 1, pokeIdx ++) {
				if (secCode & 1) {
					team.push(pokes[offset + pokeIdx]);
				}
			}
		}
		return team;
	}

	findSimilarTeams(targetTeamCode: number[]): number[][] {
		const similarTeams: number[][] = [[], [], []];
		for (let teamIndex = 0; teamIndex < this.teams.length; teamIndex++) {
			const teamCode = this.teams[teamIndex]['teamCode'];
			let simVal = 0;
			for (let secIndex = 0; secIndex < this.teamCodeLength; secIndex++) {
				for (
					let simCode = (teamCode[secIndex] & targetTeamCode[secIndex]) >>> 0;
					simCode;
					simCode &= simCode - 1, simVal++
				);
				// simVal += PetUtils.popCount(teamCode[secIndex] & targetTeamCode[secIndex]);
			}
			if (simVal >= 4) {
				similarTeams[simVal - 4].push(teamIndex);
			}
		}
		return similarTeams;
	}

	findTeamIndex(targetTeamCode: number[]): number {
		for (let teamIndex = 0; teamIndex < this.teams.length; teamIndex++) {
			const teamCode = this.teams[teamIndex]['teamCode'];
			if (!teamCode.some((secCode, secIndex) => secCode ^ targetTeamCode[secIndex])) {
				return teamIndex;
			}
		}
		return -1;
	}

	getTeamInfo(teamIndex: number) {
		return this.teams[teamIndex];
	}

	async update(replayUrl: string): Promise<boolean> {
		let replayStr: string;
		try {
			replayStr = await new NetRequest(replayUrl).get();
		} catch (err) {
			return false;
		}
		for (let side of ['p1', 'p2']) {
			let playerId: ID;
			const team = [];
			try {
				let s = replayStr.split(`|player|${side}|`).slice(1)[0];
				playerId = toID(eval(`"${s.slice(0, s.indexOf('|'))}"`));
				for (let s of replayStr.split(`|poke|${side}|`).slice(1)) {
					let speciesId = toID(eval(`"${s.slice(0, s.indexOf('|')).split(',')[0]}"`));
					team.push(speciesId);
				}
			} catch (err) {
				return false;
			}
			const teamCode = this.getTeamCode(team);
			const teamIndex = this.findTeamIndex(teamCode);
			if (teamIndex < 0) {
				this.teams.push({
					'teamCode': teamCode,
					'players': [{
						'playerId': playerId,
						'replays': [replayUrl]
					}],
				});
			} else {
				const players = this.teams[teamIndex]['players'];
				let isNewPlayer = true;
				for (let playerInfo of players) {
					if (playerInfo['playerId'] === playerId) {
						if (playerInfo['replays'].includes(replayUrl)) {
							playerInfo['replays'].push(replayUrl);
						}
						isNewPlayer = false;
						break;
					}
				}
				if (isNewPlayer) {
					players.push({
						'playerId': playerId,
						'replays': [replayUrl]
					});
				}
			}
		}
		this.ahead++;
		if (this.ahead >= MAX_UNSAVED_REPLAYS) {
			this.save();
			this.ahead = 0;
		}
		return true;
	}

	async save(): Promise<boolean> {
		try {
			FS(this.teamsFile).writeSync(JSON.stringify(this.teams, null, '\t'));
		} catch (err) {
			return false;
		}
		return true;
	}
}

const teamDBs: {[formatId: string]: TeamDB} = {};

FS(TEAM_DATABASE_DIR).readdirIfExistsSync().forEach(formatId => {
	if (Dex.formats.get(formatId).exists) {
		teamDBs[formatId] = new TeamDB(formatId);
	}
});

async function updateTeamDB(replayUrl: string): Promise<boolean> {
	const formatId = replayUrl.split('-')[1];
	if (!teamDBs[formatId]) {
		teamDBs[formatId] = new TeamDB(formatId);
	}
	return teamDBs[formatId].update(replayUrl);
}

const userLastSearch: {[userid: string]: number} = {};

export const commands: Chat.ChatCommands = {

	tdbs(target, room, user) {
		this.parse(`/teamdb search ${target}`);
	},

	teamdb: {

		'': 'guide',
		guide(target, room, user) {
			this.requireRoom();
			let buf = `<p><b>欢迎使用 PS China 队伍数据库</b></p>`;
			buf += `<form data-submitsend="/msgroom ${room!.roomid}, /teamdb search {format};{team};{s4},{s5}">`;
			// buf += SAMPLE_TEAM.map((x, i) => `<p>队伍 <input name="p" value="${x}"/></p>`).join('');
			buf += `<textarea name="team" style="width: 300px; height: 60px; padding: 5px">`;
			buf += `${SAMPLE_TEAM.join(' / ')}</textarea>`;
			buf += `<p>分级: <select name="format">${Object.keys(teamDBs).map(formatId => {
				const formatName = Dex.formats.get(formatId).name;
				const extraAttr = `${formatId === 'gen9ou' ? 'selected' : ''}`;
				return `<option ${extraAttr} value="${formatId}">${formatName}</option>`;
			}).join('')}</select></p>`;
			buf += `<p>模糊匹配: <input name="s4" type="checkbox" value="+"/>4&emsp;`;
			buf += `<input name="s5" type="checkbox" value="+" checked/>5&emsp;`;
			buf += `<button class="button" type="submit">搜索</button></form></details></p>`;
			user.sendTo(room!.roomid, `|uhtml|teamdb-search|${buf}`);
		},

		async update(target, room, user) {
			this.requireRoom();
			this.checkCan('lockdown');
			if (!FS(REPLAY_URLS_FILE).existsSync()) {
				this.errorReply('Replay URL file not found.');
			} else {
				const replayUrls = FS(REPLAY_URLS_FILE)
					.readIfExistsSync()
					.replace(/\r/g, '')
					.split('\n')
					.filter(uri => uri.startsWith('https') && uri.endsWith('.json'));
				FS(FAILED_URLS_FILE).safeWriteSync('');
				for (let i = 0; i < replayUrls.length; i++) {
					user.sendTo(room!.roomid, `|uhtml|teamdb-update|Loading ${i} / ${replayUrls.length}`);
					const success = await updateTeamDB(replayUrls[i]);
					if (!success) {
						FS(FAILED_URLS_FILE).appendSync(replayUrls[i] + '\n');
						this.errorReply(`Failed to load replay: ${replayUrls[i]}`);
					}
				}
				let success = true;
				for (let [formatId, teamDB] of Object.entries(teamDBs)) {
					if (!(await teamDB.save())) {
						this.errorReply(`Failed to save team database: ${formatId}`);
						success = false;
					}
				}
				if (success) {
					FS(REPLAY_URLS_FILE).unlinkIfExistsSync();
					user.sendTo(room!.roomid, `|uhtmlchange|teamdb-update|`);
					this.sendReply(`Finished. Replay URL file deleted.`);
				}
			}
		},

		async search(target, room, user) {
			this.requireRoom();
			if (userLastSearch[user.id] && Date.now() - userLastSearch[user.id] < SEARCH_CD) {
				this.parse('/teamdb guide');
				return this.errorReply(`您的查询频率过高, 请稍候再来`);
			}
			let [formatStr, teamStr, optionStr] = target.split(';');
			const format = Dex.formats.get(formatStr);
			if (!format.exists) {
				this.parse('/teamdb guide');
				return this.errorReply(`"${formatStr}" 分级不存在`);
			}
			// if (format.id === 'gen9ou' && room!.roomid !== 'wcop') {
			// 	return this.errorReply('Access denied.');
			// }
			const teamDB = teamDBs[format.id];
			if (!teamDB) {
				this.parse('/teamdb guide');
				return this.errorReply(`${format.name} 数据库暂未上线`);
			}
			optionStr ||= '{s4}';
			teamStr = teamStr.replace(/,/g, '/');
			const args = teamStr.split('/').map((x, i) => toID(x));
			if (args.length !== 6 || args.some(x => !Dex.forGen(parseInt(format.id[3])).species.get(x).exists)) {
				this.parse('/teamdb guide');
				return this.errorReply('请输入6只合法的宝可梦');
			}

			let buf = `<p>和 ${PetUtils.showTeam(args)} 相似的队伍:</p>`;
			const similarTeams = teamDB.findSimilarTeams(teamDB.getTeamCode(args));
			for (let i = 2; i >= 0; i--) {
				if (optionStr.includes(`{s${i + 4}}`)) continue;
				buf += `<details title="点击查看队伍">`;
				buf += `<summary>${i + 4} 个相同宝可梦: ${similarTeams[i].length} 个队伍</summary>`;
				if (similarTeams[i].length > 0) {
					similarTeams[i].forEach(teamIndex => {
						const teamInfo = teamDB.getTeamInfo(teamIndex);
						buf += `<details title="点击查看回放" style="left: 20px; position: relative">`;
						buf += `<summary>${PetUtils.showTeam(teamDB.retrieveTeamFromCode(teamInfo['teamCode']))}</summary>`;
						let replayTable: string[][] = [];
						teamInfo['players'].forEach(playerInfo => {
							let scoutUrl = 'https://fulllifegames.com/Tools/ReplayScouter/?';
							scoutUrl += `name=${playerInfo['playerId']}&tier=&opponent=&`;
							scoutUrl += `replays=${playerInfo['replays'].map(s => escapeHTML(s.replace('.json', ''))).join('%0D%0A')}`;
							const playerBar =`<a href="${scoutUrl}">${playerInfo['playerId']}</a>`;
							playerInfo['replays'].forEach((replayUrl, i) => {
								const readableUrl = replayUrl.replace('.json', '');
								replayTable.push([
									i === 0 ? playerBar : '',
									`<a href="${readableUrl}">${readableUrl.split('/').pop()}</a>`
								]);
							});
						});
						buf += PetUtils.table([], ['玩家PSID', '回放链接'], replayTable, '100%', 'left', 'left', true);
						buf += `</details>`;
					});
				} else {
					buf += `<p>未找到相似队伍</p>`;
				}
				buf += `</details>`;
			}
			user.sendTo(room!.roomid, `|uhtml|teamdb-search|${buf}`);
			userLastSearch[user.id] = Date.now();
		}

	}

}
