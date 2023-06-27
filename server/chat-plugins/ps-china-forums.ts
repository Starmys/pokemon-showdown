import { FS } from "../../lib";
import { NetRequest } from "../../lib/net";
import { escapeHTML } from "../../lib/utils";
import { PetUtils } from "./ps-china-pet-mode";

const FORUMS_URL = 'https://pschina.one';
const TOPIC_KEYS = ['中国队', '报名', '公开赛', '地域赛', '联赛', '大联盟', '大满贯', '锦标赛', '季赛', 'PL', 'Shinx', 'Suspect'];
const INTRO_FOLDER = 'config/ps-china/intro';
const INTRO_MSG_TYPES = ['PS China Intro'];
const NEWS_EDIT_CD = 60000;

let lastEditTime = -1;
let currentEditor = '';
let currentCursor = -1;
let newsTable: string[][] = [];

export const loginMsgs: {[msgType: string]: string} = {};
INTRO_MSG_TYPES.forEach(msgType => loadMsgType(msgType));
loadPSChinaNews();

function loadMsgType(msgType: string) {
	loginMsgs[msgType] = FS(`${INTRO_FOLDER}/${msgType.toLowerCase().replace(/\s/g, '-')}.html`)
		.readIfExistsSync().replace(/[\n|\t]/g, '');
}

async function scanPSChinaNews(): Promise<number> {
	const topics: {[index: string]: string} = {};
	let recentPage = await new NetRequest(`${FORUMS_URL}/recent`).get();
	let tagIndex = recentPage.indexOf(`<a href="/topic/`);
	while (tagIndex >= 0) {
		recentPage = recentPage.slice(tagIndex);
		const tagSplitIndex = recentPage.indexOf(`">`);
		const href = recentPage.slice(16, tagSplitIndex);
		const num = href.split('/')[0];
		recentPage = recentPage.slice(tagSplitIndex + 2);
		const tagEndIndex = recentPage.indexOf(`</a>`);
		const title = recentPage.slice(0, tagEndIndex);
		if (!title.startsWith('<i')) topics[num] = title;
		recentPage = recentPage.slice(tagEndIndex + 4);
		tagIndex = recentPage.indexOf(`<a href="/topic/`);
	}
	let oldUrls = new Set(newsTable.map(([index, url]) => url));
	Object.entries(topics)
		.filter(([index, title]) => TOPIC_KEYS.some(key => title.includes(key)))
		.map(([index, title]) => [title, `${FORUMS_URL}/topic/${index}`])
		.filter(([index, url]) => !oldUrls.has(url))
		.forEach(([index, url]) => newsTable.push([index, url]));
	return newsTable.length;
}

async function loadPSChinaNews() {
	let newsData = FS(`${INTRO_FOLDER}/news.json`).readIfExistsSync();
	if (newsData) {
		newsTable = JSON.parse(newsData);
	} else {
		await scanPSChinaNews();
		savePSChinaNews();
	}
	updatePSChinaIntro();
}

function savePSChinaNews() {
	FS(`${INTRO_FOLDER}/news.json`).writeSync(JSON.stringify(newsTable, null, '\t'));
}

function updatePSChinaIntro() {
	const newsStr = newsTable.map(([title, url]) => `<p><a href="${url}">${title}</a></p>`).join('');
	loadMsgType('PS China Intro');
	loginMsgs['PS China Intro'] = loginMsgs['PS China Intro'].replace('{}', newsStr);
}

function requireWriteAccess(userid: string): boolean {
	if (currentEditor !== userid && !!Users.get(currentEditor) && Date.now() < lastEditTime + NEWS_EDIT_CD) {
		return false;
	}
	currentEditor = userid;
	lastEditTime = Date.now();
	return true;
}

