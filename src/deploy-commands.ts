import * as path from "@std/path";
import { Routes } from "discord-api-types/v10";
import { REST } from "discord.js";
import { Command } from "./types/commands.ts";

// #region Basic setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const APP_ID = Deno.env.get("APP_ID");
const CHANNEL_ID = "657335250220744714";

if (!DISCORD_TOKEN || !APP_ID) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}

const isProd = APP_ID === "1417277586618323006";
const envLabel = isProd ? "PROD" : "DEV";
// #endregion Basic setup

const shouldDelete =
	prompt("Do you want to delete all registered commands? (y/N):")
		?.toLowerCase() === "y";

const commands: Command[] = [];

if (!shouldDelete) {
	const commandsFolders = path.join(Deno.cwd(), "src/commands");

	for await (const folder of Deno.readDir(commandsFolders)) {
		if (!folder.isDirectory) continue;

		for await (
			const file of Deno.readDir(path.join(commandsFolders, folder.name))
		) {
			if (!file.isFile || !file.name.endsWith(".ts")) continue;

			const filePath = path.join(commandsFolders, folder.name, file.name);
			const commandModule = await import(`file://${filePath}`);
			const command = commandModule.default ?? commandModule;

			if ("data" in command && "execute" in command) {
				commands.push(command.data.toJSON());
			} else {
				console.warn(
					`[DEPLOY-CMDS] The command at ${filePath} is missing a required "data" or "execute" property.`,
				);
			}
		}
	}
} else {
	console.log("[DEPLOY-CMDS] All commands will be deleted.");
}

const rest = new REST().setToken(DISCORD_TOKEN);

try {
	const route = isProd
		? Routes.applicationCommands(APP_ID)
		: Routes.applicationGuildCommands(APP_ID, CHANNEL_ID);

	console.log(
		`[DEPLOY-CMDS] Started ${
			shouldDelete ? "deleting" : "refreshing"
		} ${commands.length} command(s) in ${envLabel} mode.`,
	);

	const data = await rest.put(
		route,
		{ body: shouldDelete ? [] : commands },
	);

	console.log(
		`[DEPLOY-CMDS] Successfully ${shouldDelete ? "deleted" : "reloaded"} ${
			(data as Array<unknown>).length
		} command(s).`,
	);
} catch (error) {
	console.error("[DEPLOY-CMDS] Failed:", error);
}
