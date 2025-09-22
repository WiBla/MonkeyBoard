import "dotenv/config";
import process from "node:process";

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

async function discordRequest(endpoint: string, options?: RequestInit) {
  const url = "https://discord.com/api/v10/" + endpoint;
  if (options?.body) options.body = JSON.stringify(options.body);

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

async function installGlobalCommands(
  appId: string | undefined,
  commands: BodyInit,
) {
  if (!appId) throw new Error("[Commands] Missing AppId");
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await discordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }

  console.log("[Commands] Commands installed successfully");
}

installGlobalCommands(process.env.APP_ID, [TEST_COMMAND, REGISTER_COMMAND]);
