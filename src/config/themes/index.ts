import type { DestinationTheme } from "@/features/themes/types";
import { goa } from "./goa";
import { manali } from "./manali";
import { munnar } from "./munnar";
import { ooty } from "./ooty";
import { wayanad } from "./wayanad";

/** Display order for destination discovery. Add new destinations here. */
export const destinationThemes: DestinationTheme[] = [munnar, goa, ooty, wayanad, manali];

export { fallbackTheme } from "./fallback";
