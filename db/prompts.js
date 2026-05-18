// Daily writing prompts — deterministic rotation by date
export const PROMPTS = [
  "What's a secret you've kept for years?",
  "Describe a moment that changed you quietly.",
  "What do you wish someone had told you earlier?",
  "Tell a truth no one in your life knows.",
  "What's something you're afraid to want?",
  "Write about a decision you've never stopped thinking about.",
  "What would you say if anonymity lasted forever?",
  "Describe a feeling you don't have a word for.",
  "What's something you pretend not to care about?",
  "Share a thought you've never said aloud.",
  "What's the kindest thing a stranger ever did for you?",
  "What do you miss that you can't go back to?",
  "What's a belief you quietly gave up on?",
  "Describe the most honest version of yourself.",
  "What's something you're carrying that no one else knows about?",
  "Write about a time you were braver than you felt.",
  "What would your past self be most surprised to learn?",
  "What's a question you're afraid to answer honestly?",
  "Describe a feeling you keep returning to.",
  "What's something beautiful about your flaws?",
  "Share something you've been putting off facing.",
  "What's a small thing that means a lot to you?",
  "Write about a moment you felt completely alone.",
  "What's the thing you most want people to understand about you?",
  "Describe a hope you've been too afraid to speak.",
  "What do you do when no one is watching?",
  "What's a memory you keep to yourself?",
  "Write about something you forgave yourself for.",
  "What's a feeling you've been ignoring?",
  "Share something that made you feel less alone.",
];

export function getDailyPrompt(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return PROMPTS[Math.abs(dayIndex) % PROMPTS.length];
}
