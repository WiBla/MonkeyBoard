import { Client, Events } from "discord.js";
import { Event } from "../types/client.ts";

export default {
	name: Events.ClientReady,
	once: true,
	execute(client: Client) {
		console.log(`[BOT] Logged in as ${client.user!.tag}`);
	},
} as Event;
