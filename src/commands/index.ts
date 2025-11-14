import { Command } from "../types/client.ts";
import addScore from "./score/addScore.ts";
import getMyScore from "./score/getMyScore.ts";
import leaderboard from "./score/leaderboard.ts";
import oldLeaderboard from "./score/oldLeaderboard.ts";
import updateAll from "./score/updateAll.ts";
import updateMyScore from "./score/updateMyScore.ts";
import join from "./user/join.ts";
import quit from "./user/quit.ts";
import register from "./user/register.ts";
import unlink from "./user/unlink.ts";

export default [
	addScore,
	getMyScore,
	leaderboard,
	oldLeaderboard,
	updateAll,
	updateMyScore,
	join,
	quit,
	register,
	unlink,
] as Command[];
