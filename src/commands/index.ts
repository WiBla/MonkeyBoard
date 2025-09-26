import { Request } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import forgetme from "./forgetme.ts";
import getmyscore from "./getmyscore.ts";
import leaderboard from "./leaderboard.ts";
import register from "./register.ts";
import updatemyscore from "./updatemyscore.ts";

type CommandHandler = {
	[name: string]: (req: Request) => Promise<InteractionResponse>;
};

export default {
	register,
	forgetme,
	getmyscore,
	updatemyscore,
	leaderboard,
} as CommandHandler;
