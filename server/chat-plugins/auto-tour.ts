type TourSchedule = {
	formatid: string,
	minutes: string,
	hours?: string,
	day?: string,
	date?: string,
	month?: string
}[];

class AutoTourTrigger {
	private roomid: string;
	private schedule: TourSchedule;

	constructor(roomid: string, schedule: TourSchedule = []) {
		this.roomid = roomid;
		this.schedule = schedule;
	}
}

const autoTourTriggers: {[roomid: string]: AutoTourTrigger} = {};

export const commands: Chat.ChatCommands = {
}
