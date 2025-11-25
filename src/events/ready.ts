import { Client, Events } from "discord.js";
import { log } from "../index.ts";
import { Event } from "../types/client.ts";

export default {
	name: Events.ClientReady,
	once: true,
	execute(client: Client) {
		log.info(`Logged in as ${client.user!.tag}`);
	},
} as Event;
