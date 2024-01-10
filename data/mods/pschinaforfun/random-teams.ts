import {RandomTeams} from '../../random-teams';
import {FS} from '../../../lib';

export class RandomPSChinaForFunTeams extends RandomTeams {
	randomDurantsTeam() {
		const team = [];
		const sampled_names: Set<String> = new Set();
		let names = FS('config/ps-china/durant-names.txt').readSync('utf8').split(',');
		const species = this.dex.species.get('Durant');
		while (team.length < 6) {
			let next_name = this.sample(names);
			while (next_name in sampled_names) {
				next_name = this.sample(names);
			}
			const set = {
				name: next_name,
				species: species.name,
				gender: species.gender,
				item: this.random(2) < 1 ? 'Choice Scarf' : 'Leppa Berry',
				ability: 'Hustle',
				shiny: false,
				evs: {hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252},
				nature: 'Jolly',
				ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
				moves: ['Guillotine'],
			};
			if (this.random(4) < 1) {
				set.moves.push('Spite');
			} else if (this.random(6) < 1) {
				set.ability = 'Cursed Body';
			} else if (this.random(8) < 1) {
				set.moves.push('Superpower');
			} else if (this.random(10) < 1) {
				set.moves.push('Foresight');
				set.item = 'Bright Powder'
			} else if (this.random(12) < 1) {
				set.item = 'Focus Sash';
			} else if (this.random(14) < 1) {
				set.moves.push('Assist');
				set.ability = ('Prankster');
			} else if (this.random(16) < 1) {
				set.moves.push('Dynamic Punch');
			} else if (this.random(18) < 1) {
				set.item = 'Leppa Berry';
				set.moves.push('Imprison');
			}
			team.push(set);
		}
		team[0].shiny = true;
		if (this.random(4) < 1) {
			team[0].moves.push('Inferno');
			team[0].ability = 'Truant';
		} else {
			team[0].item = 'Watmel Berry';
			team[0].moves.push('Natural Gift');
		}
		return team;
	}
	randomMetronomeTeam() {
		let team = this.randomCCTeam();
		for (let pokemon of team) {
			pokemon.moves = ['Metronome'];
		}
		return team;
	}
	randomKOFTeam() {
		const team = [];
		const sampled_names: Set<String> = new Set();
		let names = FS('config/ps-china/kof-names.txt').readSync('utf8').split(',');
		const species = this.dex.species.get('Hitmonchan');
		while (team.length < 6) {
			let next_name = this.sample(names);
			while (next_name in sampled_names) {
				next_name = this.sample(names);
			}
			const set = {
				name: next_name,
				species: species.name,
				gender: species.gender,
				item: 'Ring Target',
				ability: 'Shadow Tag',
				shiny: false,
				evs: {hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252},
				nature: 'Jolly',
				ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
				moves: ['Mach Punch', 'Focus Punch', 'Upper Hand'],
			};
			team.push(set);
		}
		return team;
	}
}

export default RandomPSChinaForFunTeams;