export const Items: { [k: string]: ModdedItemData} = {
	goldencustapberry: {
		name: "Golden Custap Berry",
		spritenum: 86,
		isBerry: true,
		naturalGift: {
			basePower: 100,
			type: "Ghost",
		},
		onFractionalPriorityPriority: -2,
		onFractionalPriority(priority, pokemon) {
			if (
				priority <= 0 &&
				(pokemon.hp <= pokemon.maxhp)
			) {
				if (pokemon.eatItem()) {
					this.add('-activate', pokemon, 'item: Golden Custap Berry', '[consumed]');
					return 0.1;
				}
			}
		},
		onEat() { },
		num: 210,
		gen: 4,
	},
	stickybarb: {
		inherit: true,
		onResidual(pokemon) {
			if (!pokemon.volatiles['dynamax2'])
				this.damage(pokemon.baseMaxhp / 8);
		},
	},
};