import * as path from "@std/path";
import { Routes } from "discord-api-types/v10";
import { REST } from "discord.js";
import { Command } from "./types/commands.ts";

// #region Basic setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const APP_ID = Deno.env.get("APP_ID");

if (!DISCORD_TOKEN || !APP_ID) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}
// #endregion Basic setup

const commands: Command[] = [];
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

const rest = new REST().setToken(DISCORD_TOKEN);

try {
	console.log(
		`[DEPLOY-CMDS] Started refreshing ${commands.length} application (/) commands.`,
	);

	const data = await rest.put(
		// TODO check for dev or prod env
		Routes.applicationGuildCommands(APP_ID, "657335250220744714"),
		{ body: commands },
	);
	console.log(
		`[DEPLOY-CMDS] Successfully reloaded ${
			(data as Array<unknown>).length
		} application (/) commands`,
	);
} catch (error) {
	console.error(error);
}
