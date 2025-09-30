import { Request } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import getmyscore from "./getmyscore.ts";
import leaderboard from "./leaderboard.ts";
import register from "./register.ts";
import unlink from "./unlink.ts";
import updatemyscore from "./updatemyscore.ts";

type CommandHandler = {
	[name: string]: (req: Request) => Promise<InteractionResponse>;
};

export default {
	register,
	unlink,
	getmyscore,
	updatemyscore,
	leaderboard,
} as CommandHandler;
