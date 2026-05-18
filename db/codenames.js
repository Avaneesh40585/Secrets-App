// Deterministic weekly codename generator
// codename(userId, date) === codename(userId, sameWeekDifferentDay)
// codename changes when ISO week changes.

const ADJECTIVES = [
  "Midnight", "Silent", "Whispering", "Velvet", "Crimson", "Golden", "Silver",
  "Shadow", "Glowing", "Frozen", "Burning", "Hidden", "Wandering", "Quiet",
  "Restless", "Wild", "Gentle", "Brave", "Curious", "Dreaming", "Floating",
  "Shimmering", "Twilight", "Dawn", "Dusk", "Storm", "Misty", "Foggy",
  "Electric", "Cosmic", "Lunar", "Solar", "Stellar", "Mystic", "Ancient",
  "Eternal", "Forgotten", "Lost", "Found", "Secret", "Sacred", "Forbidden",
  "Wandering", "Hopeful", "Reckless", "Tender", "Fierce", "Noble", "Humble",
  "Daring", "Patient", "Vivid", "Subtle", "Bold", "Modest", "Radiant",
  "Hollow", "Distant", "Northern", "Southern", "Eastern", "Western",
  "Crystal", "Amber", "Sapphire", "Emerald", "Ruby", "Onyx", "Jade",
  "Whirlwind", "Tempest", "Thunder", "Lightning", "Avalanche", "Tidal",
  "Velvet", "Silken", "Iron", "Steel", "Bronze", "Pewter", "Marble",
  "Phantom", "Spectral", "Ethereal", "Ghostly", "Astral", "Celestial",
  "Wistful", "Solemn", "Joyful", "Pensive", "Serene", "Vibrant", "Quiet",
  "Drifting", "Soaring", "Diving", "Rising", "Falling", "Spinning",
  "Polar", "Tropical", "Desert", "Mountain", "Forest", "Ocean", "River",
  "Echoing", "Singing", "Dancing", "Laughing", "Weeping", "Sighing",
  "Crooked", "Winding", "Tangled", "Tidy", "Tipsy", "Sleepy", "Lazy",
  "Reluctant", "Eager", "Wary", "Trusting", "Doubtful", "Certain",
  "Bittersweet", "Honeyed", "Spicy", "Salty", "Sour", "Fragrant", "Pungent",
  "Wavering", "Steady", "Unsteady", "Unbroken", "Mending", "Healing",
  "Glittering", "Sparkling", "Twinkling", "Flickering", "Smoldering",
  "Rebel", "Outcast", "Vagrant", "Pilgrim", "Hermit", "Sage", "Jester",
  "Iron-willed", "Soft-spoken", "Sharp-eyed", "Fleet-footed", "Bright-minded"
];

const NOUNS = [
  "Fox", "Wolf", "Owl", "Raven", "Sparrow", "Hawk", "Falcon", "Eagle",
  "Tiger", "Lion", "Panther", "Lynx", "Jaguar", "Cheetah", "Cougar",
  "Bear", "Otter", "Badger", "Mink", "Stoat", "Marten", "Weasel",
  "Dragon", "Phoenix", "Griffin", "Pegasus", "Unicorn", "Wyvern", "Kraken",
  "Storm", "Cloud", "Mist", "Rain", "Snow", "Frost", "Ember", "Flame",
  "River", "Stream", "Ocean", "Lake", "Pond", "Brook", "Spring",
  "Mountain", "Valley", "Canyon", "Cliff", "Cave", "Forest", "Grove",
  "Star", "Moon", "Sun", "Comet", "Nova", "Galaxy", "Nebula", "Aurora",
  "Whisper", "Echo", "Song", "Hymn", "Lullaby", "Melody", "Symphony",
  "Dream", "Vision", "Memory", "Thought", "Notion", "Idea", "Whim",
  "Ghost", "Spirit", "Soul", "Wraith", "Shade", "Specter", "Phantom",
  "Bloom", "Petal", "Rose", "Lily", "Iris", "Tulip", "Orchid", "Lotus",
  "Willow", "Oak", "Maple", "Pine", "Birch", "Cedar", "Ash", "Elm",
  "Wanderer", "Voyager", "Traveler", "Pilgrim", "Nomad", "Drifter",
  "Sage", "Scholar", "Poet", "Bard", "Minstrel", "Storyteller",
  "Hunter", "Tracker", "Scout", "Ranger", "Guardian", "Sentinel",
  "Jester", "Trickster", "Riddle", "Puzzle", "Enigma", "Mystery",
  "Mirror", "Lantern", "Compass", "Map", "Key", "Lock", "Door",
  "Anchor", "Sail", "Helm", "Mast", "Lighthouse", "Harbor", "Shore",
  "Quill", "Ink", "Page", "Scroll", "Tome", "Library", "Archive",
  "Crown", "Throne", "Sword", "Shield", "Arrow", "Bow", "Spear",
  "Cipher", "Code", "Sigil", "Glyph", "Rune", "Symbol", "Seal",
  "Petal", "Thorn", "Vine", "Root", "Branch", "Leaf", "Seed",
  "Shadow", "Light", "Glow", "Spark", "Flicker", "Beacon", "Halo",
  "Tide", "Wave", "Current", "Eddy", "Whirlpool", "Crest", "Trough",
  "Howl", "Roar", "Purr", "Hiss", "Bellow", "Murmur", "Sigh",
  "Wraith", "Spirit", "Familiar", "Companion", "Witness", "Keeper",
  "Cartographer", "Astronomer", "Alchemist", "Apothecary", "Tinkerer",
  "Tower", "Bridge", "Arch", "Vault", "Cathedral", "Temple", "Shrine"
];

export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNum}`;
}

export function getCodename(userId, date = new Date()) {
  const week = getISOWeek(date);
  const seed = `${userId}:${week}`;
  const h = hashString(seed);
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length];
  return `${adj} ${noun}`;
}

// Google's avatar palette — flat single colors (no gradients)
const AVATAR_COLORS = [
  '#1A73E8', // Google Blue
  '#1E8E3E', // Google Green
  '#D93025', // Google Red
  '#E37400', // Google Yellow-Orange
  '#6200EE', // Purple
  '#0097A7', // Teal
  '#F06292', // Pink
  '#455A64', // Blue Grey
  '#5C6BC0', // Indigo
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Deep Purple
];

export function getAvatarColors(seed) {
  const h = hashString(seed || "default");
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return { c1: color, c2: color };
}

export function getInitial(displayName, codename, email) {
  const src = displayName || codename || email || "?";
  return src.trim().charAt(0).toUpperCase();
}
