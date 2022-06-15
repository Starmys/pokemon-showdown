import { FS } from '../../lib';
import { PRNG } from '../../sim';
import { SERVER_URL, PetUtils, getUser as getPetUser } from './ps-china-pet-mode';
import { iconURLs } from './ps-china-icon';

const TURN_CYCLE = 1200;
const HALF_CYCLE = 800;
const START_DELAY = 5000;
const DESTROY_DELAY = 60000;
const MAX_TURNS = 1000;
const MAP_ROWS = 11;
const MAP_COLS = 10;
const LATTICE_WIDTH = 38;
const LATTICE_HEIGHT = 44;
const MAP_WIDTH = Math.round(LATTICE_WIDTH * (MAP_COLS + 0.5));
const MAP_HEIGHT = Math.round(LATTICE_HEIGHT * 0.75 * (MAP_ROWS - 1) + LATTICE_HEIGHT);
const OFFICIAL_AVATAR_URL = 'https://play.pokemonshowdown.com/sprites/trainers';
const DEFAULT_AVATAR_INDEX = [1, 2, 101, 102, 169, 170, 265, 266];
const DEFAULT_AVATAR_IDS = ['lucas', 'dawn', 'ethan', 'lyra', 'hilbert', 'hilda', 'rosa', 'nate'];
const LATTICE_IMG_FOLDER_URL = `${SERVER_URL}/avatars/auto-chess`;
const LATTICE_IMG_FOLDER_LOCAL = `config/avatars/auto-chess`;
const MAP_CONFIG_FOLDER = 'config/ps-china/auto-chess';
const DEFAULT_CONFIG_PATH = `${MAP_CONFIG_FOLDER}/default`;
const LATTICE_TYPES = ['Default', 'Sunny Day', 'Rain Dance', 'Sandstorm', 'Hail'];
const PIECE_TYPES = ['Null', 'P1#1', 'P1#2', 'P1#3', 'P1#4', 'P1#5', 'P1#6', 'P2#1', 'P2#2', 'P2#3', 'P2#4', 'P2#5', 'P2#6'];

type piecePosition = {x: number, y: number};
type pieceStatus = {side: number, index: number, pos: piecePosition, nextPos?: piecePosition, direction: boolean, hp: number, set: PokemonSet};

if (!FS(MAP_CONFIG_FOLDER).existsSync()) FS(MAP_CONFIG_FOLDER).mkdirSync();

const prng = new PRNG();

function getAvatarUrl(userId: string): string {
	const avatarId = Users.get(userId)?.avatar;
	
	if (typeof avatarId === 'number' && DEFAULT_AVATAR_INDEX.includes(avatarId)){
		return `${OFFICIAL_AVATAR_URL}/${DEFAULT_AVATAR_IDS[DEFAULT_AVATAR_INDEX.indexOf(avatarId)]}.png`;
	} else if (!avatarId) {
		return `${OFFICIAL_AVATAR_URL}/unknown.png`;
	} else if (FS(`config/avatars/${avatarId}`).existsSync()) {
		return `${SERVER_URL}/avatars/${avatarId}`;
	} else {
		return `${OFFICIAL_AVATAR_URL}/${avatarId}.png`;
	}
}

class AutoChess {
	private roomId: string;
	private gameId: string;
	private playerIds: string[];
	private playerNames: string[];
	private playerIconUrls: string[];
	private spectatorIds: Set<string>;
	private status: pieceStatus[][];
	private battles: pieceStatus[][];
	private pieceIconUrls: string[][];
	private map: AutoChessMapConfig;
	private territory: number[][];
	private moveStyle: 'greedy' | 'random';
	private startCountDown: number;
	private mapSize: number[];
	private winner: number;
	private turns: number;
	private info: string[];
	private buf: string;

