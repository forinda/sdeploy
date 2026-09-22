import { appOptions } from "./options";
import { createHandler } from "@forinda/kickjs";

export const handler = createHandler({...appOptions, trustProxy:'loopback'})
