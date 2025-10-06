import { Client, Collection } from "discord.js";

export type TSClient = Client & {
	// deno-lint-ignore no-explicit-any
	commands: Collection<string, any>;
	// deno-lint-ignore no-explicit-any
	cooldowns: Collection<string, any>;
};
