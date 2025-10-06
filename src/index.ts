import * as path from "@std/path";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { TSClient } from "./types/client.ts";

// #region Basic setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const PUBLIC_KEY = Deno.env.get("PUBLIC_KEY");

if (!DISCORD_TOKEN || !PUBLIC_KEY) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}
// #endregion Basic setup

// #region Create Discord client
console.log("[BOT] Starting up client...");

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as TSClient;

// #region Auto attach commands
const commandsFolders = path.join(Deno.cwd(), "src/commands");
client.commands = new Collection();

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
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			client.commands.set(command.data.name, command);
		} else {
			console.warn(
				`[BOT] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}
// #endregion Auto attach commands

// #region Auto Event handling
const eventFiles = path.join(Deno.cwd(), "src/events");

for await (const file of Deno.readDir(eventFiles)) {
	if (!file.isFile || !file.name.endsWith(".ts")) continue;

	const filePath = path.join(eventFiles, file.name);
	const eventModule = await import(`file://${filePath}`);
	const event = eventModule.default ?? eventModule;

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
// #endregion Auto Event handling

client.login(DISCORD_TOKEN);
// #endregion Create Discord client
