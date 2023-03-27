import { FS } from "../../../lib";
import { Teams, Pokemon } from "../../../sim";




export const Rulesets: { [k: string]: ModdedFormatData } = {
	
	infinitefusion:{
		inherit:true,
		onValidateTeam(team) {
			const names = new Set<ID>();
			for (const set of team) {
				const name = set.name;
				const species = this.dex.species.get(set.species).name;
				if (names.has(this.dex.toID(name))) {
					return [
						`You have more than one ${name}`,
					];
				}
				if (names.has(this.dex.toID(species))) {
					return [
						`You have more than one ${species}`,
					];
				}
				names.add(this.dex.toID(name));
				if (species !== name) names.add(this.dex.toID(species));
				// Nihilslave: if the pokemon is a special fusion, change it here
				// @ts-ignore
				if (set.fusionSpecies) set.name = set.species = set.fusionSpecies.name;
			}
		},
		checkCanLearn(move, species, lsetData, set) {
			// @ts-ignore
			if (set.fusionSpecies) return this.checkCanLearn(move, set.fusionSpecies, lsetData, set);
			const headSpecies = this.dex.species.get(set.name);
			if (!headSpecies.exists) return this.checkCanLearn(move, species, lsetData, set);
			const problem = this.checkCanLearn(move, species, lsetData, set);
			if (!problem) return null;
			if (this.checkCanLearn(move, headSpecies, lsetData, set)) return problem;
			return null;
		},
		validateSet(set, teamHas) {
			const headSpecies = this.dex.species.get(set.name);
			const bodySpecies = this.dex.species.get(set.species);
			let problems = this.dex.formats.get('Obtainable Misc').onChangeSet?.call(this, set, this.format) || null;
			if (Array.isArray(problems) && problems.length) return problems;
			const nonstandard = ['CAP', 'Custom'];
			if (headSpecies.isNonstandard && nonstandard.includes(headSpecies.isNonstandard)) {
				return [`${headSpecies.name} does not exist`];
			}
			if (this.ruleTable.isBannedSpecies(headSpecies)) {
				return [`${headSpecies.name} is banned`];
			}
			if (!headSpecies.exists) return this.validateSet(set, teamHas);
			const check = this.checkSpecies(set, bodySpecies, bodySpecies, {});
			if (check) return [check];
			if (headSpecies.baseSpecies !== headSpecies.name) {
				return [`${headSpecies.name} is not in base forme`];
			}
			if (bodySpecies.baseSpecies !== bodySpecies.name) {
				return [`${bodySpecies.name} is not in base forme`];
			}
			let fusionSpecies: {
				species?: Species,
				abilities: string[],
			} = { abilities: [] };
			if (headSpecies.name === bodySpecies.name) {
				if (this.ruleTable.isRestrictedSpecies(headSpecies)) {
					return [`${headSpecies.name} is banned from self-fusion`];
				}
				const specialSelfFusions: {[key: string]: string} = {
					deoxys: 'Deoxys-Attack',
					rotom: 'Rotom-Heat',
					shaymin: 'Shaymin-Sky',
					// darmanitan: 'Darmanitan-Zen',
					keldeo: 'Keldeo-Resolute',
					meloetta: 'Meloetta-Pirouette',
					greninja: 'Greninja-Ash',
					floette: 'Floette-Eternal',
					zygarde: 'Zygarde-Complete',
					hoopa: 'Hoopa-Unbound',
					lycanroc: 'Lycanroc-Dusk',
					wishiwashi: 'Wishiwashi-School',
					necrozma: 'Necrozma-Ultra',
					// cramorant: 'Cramorant-Gorging',
					eternatus: 'Eternatus-Eternamax',
					palafin: 'Palafin-Hero',
				};
				if (headSpecies.id in specialSelfFusions) {
					fusionSpecies.species = this.dex.species.get(specialSelfFusions[headSpecies.id]);
				} else if (headSpecies.otherFormes) {
					for (const forme of headSpecies.otherFormes) {
						if (forme.endsWith('-Mega') || forme.endsWith('-Mega-Y') ||
							forme.endsWith('-Primal') ||
							forme.endsWith('-Origin') ||
							forme.endsWith('-Therian') ||
							forme.endsWith('-Starter') ||
							forme.endsWith('-Crowned')
						) fusionSpecies.species = this.dex.species.get(forme);
					}
				} else {
					fusionSpecies.species = this.dex.deepClone(headSpecies);
				}
			} else {
				const pair = [headSpecies.name, bodySpecies.name].sort();
				if (pair[0] === 'Kyurem' && pair[1] === 'Reshiram') fusionSpecies.species = this.dex.species.get('Kyurem-White');
				if (pair[0] === 'Kyurem' && pair[1] === 'Zekrom') fusionSpecies.species = this.dex.species.get('Kyurem-Black');
				if (pair[0] === 'Necrozma' && pair[1] === 'Solgaleo') fusionSpecies.species = this.dex.species.get('Necrozma-Dusk-Mane');
				if (pair[0] === 'Lunala' && pair[1] === 'Necrozma') fusionSpecies.species = this.dex.species.get('Necrozma-Dawn-Wings');
				if (pair[0] === 'Calyrex' && pair[1] === 'Glastrier') fusionSpecies.species = this.dex.species.get('Calyrex-Ice');
				if (pair[0] === 'Calyrex' && pair[1] === 'Spectrier') fusionSpecies.species = this.dex.species.get('Calyrex-Shadow');
				if (pair[0] === 'Arrokuda' && pair[1] === 'Cramorant') fusionSpecies.species = this.dex.species.get('Cramorant-Gulping');
				if (pair[0] === 'Cramorant' && pair[1] === 'Pikachu') fusionSpecies.species = this.dex.species.get('Cramorant-Gorging');
			}
			if (fusionSpecies.species) {
				fusionSpecies.abilities = Object.values(fusionSpecies.species!.abilities);
				for (const abil of fusionSpecies.abilities) {
					if (this.ruleTable.isBanned(`ability:${this.toID(abil)}`)) {
						return [`${bodySpecies.name}'s ability ${abil} is banned`];
					}
				}
				// @ts-ignore
				set.fusionSpecies = fusionSpecies.species;
			} else {
				fusionSpecies.abilities = [
					headSpecies.abilities[0],
					bodySpecies.abilities[1] || bodySpecies.abilities[0],
					headSpecies.abilities['H'] || '',
					headSpecies.abilities['S'] || '',
				];
			}
			const ability = this.dex.abilities.get(set.ability);
			if (!fusionSpecies.abilities.includes(ability.name)) {
				return [`${bodySpecies.name} can't have ${ability.name}`];
			}
			const item = this.dex.items.get(set.item);
			const NonexistentItems = ['blueorb', 'redorb', 'adamantcrystal', 'lustrousglobe', 'griseouscore', 'rustedshield', 'rustedsword'];
			if (item.megaStone || item.zMove || NonexistentItems.includes(item.id)) {
				return [`${bodySpecies.name}'s item ${item.name} doesn't exist in Infinite Fusion`];
			}

			set.ability = bodySpecies.abilities[0];
			problems = this.validateSet(set, teamHas);
			set.ability = ability.name;
			return problems;
		},
		onModifySpecies(species, target, source, effect) {
			if (!target) return; // chat
			if (effect && ['imposter', 'transform'].includes(effect.id)) return;
			// onModifySpecies can be called before onBegin, which is quite stupid
			let headSpecies = target.m.headSpecies ? target.m.headSpecies : this.dex.species.get(target.set.name);
			let bodySpecies = target.m.bodySpecies ? target.m.bodySpecies : this.dex.species.get(target.set.species);
			if (!headSpecies?.exists || !bodySpecies?.exists) return;
			// Nihilslave: should let non-base formes to merge, don't check it here
			const toModifySpeciesID = this.dex.species.get(species.baseSpecies).id;
			const headBaseSpeciesID = this.dex.species.get(headSpecies.baseSpecies).id;
			const bodyBaseSpeciesID = this.dex.species.get(bodySpecies.baseSpecies).id;
			if (toModifySpeciesID === headBaseSpeciesID) target.m.headSpecies = headSpecies = species;
			if (toModifySpeciesID === bodyBaseSpeciesID) target.m.bodySpecies = bodySpecies = species;
			// special fusion
			if (headSpecies.name === bodySpecies.name) {
				return this.dex.species.get(headSpecies.name);
			}

			const fusionSpecies = this.dex.deepClone(species);
			fusionSpecies.weightkg = Math.max(0.1, (headSpecies.weightkg + bodySpecies.weightkg) / 2).toFixed(1);
			fusionSpecies.weighthg = Math.max(1, (headSpecies.weighthg + bodySpecies.weighthg) / 2).toFixed(1);
			fusionSpecies.nfe = headSpecies.nfe || bodySpecies.nfe;
			// fusionSpecies.evos
			// fusionSpecies.eggGroups
			fusionSpecies.abilities = {
				0: headSpecies.abilities[0],
				1: bodySpecies.abilities[1] || bodySpecies.abilities[0],
				H: headSpecies.abilities['H'],
				S: headSpecies.abilities['S'],
			};
			if (fusionSpecies.abilities['H'] === fusionSpecies.abilities[1] ||
				fusionSpecies.abilities['H'] === fusionSpecies.abilities[0]) delete fusionSpecies.abilities['H'];
			if (fusionSpecies.abilities[1] === fusionSpecies.abilities[0]) delete fusionSpecies.abilities[1];
			fusionSpecies.bst = 0;
			if (this.dex.abilities.get(target.set.ability).id === 'wonderguard') fusionSpecies.maxHP = 1;
			let i: StatID;
			for (i in species.baseStats) {
				let headStat, bodyStat;
				if (['hp', 'spa', 'spd'].includes(i)) {
					headStat = headSpecies.baseStats[i] * 2;
					bodyStat = bodySpecies.baseStats[i];
				} else {
					headStat = headSpecies.baseStats[i];
					bodyStat = bodySpecies.baseStats[i] * 2;
				}
				fusionSpecies.baseStats[i] = this.clampIntRange(Math.floor((headStat + bodyStat) / 3), 1, 255);
				fusionSpecies.bst += fusionSpecies.baseStats[i];
			}
			fusionSpecies.types[0] = headSpecies.types[0];
			fusionSpecies.types[1] = bodySpecies.types[1] || bodySpecies.types[0];
			if (fusionSpecies.types[1] === fusionSpecies.types[0]) fusionSpecies.types = [fusionSpecies.types[0]];

			return fusionSpecies;
		},
		onSwitchIn(pokemon) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			if (baseSpecies.includes('Arceus')) pokemon.addVolatile('arceus');
			if (baseSpecies.includes('Silvally')) pokemon.addVolatile('silvally');
		},
		// todo: consider this
		// onType(types, pokemon) {
		// 	const headSpecies = pokemon.m.headSpecies?.baseSpecies;
		// 	if (headSpecies === 'Arceus' && pokemon.ability === 'multitype') {
		// 		let arcType = pokemon.getItem().onPlate;
		// 		if (!arcType) arcType = 'Normal';

		// 	}
		// },
		onBegin() {
			//const species=this.dex.species.all().filter(x=>x.tier!=='Unreleased'&&x.tier!=='Illegal'&&x.tier!=='CAP'&&x.tier!=='CAP NFE'&&x.tier!=='CAP LC'&&x.tier!=='LC'&&x.tier!=='NFE')
			for (let pokemon of this.getAllPokemon()) {
				// prevent rayquaza from mega evolving
				// pokemon.set.name=this.sample(species).name;
				// pokemon=new Pokemon(pokemon.set,pokemon.side);
				if (pokemon.species.id === 'rayquaza') {
					pokemon.canMegaEvo = null;
				}
				
				if (!pokemon.m.headSpecies || !pokemon.m.bodySpecies) {
					const headSpecies = this.dex.species.get(pokemon.set.name);
					const bodySpecies = this.dex.species.get(pokemon.set.species);
					if (headSpecies.exists) pokemon.m.headSpecies = headSpecies;
					if (bodySpecies.exists) pokemon.m.bodySpecies = bodySpecies;
				}
				// send headSpecies to client
				pokemon.getDetails = () => {
					const health = pokemon.getHealth();
					let details = pokemon.details;
					if (pokemon.m.headSpecies) details += `, headname:${pokemon.m.headSpecies.name}`;
					if (pokemon.illusion) {
						let illusionDetails = pokemon.illusion.species.name + (pokemon.level === 100 ? '' : ', L' + pokemon.level) +
							(pokemon.illusion.gender === '' ? '' : ', ' + pokemon.illusion.gender) + (pokemon.illusion.set.shiny ? ', shiny' : '');
						if (pokemon.illusion.m.headSpecies) illusionDetails += `, headname:${pokemon.illusion.m.headSpecies.name}`;
						details = illusionDetails;
					}
					if (pokemon.terastallized) details += `, tera:${pokemon.terastallized}`;
					this.debug(details);
					return {side: health.side, secret: `${details}|${health.secret}`, shared: `${details}|${health.shared}`};
				};
			}
		},
	}

};
