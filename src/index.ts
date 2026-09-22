import { bootstrap } from '@forinda/kickjs'
import { appOptions } from './options'

// Export the app for the Vite plugin (dev mode)
export const app = await bootstrap(appOptions)