	constructor(roomId: string, gameId: string, playerIds: string[], playerTeams: PokemonSet[][]) {
		playerIds.forEach(userId => userInGames[userId] = gameId);
		this.roomId = roomId;
		this.gameId = gameId;
		this.playerIds = [...playerIds];
		this.playerNames = playerIds.map(userId => Users.get(userId)?.name || 'Unknown Player');
		this.spectatorIds = new Set(playerIds);
		this.map = mapConfigs[roomId] = mapConfigs[roomId] || new AutoChessMapConfig(roomId);
		this.mapSize = this.map.getSize();
		this.moveStyle = 'greedy';

		this.territory = [];
		this.status = [[], []];
		this.map.lattices.forEach((row, rowIndex) => {
			this.territory[rowIndex] = [];
			row.forEach((num, colIndex) => {
				this.territory[rowIndex][colIndex] = -1;
				if (num >= LATTICE_TYPES.length) {
					const pieceNum = Math.floor(num / LATTICE_TYPES.length) - 1;
					const pokeIndex = pieceNum % 6;
					const playerIndex = (pieceNum - pokeIndex) / 6;
					if (playerTeams[playerIndex][pokeIndex]) {
						this.status[playerIndex][pokeIndex] = {
							hp: 5,
							side: playerIndex,
							index: pokeIndex,
							pos: {x: colIndex, y: rowIndex},
							direction: playerIndex === 0,
							set: playerTeams[playerIndex][pokeIndex]
						};
						this.territory[rowIndex][colIndex] = playerIndex;
					}
				}
			});
		});
		this.battles = [];

		this.playerIconUrls = [];
		this.pieceIconUrls = [[], []];
		this.status.forEach((playerStatus, playerIndex) => {
			this.playerIconUrls[playerIndex] = getAvatarUrl(this.playerIds[playerIndex]);
			playerStatus.forEach((poke, pokeIndex) => {
				const species = Dex.species.get(poke.set.species);
				this.pieceIconUrls[playerIndex][pokeIndex] = iconURLs[species.id] || iconURLs[toID(species.baseSpecies)];
			});
		});

		this.buf = '';
		this.info = [];
		this.startCountDown = 5;
		this.winner = -1;
		this.turns = 0;

		Rooms.get(roomId)?.add(`|html|` +
			`<b>[Pet自走棋] <username class="username">${this.playerNames[0]}</username> 与 ` +
			`<username class="username">${this.playerNames[1]}</username> 的对战开始了!</b> ` +
			`${PetUtils.button(`/autochess watch ${gameId}`, '观看')}`
		).update();

		this.start();
	}
	hasPlayer(userId: string): boolean {
		return this.playerIds.includes(userId);
	}
	addSpectator(userId: string) {
		this.spectatorIds.add(userId);
		Users.get(userId)?.sendTo(this.roomId as RoomID, this.buf);
		userInGames[userId] = this.gameId;
	}
	removeSpectator(userId: string) {
		this.spectatorIds.delete(userId);
		delete userInGames[userId];
	}
	async start() {
		if (this.startCountDown) {
			this.display();
			setTimeout(() => { this.start(); }, START_DELAY / 5);
			this.startCountDown--;
		} else {
			this.nextTurn();
		}
	}
	static calcPosition(pos: piecePosition): number[] {
		const top = Math.round(LATTICE_HEIGHT * 0.75 * pos.y) + 4;
		const left = Math.round(LATTICE_WIDTH * (pos.x + 0.5 * (pos.y % 2))) + 3;
		return [top, left];
	}
	display() {
		const title = this.winner >= 0 ? `W${this.winner + 1}` : `T${this.startCountDown}`;

		const [mapWidth, mapHeight] = this.mapSize;
		this.buf = `|uhtml|auto-chess-game|`;

		// Title Zone
		this.buf += `<div style="width: ${mapWidth}px; background: url(${LATTICE_IMG_FOLDER_URL}/${title}.png) center no-repeat">`;
		this.buf += `<div style="height: 80px">`;
		this.buf += `<img src="${this.playerIconUrls[0]}" style="transform: scaleX(-1)"/>`;
		this.buf += `<div style="width: ${this.status[0].length * 40}px; display: inline-block; vertical-align: top">`;
		this.buf += this.status[0].map(poke => `<psicon pokemon="${toID(poke.set.species)}" style="transform: scaleX(-1)">`).join('');
		this.buf += this.status[0].map(poke => `<img src="${LATTICE_IMG_FOLDER_URL}/HP${Math.ceil(poke.hp)}.png">`).join('');
		this.buf += `</div>`;
		this.buf += `</div>`;
		this.buf += `<div>`;
		this.buf += `<p style="width: 80px; text-align: center; display: inline-block"><b>${this.playerNames[0]}</b></p>`;
		this.buf += `<div style="width: ${mapWidth - 2 * 80}px; height: 10px; display: inline-block"></div>`;
		this.buf += `<p style="width: 80px; text-align: center; display: inline-block"><b>${this.playerNames[1]}</b></p>`;
		this.buf += `</div>`;
		this.buf += `<div style="height: 80px">`;
		this.buf += `<div style="width: ${mapWidth - 80 - this.status[1].length * 40}px; display: inline-block"></div>`;
		this.buf += `<div style="width: ${this.status[1].length * 40}px; display: inline-block">`;
		this.buf += this.status[1].map(poke => `<psicon pokemon="${toID(poke.set.species)}">`).join('');
		this.buf += this.status[1].map(poke => `<img src="${LATTICE_IMG_FOLDER_URL}/HP${Math.ceil(poke.hp)}.png">`).join('');
		this.buf += `</div>`;
		this.buf += `<img src="${this.playerIconUrls[1]}"/>`;
		this.buf += `</div>`;
		this.buf += `</div>`;

		// Battle Zone
		this.buf += `<div style="width: ${mapWidth}px; height: ${mapHeight}px; position: relative">`;
		this.buf += this.map.showImg();
		const displayPos: number[][][] = [];
		this.status.forEach((playerStatus, playerIndex) => {
			displayPos[playerIndex] = [];
			playerStatus.forEach((poke, pokeIndex) => {
				if (!poke.hp) return;
				let [top, left] = AutoChess.calcPosition(poke.pos);
				if (poke.nextPos) {
					const [nextTop, nextLeft] = AutoChess.calcPosition(poke.nextPos);
					top = (top + nextTop) / 2;
					left = (left + nextLeft) / 2;
				}
				displayPos[playerIndex][pokeIndex] = [top, left];
				const styles = [
					`position: absolute`,
					`top: ${top}px`,
					`left: ${left}px`,
					`background: url(${LATTICE_IMG_FOLDER_URL}/P${poke.side + 1}.png)`
				];
				if (poke.direction) {
					styles.push('transform: scaleX(-1)');
				}
				this.buf += `<img src="${this.pieceIconUrls[playerIndex][pokeIndex]}" style="${styles.join('; ')}"/>`;
			});
		});
		this.battles.forEach(([poke1, poke2], battleIndex) => {
			const [top1, left1] = displayPos[poke1.side][poke1.index];
			const [top2, left2] = displayPos[poke2.side][poke2.index];
			const top = (top1 + top2) / 2;
			const left = (left1 + left2) / 2;
			const styles = [
				`position: absolute`,
				`top: ${top}px`,
				`left: ${left}px`
			];
			this.buf += `<img src="${LATTICE_IMG_FOLDER_URL}/Battle.png" style="${styles.join('; ')}"/>`;
		});
		this.buf += PetUtils.button(`/autochess quit ${this.gameId}`, '退出', 'position: absolute; right: 0px; bottom: 0px');
		this.buf += `</div>`;
		// console.log(this.buf.length)

		Array.from(this.spectatorIds).forEach(userId => {
			Users.get(userId)?.sendTo(this.roomId as RoomID, this.buf);
		});
	}
	getPossibleDirections(x: number, y: number): number[][] {
		const possibleDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		if (y % 2) {
			possibleDirections.push([1, -1]);
			possibleDirections.push([1, 1]);
		} else {
			possibleDirections.push([-1, -1]);
			possibleDirections.push([-1, 1]);
		}
		return possibleDirections.filter(d => {
			const nx = x + d[0];
			const ny = y + d[1];
			if (nx < 0 || nx >= MAP_COLS) return false;
			if (ny < 0 || ny >= MAP_ROWS) return false;
			return this.map.lattices[ny][nx] >= 0;
		});
	}
	breadthFirstSearch(startPos: number[]): number[][] {
		const flags: boolean[][] = this.map.lattices.map(row => row.map(num => true));
		const depth: number[][] = this.map.lattices.map(row => row.map(num => -1));
		depth[startPos[1]][startPos[0]] = 0;
		flags[startPos[1]][startPos[0]] = false;
		let arr: number[][] = [startPos];
		let head = 0;
		let tail = 0;
		while (head <= tail) {
			const [x, y] = arr[head];
			const directions = this.getPossibleDirections(x, y);
			if (directions.length) {
				prng.shuffle(directions);
				directions.forEach(direction => {
					const [nextX, nextY] = [x + direction[0], y + direction[1]];
					if (this.map.lattices[nextY][nextX] >= 0 && flags[nextY][nextX]) {
						depth[nextY][nextX] = depth[y][x] + 1;
						flags[nextY][nextX] = false;
						arr.push([nextX, nextY]);
						tail++;
					}
				});
			}
			head++;
		}
		return depth;
	}
	chooseDirection(pos: piecePosition, possibleDirections: number[][], depth: number[][]): number[] {
		let bestDirection = possibleDirections[0];
		let minDepth = depth[pos.y + bestDirection[1]][pos.x + bestDirection[0]];
		for (let direction of possibleDirections.slice(1)) {
			const [nextX, nextY] = [pos.x + direction[0], pos.y + direction[1]];
			if (depth[nextY][nextX] < minDepth) {
				minDepth = depth[nextY][nextX];
				bestDirection = direction;
			}
		}
		return bestDirection;
	}
	prepGreedyMove() {
		const possibleDirections: number[][][][] = [];
		const weights: {[directionId: string]: number}[][] = [];
		this.status.forEach((playerStatus, playerIndex) => {
			possibleDirections[playerIndex] = [];
			weights[playerIndex] = [];
			playerStatus.forEach((poke, pokeIndex) => {
				weights[playerIndex][pokeIndex] = {};
				if (poke.hp) {
					const directions = this.getPossibleDirections(poke.pos.x, poke.pos.y);
					possibleDirections[playerIndex][pokeIndex] = directions;
					if (directions.length) {
						directions.forEach(direction => weights[playerIndex][pokeIndex][direction.toString()] = 1 / directions.length);
					} else {
						weights[playerIndex][pokeIndex]['0,0'] = 1;
					}
				} else {
					possibleDirections[playerIndex][pokeIndex] = [];
				}
			});
		});
		this.status.forEach((playerStatus, playerIndex) => {
			const i = 1 - playerIndex;
			playerStatus.forEach(poke2 => {
				if (!poke2.hp) return;
				const poke2Types = Dex.species.get(poke2.set.species).types.map(typeId => Dex.types.get(typeId));
				const depth = this.breadthFirstSearch([poke2.pos.x, poke2.pos.y]);
				this.status[i].forEach((poke1, pokeIndex1) => {
					if (!poke1.hp || weights[i][pokeIndex1]['0,0']) return;
					const poke1Types = Dex.species.get(poke1.set.species).types.map(typeId => Dex.types.get(typeId));
					const directions = possibleDirections[i][pokeIndex1];
					const bestDirection = this.chooseDirection(poke1.pos, directions, depth);
					weights[i][pokeIndex1][bestDirection.toString()] += directions.length * this.calcDamage(poke1Types, poke2Types);
				});
			});
		});
		weights.forEach(playerWeights => playerWeights.forEach(pokeWeights => {
			if (!Object.keys(pokeWeights).length) return;
			let sum = 0;
			Object.values(pokeWeights).forEach(weight => sum += weight);
			for (let key in pokeWeights) {
				pokeWeights[key] /= sum;
			}
		}));
		this.status.forEach((playerStatus, playerIndex) => playerStatus.forEach((poke, pokeIndex) => {
			if (!poke.hp) return;
			const dStr = PetUtils.sample(weights[playerIndex][pokeIndex]);
			const direction = dStr.split(',').map(s => parseInt(s));
			poke.direction = (poke.pos.y % 2) ? (direction[0] > 0) : (direction[0] >= 0);
			poke.nextPos = {
				x: poke.pos.x + direction[0],
				y: poke.pos.y + direction[1]
			}
		}));
	}
	prepRandomMove() {
		this.status.forEach((playerStatus, playerIndex) => playerStatus.forEach((poke, pokeIndex) => {
			if (!poke.hp) return;
			const possibleDirections = this.getPossibleDirections(poke.pos.x, poke.pos.y);
			const direction = possibleDirections.length ? prng.sample(possibleDirections) : [0, 0];
			poke.direction = (poke.pos.y % 2) ? (direction[0] > 0) : (direction[0] >= 0);
			poke.nextPos = {
				x: poke.pos.x + direction[0],
				y: poke.pos.y + direction[1]
			}
		}));
	}
	prepMove() {
		switch (this.moveStyle) {
		case 'greedy':
			return this.prepGreedyMove();
		case 'random':
			return this.prepRandomMove();
		}
	}
	detectBattles() {
		const allPieces = this.status[0].concat(this.status[1]).filter(poke => poke.nextPos);
		allPieces.forEach((poke1, i) => allPieces.slice(0, i).forEach((poke2, j) => {
			if ((poke1.side !== poke2.side) && (
				(poke1.nextPos!.x === poke2.nextPos!.x && poke1.nextPos!.y === poke2.nextPos!.y) ||
				(poke1.nextPos!.x === poke2.pos!.x && poke1.nextPos!.y === poke2.pos!.y &&
				 poke1.pos!.x === poke2.nextPos!.x && poke1.pos!.y === poke2.nextPos!.y)
			)) {
				this.battles.push([poke2, poke1]);
			}
		}));
	}
	calcDamage(sourceTypes: TypeInfo[], targetTypes: TypeInfo[], sourceLattice: number = 0, targetLattice: number = 0): number {
		let damage = 0;
		sourceTypes.forEach(sourceType => {
			let partDamage = 1;
			targetTypes.forEach(targetType => {
				partDamage *= [1, 2, 0.5, 0][targetType.damageTaken[sourceType.name]];
			});
			damage += partDamage;
		});
		damage /= sourceTypes.length;
		switch (sourceLattice) {
		case 1: // Sunny Day
			sourceTypes.forEach(sourceType => {
				switch (sourceType.id) {
				case 'fire':
					damage *= 2;
					break;
				case 'water':
					damage *= 0.5;
					break;
				}
			});
			break;
		case 2: // Rain Dance
			sourceTypes.forEach(sourceType => {
				switch (sourceType.id) {
				case 'fire':
					damage *= 0.5;
					break;
				case 'water':
					damage *= 2;
					break;
				}
			});
			break;
		}
		switch (targetLattice) {
		case 3: // Sandstorm
			targetTypes.forEach(targetType => {
				switch (targetType.id) {
				case 'rock':
					damage *= 0.5;
				}
			});
			break;
		}
		return damage;
	}
	calcWeatherDamage(targetTypes: TypeInfo[], latticeNum: number = 0): number {
		switch (latticeNum) {
		case 3: // Sandstorm
			for (let targetType of targetTypes) {
				if (['rock', 'ground', 'steel'].includes(targetType.id)) {
					return 0;
				}
			}
			return 0.5;
		case 4: // Hail
			for (let targetType of targetTypes) {
				if (['ice'].includes(targetType.id)) {
					return 0;
				}
			}
			return 0.5;
		default:
			return 0;
		}
	}
	tryMove(pieces: pieceStatus[]): boolean {
		this.map.lattices.forEach((row, y) => row.forEach((num, x) => this.territory[y][x] = -1));
		for (let poke of pieces) {
			if (this.territory[poke.nextPos!.y][poke.nextPos!.x] < 0) {
				this.territory[poke.nextPos!.y][poke.nextPos!.x] = poke.side;
			} else if (this.territory[poke.pos.y][poke.pos.x] < 0) {
				this.territory[poke.pos.y][poke.pos.x] = poke.side;
			} else {
				return false;
			}
		}
		return true;
	}
	move() {
		this.battles.forEach(([poke1, poke2], battleIndex) => {
			const poke1Types = Dex.species.get(poke1.set.species).types.map(typeId => Dex.types.get(typeId));
			const poke2Types = Dex.species.get(poke2.set.species).types.map(typeId => Dex.types.get(typeId));
			const poke1Lattice = this.map.lattices[poke1.pos.y][poke1.pos.x] % LATTICE_TYPES.length;
			const poke2Lattice = this.map.lattices[poke2.pos.y][poke2.pos.x] % LATTICE_TYPES.length;
			poke1.hp -= this.calcDamage(poke2Types, poke1Types, poke2Lattice, poke1Lattice);
			poke2.hp -= this.calcDamage(poke1Types, poke2Types, poke1Lattice, poke2Lattice);
			if (poke1.hp <= 0) {
				poke1.hp = 0;
				delete poke1.nextPos;
			} else {
				poke2.nextPos = poke2.pos;
			}
			if (poke2.hp <= 0) {
				poke2.hp = 0;
				delete poke2.nextPos;
			} else {
				poke1.nextPos = poke1.pos;
			}
		});
		this.battles = [];

		let pieces = this.status[0].concat(this.status[1]);
		pieces.forEach(poke => {
			const pokeTypes = Dex.species.get(poke.set.species).types.map(typeId => Dex.types.get(typeId));
			poke.hp -= this.calcWeatherDamage(pokeTypes, this.map.lattices[poke.pos.y][poke.pos.x] % LATTICE_TYPES.length);
			if (poke.hp <= 0) {
				poke.hp = 0;
				delete poke.nextPos;
			}
		});

		pieces = this.status[0].concat(this.status[1]).filter(poke => !!poke.nextPos);
		prng.shuffle(pieces);
		let canMove = false;
		for (let i = 0; i < pieces.length; i++) {
			if (this.tryMove(pieces)) {
				canMove = true;
				break;
			} else {
				pieces = pieces.slice(1).concat(pieces.slice(0, 1));
			}
		}
		this.map.lattices.forEach((row, y) => row.forEach((num, x) => this.territory[y][x] = -1));
		if (canMove) {
			pieces.forEach(poke => {
				if (this.territory[poke.nextPos!.y][poke.nextPos!.x] < 0) {
					poke.pos = poke.nextPos!;
				}
				this.territory[poke.pos.y][poke.pos.x] = poke.side;
				delete poke.nextPos;
			});
		} else {
			pieces.forEach(poke => {
				this.territory[poke.pos.y][poke.pos.x] = poke.side;
				delete poke.nextPos;
			});
		}
	}
	async nextTurn() {
		const start = Date.now();
		this.turns++;
		const p1clear = this.status[0].every(x => !x.hp);
		const p2clear = this.status[1].every(x => !x.hp);
		this.winner = (this.turns >= MAX_TURNS) ? 2 : (p1clear ? (p2clear ? 2 : 1) : (p2clear ? 0 : -1));
		this.move();
		this.display();
		this.prepMove();
		this.detectBattles();
		if (this.winner >= 0) {
			setTimeout(() => { this.destroy(); }, DESTROY_DELAY);
		} else {
			setTimeout(() => { this.display(); }, HALF_CYCLE);
			const delta = Date.now() - start;
			if (delta < TURN_CYCLE) {
				setTimeout(() => { this.nextTurn(); }, TURN_CYCLE - delta);
			} else {
				this.nextTurn();
			}
		}
	}
	destroy() {
		Array.from(this.spectatorIds).forEach(userId => this.removeSpectator(userId));
		delete autoChessGames[this.gameId];
	}
}

