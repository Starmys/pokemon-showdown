import { FS, Utils } from '../../lib';
import { ChatRoom } from '../rooms';

type TourRules = {
	playercap?: string,
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

function calcNextTime(timing: TourTiming): Date {
	const now = new Date();
	const next = new Date(now.getTime());
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
			tourStatus.settings.rules.playercap,
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

export const commands: Chat.ChatCommands = {
	autotour: {
		'': 'check',
		check(target, room, user) {
			this.requireRoom();
			const roomid = room!.roomid;
			if (tourQueues[roomid]) {
				this.sendReply(tourQueues[roomid].check());
			} else {
				this.sendReply('There is no auto tour configured in this room.');
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
					buf += '<center><table>';
					let header = ['Format', 'Time', 'Rules'];
					if (canEdit) {
						header.push('Operations');
					}
					buf += '<tr>' + header.map(s => `<th>${s}</th>`).join('') + '</tr>';
					roomTourConfig.forEach((tourSettings, index) => {
						const formatName = tourSettings.format;
						let timing = 'Every ';
						if (tourSettings.timing.day) {
							const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
							timing += days[tourSettings.timing.day] + ' ';
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
							row.push(
								['Edit', 'Delete']
								.map(s => button(`/autotour config ${s.toLowerCase()} ${index}`, s))
								.join('<br/>')
							);
						}
						buf += '<tr>' + row.map(s => `<td>${s}</td>`).join('') + '</tr>';
					});
					buf += '</table></center>';
				} else {
					buf += '<p>There is no auto tour configured in this room.</p>';
				}
				buf += button(`/autotour config edit ${roomTourConfig.length}`, 'Add');
				buf += '<br/>';
				buf += button(`/autotour config save`, 'Confirm');
				buf += button(`/autotour config cancel`, 'Cancel');
				this.sendReplyBox(buf);
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
				this.sendReplyBox('|uhtml|auto-tour-config|');
				this.sendReply('Auto tour config updated.');
			},
			cancel(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
				delete tmpTourConfig[user.id];
				this.sendReplyBox('|uhtml|auto-tour-config|');
			},
			delete(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
				if (!tmpTourConfig[user.id]) tmpTourConfig[user.id] = JSON.parse(JSON.stringify(tourConfig[room!.roomid]));
				this.parse('/autotour config')
			},
			edit(target, room, user) {
				this.requireRoom();
				this.checkCan('editroom', null, room!);
			}
		}
	}
}
