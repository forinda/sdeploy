import 'reflect-metadata'
// Side-effect import — registers the extended env schema with kickjs
// **before** any controller / service / @Value gets resolved. Without
// this line ConfigService.get('YOUR_KEY') returns undefined because the
// cached schema would still be the base shape. See guide/configuration.
import '@/config'
import { modules } from "@/modules";
import { expressRuntime, type ApplicationOptions } from "@forinda/kickjs";



export const appOptions: ApplicationOptions = {
  modules: modules,
  runtime: expressRuntime()
}
