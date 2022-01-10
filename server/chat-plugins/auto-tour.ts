import { FS, Utils } from '../../lib';
import { ChatRoom } from '../rooms';

type TourRules = {
	playercap?: number,
	autostart?: number,
	forcetimer?: boolean,
	autodq?: number,
};

type TourTiming = {
	minutes: number,
	hours?: number,
	day?: number,
};

type TourSettings = {
	format: string,
	rules: TourRules,
	timing: TourTiming
};

type TourStatus = {
	settings: TourSettings,
	nexttime: Date
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function calcNextTime(timing: TourTiming): Date {
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

function formatInfo(format: Format): string {
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
		if (rules.length > 0) {
			rulesetHtml = `<details><summary>Banlist/Ruleset</summary>${rules.join("<br />")}</details>`;
		} else {
			rulesetHtml = `No ruleset found for ${format.name}`;
		}
	}
	let formatType: string = (format.gameType || "singles");
	formatType = formatType.charAt(0).toUpperCase() + formatType.slice(1).toLowerCase();
	if (!format.desc && !format.threads) {
		if (format.effectType === 'Format') {
			return `No description found for this ${formatType} ${format.section} format.<br />${rulesetHtml}`;
		} else {
			return `No description found for this rule.<br />${rulesetHtml}`;
		}
	}
	const descHtml = [...(format.desc ? [format.desc] : []), ...(format.threads || [])];
	return `${descHtml.join("<br />")}<br />${rulesetHtml}`;
}

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
}

class TourQueue {
	private roomid: string;
	private schedule: TourStatus[];
	private timeout: number | undefined;

	constructor(roomid: string, config: TourSettings[] = []) {
		this.roomid = roomid;
		this.schedule = config.map((tourSettings) => {
			return {
				settings: tourSettings,
				nexttime: calcNextTime(tourSettings.timing)
			};
		});
		this.schedule.sort((t1, t2) => +t1.nexttime - +t2.nexttime);
		this.start();
	}

	start() {
		return
	}

	stop() {
		clearTimeout(this.timeout);
	}

	restart() {
		this.stop();
		this.start();
	}

	createTour() {
		const room = Rooms.get(this.roomid);
		if (room?.type !== 'chat') return;
		const tourStatus = this.schedule[0];
		const format = Dex.formats.get(tourStatus.settings.format);
		if (!format.exists) return;
		if (!room.settings.tournaments) room.settings.tournaments = {};
		room.settings.tournaments.autostart = tourStatus.settings.rules.autostart;
		room.settings.tournaments.forceTimer = tourStatus.settings.rules.forcetimer;
		room.settings.tournaments.autodq = tourStatus.settings.rules.autodq;
		const broadcastContext = new BroadcastContext(room, 'Auto Tour');
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
		if (tour) broadcastContext.sendReply(formatInfo(format));
	}

	check() {
		if (this.schedule.length === 0) {
			return 'There is no auto tour configured in this room.';
		} else {
			const tourStatus = this.schedule[0];
			return `Next tour: ${tourStatus.settings.format} at ${tourStatus.nexttime.toString()}`;
		}
	}
}

const AUTO_TOUR_CONFIG_FILE = 'config/tours.json';

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
		tourQueues[roomid] = new TourQueue(roomid, roomTourConfig);
	});
}

if (!FS(AUTO_TOUR_CONFIG_FILE).existsSync()) saveTourConfig();
loadTourConfig();
applyTourConfig();

let tmpTourConfig: {[userid: string]: TourSettings[]} = {};

function button(command: string, desc: string) {
	return `<button class="button" name="send" value="${command}">${desc}</button>`;
}

function disabledButton(desc: string) {
	return `<button class="button disabled" style="font-weight:bold;color:#575757;background:#d3d3d3">${desc}</button>`;
}

function conditionalButton(condition: boolean, command: string, desc: string) {
	return condition ? disabledButton(desc) : button(command, desc);
}

