import { Request, Response } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import getmyscore from "./getmyscore.ts";
import leaderboard from "./leaderboard.ts";
import register from "./register.ts";
import unlink from "./unlink.ts";
import updateall from "./updateall.ts";
import updatemyscore from "./updatemyscore.ts";

type CommandHandler = {
	[name: string]: (
		req: Request,
		Res?: Response,
	) => Promise<InteractionResponse>;
};

export default {
	getmyscore,
	leaderboard,
	register,
	unlink,
	updatemyscore,
	updateall,
} as CommandHandler;
