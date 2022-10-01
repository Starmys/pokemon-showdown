export const Abilities: {[k: string]: ModdedAbilityData} = {
	innerfocus: {
		inherit: true,
		rating: 1.5,
		onBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate') {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Inner Focus', '[of] ' + target);
			}
		},
	},
	oblivious: {
		inherit: true,
		onBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate') {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Oblivious', '[of] ' + target);
			}
		},
	},
	drizzle: {
		inherit: true,
		onStart(source) {
			if (this.field.weather !== 'raindance') {
				this.field.setWeather('raindance');
			}
		},
	},
	drought: {
		inherit: true,
		onStart(source) {
			if (this.field.weather !== 'sunnyday') {
				this.field.setWeather('sunnyday');
			}
		},
	},
	sandstream: {
		inherit: true,
		onStart(source) {
			if (this.field.weather !== 'sandstorm') {
				this.field.setWeather('sandstorm');
			}
		},
	},
	snowwarning: {
		inherit: true,
		onStart(source) {
			if (this.field.weather !== 'hail') {
				this.field.setWeather('hail');
			}
		},
	},
}
