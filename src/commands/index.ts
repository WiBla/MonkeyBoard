import getMyScore from "./score/getMyScore.ts";
import leaderboard from "./score/leaderboard.ts";
import updateAll from "./score/updateAll.ts";
import updateMyScore from "./score/updateMyScore.ts";
import join from "./user/join.ts";
import quit from "./user/quit.ts";
import register from "./user/register.ts";
import unlink from "./user/unlink.ts";

export default [
	getMyScore,
	leaderboard,
	updateAll,
	updateMyScore,
	join,
	quit,
	register,
	unlink,
];
