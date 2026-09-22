/**
 * Tasks Module
 *
 * REST module with a flat folder structure.
 * Controller delegates to service, service wraps the repository.
 *
 * Structure:
 *   tasks.controller.ts  — HTTP routes (CRUD)
 *   tasks.service.ts     — Business logic
 *   tasks.repository.ts  — Repository: factory, contract, token
 *   dtos/                   — Request/response schemas
 *
 * The repository is backed by an in-memory Map so this module works as
 * generated. Swap in in-memory by replacing the factory body in
 * tasks.repository.ts — the contract is whatever that factory returns, so
 * nothing else has to change.
 */
import { defineModule } from '@forinda/kickjs'
import { TASKS_REPOSITORY, createTasksRepository } from './tasks.repository'
import { TasksController } from './tasks.controller'

// Eagerly load every module file so decorators (@Controller / @Service /
// @Repository, and anything you add) register in the DI container. The glob is
// deliberately broad: a suffix list only covers the names the generator happens
// to emit, so a hand-written `*.usecase.ts` or `*.policy.ts` silently never
// registered and failed later as `No provider for X` (#609). Recursive (./**/)
// so nesting keeps working.
import.meta.glob(['./**/*.ts', '!./**/*.test.ts', '!./**/*.d.ts'], { eager: true })

export const TasksModule = defineModule({
  name: 'TasksModule',
  build: () => ({
    register(container) {
      container.registerFactory(TASKS_REPOSITORY, () => createTasksRepository())
    },

    /**
     * Declare HTTP routes for this module. Return value shape:
     *
     *   - `path`        — URL prefix for this route set.
     *   - `controller`  — Controller class (also drives OpenAPI).
     *   - `version`     — Optional. Overrides the app-wide API version.
     *
     * Return an **array** to mount multiple route sets — admin
     * surfaces, side-by-side v1 + v2 controllers, etc:
     *
     *   return [
     *     { path: '/tasks', version: 1, controller: TasksV1Controller },
     *     { path: '/tasks', version: 2, controller: TasksV2Controller },
     *   ]
     */
    routes() {
      return {
        path: '/tasks',
        controller: TasksController,
      }
    },
  }),
})
