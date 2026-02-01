type Result = {
	_id: string;
	uid: string;
	wpm: number;
	rawWpm: number;
	charStats: string;
	acc: number;
	mode: "time" | "words" | "quote" | "custom" | "zen";
	mode2: number | "custom" | "zen";
	quoteLength?: number;
	timestamp: number;
	restartCount: number;
	incompleteTestSeconds: number;
	afkDuration?: number;
	testDuration: number;
	tags?: string;
	consistency: number;
	keyConsistency: number;
	language?: string;
	bailedOut?: boolean;
	blindMode?: boolean;
	lazyMode?: boolean;
	funbox?: string;
	difficulty?: string;
	numbers?: boolean;
	punctuation?: boolean;
	isPb?: boolean;
};

type TagResult = {
	acc: number;
	consistency: number;
	difficulty: "normal" | "expert" | "master";
	lazyMode: boolean;
	language: string;
	punctuation: boolean;
	raw: number;
	wpm: number;
	numbers: boolean;
	timestamp: number;
};

type PersonalBests = {
	time: {
		15?: TagResult[];
		30?: TagResult[];
		60?: TagResult[];
	};
	words: {
		10?: TagResult[];
		25?: TagResult[];
		50?: TagResult[];
		100?: TagResult[];
	};
	quote: Record<PropertyKey, never>;
	zen: { zen: TagResult[] };
	custom: { custom: TagResult[] };
};

type Tags = {
	_id: string;
	name: string;
	uid: string;
	personalBests: PersonalBests;
};

type DBTags = Omit<Tags, "_id" | "personalBests"> & { id: string };

type User = {
	uid: string;
	name: string;
	discordId: string;
	apeKey: string;
	isActive: number;
	/** À ne pas confondre avec `DNT` qui est le casting en boolean de la valeur en DB */
	dnt: number;
	/** À ne pas confondre avec `dnt` qui est la valeure stocké en DB sous forme d'un nombre (0|1) */
	DNT?: boolean;
};

type Leaderboard = {
	id: string;
	uid: string;
	name: string;
	discordId: string;
	wpm: number;
	acc: number;
	language?: string;
	mode: string;
	mode2: string;
	isPb: number;
	timestamp: number;
};

type LeaderboardMapped = Omit<Leaderboard, "isPb"> & {
	isPb: boolean;
	time: string;
	tag_names: string | null;
};

type LeaderboardWithBestWPM = LeaderboardMapped & {
	lastPB: number | null;
};

type BestWPM = {
	language: string | null;
	wpm: number;
};
