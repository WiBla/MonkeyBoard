import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
	name: "test",
	description: "Basic command",
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
};

// Allow users to link their monkeytype ApeKey
const REGISTER_COMMAND = {
	name: "register",
	description:
		"Liez votre compte discord à votre compte Monkeytype à l'aide d'une clé d'API",
	options: [
		{
			type: 3,
			name: "apekey",
			description: "Une clé d'authentification généré depuis le site",
			required: false,
		},
	],
	type: 1,
	integration_types: [0, 1],
	contexts: [0, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, REGISTER_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
