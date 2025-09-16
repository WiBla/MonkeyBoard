import "dotenv/config";
import db from "./db.js";
import Monkey from "./monkey.js";
import {
	InteractionResponseFlags,
	InteractionResponseType,
} from "discord-interactions";

function getStartOfMonthTimestamp() {
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	return firstDayOfMonth.getTime();
}

export async function DiscordRequest(endpoint, options) {
	const url = "https://discord.com/api/v10/" + endpoint;
	if (options.body) options.body = JSON.stringify(options.body);

	const res = await fetch(url, {
		headers: {
			Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
			"Content-Type": "application/json; charset=UTF-8",
			"User-Agent":
				"DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
		},
		...options,
	});

	if (!res.ok) {
		const data = await res.json();
		console.log(res.status);
		throw new Error(JSON.stringify(data));
	}

	return res;
}

export async function InstallGlobalCommands(appId, commands) {
	// API endpoint to overwrite global commands
	const endpoint = `applications/${appId}/commands`;

	try {
		// This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
		await DiscordRequest(endpoint, { method: "PUT", body: commands });
	} catch (err) {
		console.error(err);
	}

	console.log("[utils] Commands installed successfully");
}

export function buildResponse({
	type = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
	flags,
	components,
}) {
	// Add component V2 by default
	flags |= InteractionResponseFlags.IS_COMPONENTS_V2;

	return {
		type,
		data: {
			flags,
			components,
		},
	};
}

export async function RegisterUser(discordId, apeKey) {
	let success = false;

	try {
		Monkey.setToken(apeKey);

		// Check if key is valid and allows us to get their Monkeytype uid
		const lastResult = await Monkey.getLastResult();
		if (!lastResult?.uid) throw new Error("Cannot get last result");
		console.log("[utils] Done fetching last results");

		// Get user's username
		const profile = await Monkey.getProfileByID(lastResult.uid);
		if (!profile?.name) throw new Error("Cannot get profile");
		console.log("[utils] Done fetching user profile");

		// Save user to DB
		await db.addUser(profile.uid, profile.name, discordId, apeKey);
		console.log("[utils] Done saving user to DB");

		// Get user's results since start of month & save them
		const results = await Monkey.getResults(getStartOfMonthTimestamp());
		await db.addResults(results);
		console.log("[utils] Done saving user's results from the current month");

		success = true;
		console.log("[utils] User registered successfully");
	} catch (err) {
		console.error("[utils] Error while registering user:", err.message);
	} finally {
		Monkey.deleteToken();
		return success;
	}
}

export async function switchUser() {
	try {
		const user = await db.getFirstUser();
		Monkey.setToken(user.apekey);
		return user;
	} catch (err) {
		console.error("[utils] Cannot switch user", err);
	}
}

export async function GetTags() {
	try {
		const user = await switchUser();
		const tags = await Monkey.getTags();
		db.addTags(tags, user.uid);
	} catch (err) {
		console.error("[utils] Cannot get tags", err);
	}
}