const autoChessGames: {[gameid: string]: AutoChess} = {};
const userInGames: {[userid: string]: string} = {};

function checkIfUserIsAvailable(user: User, reportTo: User, asPlayer: boolean = true): boolean {
	if (userInGames[user.id]) {
		const isPlayer = autoChessGames[userInGames[user.id]].hasPlayer(user.id);
		const roomId = userInGames[user.id].split('-')[0];
		const roomTitle = Rooms.get(roomId)!.title;
		let buf = '';
		if (user.id === reportTo.id) {
			buf += `您正在 <a href="/${roomId}">${roomTitle}</a> 房间${isPlayer ? '参与' : '观看'}一场自走棋游戏。<br/>`;
			buf += `请退出或等待游戏结束后再${asPlayer ? '开始' : '观看'}新的自走棋游戏。`;
		} else {
			buf += `用户 ${user.name} 正在${isPlayer ? '参与' : '观看'}一场自走棋游戏。<br/>`;
		}
		PetUtils.popup(reportTo, buf);
		return false;
	}
	return true;
} 

class AutoChessMapConfig {
	public roomId: string;
	public mapId: string;
	private configPath: string;
	public lattices: number[][];

	constructor(roomId: string) {
		this.roomId = roomId;
		this.configPath = `${MAP_CONFIG_FOLDER}/${roomId}.json`;
		const configStr = FS(this.configPath).readIfExistsSync() || FS(DEFAULT_CONFIG_PATH).readIfExistsSync();
		this.lattices = configStr ? JSON.parse(configStr) : new Array(MAP_ROWS).fill(0).map(row => new Array(MAP_COLS).fill(-1));
		this.mapId = this.calcMapId();
	}

