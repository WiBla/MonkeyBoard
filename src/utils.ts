import {
  InteractionResponseFlags,
  InteractionResponseType,
} from "discord-interactions";
import "dotenv/config";
import db from "./db.ts";
import Monkey from "./monkey.ts";

function getStartOfMonthTimestamp(): number {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDayOfMonth.getTime();
}

async function getAllScoresAfter(
  timestamp: number | null = null,
  offset = 0,
  total = 0,
): Promise<number> {
  const results = await Monkey.getResults(timestamp, offset);

  if (results !== undefined && results.length > 0) {
    total += results.length;
    console.log(`[Utils] Found ${results.length} scores, total ${total}`);

    db.addResults(results);
    console.log(`[Utils] Done saving current score data`);

    if (results.length >= 1000) getAllScoresAfter(timestamp, offset + 1, total);
  }

  return Promise.resolve(total);
}

async function updateResultsOf(uid: string) {
  try {
    // Attempts to get the latest result that is already in DB
    let timestamp = db.getMostRecentTimestamp(uid);
    console.debug(timestamp);
    // Otherwise start from the 1st of the month
    timestamp ??= getStartOfMonthTimestamp();
    console.debug(timestamp);

    const total = await getAllScoresAfter(timestamp);

    console.log(
      `[Utils] Done saving ${total} new result(s) from this user's monthly activity`,
    );
  } catch (err) {
    console.error("[Utils] Error while updating user results", err);
  }
}

export function buildResponse({
  type = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  flags = 0,
  components,
}: {
  type?: number;
  flags?: number;
  components: {
    type: number;
    items?: { media: { url: string } }[];
    content?: string;
  }[];
}) {
  // Add component V2 by default
  flags |= InteractionResponseFlags.IS_COMPONENTS_V2;

  return { type, data: { flags, components } };
}

export async function registerUser(discordId: string, apeKey: string) {
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
    db.addUser(profile.uid, profile.name, discordId, apeKey, true);
    console.log("[Utils] Done saving user to DB");

    await updateResultsOf(profile.uid);

    success = true;
    console.log("[Utils] User registered successfully");
  } catch (err) {
    console.error("[Utils] Error while registering user:", err);
  } finally {
    Monkey.deleteToken();
  }

  return success;
}

export function getAllScores() {
  try {
    const users = db.getAllUsers();
    const promises = [];

    for (const user of users) {
      promises.push(
        new Promise(() => {
          Monkey.setToken(user.apekey);

          if (!Monkey.isKeyValid())
            return Promise.reject("Invalid ApeKey for user" + user.apeKey);

          updateResultsOf(user.uid);
        }),
      );
    }

    Promise.allSettled(promises);
  } catch (err) {
    console.error("[Utils] Cannot get users", err);
  }
}
