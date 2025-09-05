import db from "./db.js";
import Monkey from "./monkey.js";

async function main() {
	// Get profile
	// const profile = await Monkey.getProfile("wibla");
	// await db.addUser(profile.uid, profile.name, profile.discordId);

	const tags = await Monkey.getTags();
	console.log(tags, Monkey.uid);

	await db.close();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
