export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  aliases: string[];
}

export const VOICES: VoiceOption[] = [
  // ---- British English (default) ----
  {
    id: "en-GB-RyanNeural",
    name: "Ryan",
    description: "Warm British male (default)",
    aliases: ["ryan", "british", "uk", "britain", "english"],
  },
  {
    id: "en-GB-ThomasNeural",
    name: "Thomas",
    description: "Formal British male (BBC-style)",
    aliases: ["thomas", "bbc"],
  },
  {
    id: "en-GB-SoniaNeural",
    name: "Sonia",
    description: "Refined British female",
    aliases: ["sonia"],
  },
  {
    id: "en-GB-LibbyNeural",
    name: "Libby",
    description: "Bright British female",
    aliases: ["libby"],
  },

  // ---- US English ----
  {
    id: "en-US-AndrewNeural",
    name: "Andrew",
    description: "Warm US male",
    aliases: ["andrew", "american"],
  },
  {
    id: "en-US-BrianNeural",
    name: "Brian",
    description: "Casual US male",
    aliases: ["brian"],
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy",
    description: "Lively US male",
    aliases: ["guy"],
  },
  {
    id: "en-US-ChristopherNeural",
    name: "Christopher",
    description: "Authoritative US male",
    aliases: ["christopher", "chris"],
  },
  {
    id: "en-US-AvaNeural",
    name: "Ava",
    description: "Warm US female",
    aliases: ["ava", "warm"],
  },
  {
    id: "en-US-EmmaNeural",
    name: "Emma",
    description: "Cheerful US female",
    aliases: ["emma", "cheerful"],
  },
  {
    id: "en-US-JennyNeural",
    name: "Jenny",
    description: "Friendly US female",
    aliases: ["jenny"],
  },
  {
    id: "en-US-AriaNeural",
    name: "Aria",
    description: "Confident US female",
    aliases: ["aria"],
  },
  {
    id: "en-US-MichelleNeural",
    name: "Michelle",
    description: "Pleasant US female",
    aliases: ["michelle"],
  },

  // ---- Australian / NZ / Irish / Canadian ----
  {
    id: "en-AU-WilliamNeural",
    name: "William",
    description: "Australian male",
    aliases: ["william", "australian", "aussie"],
  },
  {
    id: "en-AU-NatashaNeural",
    name: "Natasha",
    description: "Australian female",
    aliases: ["natasha"],
  },
  {
    id: "en-NZ-MitchellNeural",
    name: "Mitchell",
    description: "New Zealand male",
    aliases: ["mitchell", "kiwi"],
  },
  {
    id: "en-NZ-MollyNeural",
    name: "Molly",
    description: "New Zealand female",
    aliases: ["molly"],
  },
  {
    id: "en-IE-ConnorNeural",
    name: "Connor",
    description: "Irish male",
    aliases: ["connor", "irish"],
  },
  {
    id: "en-IE-EmilyNeural",
    name: "Emily",
    description: "Irish female",
    aliases: ["emily"],
  },
  {
    id: "en-CA-LiamNeural",
    name: "Liam",
    description: "Canadian male",
    aliases: ["liam", "canadian"],
  },
  {
    id: "en-CA-ClaraNeural",
    name: "Clara",
    description: "Canadian female",
    aliases: ["clara"],
  },

  // ---- African ----
  {
    id: "en-ZA-LukeNeural",
    name: "Luke",
    description: "South African English male",
    aliases: ["luke", "south african", "south africa", "za"],
  },
  {
    id: "en-ZA-LeahNeural",
    name: "Leah",
    description: "South African English female",
    aliases: ["leah"],
  },
  {
    id: "af-ZA-WillemNeural",
    name: "Willem",
    description: "Afrikaans-accented male",
    aliases: ["willem", "afrikaans"],
  },
  {
    id: "af-ZA-AdriNeural",
    name: "Adri",
    description: "Afrikaans-accented female",
    aliases: ["adri"],
  },
  {
    id: "en-KE-ChilembaNeural",
    name: "Chilemba",
    description: "Kenyan male",
    aliases: ["chilemba", "kenyan", "kenya"],
  },
  {
    id: "en-KE-AsiliaNeural",
    name: "Asilia",
    description: "Kenyan female",
    aliases: ["asilia"],
  },
  {
    id: "en-NG-AbeoNeural",
    name: "Abeo",
    description: "Nigerian male",
    aliases: ["abeo", "nigerian", "nigeria"],
  },
  {
    id: "en-NG-EzinneNeural",
    name: "Ezinne",
    description: "Nigerian female",
    aliases: ["ezinne"],
  },
  {
    id: "en-TZ-ElimuNeural",
    name: "Elimu",
    description: "Tanzanian male",
    aliases: ["elimu", "tanzanian"],
  },
  {
    id: "en-TZ-ImaniNeural",
    name: "Imani",
    description: "Tanzanian female",
    aliases: ["imani"],
  },

  // ---- Asian English ----
  {
    id: "en-IN-PrabhatNeural",
    name: "Prabhat",
    description: "Indian male",
    aliases: ["prabhat", "indian", "india"],
  },
  {
    id: "en-IN-NeerjaNeural",
    name: "Neerja",
    description: "Indian female",
    aliases: ["neerja"],
  },
  {
    id: "en-SG-WayneNeural",
    name: "Wayne",
    description: "Singaporean male",
    aliases: ["wayne", "singapore", "singaporean"],
  },
  {
    id: "en-SG-LunaNeural",
    name: "Luna",
    description: "Singaporean female",
    aliases: ["luna"],
  },
  {
    id: "en-HK-SamNeural",
    name: "Sam",
    description: "Hong Kong male",
    aliases: ["sam", "hong kong"],
  },
  {
    id: "en-HK-YanNeural",
    name: "Yan",
    description: "Hong Kong female",
    aliases: ["yan"],
  },
  {
    id: "en-PH-JamesNeural",
    name: "James",
    description: "Filipino male",
    aliases: ["james", "filipino", "philippines"],
  },
  {
    id: "en-PH-RosaNeural",
    name: "Rosa",
    description: "Filipino female",
    aliases: ["rosa"],
  },

  // ---- Multilingual ----
  {
    id: "en-US-AndrewMultilingualNeural",
    name: "Andrew (multi)",
    description: "Multilingual male",
    aliases: ["andrew multi", "multilingual", "multi"],
  },
  {
    id: "en-US-AvaMultilingualNeural",
    name: "Ava (multi)",
    description: "Multilingual female",
    aliases: ["ava multi"],
  },
];

export const DEFAULT_VOICE = "en-GB-RyanNeural";

export function findVoiceById(id: string): VoiceOption | undefined {
  return VOICES.find((v) => v.id === id);
}

/**
 * Detect whether an utterance is a request to switch voices.
 * Matches phrases like:
 *   "switch to Luke"
 *   "use Luke's voice"
 *   "change to British"
 *   "talk like a South African"
 *   "speak like Sonia"
 *   "be Ryan"
 */
export function matchVoiceCommand(text: string): VoiceOption | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  // Long utterances are almost never voice commands
  if (lower.length > 60) return null;

  // Must contain a command verb OR the word "voice"
  const commandVerbs = [
    "switch", "change", "use", "try", "be",
    "speak like", "talk like", "sounds like",
  ];
  const hasVerb = commandVerbs.some((v) => lower.includes(v));
  const mentionsVoice = lower.includes("voice");

  if (!hasVerb && !mentionsVoice) return null;

  // Must contain a matching voice name or alias
  for (const v of VOICES) {
    if (lower.includes(v.name.toLowerCase())) return v;
    for (const alias of v.aliases) {
      if (lower.includes(alias)) return v;
    }
  }

  return null;
}