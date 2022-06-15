import { FS, Utils } from '../../lib';
import { PetUtils } from './ps-china-pet-mode';
import { AdminUtils } from './ps-china-admin';

type TourRules = {
	bonus?: boolean,
	playercap?: number,
	autostart?: number,
	forcetimer?: boolean,
	allowscouting?: boolean,
	autodq?: number,
};

type TourTiming = {
	minutes: number,
	hours: number,
	day?: number,
};

type TourSettings = {
	format: string,
	rules: TourRules,
	timing: TourTiming,
	desc?: string,
};

type TourStatus = {
	settings: TourSettings,
	nexttime: Date
};

const SHORT_WATCHER_ADVANCE = 5000;
const SHORT_WATCHER_CYCLE = 1000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCORE_BONUS = [0, 5, 10, 20, 30, 50, 70];
const AUTO_TOUR_CONFIG_FILE = 'config/tours.json';
const TOUR_LOG_DIR = 'logs/tour';

if (!FS(TOUR_LOG_DIR).existsSync()) FS(TOUR_LOG_DIR).mkdir();

class BroadcastContext {
	private room: ChatRoom;
	private info: string;

	constructor(room: ChatRoom, info: string) {
		this.room = room;
		this.info = info;
	}
	sendReply(data: string): void {
		this.room.add(`|html|<strong class="message">[${this.info}] ${data.replace(/\n/ig, '<br />')}</strong>`).update();
	}
	errorReply(data: string): void {
		this.room.add(`|html|<strong class="message-error">[${this.info}] ${data.replace(/\n/ig, '<br />')}</strong>`).update();
	}
	modlog(
		action: string,
		user: string | User | null = null,
		note: string | null = null,
		options: Partial<{noalts: any, noip: any}> = {}
	) {
		this.room.modlog({ action: action, isGlobal: false });
	}
}

class ScoreTourUtils {
	static getScoreTourClass() {
		return class ScoreTournament extends Tournaments.Tournament {
			onTournamentEnd() {
				super.onTournamentEnd();
				const bracketData = this.getBracketData();
				const logDir = `${TOUR_LOG_DIR}/${PetUtils.getDate()}`;
				if (!FS(logDir).existsSync()) FS(logDir).mkdirSync();
				const tourLog = ScoreTourUtils.parseTourLog(bracketData);
				FS(`${logDir}/${toID(this.name)}.json`).safeWriteSync(PetUtils.formatJSON(tourLog));
				AdminUtils.updateUserAlts();
				ScoreTourUtils.addTourScore(this.name, tourLog);
				const winnerId = toID(bracketData?.rootNode?.team);
				const mainId = AdminUtils.addEggToMain(winnerId);
				if (mainId) {
					const winnerNote = mainId === winnerId ? '' : `的宠物系统账号 ${mainId} `;
					AdminUtils.adminPM(winnerId, `恭喜夺冠! 您${winnerNote}获得了一个蛋!`);
					Rooms.get('staff')?.add(`|c|&|/log 自动奖品发放: ${winnerId} ${winnerNote}获得了一个蛋`).update();
				} else {
					Rooms.get('staff')?.add(`|c|&|/log 自动奖品发放: 未找到冠军 ${winnerId} 的宠物系统账号`).update();
				}
			}
		}
	}
	static parseTourLog(bracket: AnyObject | null): AnyObject {
		try {
			const playerWins = ScoreTourUtils.searchTourTree(bracket!.rootNode);
			const sortedPlayerWins: { [playerid: string]: string[] } = {};
			const players = Object.keys(playerWins);
			players.sort((p1, p2) => playerWins[p1].length > playerWins[p2].length ? 1 : -1);
			players.forEach(player => sortedPlayerWins[player] = playerWins[player]);
			return sortedPlayerWins;
		} catch (err) {
			return bracket || {};
		}
	}
	static searchTourTree(node: AnyObject): { [playerid: string]: string[] } {
		const result: { [playerid: string]: string[] } = {};
		const playerId = toID(node.team);
		if (node.children) {
			node.children.forEach((child: AnyObject) => {
				const childResult = ScoreTourUtils.searchTourTree(child);
				Object.assign(result, childResult);
			});
			const foeId = node.children.map((child: AnyObject) => toID(child.team)).find((childId: string) => childId !== playerId);
			result[playerId].push(foeId);
		} else {
			result[playerId] = [];
		}
		return result;
	}
	static async addTourScore(tourname: string, tourLog: AnyObject) {
		try {
			for (let userId of Object.keys(tourLog)) {
				const wins = tourLog[userId].length;
				let score = SCORE_BONUS[wins] || 0;
				if (score > 0) {
					await AdminUtils.addScoreToMain(userId, score, `{}在 ${tourname} 淘汰赛中连胜 ${wins} 轮`);
				}
			}
		} catch (err) {
			Rooms.get('staff')?.add(`|c|&|/log ${tourname} 淘汰赛自动加分失败`).update();
		}
	}
}