	async save() {
		if (this.valid() && await this.render()) {
			FS(this.configPath).writeSync(JSON.stringify(this.lattices));
			mapConfigs[this.roomId] = this;
			return true;
		} else {
			return false;
		}
	}

	async render() {
		try {
			const sharp = require('sharp');
			this.mapId = this.calcMapId();
			const mapImgPath = `${LATTICE_IMG_FOLDER_LOCAL}/${this.mapId}.png`;
			if (FS(mapImgPath).existsSync()) return true;
			const latticeImgs: number[][] = [];
			for (let latticeType of LATTICE_TYPES) {
				const imgBuffer = await sharp(`${LATTICE_IMG_FOLDER_LOCAL}/${toID(latticeType)}.png`).raw().toBuffer();
				const imgData = imgBuffer.toJSON().data;
				// grayscale(50%)
				for (let i = 0; i < imgData.length; i += 4) {
					const r = imgData[i + 0];
					const g = imgData[i + 1];
					const b = imgData[i + 2];
					const brightness = (r + g + b) / 3;
					imgData[i + 0] = Math.round((r + brightness) / 2);
					imgData[i + 1] = Math.round((g + brightness) / 2);
					imgData[i + 2] = Math.round((b + brightness) / 2);
				}
				latticeImgs.push(imgData);
			}
			const pixelArr: number[] = new Array(4 * MAP_WIDTH * MAP_HEIGHT).fill(0);
			const latticeRowLength = LATTICE_WIDTH * 4;
			const mapRowLength = MAP_WIDTH * 4;
			this.lattices.forEach((row, rowIndex) => row.forEach((num, colIndex) => {
				if (num < 0) return;
				const latticeType = num % LATTICE_TYPES.length;
				const left = Math.round(LATTICE_WIDTH * (colIndex + 0.5 * (rowIndex % 2)));
				const top = Math.round(LATTICE_HEIGHT * 0.75 * rowIndex);
				const shift = (top - 1) * mapRowLength + left * 4;
				for (let i = 0, irs = 0, ors = shift; i < LATTICE_HEIGHT; i++, irs += latticeRowLength, ors += mapRowLength) {
					for (let j = 0, ips = irs, ops = ors; j < LATTICE_WIDTH; j++, ips += 4, ops += 4) {
						const iAlpha = latticeImgs[latticeType][ips + 3] / 255;
						if (iAlpha > 0) {
							const oAlpha = pixelArr[ops + 3] / 255;
							pixelArr[ops + 0] = iAlpha * latticeImgs[latticeType][ips + 0] + oAlpha * pixelArr[ops + 0];
							pixelArr[ops + 1] = iAlpha * latticeImgs[latticeType][ips + 1] + oAlpha * pixelArr[ops + 1];
							pixelArr[ops + 2] = iAlpha * latticeImgs[latticeType][ips + 2] + oAlpha * pixelArr[ops + 2];
							pixelArr[ops + 3] = latticeImgs[latticeType][ips + 3] + pixelArr[ops + 3];
						}
					}
				}
			}));
			await sharp(Uint8Array.from(pixelArr), {raw: {width: MAP_WIDTH, height: MAP_HEIGHT, channels: 4}})
			.resize(MAP_WIDTH, MAP_HEIGHT).toFormat("png").toFile(mapImgPath);
			return true;
		} catch (err) {
			return false;
		}
	}

