import { Command } from "../types/discord.d.ts";
import {
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	DiscordApplicationIntegrationType,
	DiscordInteractionContextType,
} from "../utils/discord.ts";

const APP_ID = Deno.env.get("APP_ID");
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
if (!APP_ID || !DISCORD_TOKEN) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}

const baseCmd = {
	type: ApplicationCommandTypes.ChatInput,
	integration_types: [DiscordApplicationIntegrationType.GuildInstall],
	contexts: [DiscordInteractionContextType.Guild],
};

const REGISTER_COMMAND: Command = {
	name: "register",
	description:
		"Liez votre compte discord à votre compte Monkeytype à l'aide d'une clé d'API",
	options: [
		{
			type: ApplicationCommandOptionTypes.String,
			name: "apekey",
			description: "Une clé d'authentification généré depuis le site",
			required: false,
		},
	],
	...baseCmd,
};

const UNLINK_COMMAND: Command = {
	name: "unlink",
	description: "Supprime toutes les données vous concernant",
	...baseCmd,
};

const GET_MY_SCORE_COMMAND: Command = {
	name: "getmyscore",
	description: "Récupère votre score du mois",
	...baseCmd,
};

const UPDATE_MY_SCORE_COMMAND: Command = {
	name: "updatemyscore",
	description: "Met à jours vos scores",
	...baseCmd,
};

const LEADERBOARD_COMMAND: Command = {
	name: "leaderboard",
	description: "Avoir un aperçu du leaderboard",
	...baseCmd,
};

const UPDATEALL_COMMAND: Command = {
	name: "updateall",
	description: "Met à jour tous les scores",
	...baseCmd,
};

async function bulkUpdateCommands(commands: Command[]) {
	const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;
	const options = {
		method: "PUT",
		body: JSON.stringify(commands),
	};

	const res = await fetch(url, {
		headers: {
			Authorization: `Bot ${DISCORD_TOKEN}`,
			"Content-Type": "application/json; charset=UTF-8",
			"User-Agent":
				"DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
		},
		...options,
	});

	if (!res.ok) {
		const data = await res.json();
		throw new Error(JSON.stringify(data));
	}

	return res;
}

export async function installGlobalCommands(
	commands: Command[],
) {
	try {
		// This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
		await bulkUpdateCommands(commands);
		console.log("[Commands] Commands installed successfully");
	} catch (err) {
		console.error("[Commands] Error installing commands:", err);
	}
}

await installGlobalCommands([
	REGISTER_COMMAND,
	UNLINK_COMMAND,
	GET_MY_SCORE_COMMAND,
	UPDATE_MY_SCORE_COMMAND,
	LEADERBOARD_COMMAND,
	UPDATEALL_COMMAND,
]);