class TourQueue {
	private roomid: string;
	private schedule: TourStatus[];
	private timeout: NodeJS.Timeout | undefined;

	constructor(roomid: string, config: TourSettings[] = []) {
		this.roomid = roomid;
		this.schedule = config.map((tourSettings) => {
			return {
				settings: tourSettings,
				nexttime: TourQueue.calcNextTime(tourSettings.timing)
			};
		});
		this.schedule.sort((t1, t2) => +t1.nexttime - +t2.nexttime);
		this.longWatcher();
	}

	stop() {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
	}

	longWatcher() {
		const waiting = +this.schedule[0].nexttime - Date.now() - SHORT_WATCHER_ADVANCE;
		if (waiting > 0) {
			this.timeout = setTimeout(() => {
				this.shortWatcher();
			}, waiting);
		} else {
			this.shortWatcher();
		}
	}

	shortWatcher() {
		if (Date.now() < +this.schedule[0].nexttime || Rooms.get(this.roomid)?.game) {
			this.timeout = setTimeout(() => {
				this.shortWatcher();
			}, SHORT_WATCHER_CYCLE);
		} else {
			this.createTour();
			this.schedule[0].nexttime = TourQueue.calcNextTime(this.schedule[0].settings.timing);
			this.schedule.sort((t1, t2) => +t1.nexttime - +t2.nexttime);
			this.longWatcher();
		}
	}

	createTour() {
		const room = Rooms.get(this.roomid);
		if (room?.type !== 'chat') return;
		const tourStatus = this.schedule[0];
		const format = Dex.formats.get(tourStatus.settings.format);
		const broadcastContext = new BroadcastContext(room, 'Auto Tour');
		if (!format.exists) {
			broadcastContext.errorReply(`Config error: the format ${tourStatus.settings.format} does not exist.`);
			return;
		}
		broadcastContext.sendReply(`Creating ${format.name} tournament...`);
		if (!room.settings.tournaments) room.settings.tournaments = {};
		room.settings.tournaments.forceTimer = tourStatus.settings.rules.forcetimer;
		room.settings.tournaments.allowScouting = tourStatus.settings.rules.allowscouting;
		if (tourStatus.settings.rules.autostart) {
			room.settings.tournaments.autostart = tourStatus.settings.rules.autostart * 60 * 1000;
		}
		if (tourStatus.settings.rules.autodq) {
			room.settings.tournaments.autodq = tourStatus.settings.rules.autodq * 60 * 1000;
		}
		const tour = Tournaments.createTournament(
			room,
			format.id,
			'elimination',
			tourStatus.settings.rules.playercap?.toString(),
			false,
			undefined,
			undefined,
			//@ts-ignore
			broadcastContext
		)
		if (tour) {
			if (tourStatus.settings.rules.bonus) {
				tour.onTournamentEnd = ScoreTourUtils.getScoreTourClass().prototype.onTournamentEnd;
				let msg = `<b>${room.title} 房间 ${format.name} 淘汰赛`;
				if (tourStatus.settings.rules.autostart) {
					msg += `将于${tourStatus.settings.rules.autostart}分钟后开始!</b>`;
				} else {
					msg += '即将开始!</b>';
				}
				msg += '<center><table>';
				const sfill = (x: string | number) => (' ' + x).slice(-2).replace(/\s+/g, '&ensp;');
				msg += '<tr><th>获胜轮数</th>' + SCORE_BONUS.map((v, i) => `<td>${sfill(i)}</td>`).join('') + '</tr>';
				msg += '<tr><th>奖励积分</th>' + SCORE_BONUS.map((v, i) => `<td>${sfill(v)}</td>`).join('') + '</tr>';
				msg += '</table></center>';
				msg += '<b>冠军还可以在宠物系统中获得一个神秘的蛋!</b>'
				for (const u of Users.users.values()) {
					if (u.connected) u.send(`|pm|&|${u.tempGroup}${u.name}|/raw <div class="broadcast-blue">${msg}</div>`);
				}
			}
			broadcastContext.sendReply(TourQueue.formatInfo(format));
			if (tourStatus.settings.desc) {
				broadcastContext.sendReply(tourStatus.settings.desc);
			}
		} else {
			broadcastContext.errorReply('Failed to create a tournament.');
		}
	}