	calcMapId() {
		return '.' + Math.abs(PetUtils.hash(this.lattices.map(row => row.join('')).join(''))).toString(36).toUpperCase();
	}

	valid() {
		const pieceCount = new Array(PIECE_TYPES.length).fill(0);
		this.lattices.forEach(row => row.filter(num => num >= 0).forEach(num => {
			pieceCount[Math.floor(num / LATTICE_TYPES.length)]++;
		}));
		return pieceCount.shift() > 0 && pieceCount.every(x => x === 1);
	}

	getSize() {
		let width = 0;
		let height = 0;
		this.lattices.forEach((row, rowIndex) => {
			let lastIndex;
			for (lastIndex = row.length - 1; row[lastIndex] < 0; lastIndex--);
			if (lastIndex >= 0) {
				const rowWidth = LATTICE_WIDTH * (lastIndex + 1 + 0.5 * (rowIndex % 2));
				width = Math.max(width, rowWidth);
				height = LATTICE_HEIGHT * (1 + 0.75 * rowIndex);
			}
		});
		width = Math.max(width, 80 + 40 * 6);
		return [width, height];
	}

	setLattice(targetLatticeNum: number, targetPieceNum: number, targetRow: number, targetCol: number): boolean {
		const targetNum = targetPieceNum * LATTICE_TYPES.length + targetLatticeNum;
		const maxNum = LATTICE_TYPES.length * PIECE_TYPES.length;
		if (targetRow >= 0 && targetRow < MAP_ROWS && targetCol >= 0 && targetCol < MAP_COLS && targetNum < maxNum) {
			if (targetPieceNum > 0) {
				this.lattices.forEach((row, rowIndex) => row.forEach((num, colIndex) => {
					if (Math.floor(num / LATTICE_TYPES.length) === targetPieceNum) {
						this.lattices[rowIndex][colIndex] %= LATTICE_TYPES.length;
					}
				}));
			}
			this.lattices[targetRow][targetCol] = targetNum;
			return true;
		} else {
			return false;
		}
	}

