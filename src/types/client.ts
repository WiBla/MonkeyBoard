import {
	BaseInteraction,
	ChatInputCommandInteraction,
	Client,
	Collection,
	SlashCommandBuilder,
} from "discord.js";

export interface Command {
	data: SlashCommandBuilder;
	cooldown?: number;
	execute: (
		interaction: ChatInputCommandInteraction,
	) => Promise<void>;
}

export interface Event {
	name: string;
	once?: boolean;
	execute:
		| ((interaction: BaseInteraction) => Promise<void>)
		| ((client: Client) => Promise<void>);
}

export type TSClient = Client & {
	commands: Collection<string, Command>;
	cooldowns: Collection<string, Collection<string, number>>;
};
