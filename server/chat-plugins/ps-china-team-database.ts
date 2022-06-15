import { FS } from "../../lib";
import { NetRequest } from "../../lib/net";
import { escapeHTML } from "../../lib/utils";
import { PetUtils } from "./ps-china-pet-mode";

const TEAM_DATABASE_DIR = 'config/ps-china/team-db/gen8ou';
const SIGNIFICANT_POKES_FILE = `${TEAM_DATABASE_DIR}/pokes.json`;
const REPLAY_URLS_FILE = `${TEAM_DATABASE_DIR}/replay-urls.txt`;
const TEAM_DATABASE_FILE = `${TEAM_DATABASE_DIR}/teams.json`;
const SAMPLE_TEAM = ['Tapu Lele', 'Weavile', 'Corviknight', 'Toxapex', 'Landorus-Therian', 'Slowking-Galar'];
const SEARCH_CD = 10000;

if (!FS(TEAM_DATABASE_DIR).existsSync()) FS(TEAM_DATABASE_DIR).mkdirpSync();
if (!FS(TEAM_DATABASE_FILE).existsSync()) FS(TEAM_DATABASE_FILE).writeSync('[]');

let teamDB: {
	"teamCode": number[],
	"players": [{"playerId": string, "replays": string[]}]
}[] = JSON.parse(FS(TEAM_DATABASE_FILE).readIfExistsSync());

let pokeNum = 0;
let pokeIndex: {[speciesId: string]: number} = {};
if (FS(SIGNIFICANT_POKES_FILE).existsSync()) {
	JSON.parse(FS(SIGNIFICANT_POKES_FILE).readIfExistsSync()).forEach((speciesId: string) => {
		pokeIndex[speciesId] = pokeNum;
		pokeNum += 1;
	})
} else {
	Dex.species.all().forEach((species) => {
		if (['OU', 'UUBL', 'UU', 'RUBL', 'RU'].includes(species.tier) || ['urshifu', 'kyurem'].includes(species.id)) {
			pokeIndex[species.id] = pokeNum;
			pokeNum += 1;
		}
	});
	FS(SIGNIFICANT_POKES_FILE).writeSync(JSON.stringify(Object.keys(pokeIndex)));
}
const teamCodeLength = Math.ceil(pokeNum / 31);

function getTeamCode(team: string[]): number[] {
	let teamCode: number[] = new Array(teamCodeLength).fill(0);
	for (let speciesId of team) {
		if (pokeIndex[speciesId] !== undefined) {
			teamCode[Math.floor(pokeIndex[speciesId] / 31)] += 1 << (pokeIndex[speciesId] % 31);
		}
	}
	return teamCode;
}

function findSimilarTeams(targetTeamCode: number[]): number[][] {
	const similarTeams: number[][] = [[], [], []];
	for (let i = 0; i < teamDB.length; i++) {
		const teamCode = teamDB[i]['teamCode'];
		let simVal = 0;
		for (let j = 0; j < teamCodeLength; j++) {
			let x = teamCode[j] & targetTeamCode[j];
			while (x > 0) {
				simVal += x % 2;
				x = x >> 1;
			}
		}
		if (simVal >= 4) {
			similarTeams[simVal - 4].push(i);
		}
	}
	return similarTeams;
}

function findTeamIndex(targetTeamCode: number[]): number {
	for (let i = 0; i < teamDB.length; i++) {
		const teamCode = teamDB[i]['teamCode'];
		let sameCode = true;
		for (let j = 0; j < teamCodeLength; j++) {
			if (teamCode[j] ^ targetTeamCode[j]) {
				sameCode = false;
				break;
			}
		}
		if (sameCode) {
			return i;
		}
	}
	return -1;
}

async function updateTeamDB(replayUrl: string): Promise<boolean> {
	try {
		const replayStr = await new NetRequest(replayUrl).get();
		for (let side of ['p1', 'p2']) {
			let s = replayStr.split(`|player|${side}|`).slice(1)[0];
			const playerId = toID(eval(`'${s.slice(0, s.indexOf('|'))}'`));
			const team = []
			for (let s of replayStr.split(`|poke|${side}|`).slice(1)) {
				let speciesId = toID(eval(`'${s.slice(0, s.indexOf('|')).split(',')[0]}'`));
				team.push(speciesId);
			}
			const teamCode = getTeamCode(team);
			const teamIndex = findTeamIndex(teamCode);
			if (teamIndex < 0) {
				teamDB.push({
					'teamCode': teamCode,
					'players': [{
						'playerId': playerId,
						'replays': [replayUrl]
					}]
				});
			} else {
				let newPlayer = true;
				for (let playerIndex = 0; playerIndex < teamDB[teamIndex]['players'].length; playerIndex++) {
					if (teamDB[teamIndex]['players'][playerIndex]['playerId'] === playerId) {
						teamDB[teamIndex]['players'][playerIndex]['replays'].push(replayUrl);
						newPlayer = false;
						break;
					}
				}
				if (newPlayer) {
					teamDB[teamIndex]['players'].push({
						'playerId': playerId,
						'replays': [replayUrl]
					});
				}
			}
		}
	} catch (err) {
		return false;
	}
	return true;
}