	check() {
		return `<b>Next tour:</b> ${this.schedule[0].settings.format} at ${this.schedule[0].nexttime.toString()}`;
	}

	static calcNextTime(timing: TourTiming): Date {
		const now = new Date();
		const next = new Date(now.getTime());
		next.setMilliseconds(0);
		next.setSeconds(0);
		next.setMinutes(timing.minutes);
		if (timing.hours === undefined) {
			if (now.getTime() >= next.getTime()) {
				next.setHours(next.getHours() + 1);
			}
		} else {
			next.setHours(timing.hours);
			if (timing.day === undefined) {
				if (now.getTime() >= next.getTime()) {
					next.setDate(next.getDate() + 1);
				}
			} else {
				next.setDate(next.getDate() - next.getDay() + timing.day);
				if (now.getTime() >= next.getTime()) {
					next.setDate(next.getDate() + 7);
				}
			}
		}
		return next;
	}

	static formatInfo(format: Format): string {
		const rules: string[] = [];
		let rulesetHtml = '';
		if (['Format', 'Rule', 'ValidatorRule'].includes(format.effectType)) {
			if (format.ruleset?.length) {
				rules.push(`<b>Ruleset</b> - ${Utils.escapeHTML(format.ruleset.join(", "))}`);
			}
			if (format.banlist?.length) {
				rules.push(`<b>Bans</b> - ${Utils.escapeHTML(format.banlist.join(", "))}`);
			}
			if (format.unbanlist?.length) {
				rules.push(`<b>Unbans</b> - ${Utils.escapeHTML(format.unbanlist.join(", "))}`);
			}
			if (format.restricted?.length) {
				rules.push(`<b>Restricted</b> - ${Utils.escapeHTML(format.restricted.join(", "))}`);
			}
			if (rules.length) {
				rulesetHtml = `<details><summary>Banlist/Ruleset</summary>${rules.join("<br/>")}</details>`;
			} else {
				rulesetHtml = `No ruleset found for ${format.name}`;
			}
		}
		let formatType: string = (format.gameType || "singles");
		formatType = formatType.charAt(0).toUpperCase() + formatType.slice(1).toLowerCase();
		if (!format.desc && !format.threads) {
			if (format.effectType === 'Format') {
				return `No description found for this ${formatType} ${format.section} format.<br/>${rulesetHtml}`;
			} else {
				return `No description found for this rule.<br/>${rulesetHtml}`;
			}
		}
		const descHtml = [...(format.desc ? [format.desc] : []), ...(format.threads || [])];
		return `${format.name}<div>${descHtml.join("<br/>")}<br/>${rulesetHtml}</div>`;
	}
}

let tourConfig: {[roomid: string]: TourSettings[]} = {};
let tourQueues: {[roomid: string]: TourQueue} = {};

function loadTourConfig() {
	tourConfig = JSON.parse(FS(AUTO_TOUR_CONFIG_FILE).readSync());
}

function saveTourConfig() {
	FS(AUTO_TOUR_CONFIG_FILE).safeWriteSync(JSON.stringify(tourConfig));
}

function applyTourConfig() {
	Object.values(tourQueues).forEach((tourQueue) => tourQueue.stop());
	tourQueues = {};
	Object.entries(tourConfig).forEach(([roomid, roomTourConfig]) => {
		if (roomTourConfig.length) {
			tourQueues[roomid] = new TourQueue(roomid, roomTourConfig);
		}
	});
}

if (!FS(AUTO_TOUR_CONFIG_FILE).existsSync()) saveTourConfig();
loadTourConfig();
applyTourConfig();

let tmpTourConfig: {[cfgid: string]: TourSettings[]} = {};

