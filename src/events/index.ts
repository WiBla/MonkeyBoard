import { Event } from "../types/client.ts";
import buttonInteraction from "./buttonInteraction.ts";
import interactionCreate from "./interactionCreate.ts";
import ready from "./ready.ts";

export default [buttonInteraction, interactionCreate, ready] as Event[];