export const commands: Chat.ChatCommands = {
	autotour: {
		'': 'check',
		check(target, room, user) {
			this.requireRoom();
			const roomid = room!.roomid;
			if (tourQueues[roomid]) {
				this.sendReply(tourQueues[roomid].check());
				this.sendReply(`|uhtml|auto-tour-config|${button('/autotour config', 'View all configured tours')}`);
			} else {
				if (Users.Auth.hasPermission(user, 'editroom', null, room)) {
					this.parse(`/autotour config`);
				} else {
					this.sendReply('There is no auto tour configured in this room.');
				}
			}
		},
		config: {
			'': 'show',
			show(target, room, user) {
				this.requireRoom();
				const roomid = room!.roomid;
				const canEdit = Users.Auth.hasPermission(user, 'editroom', null, room);
				let buf = '|uhtml|auto-tour-config|';
				const roomTourConfig = tmpTourConfig[user.id] || tourConfig[roomid] || [];
				if (roomTourConfig.length) {
					buf += '<table style="border-spacing: 5px;">';
					let header = ['Format', 'Time', 'Rules'];
					if (canEdit) {
						header.push('Operations');
					}
					buf += '<tr>' + header.map(s => `<th style="text-align: center">${s}</th>`).join('') + '</tr>';
					roomTourConfig.forEach((tourSettings, index) => {
						const formatName = tourSettings.format;
						let timing = 'Every ';
						if (tourSettings.timing.day !== undefined) {
							timing += DAYS[tourSettings.timing.day] + ' ';
						} else {
							timing = 'Everyday ';
						}
						if (tourSettings.timing.hours) {
							timing += ('0' + tourSettings.timing.hours).slice(-2);
						} else {
							timing += 'XX';
						}
						timing += ':' + ('0' + tourSettings.timing.minutes).slice(-2);
						let rules = Object.entries(tourSettings.rules).map(([key, value]) => `${key}: ${value}`).join('<br/>');
						let row = [formatName, timing, rules];
						if (canEdit) {
							let buttons = '';
							buttons += button(`/autotour config edit ${index}`, 'Edit');
							buttons += '<br/>';
							buttons += button(`/autotour config edit ${index} delete`, 'Delete');
							row.push(buttons);
						}
						buf += '<tr>' + row.map(s => `<td style="text-align: center">${s}</td>`).join('') + '</tr>';
					});
					buf += '</table>';
				} else {
					buf += '<p>There is no auto tour configured in this room.</p>';
				}
				if (canEdit) {
					buf += '<p>';
					buf += button(`/autotour config edit ${roomTourConfig.length}`, 'Add');
					buf += button(`/autotour config save`, 'Confirm');
					buf += button(`/autotour config cancel`, 'Cancel');
					buf += '</p>';
				}
				this.sendReply(buf);
			},
			save(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
				if (tmpTourConfig[user.id]) {
					if (tmpTourConfig[user.id].length) {
						tourConfig[room!.roomid] = tmpTourConfig[user.id];
					} else {
						delete tourConfig[room!.roomid];
					}
					saveTourConfig();
					applyTourConfig();
					delete tmpTourConfig[user.id];
				}
				this.sendReply('|uhtml|auto-tour-config|');
				this.sendReply('Auto tour config updated.');
			},
			cancel(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
				delete tmpTourConfig[user.id];
				this.sendReply('|uhtml|auto-tour-config|');
			},
			edit(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
				if (!tmpTourConfig[user.id]) {
					tmpTourConfig[user.id] = JSON.parse(JSON.stringify(tourConfig[room!.roomid] || []));
				}
				const [indexStr, command, args] = target.replace(/\s+/g, '').split(',');
				const index = parseInt(indexStr);
				const num = parseInt(args);
				if (index >= 0 && index < tmpTourConfig[user.id].length) {
					const tourSettings = tmpTourConfig[user.id][index];
					switch (command) {
						case 'delete':
							tmpTourConfig[user.id].splice(index, 1);
							return this.parse('/autotour config');
						case 'format':
							const format = Dex.formats.get(args);
							if (format.exists) {
								tourSettings.format = format.name;
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'forcetimer':
							tourSettings.rules.forcetimer = !tourSettings.rules.forcetimer;
							return this.parse(`/autotour config edit ${index}`);
						case 'playercap':
						case 'autostart':
						case 'autodq':
							if (Number.isInteger(num) && num >= (command === 'playercap' ? 2 : 0)) {
								tourSettings.rules[command] = num;
							} else {
								delete tourSettings.rules[command];
							}
							return this.parse(`/autotour config edit ${index}`);
						case 'minutes':
						case 'hours':
						case 'day':
							const cycle = {'minutes': 60, 'hours': 24, 'day': 7}[command];
							if (Number.isInteger(num) && num >= 0) {
								tourSettings.timing[command] = num % cycle;
							} else if (command !== 'minutes') {
								delete tourSettings.timing[command];
							}
							return this.parse(`/autotour config edit ${index}`);
						default:
							let buf = '|uhtml|auto-tour-config|';
							const cmdPrefix = `/msgroom ${room!.roomid}, /autotour config edit ${index}`;
							buf += `<b>Format</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},format,{autotour-format}">`;
							buf += `<input name="autotour-format" placeholder="${tourSettings.format}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += `<b>Force Timer</b><br/>`;
							buf += conditionalButton(!!tourSettings.rules.forcetimer, `${cmdPrefix},forcetimer`, 'On');
							buf += conditionalButton(!tourSettings.rules.forcetimer, `${cmdPrefix},forcetimer`, 'Off');
							buf += '<br/>';
							buf += `<b>Player Capacity</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},playercap,{autotour-playercap}">`;
							buf += `<input name="autotour-playercap" placeholder="${tourSettings.rules.playercap}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += `<b>Auto Start (in Minutes)</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},autostart,{autotour-autostart}">`;
							buf += `<input name="autotour-autostart" placeholder="${tourSettings.rules.autostart}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += `<b>Auto Disqualify (in Minutes)</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},autodq,{autotour-autodq}">`;
							buf += `<input name="autotour-autodq" placeholder="${tourSettings.rules.autodq}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += `<b>Timing: Day</b><br/>`;
							buf += conditionalButton(tourSettings.timing.day === undefined, `${cmdPrefix},day,undefined`, 'Everyday');
							buf += DAYS.map((day, i) => {
								return conditionalButton(tourSettings.timing.day === i, `${cmdPrefix},day,${i}`, day);
							}).join('');
							buf += '<br/>'
							buf += `<b>Timing: Hours</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},hours,{autotour-hours}">`;
							buf += `<input name="autotour-hours" placeholder="${tourSettings.timing.hours}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += `<b>Timing: Minutes</b><br/>`;
							buf += `<form data-submitsend="${cmdPrefix},minutes,{autotour-minutes}">`;
							buf += `<input name="autotour-minutes" placeholder="${tourSettings.timing.minutes}" style="width: 200px"/>`;
							buf += `<button class="button" type="submit">OK</button>`;
							buf += `</form>`;
							buf += button(`/autotour config`, 'Confirm & Back');
							this.sendReply(buf);
					}
				} else if (index === tmpTourConfig[user.id].length) {
					tmpTourConfig[user.id][index] = {
						format: '[Gen 8] OU',
						rules: tmpTourConfig[user.id][0]?.rules || {},
						timing: {minutes: 0, hours: 20}
					}
					this.parse('/autotour config');
				} else {
					this.parse('/autotour config');
				}
			}
		}
	}
}
