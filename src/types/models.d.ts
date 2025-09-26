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
	discordId: number;
	apeKey: string;
	isActive: boolean;
};
