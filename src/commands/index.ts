import { Command } from "../types/client.ts";
import actualiser from "./score/actualiser.ts";
import dernierpodium from "./score/dernierpodium.ts";
import podium from "./score/podium.ts";
import scoremanuel from "./score/scoremanuel.ts";
import toutmaj from "./score/toutmaj.ts";
import voirmonscore from "./score/voirmonscore.ts";
import connexion from "./user/connexion.ts";
import deconnexion from "./user/deconnexion.ts";
import quitter from "./user/quitter.ts";
import rejoindre from "./user/rejoindre.ts";

export default [
	actualiser,
	dernierpodium,
	podium,
	scoremanuel,
	toutmaj,
	voirmonscore,
	connexion,
	deconnexion,
	quitter,
	rejoindre,
] as Command[];