function showNewsTable(roomid: string): string {
	const news = newsTable
	.map((row, i) => row.map((text, j) => {
		if (text.startsWith('http')) text = `<a href="${text}">${text}</a>`;
		if (currentCursor === i * 2 + j) {
			// TODO: Move Up & Move Down
			let buf = '';
			buf += `<form data-submitsend="/msgroom ${roomid}, /pschinaforums news edit ${i * 2 + j},{cn-forums-news-text}">`;
			buf += `<input name="cn-forums-news-text" value="${escapeHTML(text)}"/> `;
			buf += `<button class="button" type="submit">确认</button>`;
			buf += `</form>`;
			return buf;
		} else {
			return `${text} ${PetUtils.button(`/pschinaforums news edit ${i * 2 + j}`, '编辑')}`;
		}
	}))
	.map(([title, url], i) => [PetUtils.button(`/pschinaforums news edit ${i * 2},-`, '-', 'width: 30px'), title, url])
	.concat([[PetUtils.button(`/pschinaforums news edit ${newsTable.length * 2}`, '+', 'width: 30px'), '', '']]);
	const buttons = [
		PetUtils.button('/pschinaforums news load', '从论坛读取'),
		PetUtils.button('/pschinaforums news update', '保存'),
		PetUtils.button('/pschinaforums news clear', '取消'),
	];
	return `<p><b>新闻列表:</b></p>${PetUtils.table([], [], news, '100%', 'left', 'left', true)}<p>${buttons.join('')}</p>`;
}

export const commands: Chat.ChatCommands = {
	'cnforums': 'pschinaforums',
	pschinaforums: {
		news: {
			'': 'edit',
			edit(target, room, user) {
				this.requireRoom();
				this.checkCan('lock');
				if (!requireWriteAccess(user.id)) {
					return this.errorReply(`${Users.get(currentEditor)?.name} 正在编辑新闻列表。`);
				}
				const [cursorStr, text] = target.split(',');
				const cursor = ((parseInt(cursorStr) + 1) || 0) - 1;
				const rowIndex = cursor >> 1;
				if (text === '-') {
					newsTable.splice(rowIndex, 1);
					currentCursor = -1;
				} else if (rowIndex == newsTable.length) {
					newsTable.push(['(请编辑标题)', '(请编辑链接)']);
					currentCursor = -1;
				} else if (cursor >= 0 && cursor === currentCursor) {
					newsTable[rowIndex][cursor & 1] = text;
					currentCursor = -1;
				} else {
					currentCursor = cursor;
				}
				this.sendReply(`|uhtml|cn-forums|${showNewsTable(room!.roomid)}`);
			},
			async load(target, room, user) {
				this.requireRoom();
				this.checkCan('lock');
				if (!requireWriteAccess(user.id)) {
					return this.errorReply(`${Users.get(currentEditor)?.name} 正在编辑新闻列表。`);
				}
				await scanPSChinaNews();
				this.parse('/pschinaforums news edit');
			},
			update(target, room, user) {
				this.requireRoom();
				this.checkCan('lock');
				if (!requireWriteAccess(user.id)) {
					return this.errorReply(`${Users.get(currentEditor)?.name} 正在编辑新闻列表。`);
				}
				updatePSChinaIntro();
				savePSChinaNews();
				currentEditor = '';
				this.sendReply('新闻列表更新成功!');
				this.stafflog(`${user.name} 更新了新闻列表。`)
				this.parse('/pschinaforums news clear');
			},
			clear(target, room, user) {
				this.requireRoom();
				if (currentEditor === user.id) currentEditor = '';
				this.sendReply('|uhtmlchange|cn-forums|');
			}
		},

		'': 'help',
		help(target, room, user) {
			if (!room) return;
			const cmds = Object.entries({
				'新闻列表': '/pschinaforums news',
			}).map(([desc, cmd]) => [PetUtils.button(cmd, desc), `<code>${cmd}</code>`]);
			let buf = 'PS China 论坛相关功能:'
			buf += PetUtils.table([], [], cmds, '300px', 'left', 'left', true);
			user.sendTo(room.roomid, `|uhtml|pet-welcome|${buf}`);
		}
	}
}