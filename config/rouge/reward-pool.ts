import { Pokemon } from "../../sim";
import { DexTypes } from "../../sim/dex-data";

export const RewardPool = {
	'championroom': ["You've passed the cave.time to go back", 'Entrance to the void'],
	'championroom2': ["You defeat the void and become a new champion"],
	"pokemonroom": [
		'Get Munchlax', 'Get Tauros', 'Get Ferroseed', 'Get Indeedee', 'Get Growlithe',
		'Get Slowbro', 'Get Lapras', 'Get Dreepy', 'Get Beldum', 'Get Onix', 'Get Slakoth', 'Get Solosis',
		'Get Pincurchin', 'Get Pinsir', 'Get Sneasel', 'Get Houndour', 'Get Seadra', 'Get Shinx',
		'Get Riolu', 'Get Fletchinder', 'Get Roselia', 'Get Larvitar', 'Get Slowpoke', 'Get Dhelmise',
		'Get Gastly', 'Get Torkoal', 'Get Spearow', 'Get Golisopod', 'Get Skarmory', 'Get Absol',
		'Get Tyrunt', 'Get Drilbur', 'Get Clefairy', 'Get Shellder', 'Get Heracross', 'Get Swinub',
		'Get Dugtrio-Alola', 'Get Silicobra', 'Get Togepi', 'Get Vulpix-Alola', 'Get Scyther', 'Get Krabby',
		'Get Binacle', 'Get Shuppet', 'Get Druddigon', 'Get Misdreavus', 'Get Ekans', 'Get Wailmer',
		'Get Cosmog', 'Get Emzzf', 'Get Psyduck', 'Get White Devil', 'Get Gible', 'Get Arctovish',
		'Get Glastrier', 'Get Virizion', 'Get Miracle Singer', 'Get Nihilego', 'Get Meloetta-Pirouette',
		'Get Legend-Unown', 'Get Swablu', 'Get Arctozolt', 'Get Beedrill', 'Get Shroomish', 'Get Cubone',
		'Get Dratini', 'Get Yungoos', 'Get Ralts', 'Get Silvally', 'Get Slowpoke-Galar', 'Get Hoopa',
		'Get Escavalier', 'Get Kangaskhan', 'Get Kricketune', 'Get Deerling', 'Get Cyclizar', 'Get Terapagos',
		'Get Thundurus', 'Get Angod', 'Get Tapu Bulu', 'Get Tapu Fini', 'Get Mawile', 'Get Flygon-mega',
		'Get Zygarde-10%', 'Get Nidoking', 'Get Nidoqueen', 'Get Diancie', 'Get Shuckle-Mega',
		'Get Tapu Koko', 'Get Tapu Lele', 'Get Heatran', 'Get Hammer', 'Get Blacephalon',
		'Get Urshifu', 'Get Zarude', 'Get Melmetal', 'Get Latios', 'Get Latias', 'Get Hoopa-Unbound',
		'Get Genesect', 'Get Regigigas','Get Geodude-Alola', 'Get Happiny', 'Get Bergmite', 'Get Enamorus',
		'Get Enamorus-Therian', 'Get Landorus','Get Landorus-Therian','Get Floette', 'Get Sableye','Get Dondozo',
	],
	"pokemonroom2": [],
	'commonroom': [
		'Evo All', 'All Evs Add 24', 'Rand One Mon All Evs Add 72', 'Rand One Mon Two Evs Fill',
		'Retransmission PokemonSet', 'Retransmission Moves Pool', 'Choose One Mon Three Evs Half',
		'Choose One Mon All Evs Add 48', 'Choose One Mon Get Specific Item', 'Add life',
		'All Hp Evs Add 160', 'All Atk Evs Add 160', 'All Def Evs Add 160', 'All Spa Evs Add 160',
		'All Spd Evs Add 160', 'All Spe Evs Add 160', 'Choose One Mon Atk Spe fill',
		'Choose One Mon Spa Spe fill', 'Choose One Mon Hp Another fill'
	],
	'commonroom2': [],
	'itemroom': [
		'Get SuperBand', 'Get SuperSpecs', 'Get SuperScarf', 'Get Super Quick Claw',
		'Get Super Vest', 'Get Diseviolite', 'Get Berserk Gene', 'Get Super Metronome',
		'Get Super Life Orb', 'Get Intact Apple', 'Get Super Muscle Band', 'Get Super Wise Glasses',
		'Get Adaptive Slate', 'Get Sight Lens', 'Get Gladiator Helmet', 'Get Super Bright Powder',
		'Get Super Expert Belt', 'Get Huge Berry', 'Get Wonderful Berry', 'Get Super Scope Lens',
		'Get Eject Station', 'Get Satori No Wheelchair', 'Get Consolation Prize', 'Get Effort Berry',
		'Get Portable Earth', 'Get Death Speaker', 'Get Giant Clothes', "Get Power Herb",
		'Get Explosive Arm', 'Get Double-edged Sword', 'Get Flexible Device', 'Get Pain Connector',
		'Get Immunity Herb', 'Get Deep Sea Dew', 'Get Seismic Lever', 'Get Azure Flute', 'Get Super Shell Bell',
		'Get Priority Glove',
	],
	'itemroom2': [],
	'moveroom': [
		'Learn Super Steel Beam', 'Learn No Retreat', 'Learn Surging Strikes', 'Learn PhotonGeyser',
		'Learn Boomburst', 'Learn Sheer Colder', 'Learn Aeroblast', 'Learn Double Impression',
		'Learn Wicked Blow', 'Learn Glaive Rush', 'Learn Super Light of Ruin', 'Learn Secret Sword',
		'Learn V-create', 'Learn Poltergeist', 'Learn Apple Acid', 'Learn Swamp Power',
		'Learn Triple Axel', 'Learn Shell Side Arm', 'Learn Meteor Beam', 'Learn Moongeist Beam',
		'Learn Sleep Powder', 'Learn Stim Pack', 'Learn Super Silver Wind', 'Learn Dragon Energy',
		'Learn Super Parabolic Charge', 'Learn Bolt Beak', 'Learn Super Spirit Break',
		'Learn Sacred Sword', 'Learn Blue Flare', 'Learn Dual Ace', 'Learn Grav Apple',
		'Learn Precipice Blades', 'Learn Freeze-Dry', 'Learn Gunk Shot', 'Learn Diamond Storm',
		'Learn Origin Pulse', 'Learn Dragon Dance', 'Learn Stasis Ward', 'Learn Psychic Sword', 'Learn Bitter Blade',
		'Learn Backdraft', 'Learn Spring', 'Learn Revival Blessing', 'Learn Life Blessing', 'Learn Level Wish', 'Learn Baddy Bad',
		'Learn Double Iron Bash', 'Learn Extreme Speed', 'Learn Shell Smash', 'Learn Core Enforcer',
		'Learn Slack Off', 'Learn Quiver Dance', 'Learn Prism Charge', 'Learn Happy Hour',
		'Learn Tail Glow', 'Learn Belly Drum', 'Learn Divine', 'Learn Fishious Rend', 'Learn Knock Off',
		'Learn Blizzard', 'Learn Solar Beam', 'Learn Solar Blade', 'Learn Hurricane', 'Learn Thunder',
		'Learn Weather Ball', 'Learn Tri Attack', 'Learn Explosion', 'Learn Self-Destruct',
		'Learn Quick Attack','Learn Vacuum Wave','Learn Bullet Punch','Learn Water Shuriken','Learn Accelerock','Learn Sucker Punch',
	],
	'moveroom2': [],

	'abilityroom': [
		'Become Bomber', 'Become Solar Power', 'Become Download ', 'Become Fur Coat',
		'Become Gorilla Tactics', 'Become Ice Scales', 'Become Fluffy', 'Become Hustle',
		'Become Intimidate', 'Become Mold Breaker', 'Become Prankster', 'Become Quick Draw',
		'Become Tinted Lens', 'Become Unburden', 'Become Guts', 'Become Hide', 'Become Diffuser',
		'Become Hard Shell', 'Become Giant Killer', 'Become Irreducible', 'Become Hyperactivity',
		'Become Fortitude Shield', 'Become Poison Around', 'Become Alpha Bond', 'Become Incomplete Nirvana',
		'Become Sheer Force', 'Become Beast Boost', 'Become Protean', 'Become Regenerator',
		'Become Speed Boost', 'Become Concentrator', 'Become Immolating', 'Become Renewal', 'Become Sacrifice',
		'Become Power Priority',
	],
	'abilityroom2': [],

	'eliteroom': [
		'Gain Artirain', 'Gain Artisnow', 'Gain Artistorm', 'Gain Artisunny', 'Gain Confident Start',
		'Gain Artilightscreen', 'Gain Artireflect', 'Gain Focus Device', 'Gain Angel Halo',
		'Gain Acupressure Mat', 'Gain Trick Props', 'Gain Potion Of Rapid Growth', 'Gain Guardian Shield',
		'Gain Sword of Trying', 'Gain Sleight of Hand', 'Gain Tri Force', 'Gain Obscenities',
		'Gain Overdriver', 'Gain Time Jewel', 'Gain Fairy Egg', 'Gain Misfortune Mirror',
		'Gain Healing Area', 'Gain Trueshot Aura', 'Gain Future Scope', 'Gain Future Camera',
		'Gain Status Push', 'Gain Lifestream', 'Gain Cockatrice Eye', 'Gain Fall Rise', 'Gain Order Way Up', 'Gain Exp Of Spring',
		'Gain Teratype Sword', 'Gain Teratype Shield',
		'Gain Dragon Thrones', 'Gain Dancing Floor', 'Gain Egg Of Compassion', 'Gain Industrial Plant',
		'Gain Ticket Of Colosseum', 'Gain Soy Milk', 'Gain Garden Guardian', 'Gain Pole Tracker',
		'Gain Industrial Emissions', 'Gain Sun Shower', 'Gain Combustible', 'Gain Infestation2',
		'Gain Gang Guarantee', 'Gain False Moon', 'Gain Gun of Nerf', 'Gain Eight Diagrams drawing',
		'Gain Psychoanalysis', 'Gain Gravity Generator', 'Gain Stope', 'Gain Final Act',
		'Gain Piercing Attack', 'Gain Move Reaction', 'Gain Wrathwell',
	],
	'eliteroom2': [],
};
export const WeightPool = {
	"pokemonroomweight": {
		'Get Munchlax': 10,
		'Get Tauros': 10,
		'Get Ferroseed': 10,
		'Get Indeedee': 10,
		'Get Growlithe': 10,
		'Get Slowbro': 10,
		'Get Lapras': 10,
		'Get Dreepy': 10,
		'Get Beldum': 10,
		'Get Onix': 10,
		'Get Slakoth': 10,
		'Get Solosis': 10,
		'Get Pincurchin': 10,
		'Get Pinsir': 10,
		'Get Sneasel': 10,
		'Get Houndour': 10,
		'Get Seadra': 10,
		'Get Shinx': 10,
		'Get Riolu': 10,
		'Get Fletchinder': 10,
		'Get Roselia': 10,
		'Get Larvitar': 10,
		'Get Slowpoke': 10,
		'Get Dhelmise': 10,
		'Get Gastly': 10,
		'Get Torkoal': 10,
		'Get Spearow': 10,
		'Get Golisopod': 10,
		'Get Skarmory': 10,
		'Get Absol': 10,
		'Get Tyrunt': 10,
		'Get Drilbur': 10,
		'Get Clefairy': 10,
		'Get Shellder': 10,
		'Get Heracross': 10,
		'Get Swinub': 10,
		'Get Dugtrio-Alola': 10,
		'Get Silicobra': 10,
		'Get Togepi': 10,
		'Get Vulpix-Alola': 10,
		'Get Scyther': 10,
		'Get Krabby': 10,
		'Get Binacle': 10,
		'Get Shuppet': 10,
		'Get Druddigon': 10,
		'Get Misdreavus': 10,
		'Get Ekans': 10,
		'Get Wailmer': 10,
		'Get Cosmog': 10,
		'Get Emzzf': 10,
		'Get Psyduck': 10,
		'Get White Devil': 10,
		'Get Gible': 10,
		'Get Arctovish': 10,
		'Get Glastrier': 10,
		'Get Virizion': 10,
		'Get Miracle Singer': 10,
		'Get Nihilego': 10,
		'Get Meloetta-Pirouette': 10,
		'Get Legend-Unown': 10,
		'Get Swablu': 10,
		'Get Arctozolt': 10,
		'Get Beedrill': 10,
		'Get Shroomish': 10,
		'Get Cubone': 10,
		'Get Dratini': 10,
		'Get Yungoos': 10,
		'Get Ralts': 10,
		'Get Silvally': 10,
		'Get Slowpoke-Galar': 10,
		'Get Hoopa': 10,
		'Get Escavalier': 10,
		'Get Kangaskhan': 10,
		'Get Kricketune': 10,
		'Get Deerling': 10,
		'Get Cyclizar': 10,
		'Get Terapagos': 10,
		'Get Thundurus': 8,
		'Get Angod': 8,
		'Get Tapu Bulu': 5,
		'Get Tapu Fini': 5,
		'Get Mawile': 10,
		'Get Flygon-mega': 5,
		'Get Zygarde-10%': 10,
		'Get Nidoking': 10,
		'Get Nidoqueen': 10,
		'Get Diancie': 5,
		'Get Shuckle-Mega': 5,
		'Get Tapu Koko': 5,
		'Get Tapu Lele': 5,
		'Get Heatran': 5,
		'Get Hammer': 5,
		'Get Blacephalon': 5,
		'Get Urshifu': 5,
		'Get Zarude': 8,
		'Get Melmetal': 5,
		'Get Latios': 5,
		'Get Latias': 5,
		'Get Hoopa-Unbound': 5,
		'Get Genesect': 5,
		'Get Regigigas': 5,
		"Get Duraludon": 10,
		"Get Wingull": 10,
		"Get Electabuzz": 10,
		"Get Skrelp": 10,
		"Get Vullaby": 10,
		"Get Yanma": 10,
		"Get Lillipup": 10,
		"Get Caterpie": 10,
		"Get Bellsprout": 10,
		"Get Mareep": 10,
		"Get Tympole": 10,
		"Get Tentacool": 10,
		"Get Scraggy": 10,
		"Get Nacli": 10,
		"Get Mankey": 10,
		"Get Capsakid": 10,
		"Get Frigibax": 10,
		"Get Tinkatink": 10,
		"Get Tandemaus": 10,
		"Get Pawniard": 10,
		"Get Necrozma": 5,
		"Get Mew": 8,
		"Get Iron Moth": 5,
		"Get Slither Wing": 5,
		"Get Iron Valiant": 5,
		"Get Terrakion": 8,
		"Get Iron Thorns": 5,
		"Get Roaring Moon": 5,
		'Get Geodude-Alola': 10,
		'Get Happiny': 10,
		'Get Bergmite': 10,
		'Get Enamorus': 5,
		'Get Enamorus-Therian': 8,
		'Get Landorus': 8,
		'Get Landorus-Therian': 8,
		'Get Floette': 10,
		'Get Sableye':10,
		'Get Dondozo':10,

	},
	"commonroomweight": {
		'Evo All': 5,
		'All Evs Add 24': 10,
		'Rand One Mon All Evs Add 72': 10,
		'Rand One Mon Two Evs Fill': 10,
		'Retransmission PokemonSet': 15,
		'Retransmission Moves Pool': 15,
		'Choose One Mon Three Evs Half': 10,
		'Choose One Mon All Evs Add 48': 10,
		'Choose One Mon Get Specific Item': 15,
		'Add life': 15,
		'All Hp Evs Add 160': 5,
		'All Atk Evs Add 160': 5,
		'All Def Evs Add 160': 5,
		'All Spa Evs Add 160': 5,
		'All Spd Evs Add 160': 5,
		'All Spe Evs Add 160': 5,
		'Choose One Mon Atk Spe fill': 5,
		'Choose One Mon Spa Spe fill': 5,
		'Choose One Mon Hp Another fill': 5,
		'Promote A Pokemon': 1

	},
	'itemroomweight': {
		'Get SuperBand': 10,
		'Get SuperSpecs': 10,
		'Get SuperScarf': 10,
		'Get Super Quick Claw': 10,
		'Get Super Vest': 10,
		'Get Diseviolite': 10,
		'Get Berserk Gene': 10,
		'Get Super Metronome': 10,
		'Get Super Life Orb': 10,
		'Get Intact Apple': 10,
		'Get Super Muscle Band': 10,
		'Get Super Wise Glasses': 10,
		'Get Adaptive Slate': 10,
		'Get Sight Lens': 10,
		'Get Gladiator Helmet': 10,
		'Get Super Bright Powder': 10,
		'Get Super Expert Belt': 10,
		'Get Huge Berry': 10,
		'Get Wonderful Berry': 10,
		'Get Super Scope Lens': 10,
		'Get Eject Station': 10,
		'Get Satori No Wheelchair': 10,
		'Get Consolation Prize': 10,
		'Get Effort Berry': 10,
		'Get Portable Earth': 10,
		'Get Death Speaker': 10,
		'Get Giant Clothes': 10,
		'Get Explosive Arm': 5,
		'Get Double-edged Sword': 5,
		'Get Flexible Device': 5,
		'Get Pain Connector': 5,
		'Get Immunity Herb': 5,
		'Get Deep Sea Dew': 5,
		'Get Seismic Lever': 5,
		'Get Azure Flute': 5,
		"Get Smoke Trigger": 10,
		"Get Micro Master": 10,
		"Get Thruster": 5,
		"Get Custap Element": 5,
		"Get Power Herb": 0,
		'Get Super Shell Bell': 10,
		'Get Priority Glove': 10,
	},
	'moveroomweight': {
		'Learn Super Steel Beam': 8,
		'Learn No Retreat': 12,
		'Learn Surging Strikes': 8,
		'Learn PhotonGeyser': 8,
		'Learn Boomburst': 10,
		'Learn Sheer Colder': 7,
		'Learn Aeroblast': 88,
		'Learn Double Impression': 8,
		'Learn Wicked Blow': 10,
		'Learn Glaive Rush': 8,
		'Learn Super Light of Ruin': 8,
		'Learn Secret Sword': 8,
		'Learn V-create': 10,
		'Learn Poltergeist': 8,
		'Learn Apple Acid': 8,
		'Learn Swamp Power': 8,
		'Learn Triple Axel': 8,
		'Learn Shell Side Arm': 8,
		'Learn Meteor Beam': 12,
		'Learn Moongeist Beam': 8,
		'Learn Sleep Powder': 12,
		'Learn Stim Pack': 12,
		'Learn Super Silver Wind': 8,
		'Learn Dragon Energy': 8,
		'Learn Super Parabolic Charge': 8,
		'Learn Bolt Beak': 8,
		'Learn Super Spirit Break': 8,
		'Learn Sacred Sword': 8,
		'Learn Blue Flare': 8,
		'Learn Dual Ace': 8,
		'Learn Grav Apple': 8,
		'Learn Precipice Blades': 8,
		'Learn Freeze-Dry': 8,
		'Learn Gunk Shot': 8,
		'Learn Diamond Storm': 8,
		'Learn Origin Pulse': 8,
		'Learn Dragon Dance': 12,
		'Learn Stasis Ward': 10,
		'Learn Psychic Sword': 8,
		'Learn Backdraft': 10,
		'Learn Spring': 10,
		'Learn Revival Blessing': 10,
		'Learn Life Blessing': 10,
		'Learn Level Wish': 10,
		'Learn Baddy Bad': 8,
		'Learn Double Iron Bash': 10,
		'Learn Extreme Speed': 7,
		'Learn Shell Smash': 7,
		'Learn Core Enforcer': 7,
		'Learn Slack Off': 7,
		'Learn Quiver Dance': 7,
		'Learn Prism Charge': 7,
		'Learn Tail Glow': 7,
		'Learn Belly Drum': 7,
		'Learn Divine': 7,
		'Learn Fishious Rend': 7,
		"Learn Mew Ball": 12,
		"Learn Parry": 12,
		"Learn Population Bomb": 8,
		"Learn Speed Impact": 8,
		"Learn Fake Shot": 10,
		"Learn Sketch": 12,
		"Learn Happy Hour": 0,
		'Learn Knock Off': 0,
		'Learn Bitter Blade': 8,
		'Learn Blizzard': 1,
		'Learn Solar Beam': 0,
		'Learn Solar Blade': 0,
		'Learn Hurricane': 1,
		'Learn Thunder': 1,
		'Learn Weather Ball': 0,
		'Learn Tri Attack': 0,
		'Learn Explosion': 0,
		'Learn Self-Destruct': 0,
		'Learn Quick Attack': 0,
		'Learn Vacuum Wave': 0,
		'Learn Bullet Punch': 0,
		'Learn Water Shuriken': 0,
		'Learn Accelerock': 0,
		'Learn Sucker Punch': 8,
	},
	'abilityroomweight': {
		'Become Bomber': 10,
		'Become Solar Power': 10,
		'Become Download ': 10,
		'Become Fur Coat': 10,
		'Become Gorilla Tactics': 10,
		'Become Ice Scales': 10,
		'Become Fluffy': 10,
		'Become Hustle': 10,
		'Become Intimidate': 10,
		'Become Mold Breaker': 10,
		'Become Prankster': 10,
		'Become Quick Draw': 10,
		'Become Tinted Lens': 10,
		'Become Unburden': 10,
		'Become Guts': 10,
		'Become Hide': 10,
		'Become Diffuser': 10,
		'Become Hard Shell': 10,
		'Become Giant Killer': 10,
		'Become Irreducible': 10,
		'Become Hyperactivity': 10,
		'Become Fortitude Shield': 10,
		'Become Poison Around': 10,
		'Become Alpha Bond': 10,
		'Become Incomplete Nirvana': 10,
		'Become Sheer Force': 5,
		'Become Beast Boost': 5,
		'Become Protean': 5,
		'Become Regenerator': 5,
		'Become Speed Boost': 5,
		'Become Concentrator': 5,
		'Become Immolating': 5,
		'Become Renewal': 5,
		'Become Sacrifice': 5,
		"Become Haven": 5,
		"Become Overcharge": 10,
		"Become Adaptability": 10,
		"Become Spiky Body": 10,
		"Become Born Of Explosion": 10,
		"Become Szpenguin": 10,
		'Become Power Priority': 10,
	},
	'eliteroomweight': {
		'Gain Artirain': 10,
		'Gain Artisnow': 10,
		'Gain Artistorm': 10,
		'Gain Artisunny': 10,
		'Gain Confident Start': 10,
		'Gain Artilightscreen': 10,
		'Gain Artireflect': 10,
		'Gain Focus Device': 10,
		'Gain Angel Halo': 10,
		'Gain Acupressure Mat': 10,
		'Gain Trick Props': 10,
		'Gain Potion Of Rapid Growth': 10,
		'Gain Guardian Shield': 10,
		'Gain Sword of Trying': 10,
		'Gain Sleight of Hand': 10,
		'Gain Tri Force': 10,
		'Gain Obscenities': 10,
		'Gain Overdriver': 10,
		'Gain Time Jewel': 10,
		'Gain Fairy Egg': 10,
		'Gain Misfortune Mirror': 10,
		'Gain Healing Area': 10,
		'Gain Trueshot Aura': 10,
		'Gain Future Scope': 10,
		'Gain Future Camera': 10,
		'Gain Status Push': 10,
		'Gain Lifestream': 10,
		'Gain Cockatrice Eye': 10,
		'Gain Fall Rise': 10,
		'Gain Order Way Up': 10,
		'Gain Exp Of Spring': 10,
		'Gain Teratype Sword': 10,
		'Gain Teratype Shield': 10,
		'Gain Dragon Thrones': 5,
		'Gain Dancing Floor': 5,
		'Gain Egg Of Compassion': 5,
		'Gain Industrial Plant': 5,
		'Gain Ticket Of Colosseum': 5,
		'Gain Soy Milk': 5,
		'Gain Garden Guardian': 5,
		'Gain Pole Tracker': 5,
		'Gain Industrial Emissions': 5,
		'Gain Sun Shower': 5,
		'Gain Combustible': 5,
		'Gain Infestation2': 5,
		'Gain Gang Guarantee': 5,
		'Gain False Moon': 5,
		'Gain Gun of Nerf': 5,
		'Gain Eight Diagrams drawing': 5,
		'Gain Psychoanalysis': 5,
		'Gain Gravity Generator': 5,
		'Gain Stope': 5,
		'Gain Final Act': 5,
		'Gain Piercing Attack': 5,
		"Gain Champion Belt": 10,
		"Gain Pack Light": 10,
		"Gain Enchantments": 10,
		"Gain Flame Shield": 10,
		"Gain Heroic Sword": 10,
		"Gain Contrary Blade": 10,
		"Gain Melody Of Siren": 10,
		"Gain Conjuring Show": 10,
		"Gain Holographic Projection": 5,
		"Gain Replication": 5,
		"Gain Physical Suppression": 5,
		'Gain Move Reaction': 5,
		'Gain Wrathwell': 8,
	},
};

