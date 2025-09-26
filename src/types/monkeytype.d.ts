// https://api.monkeytype.com/docs

type Profile = {
	uid: string;
	name: string;
	banned: boolean;
	addedAt: number;
	discordId?: string;
	discordAvatar?: string;
	xp: number;
	lbOptOut: boolean;
	isPremium: boolean;
	inventory: {
		badges: { id: number; selected: boolean }[];
	};
	streak: number;
	maxStreak: number;
	details: {
		bio: string;
		keyboard: string;
		socialProfiles: {
			twitter?: string;
			github?: string;
			website?: string;
		};
		showActivityOnPublicProfile: boolean;
	};
};

type LastResult = {
	wpm: number;
	rawWpm: number;
	charStats?: number[];
	acc: number;
	mode: "words" | "time" | "quote";
	mode2?: string;
	quoteLength?: number;
	timestamp: number;
	testDuration?: number;
	consistency?: number;
	keyConsistency?: number[];
	charData: {
		wpm: number[];
		burst: number[];
		err: number[];
	};
	uid: string;
	restartCount: number;
	incompleteTestSeconds: number;
	afkDuration?: number;
	tags?: string[];
	bailedOut?: boolean;
	blindMode?: boolean;
	lazyMode?: boolean;
	funbox?: string[];
	language?: string;
	difficulty?: string;
	numbers?: boolean;
	punctuation?: boolean;
	_id: string;
	keySpacingStats?: {
		average: number;
		sd: number;
	};
	keyDurationStats?: {
		average: number;
		sd: number;
	};
	name: string;
	isPb?: boolean;
};

type Tags = {
	_id: string;
	name: string;
	// personalBests
};

type APIResponse<T = unknown> = {
	message: string;
	data?: T; // Only for 200 status
	validationErrors?: string[]; // Usually for 422 status
	errorId?: string; // Usually for 500 or 503 status
	uid?: string; // Usually for 500 or 503 status
};