	showConfig(tag: (num: number, rowIndex: number, colIndex: number, style: string) => string, background: boolean = false) {
		let latticeConfigStr = background ? this.showImg() : '';
		latticeConfigStr += this.lattices.map((row, rowIndex) => row.map((num, colIndex) => {
			const styles = [
				`position: absolute`,
				`width: ${LATTICE_WIDTH}px`,
				`height: ${LATTICE_HEIGHT}px`,
				`top: ${Math.round(LATTICE_HEIGHT * 0.75 * rowIndex)}px`,
				`left: ${Math.round(LATTICE_WIDTH * (colIndex + 0.5 * (rowIndex % 2)))}px`,
				`border: none`,
				`box-shadow: none`
			];
			if (num < 0) styles.push('opacity: 0');
			const latticeId = toID(LATTICE_TYPES[num % LATTICE_TYPES.length]);
			styles.push(`background: url(${LATTICE_IMG_FOLDER_URL}/${latticeId}.png)`);
			return tag(num, rowIndex, colIndex, styles.join('; '));
		}).join('')).join('');
		return `<div style="height: ${MAP_HEIGHT}px; position: relative">${latticeConfigStr}</div>`;
	}

	showImg() {
		return `<img src="${LATTICE_IMG_FOLDER_URL}/${this.mapId}.png" style="position: absolute"/>`;
	}
}

new AutoChessMapConfig('default').render();
const mapConfigs: {[roomid: string]: AutoChessMapConfig} = {};
const tmpConfigs: {[userid: string]: AutoChessMapConfig} = {};