async function saveTeamDB(): Promise<boolean> {
	try {
		FS(TEAM_DATABASE_FILE).writeSync(JSON.stringify(teamDB, null, '\t'));
	} catch (err) {
		return false;
	}
	return true;
}

function codeToTeam(teamCode: number[]): string[] {
	const team = [];
	const pokes = Object.keys(pokeIndex);
	for (let i = 0; i < teamCodeLength; i++) {
		let x = teamCode[i];
		for (let j = 0; x > 0; x >>= 1, j++) {
			if (x % 2) {
				team.push(pokes[i * 31 + j]);
			}
		}
	}
	return team;
}

function showTeam(team: string[]): string {
	return team.map(speciesId => `<psicon pokemon="${speciesId}"/>`).join('');
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
			let buf = `<b>欢迎使用 PS China [Gen 8] OU 队伍数据库</b>`;
			buf += `<form data-submitsend="/msgroom ${room!.roomid}, /teamdb search {p1},{p2},{p3},{p4},{p5},{p6};{s4},{s5}">`;
			buf += SAMPLE_TEAM.map((x, i) => `<p>位置 ${i + 1} <input name="p${i + 1}" value="${x}"/></p>`).join('');
			buf += `<p>模糊匹配: <input name="s4" type="checkbox" value="+"/>4&emsp;`;
			buf += `<input name="s5" type="checkbox" value="+" checked/>5</p>`;
			buf += `<button class="button" type="submit">搜索</button></form></details>`;
			user.sendTo(room!.roomid, `|uhtml|teamdb-search|${buf}`);
		},
		async update(target, room, user) {
			this.requireRoom();
			this.checkCan('lockdown');
			// if (room!.roomid !== 'wcop') return this.errorReply('Access denied.');
			if (!FS(REPLAY_URLS_FILE).existsSync()) {
				this.errorReply('Replay URL file not found.');
			} else {
				const replayUrls = FS(REPLAY_URLS_FILE).readIfExistsSync().replace(/\r/g, '').split('\n');
				for (let i = 0; i < replayUrls.length; i++) {
					user.sendTo(room!.roomid, `|uhtml|teamdb-update|Loading ${i} / ${replayUrls.length}`);
					const success = await updateTeamDB(replayUrls[i]);
					if (!success) this.errorReply(`Failed to load replay: ${replayUrls[i]}`);
					if (i % 100 === 0) await saveTeamDB(); // TODO: remove this line
				}
				const success = await saveTeamDB();
				if (success) {
					FS(REPLAY_URLS_FILE).unlinkIfExistsSync();
					user.sendTo(room!.roomid, `|uhtmlchange|teamdb-update|`);
					this.sendReply(`Finished. Replay URL file deleted.`);
				} else {
					this.errorReply(`Failed to save team database.`);
				}
			}
		},
		async search(target, room, user) {
			this.requireRoom();
			if (userLastSearch[user.id] && Date.now() - userLastSearch[user.id] < SEARCH_CD) {
				this.parse('/teamdb guide');
				return this.errorReply(`您的查询频率过高, 请稍候再来`);
			}
			// if (room!.roomid !== 'wcop') return this.errorReply('Access denied.');
			let [teamStr, optionStr] = target.split(';');
			optionStr ||= '{s4}';
			teamStr = teamStr.replace(/,/g, '/');
			const args = teamStr.split('/').map((x, i) => toID(x) || toID(SAMPLE_TEAM[i]));
			if (args.length !== 6 || args.some(x => !Dex.species.get(x).exists)) {
				this.parse('/teamdb guide');
				return this.errorReply('请输入6只合法的宝可梦');
			}
			let buf = `<p>Teams similar to ${showTeam(args)}</p>`;
			const similarTeams = findSimilarTeams(getTeamCode(args));
			for (let i = 2; i >= 0; i--) {
				if (optionStr.includes(`{s${i + 4}}`)) continue;
				buf += `<details title="Click to view teams">`;
				buf += `<summary>${i + 4} hits: ${similarTeams[i].length} team${similarTeams[i][1] ? 's' : ''}</summary>`;
				if (similarTeams[i].length > 0) {
					similarTeams[i].forEach(teamIndex => {
						const teamInfo = teamDB[teamIndex];
						buf += `<details title="Click to view replays" style="left: 20px; position: relative">`;
						buf += `<summary>${showTeam(codeToTeam(teamInfo['teamCode']))}</summary>`;
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
									`<a href="${readableUrl}">${readableUrl}</a>`
								]);
							});
						});
						buf += PetUtils.table([], ['Player', 'Replay'], replayTable, '100%', 'left', 'left', true);
						buf += `</details>`;
					});
				} else {
					buf += `<p>Not found.</p>`;
				}
				buf += `</details>`;
			}
			user.sendTo(room!.roomid, `|uhtml|teamdb-search|${buf}`);
			userLastSearch[user.id] = Date.now();
		}
	}
}