type Result = {
	_id: string;
	uid: string;
	wpm: number;
	rawWpm: number;
	charStats: string;
	acc: number;
	mode: string;
	mode2: string;
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

type Tag = { _id: string; name: string; uid: string };

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