const rainAbility = ['swiftswim', 'raindish', 'dryskin'];
const sunAbility = ['protosynthesis', 'flowergift', 'chlorophyll', 'solarpower'];
const sandfAbility = ['sanveil', 'sandforce', 'sandrush'];
const snowAbility = ['snowcloak', 'slushrush', 'icebody'];
const stabMovePool = {
	Bug: ['Learn Super Silver Wind', 'Learn Double Impression'],
	Dark: ['Learn Knock Off', 'Learn Baddy Bad', 'Learn Sucker Punch'],
	Dragon: ['Learn DragonEnergy', 'Learn Glaive Rush', 'Learn Core Enforcer'],
	Electric: ['Learn Super Parabolic Charge', 'Learn Bolt Beak'],
	Fairy: ['Learn Super Spirit Break', 'Learn Super Light of Ruin'],
	Fighting: ['Learn Sacred Sword', 'Learn Secret Sword', 'Learn Speed Impact'],
	Fire: ['Learn Bitter Blade', 'Learn Blue Flare'],
	Flying: ['Learn Aeroblast', 'Learn Dual Ace'],
	Ghost: ['Learn Poltergeist', 'Learn Moongeist Beam'],
	Grass: ['Learn Apple Acid', 'Learn Grav Apple'],
	Ground: ['Learn Precipice Blades', 'Learn Swamp Power',],
	Ice: ['Learn Triple Axel', 'Learn Freeze-Dry', 'Learn Sheer Colder'],
	Normal: ["Learn Population Bomb", 'Learn Tri Attack'],
	Poison: ['Learn Shell Side Arm', 'Learn Gunk Shot'],
	Psychic: ['Learn Psychic Sword', 'Learn PhotonGeyser'],
	Rock: ['Learn Diamond Storm'],
	Steel: ['Learn Super Steel Beam', 'Learn Surging Strikes'],
	Stellar: [],
	Water: ['Learn Surging Strikes', 'Learn Origin Pulse'],
};
const Charge = [
	'bounce', 'dig', 'dive', 'fly', 'freezeshock', 'geomancy', 'iceburn', 'phantomforce', 'shadowforce', 'skullbash',
	'skyattack', 'meteorbeam', 'electroshot'
];
const Charge2 = [
	'solarbeam', 'solarblade', 'bounce', 'dig', 'dive', 'fly', 'freezeshock', 'geomancy', 'iceburn', 'phantomforce', 'razorwind', 'shadowforce', 'skullbash',
	'skyattack', 'meteorbeam', 'electroshot'
];
const canPromote = [
	'terapagos', 'cyclizar', 'silvally', 'froakie', 'frogadier', 'greninja', 'caterpie', 'fearow', 'spearow',
	'pelipper', 'wingull', 'mew', 'wailord', 'wailmer', 'torkoal', 'archaludon', 'duraludon', 'dreepy', 'drakloak',
	'dragapult', 'kingdra', 'seadra', 'mandibuzz', 'vullaby', 'deerling', 'sawsbuck', 'dragalge', 'glastrier', 'spectrier',
	'herdier', 'lillipup', 'stoutland', 'arcanine', 'growlithe', 'zygarde10', 'shinx', 'luxio', 'luxray', 'necrozma', 'druddigon',
	'lapras', 'electivire', 'electabuzz', 'altaria', 'swablu'
];
const recoil = [
	'headcharge', 'bravebird', 'doubleedge', 'flareblitz', 'headsmash', 'superlightofruin', 'volttackle', 'wavecrash',
	'wildcharge', 'woodhammer'
];
const RecoveryMove = [
	'healorder', 'milkdrink', 'moonlight', 'morningsun', 'recover', 'roost', 'shoreup', 'slackoff', 'softboiled', 'strengthsap', 'synthesis',
];
const priorityMoveWeight = ['Learn Quick Attack','Learn Vacuum Wave','Learn Bullet Punch','Learn Water Shuriken','Learn Accelerock','Learn Sucker Punch']
export const updateWeightPool = {
	"pokemonroom": function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) { },
	'commonroom': function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) {
		let pokemons = battle.p2.pokemon;
		if (pokemons.filter(x => canPromote.includes(battle.toID(x.species))).length) {
			weightPool['Promote A Pokemon'] += 15;
		}
		if (pokemons.filter(x => x.species.evos && x.species.evos.length).length === 0) {
			weightPool['Evo All'] = 0;
		}
	},
	'itemroom': function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) {
		let pokemons = battle.p2.pokemon;
		// let moves = pokemons.flatMap(pokemon => pokemon.moves);
		if (pokemons.filter(x => x.moves.filter(x => Charge.includes(x)).length && x.item !== 'powerherb').length) {
			weightPool["Get Power Herb"] += 40;
		}
		if (pokemons.filter(x => x.moves.filter(x => recoil.includes(x)).length && x.item !== 'gladiatorhelmet').length) {
			weightPool["Get Gladiator Helmet"] += 10;
		}
	},
	'moveroom': function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) {
		let pokemons = battle.p2.pokemon;
		if (pokemons.filter(x => x.item === 'normaliumz' && !(x.moves.includes('happyhour') || x.moves.includes('celebrate'))).length) {
			weightPool['Learn Happy Hour'] += 50;
		}
		let types = new Set<string>(pokemons.flatMap(pokemon => pokemon.getTypes()));
		for (let type of types) {
			//@ts-ignore
			weightPool[stabMovePool[type]] += 8;
		}
		if (relics.includes('Artirain')) {
			weightPool['Learn Hurricane'] += 19;
			weightPool['Learn Thunder'] += 19;
			weightPool['Learn Weather Ball'] += 19;
		}
		if (relics.includes('Artisunny')) {
			weightPool['Learn Solar Beam'] += 19;
			weightPool['Learn Solar Blade'] += 19;
			weightPool['Learn Weather Ball'] += 19;
		}
		if (relics.includes('Artistorm')) {
			weightPool['Learn Weather Ball'] += 19;
		}
		if (relics.includes('Artisnow')) {
			weightPool['Learn Blizzard'] += 19;
			weightPool['Learn Weather Ball'] += 19;
		}
		if (pokemons.filter(x => x.ability === 'overcharge').length) {
			weightPool['Learn Solar Beam'] += 20;
			weightPool['Learn Solar Blade'] += 20;
			weightPool['Learn Meteor Beam'] += 20;
		}
		if (pokemons.filter(x => x.ability === 'bornofexplosion').length) {
			weightPool['Learn Explosion'] += 15;
			weightPool['Learn Self-Destruct'] += 20;
		}
		if (pokemons.filter(x => (x.ability === 'megalauncher' || x.item === 'Blastoisinite') && x.moves.includes('originpulse')).length) {
			weightPool['Learn Origin Pulse'] += 10;
		}
		if (pokemons.filter(x => x.ability === 'principaldancer').length) {
			weightPool['Learn Dragon Dance'] += 5;
			weightPool['Learn Quiver Dance'] += 5;
		}
		if (pokemons.filter(x => x.ability === 'anfist').length) {
			weightPool['Learn Double Iron Bash'] += 5;
		}
		if (pokemons.filter(x => x.ability === 'powerpriority').length) {
			for (let reward of priorityMoveWeight) {
				weightPool[reward] += 10
			}
			weightPool['Learn Double Impression'] += 5;
			weightPool['Learn Fake Shot'] += 5;

		}
	},
	'abilityroom': function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) {
		let pokemons = battle.p2.pokemon;
		// let moves = pokemons.flatMap(pokemon => pokemon.moves);
		if (pokemons.filter(x => x.moves.filter(x => Charge2.includes(x)).length && x.ability !== 'overcharge').length) {
			weightPool["Become Overcharge"] += 40;
		}
		if (pokemons.filter(x => x.moves.filter(x => RecoveryMove.includes(x)).length && x.item !== 'gladiatorhelmet').length) {
			weightPool["Become Haven"] += 10;
		}
		if (relics.includes('Artisunny')) {
			weightPool['Become Solar Power'] += 10;
		}


	},
	'eliteroom': function (battle: Battle, weightPool: Record<string, number>, relics: string[] = []) {
		let pokemons = battle.p2.pokemon;
		if (pokemons.filter(x => rainAbility.includes(x.ability) || x.item === 'swampertite').length) {
			weightPool['Gain Artirain'] += 30;
		}
		if (pokemons.filter(x => sunAbility.includes(x.ability) || x.item === 'houndoominite').length) {
			weightPool['Gain Artisunny'] += 30;
		}
		if (pokemons.filter(x => sandfAbility.includes(x.ability) || x.item === 'Garchompite').length) {
			weightPool['Gain Artistorm'] += 30;
		}
		if (pokemons.filter(x => snowAbility.includes(x.ability)).length) {
			weightPool['Gain Artisnow'] += 30;
		}
		if (pokemons.filter(x => x.hasType('Dragon')).length) {
			weightPool['Gain Dragon Thrones'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Fairy')).length) {
			weightPool['Gain Garden Guardian'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Ice')).length) {
			weightPool['Gain Pole Tracker'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Bug')).length) {
			weightPool['Gain Infestation2'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Dark')).length) {
			weightPool['Gain Gang Guarantee'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Grand')).length) {
			weightPool['Gain Eight Diagrams drawing'] += 5;
		}
		if (pokemons.filter(x => x.hasType('Normal')).length) {
			weightPool['Gain Gunofnerf'] += 5;
		}
	},
};