export const commands: Chat.ChatCommands = {
	autotour: {
		'': 'check',
		check(target, room, user) {
			this.requireRoom();
			const roomid = room!.roomid;
			if (tourQueues[roomid]) {
				let buf = `|uhtml|auto-tour-config|`;
				buf += `<p>${tourQueues[roomid].check()}</p><br/>`;
				buf += PetUtils.button('/autotour config', 'View all configured tours');
				this.sendReply(buf);
			} else {
				this.parse(`/autotour config`);
			}
		},
		config: {
			'': 'show',
			show(target, room, user) {
				this.requireRoom();
				const roomid = room!.roomid;
				const canEdit = Users.Auth.hasPermission(user, 'roommod', null, room);
				let buf = '|uhtml|auto-tour-config|';
				let notSaved = !!tmpTourConfig[`${room!.roomid}-${user.id}`];
				const roomTourConfig = tmpTourConfig[`${room!.roomid}-${user.id}`] || tourConfig[roomid] || [];
				if (roomTourConfig.length) {
					buf += '<table style="border-spacing: 5px;">';
					let header = ['Format', 'Time'];
					buf += '<tr>' + header.map(s => `<th style="text-align: center">${s}</th>`).join('') + '</tr>';
					roomTourConfig.forEach((tourSettings, index) => {
						const formatName = tourSettings.format;
						let timing = 'Every ';
						if (tourSettings.timing.day !== undefined) {
							timing += DAYS[tourSettings.timing.day] + ' ';
						} else {
							timing = 'Everyday ';
						}
						if (tourSettings.timing.hours !== undefined) {
							timing += ('0' + tourSettings.timing.hours).slice(-2);
						} else {
							timing += 'XX';
						}
						timing += ':' + ('0' + tourSettings.timing.minutes).slice(-2);
						let buttons = PetUtils.button(`/autotour config rules ${index}`, 'Rules');
						if (canEdit) {
							buttons += PetUtils.button(`/autotour config edit ${index}`, 'Edit');
							buttons += PetUtils.button(`/autotour config edit ${index},delete`, 'Delete');
						}
						let row = [formatName, timing, buttons];
						buf += '<tr>' + row.map(s => `<td style="text-align: center">${s}</td>`).join('') + '</tr>';
					});
					const lastRow = ['', '', PetUtils.button(`/autotour config exit`, 'Exit')];
					if (canEdit) lastRow[0] = PetUtils.button(`/autotour config edit ${roomTourConfig.length}`, 'Add');
					if (notSaved) {
						lastRow[2] = PetUtils.button(`/autotour config save`, 'Confirm') +
							PetUtils.button(`/autotour config cancel`, 'Cancel');
					}
					buf += '<tr>' + lastRow.map(s => `<td style="text-align: center">${s}</td>`).join('') + '</tr>';
					buf += '</table>';
				} else {
					buf += 'There is no auto tour configured in this room. ';
					if (canEdit) buf += PetUtils.button(`/autotour config edit ${roomTourConfig.length}`, 'Add');
				}
				this.sendReply(buf);
			},
			rules(target, room, user) {
				this.requireRoom();
				const roomid = room!.roomid;
				const roomTourConfig = tmpTourConfig[`${room!.roomid}-${user.id}`] || tourConfig[roomid] || [];
				const index = parseInt(target);
				if (index >= 0 && index < roomTourConfig.length) {
					const tourRules = roomTourConfig[index].rules;
					const allowScouting = tourRules.allowscouting === undefined || tourRules.allowscouting;
					const forceTimer = !!tourRules.forcetimer;
					const bonus = !!tourRules.bonus;
					const lines = [];
					lines.push(`<b>Bonus: ${bonus ? 'ON' : 'OFF'}</b>`);
					if (bonus) {
						lines.push('PS-China scores will be awarded if you win battles in the tournament.');
					} else {
						lines.push('No scores awarded in the tournament.');
					}
					lines.push(`<b>Capacity: ${tourRules.playercap || 'Unset'}</b>`);
					if (tourRules.playercap) {
						lines.push(`A maximum of ${tourRules.playercap} players can take part in the tournament.`);
					} else {
						lines.push('There is no upper limit on the number of participants.');
					}
					lines.push(`<b>Scouting: ${allowScouting ? 'Allowed' : 'Banned'}</b>`);
					lines.push(`Players ${allowScouting ? 'can' : 'can\'t'} watch other tournament battles.`);
					lines.push(`<b>Force Timer: ${forceTimer ? 'ON' : 'OFF'}</b>`);
					if (forceTimer) {
						lines.push('All battles will be timed.');
					} else {
						lines.push('The timer is opt-in.');
					}
					lines.push(`<b>Auto-start: ${tourRules.autostart || 'Unset'}</b>`);
					if (tourRules.autostart) {
						lines.push(`The tournament will automatically start in ${tourRules.autostart} minute(s).`);
					} else {
						lines.push('The tournament will not automatically started.');
					}
					lines.push(`<b>Auto-disqualify: ${tourRules.autodq || 'Unset'}</b>`);
					if (tourRules.autodq) {
						lines.push(`Inactive players will be disqualified in ${tourRules.autodq} minute(s).`);
					} else {
						lines.push('Inactive players will not be automatically disqualified.');
					}
					if (roomTourConfig[index].desc) {
						lines.push(`<b>Description:</b>`);
						lines.push(roomTourConfig[index].desc);
					}
					lines.push(PetUtils.button('/autotour config', 'Back'));
					return this.sendReply(`|uhtml|auto-tour-config|${lines.join('<br/>')}`);
				}
			},
			save(target, room, user) {
				this.requireRoom();
				this.checkCan('roommod', null, room!);
				if (tmpTourConfig[`${room!.roomid}-${user.id}`]) {
					if (tmpTourConfig[`${room!.roomid}-${user.id}`].length) {
						tourConfig[room!.roomid] = tmpTourConfig[`${room!.roomid}-${user.id}`];
					} else {
						delete tourConfig[room!.roomid];
					}
					saveTourConfig();
					applyTourConfig();
					delete tmpTourConfig[`${room!.roomid}-${user.id}`];
				}
				this.parse('/autotour config');
				this.sendReply('Auto tour config updated.');
			},
			cancel(target, room, user) {
				this.requireRoom();
				this.checkCan('roommod', null, room!);
				delete tmpTourConfig[`${room!.roomid}-${user.id}`];
				this.parse('/autotour config');
			},
			exit(target, room, user) {
				this.requireRoom();
				this.sendReply('|uhtmlchange|auto-tour-config|');
			},
			edit(target, room, user) {
				this.requireRoom();
				this.checkCan('roommod', null, room!);
				if (!tmpTourConfig[`${room!.roomid}-${user.id}`]) {
					tmpTourConfig[`${room!.roomid}-${user.id}`] = JSON.parse(JSON.stringify(tourConfig[room!.roomid] || []));
				}
				const [indexStr, command, args] = target.replace(/\s+/g, '').split(',');
				const index = parseInt(indexStr);
				const num = parseInt(args);
				if (index >= 0 && index < tmpTourConfig[`${room!.roomid}-${user.id}`].length) {
					const tourSettings = tmpTourConfig[`${room!.roomid}-${user.id}`][index];
					const rules = tourSettings.rules;
					const timing = tourSettings.timing;
					switch (command) {
						case 'delete':
							tmpTourConfig[`${room!.roomid}-${user.id}`].splice(index, 1);
							return this.parse('/autotour config');
						case 'desc':
							tourSettings.desc = target.split('desc')[1].slice(1);
							return this.parse(`/autotour config edit ${index}`);
						case 'format':
							const format = Dex.formats.get(args);
							if (format.exists) {
								tourSettings.format = format.name;
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'bonus':
						case 'forcetimer':
						case 'allowscouting':
							if (rules[command] === undefined) {
								rules[command] = command === 'allowscouting';
							}
							if (command !== 'bonus' || room!.roomid === 'skypillar') {
								rules[command] = !rules[command];
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'playercap':
						case 'autostart':
						case 'autodq':
							if (Number.isInteger(num) && num >= (command === 'playercap' ? 2 : 0)) {
								rules[command] = num;
							} else {
								delete rules[command];
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'time':
							const hours = Math.floor(num / 100) % 24;
							const minutes = Math.floor(num) % 100;
							if (hours >= 0 && minutes >= 0 && minutes < 60) {
								timing['hours'] = hours;
								timing['minutes'] = minutes;
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'day':
							if (Number.isInteger(num) && num >= 0 && num < 7) {
								timing[command] = num;
							} else {
								delete timing[command];
							}
							return this.parse(`/autotour config edit ${index}`);
						default:
							let buf = '|uhtml|auto-tour-config|';
							const cmdPrefix = `/msgroom ${room!.roomid}, /autotour config edit ${index}`;
							const allowScouting = rules.allowscouting === undefined || rules.allowscouting;
							const forceTimer = !!rules.forcetimer;
							const bonus = !!rules.bonus;
							buf += `<b>Format</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},format,{autotour-format}">`;
							buf += `<input name="autotour-format" placeholder="${tourSettings.format}" style="width: 300px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form><br/>`;
							buf += `<b>Bonus</b><br/>`;
							buf += PetUtils.conditionalButton(bonus, `${cmdPrefix},bonus`, 'On');
							buf += PetUtils.conditionalButton(!bonus, `${cmdPrefix},bonus`, 'Off');
							buf += `<br/><br/>`;
							buf += `<details open><summary><b>Rules</b></summary>`;
							buf += PetUtils.table(
								['Player Capacity', 'Allow Scouting', 'Force Timer', 'Auto-start', 'Auto-disqualify'],
								[],
								[
									`<form data-submitsend="${cmdPrefix},playercap,{autotour-playercap}">` +
									`<input name="autotour-playercap" placeholder="${rules.playercap}" style="width: 60px"/>` +
									`<button class="button" type="submit">OK</button>` +
									`</form>`,
									PetUtils.conditionalButton(allowScouting, `${cmdPrefix},allowscouting`, 'On') +
									PetUtils.conditionalButton(!allowScouting, `${cmdPrefix},allowscouting`, 'Off'),
									PetUtils.conditionalButton(forceTimer, `${cmdPrefix},forcetimer`, 'On') +
									PetUtils.conditionalButton(!forceTimer, `${cmdPrefix},forcetimer`, 'Off'),
									`<form data-submitsend="${cmdPrefix},autostart,{autotour-autostart}">` +
									`<input name="autotour-autostart" placeholder="${rules.autostart}" style="width: 60px"/>` +
									`<button class="button" type="submit">OK</button>` +
									`</form>`,
									`<form data-submitsend="${cmdPrefix},autodq,{autotour-autodq}">` +
									`<input name="autotour-autodq" placeholder="${rules.autodq}" style="width: 60px"/>` +
									`<button class="button" type="submit">OK</button>` +
									`</form>`
								].map(s => [s]),
								'350px',
								'left',
								'right'
							);
							buf += `</details><br/>`;
							buf += `<details open><summary><b>Timing</b></summary>`;
							buf += PetUtils.table(
								['Day', 'Time'],
								[],
								[
									PetUtils.conditionalButton(
										timing.day === undefined,
										`${cmdPrefix},day,undefined`,
										'Everyday',
									) + DAYS.map((day, i) => PetUtils.conditionalButton(
										timing.day === i,
										`${cmdPrefix},day,${i}`,
										day,
									)).join(''),
									`<form data-submitsend="${cmdPrefix},time,{autotour-hours}{autotour-minutes}">` +
									`<input name="autotour-hours" placeholder="${timing.hours}" style="width: 60px"/>` +
									`&ensp;:&ensp;` +
									`<input name="autotour-minutes" placeholder="${timing.minutes}" style="width: 60px"/>` +
									`<button class="button" type="submit">OK</button>` +
									`</form>`
								].map(s => [s]),
								'350px',
								'left',
								'right'
							)
							buf += `</details><br/>`;
							buf += `<b>Description (Optional):</b> ${tourSettings.desc}<br/>`;
							buf += `<form data-submitsend="${cmdPrefix},desc,{autotour-desc}">`;
							buf += `<input name="autotour-desc" placeholder="${Utils.escapeHTML(tourSettings.desc || 'undefined')}" style="width: 300px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form><br/>`;
							buf += PetUtils.button(`/autotour config`, 'Confirm & Back');
							this.sendReply(buf);
					}
				} else if (index === tmpTourConfig[`${room!.roomid}-${user.id}`].length) {
					tmpTourConfig[`${room!.roomid}-${user.id}`][index] = {
						format: '[Gen 8] OU',
						rules: tmpTourConfig[`${room!.roomid}-${user.id}`][tmpTourConfig[`${room!.roomid}-${user.id}`].length - 1]?.rules || {},
						timing: { 'minutes': 0, 'hours': 20 }
					}
					this.parse('/autotour config');
				} else {
					this.parse('/autotour config');
				}
			}
		}
	}
}
