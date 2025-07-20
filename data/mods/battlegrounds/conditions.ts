export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	shiny: {
		name: 'Shiny',
		noCopy: true,
		duration: 0,
		onStart(pokemon) {
			
			const ratio = 1.5;
			this.add('-activate', pokemon, 'move: shiny');
			this.add('-start', pokemon, 'shiny');
			pokemon.maxhp = Math.floor(pokemon.maxhp * ratio);
			pokemon.hp = Math.floor(pokemon.hp * ratio);
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
			pokemon.storedStats.atk = Math.floor(pokemon.storedStats.atk * 1.3);
			pokemon.storedStats.spa = Math.floor(pokemon.storedStats.spa * 1.3);
		},
		onBeforeSwitchOut(pokemon) {
			pokemon.removeVolatile('shiny');
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, 'shiny');
			pokemon.hp = Math.ceil(pokemon.hp * pokemon.baseMaxhp / pokemon.maxhp)
			pokemon.maxhp = pokemon.baseMaxhp;
			this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
		},
	},
}