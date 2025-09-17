import {
  InteractionResponseFlags,
  InteractionResponseType,
} from "discord-interactions";
import "dotenv/config";
import db from "./db.js";
import Monkey from "./monkey.js";

function getStartOfMonthTimestamp() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDayOfMonth.getTime();
}

async function getAllScoresAfter(timestamp, offset = 0, total = 0) {
  const results = await Monkey.getResults(timestamp, offset);

  if (results !== undefined && results.length > 0) {
    console.log(`[Utils] Found ${results.length} scores, total ${total}`);

    total += results.length;
    await db.addResults(results);
    console.log(`[Utils] Done saving current score data`);

    if (results.length >= 1000) getAllScoresAfter(timestamp, offset + 1, total);
  }

  return total;
}

async function updateResultsOf(uid) {
  try {
    // Attempts to get the latest result that is already in DB
    let timestamp = await db.getMostRecentTimestamp(uid);
    // Otherwise start from the 1st of the month
    timestamp ??= getStartOfMonthTimestamp();

    const total = await getAllScoresAfter(timestamp);

    console.log(
      `[Utils] Done saving ${total} new result(s) from this user's monthly activity`,
    );
  } catch (err) {
    console.error("[Utils] Error while updating user results", err);
  }
}

export async function discordRequest(endpoint, options) {
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

export async function installGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await discordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }

  console.log("[Utils] Commands installed successfully");
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

export async function registerUser(discordId, apeKey) {
  let success = false;

  try {
    Monkey.setToken(apeKey);

    // Check if key is valid and allows us to get their Monkeytype uid
    const lastResult = await Monkey.getLastResult();
    if (!lastResult?.uid) throw new Error("Cannot get last result");
    console.log("[Utils] Done fetching last results");

    // Get user's username
    const profile = await Monkey.getProfileByID(lastResult.uid);
    if (!profile?.name) throw new Error("Cannot get profile");
    console.log(`[Utils] Done fetching user profile, hello ${profile.name} !`);

    // Save user to DB
    await db.addUser(profile.uid, profile.name, discordId, apeKey, true);
    console.log("[Utils] Done saving user to DB");

    await updateResultsOf(profile.uid);

    success = true;
    console.log("[Utils] User registered successfully");
  } catch (err) {
    console.error("[Utils] Error while registering user:", err.message);
  } finally {
    Monkey.deleteToken();
  }

  return success;
}

export async function switchUser() {
  try {
    const user = await db.getFirstUser();
    Monkey.setToken(user.apekey);
    return user;
  } catch (err) {
    console.error("[Utils] Cannot switch user", err);
  }
}

export async function getTags() {
  try {
    const user = await switchUser();
    const tags = await Monkey.getTags();
    db.addTags(tags, user.uid);
  } catch (err) {
    console.error("[Utils] Cannot get tags", err);
  }
}

export async function getAllScores() {
  try {
    const users = await db.getAllUsers();
    const promises = [];

    for (const user of users) {
      promises.push(
        new Promise(() => {
          Monkey.setToken(user.apekey);

          if (!Monkey.isKeyValid())
            return Promise.reject("Invalid ApeKey for user", user);

          updateResultsOf(user.uid);
        }),
      );
    }

    Promise.allSettled(promises);
  } catch (err) {
    console.error("[Utils] Cannot get users", err);
  }
}
