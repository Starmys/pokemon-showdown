export const Moves: {[k: string]: ModdedMoveData} = {
	aurawheel: {
		inherit: true,
		onTry(source) {
			const baseSpecies = [source.m.headSpecies?.baseSpecies, source.m.bodySpecies?.baseSpecies];
			if (baseSpecies.includes('Morpeko')) {
				return;
			}
			this.attrLastMove('[still]');
			this.add('-fail', source, 'move: Aura Wheel');
			this.hint("Only a Pokemon whose form is Morpeko or Morpeko-Hangry can use this move.");
			return null;
		},
		onModifyType(move, pokemon) {
			const names = [pokemon.m.headSpecies?.name, pokemon.m.bodySpecies?.name];
			if (names.includes('Morpeko-Hangry')) {
				move.type = 'Dark';
			} else {
				move.type = 'Electric';
			}
		},
	},
	darkvoid: {
		inherit: true,
		onTry(source, target, move) {
			const names = [source.m.headSpecies?.name, source.m.bodySpecies?.name];
			if (names.includes('Darkrai') || move.hasBounced) {
				return;
			}
			this.add('-fail', source, 'move: Dark Void');
			this.hint("Only a Pokemon whose form is Darkrai can use this move.");
			return null;
		},
	},
	dive: {
		inherit: true,
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			const ids = [attacker.m.headSpecies?.id, attacker.m.bodySpecies?.id];
			if (attacker.hasAbility('gulpmissile') && ids.includes('cramorant' as ID) && !attacker.transformed) {
				const forme = attacker.hp <= attacker.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
				attacker.formeChange(forme, move);
			}
			this.add('-prepare', attacker, move.name);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
	},
	// well, we don't really need to fix this, but why not
	hyperspacefury: {
		inherit: true,
		onTry(source) {
			const names = [source.m.headSpecies?.name, source.m.bodySpecies?.name];
			if (names.includes('Hoopa-Unbound')) {
				return;
			}
			this.hint("Only a Pokemon whose form is Hoopa Unbound can use this move.");
			if (names.includes('Hoopa')) {
				this.attrLastMove('[still]');
				this.add('-fail', source, 'move: Hyperspace Fury', '[forme]');
				return null;
			}
			this.attrLastMove('[still]');
			this.add('-fail', source, 'move: Hyperspace Fury');
			return null;
		},
	},
	relicsong: {
		inherit: true,
		onHit(target, pokemon, move) {
			const baseSpecies = [pokemon.m.headSpecies?.baseSpecies, pokemon.m.bodySpecies?.baseSpecies];
			if (baseSpecies.includes('Meloetta') && !pokemon.transformed) {
				move.willChangeForme = true;
			}
		},
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (move.willChangeForme) {
				const ids = [pokemon.m.headSpecies?.id, pokemon.m.bodySpecies?.id];
				const meloettaForme = ids.includes('meloettapirouette') ? '' : '-Pirouette';
				pokemon.formeChange('Meloetta' + meloettaForme, this.effect, false, '[msg]');
			}
		},
	},
	// still, why not
	watershuriken: {
		inherit: true,
		basePowerCallback(pokemon, target, move) {
			const names = [pokemon.m.headSpecies?.name, pokemon.m.bodySpecies?.name];
			if (names.includes('Greninja-Ash') && pokemon.hasAbility('battlebond') &&
				!pokemon.transformed) {
				return move.basePower + 5;
			}
			return move.basePower;
		},
	},
};