const autoChessChallenges: {[userid: string]: {roomid: string, foeid: string}} = {};

export const commands: Chat.ChatCommands = {
	'ac': 'autochess',
	autochess: {
		'': 'help',
		help(target, room, user) {
			if (!room) return this.parse('/msgroom skypillar, /autochess help');
			let buf = '<b>欢迎体验 PS China 宝可梦自走棋!</b><br/>';
			buf += PetUtils.button('/autochess map', '查看地图');
			if (user.can('roommod', null, room)) {
				buf += ' ' + PetUtils.button('/autochess map edit', '编辑地图');
			}
			buf += '<br/>';
			buf += `请输入您想要挑战的用户:`;
			buf += `<form data-submitsend="/msgroom ${room.roomid}, /autochess challenge create {autochess-foe}">`;
			buf += `<input name="autochess-foe" style="width: 100px"/> `;
			buf += `<button class="button" type="submit">发送挑战!</button>`;
			buf += `</form>`;
			this.sendReply(`|uhtml|auto-chess|${buf}`);
		},
		challenge: {
			create(target, room, user) {
				this.sendReply(`|uhtmlchange|auto-chess|`);
				if (!room) return PetUtils.popup(user, '请在聊天室里发送自走棋挑战');
				if (room.type !== 'chat') return PetUtils.popup(user, '请在聊天室里发送自走棋挑战');
				if (autoChessChallenges[user.id]) {
					return PetUtils.popup(user, `请勿重复发出自走棋挑战! ${PetUtils.button('/autochess challenge cancel', '取消挑战')}`);
				}
				const foe = Users.get(target);
				if (!foe) return PetUtils.popup(user, `未找到用户 ${target}`);
				if (foe.id === user.id) return PetUtils.popup(user, `您不能向自己发出自走棋挑战!`);
				if (!getPetUser(user.id).property) return PetUtils.popup(user, '您的宠物存档为空!');
				if (!getPetUser(foe.id).property) return PetUtils.popup(user, `用户 ${foe.name} 的宠物存档为空!`);
				if (!checkIfUserIsAvailable(user, user)) return;
				if (!checkIfUserIsAvailable(foe, user)) return;
				autoChessChallenges[user.id] = {roomid: room.roomid, foeid: foe.id};
				const style = [
					'background: #fcd2b3',
					'border: 1px solid #f57b21',
					'color: #682f05',
					'text-align: center'
				].join('; ');
				let buf = `<p><b>${user.name} 向您发出了自走棋挑战!</b></p>`;
				buf += `<p>(聊天室: <a href="/${room.roomid}">${room.title}</a>)</p>`
				buf += '<p>';
				buf += PetUtils.button(`/autochess challenge accept ${user.id}`, '接受');
				buf += PetUtils.button(`/autochess challenge reject ${user.id}`, '拒绝');
				buf += '</p>';
				foe.send(`|pm|${user.id}|${foe.id}|/uhtml auto-chess-chat, <div style="${style}">${buf}</div>`);
				buf = `<p><b>您已向 ${foe.name} 发出自走棋挑战!</b></p>`;
				buf += '<p>';
				buf += PetUtils.button('/autochess challenge cancel', '取消');
				buf += '</p>';
				user.send(`|pm|${foe.id}|${user.id}|/uhtml auto-chess-chat, <div style="${style}">${buf}</div>`);
			},
			cancel(target, room, user) {
				if (autoChessChallenges[user.id]) {
					const foeId = autoChessChallenges[user.id].foeid;
					Users.get(foeId)?.send(`|pm|${user.id}|${foeId}|/uhtml auto-chess-chat`);
					user.send(`|pm|${foeId}|${user.id}|/uhtml auto-chess-chat`);
					delete autoChessChallenges[user.id];
				}
			},
			accept(target, room, user) {
				target = toID(target);
				if (autoChessChallenges[target] && autoChessChallenges[target].foeid === user.id) {
					user.send(`|pm|${target}|${user.id}|/uhtml auto-chess-chat`);
					const foe = Users.get(target);
					if (!foe) return PetUtils.popup(user, `未找到用户 ${target}`);
					foe.send(`|pm|${user.id}|${target}|/uhtml auto-chess-chat`);
					const petUser = getPetUser(user.id);
					if (!petUser.property) return PetUtils.popup(user, '您的宠物存档为空!');
					const userTeam = petUser.getTeam();
					if (!userTeam) return PetUtils.popup(user, '您的宠物存档格式错误!');
					const petFoe = getPetUser(foe.id);
					if (!petFoe.property) return PetUtils.popup(user, `用户 ${foe.name} 的宠物存档为空!`);
					const foeTeam = petFoe.getTeam();
					if (!foeTeam) return PetUtils.popup(user, `用户 ${foe.name} 的宠物存档格式错误!`);
					if (!checkIfUserIsAvailable(user, user)) return;
					if (!checkIfUserIsAvailable(foe, user)) return;
					const roomId = autoChessChallenges[target].roomid;
					const gameId = `${roomId}-${user.id}-${foe.id}-${Date.now()}`;
					const playerIds = [foe.id, user.id];
					const playerTeams = [foeTeam, userTeam];
					autoChessGames[gameId] = new AutoChess(roomId, gameId, playerIds, playerTeams);
					delete autoChessChallenges[target];
					this.parse(`/j ${roomId}`);
				}
			},
			reject(target, room, user) {
				target = toID(target);
				if (autoChessChallenges[target] && autoChessChallenges[target].foeid === user.id) {
					Users.get(target)?.send(`|pm|${user.id}|${target}|/uhtml auto-chess-chat`);
					user.send(`|pm|${target}|${user.id}|/uhtml auto-chess-chat`);
					delete autoChessChallenges[target];
				}
			}
		},
		'spec': 'watch',
		watch(target, room, user) {
			if (!autoChessGames[target]) return PetUtils.popup(user, '您要加入的自走棋游戏不存在或已结束。');
			if (!checkIfUserIsAvailable(user, user, false)) return;
			autoChessGames[target].addSpectator(user.id);
			this.parse(`/j ${target.split('-')[0]}`);
		},
		'exit': 'quit',
		'leave': 'quit',
		quit(target, room, user) {
			if (userInGames[user.id] === target) {
				autoChessGames[userInGames[user.id]].removeSpectator(user.id);
			}
			this.sendReply(`|uhtmlchange|auto-chess-game|`);
		},
		'config': 'map',
		map: {
			'': 'show',
			show(target, room, user) {
				if (!room) return PetUtils.popup(user, '请在聊天室里查看自走棋地图。');
				if (room.type !== 'chat') return PetUtils.popup(user, '请在聊天室里查看自走棋地图。');
				if (!mapConfigs[room.roomid]) {
					mapConfigs[room.roomid] = new AutoChessMapConfig(room.roomid);
				}
				let buf = '|uhtml|auto-chess-map|';
				buf += mapConfigs[room.roomid].showConfig((num, rowIndex, colIndex, style) => {
					const latticeNum = num % LATTICE_TYPES.length;
					const pieceNum = (num - latticeNum) / LATTICE_TYPES.length;
					return pieceNum ? PetUtils.button('', PIECE_TYPES[pieceNum], style) : '';
				}, true);
				buf += PetUtils.button('/autochess map cancel', '返回');
				this.sendReply(buf);
			},
			edit(target, room, user) {
				if (!room) return PetUtils.popup(user, '请在聊天室里编辑自走棋地图。');
				if (room.type !== 'chat') return PetUtils.popup(user, '请在聊天室里编辑自走棋地图。');
				this.checkCan('roommod', null, room!);
				if (tmpConfigs[user.id]?.roomId !== room.roomid) {
					delete tmpConfigs[user.id];
				}
				const tmpConfig = tmpConfigs[user.id] || mapConfigs[room.roomid] || new AutoChessMapConfig(room.roomid);
				tmpConfigs[user.id] = tmpConfig;
				let [targetNum, targetRow, targetCol] = target.split(',').map(x => parseInt(x));
				if (isNaN(targetNum)) targetNum = -1;
				const targetLatticeNum = targetNum % LATTICE_TYPES.length;
				let targetPieceNum = (targetNum - targetLatticeNum) / LATTICE_TYPES.length;
				if (tmpConfig.setLattice(targetLatticeNum, targetPieceNum, targetRow, targetCol) && targetPieceNum > 0) {
					targetPieceNum = targetPieceNum % (PIECE_TYPES.length - 1) + 1;
					targetNum = targetPieceNum * LATTICE_TYPES.length + targetLatticeNum;
				}
				let buf = '|uhtml|auto-chess-map|';
				buf += '<p><b>Field</b></p>';
				buf += PetUtils.conditionalButton(targetNum < 0, '/autochess map edit -1', 'Null');
				buf += LATTICE_TYPES.map((l, i) => {
					return PetUtils.conditionalButton(targetNum === i, `/autochess map edit ${i}`, l);
				}).join('');
				buf += '<p><b>Pokemon</b></p>';
				buf += PIECE_TYPES.map((p, i) => {
					return PetUtils.conditionalButton(targetPieceNum === i, `/autochess map edit ${i * LATTICE_TYPES.length}`, p);
				}).slice(1).join('');
				buf += tmpConfig.showConfig((num, rowIndex, colIndex, style) => {
					const latticeNum = num % LATTICE_TYPES.length;
					const pieceNum = (num - latticeNum) / LATTICE_TYPES.length;
					if (num < 0 && (targetLatticeNum < 0 || targetPieceNum > 0)) return '';
					const desc = pieceNum ? PIECE_TYPES[pieceNum] : '';
					const buttonNum = (num >= 0 && targetPieceNum > 0) ? targetNum - targetLatticeNum + latticeNum : targetNum;
					const command = `/autochess map edit ${buttonNum},${rowIndex},${colIndex}`;
					return PetUtils.button(command, desc, style);
				});
				buf += PetUtils.boolButtons('/autochess map save', '/autochess map cancel');
				this.sendReply(buf);
			},
			'confirm': 'save',
			async save(target, room, user) {
				const tmpConfig = tmpConfigs[user.id];
				if (!tmpConfig || tmpConfig.roomId !== room?.roomid) {
					return PetUtils.popup(user, '未检测到您编辑的地图设置');
				}
				PetUtils.popup(user, '地图设置保存中...');
				if (await tmpConfig.save()) {
					PetUtils.popup(user, '地图设置保存成功!');
					this.parse('/autochess map cancel');
				} else {
					PetUtils.popup(user, '地图设置不合法!');
				}
			},
			'back': 'cancel',
			cancel(target, room, user) {
				delete tmpConfigs[user.id];
				this.sendReply('|uhtmlchange|auto-chess-map|');
			}
		}
	}
}