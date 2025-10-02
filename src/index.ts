import * as path from "@std/path";
import {
	BaseInteraction,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	MessageFlags,
} from "discord.js";
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
client.commands = new Collection();

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
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			client.commands.set(command.data.name, command);
		} else {
			console.warn(
				`[BOT] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
	console.debug(interaction);
	if (!interaction.isChatInputCommand()) return;

	const command = (interaction.client as TSClient).commands.get(
		interaction.commandName,
	);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error("[BOT]", error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: "There was an error whlie executing this command!",
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: "There was an error while executing this command!",
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	console.log("[BOT]", interaction);
});

client.once(Events.ClientReady, (readyClient) => {
	console.log(`[BOT] Logged in as ${readyClient.user.tag}`);
});

client.login(DISCORD_TOKEN);
// #endregion Create Discord client
