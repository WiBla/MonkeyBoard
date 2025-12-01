import * as path from "@std/path";
import { Routes } from "discord-api-types/v10";
import { REST } from "discord.js";
import { Command } from "./types/client.ts";
import { Logger } from "./utils/Logger.ts";

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

const log = new Logger({
	name: "DEPLOY-CMDS",
	level: isProd ? "INFO" : "DEBUG",
});

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
			log.warn(
				`The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

const rest = new REST().setToken(DISCORD_TOKEN);

try {
	const route = isProd
		? Routes.applicationCommands(APP_ID)
		: Routes.applicationGuildCommands(APP_ID, CHANNEL_ID);

	log.info(
		`Started refreshing ${commands.length} command(s) in ${envLabel} mode.`,
	);

	const data = await rest.put(route, { body: commands });

	log.info(
		`Successfully reloaded ${(data as Array<unknown>).length} command(s).`,
	);
} catch (err) {
	log.error("Failed:", err);
}
