/**
 * Tasks repository.
 *
 * Backed by an in-memory Map: a working store with no dependencies.
 *
 * The factory's return type IS the contract: `TasksRepository` is derived
 * from it, so the implementation and its interface cannot drift apart. To swap
 * stores, write another factory returning a compatible shape and bind that one
 * in the module — nothing else has to change.
 */
import { randomUUID } from 'node:crypto'
import { createToken, HttpException } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import type { TasksResponseDTO } from './dtos/tasks-response.dto'
import type { CreateTasksDTO } from './dtos/create-tasks.dto'
import type { UpdateTasksDTO } from './dtos/update-tasks.dto'

export function createTasksRepository() {
  const store = new Map<string, TasksResponseDTO>()

  return {
    async findById(id: string): Promise<TasksResponseDTO | null> {
      return store.get(id) ?? null
    },

    async findAll(): Promise<TasksResponseDTO[]> {
      return [...store.values()]
    },

    async findPaginated(parsed: ParsedQuery): Promise<{ data: TasksResponseDTO[]; total: number }> {
      const all = [...store.values()]
      const { offset, limit } = parsed.pagination
      return { data: all.slice(offset, offset + limit), total: all.length }
    },

    async create(dto: CreateTasksDTO): Promise<TasksResponseDTO> {
      const now = new Date().toISOString()
      const entity = {
        id: randomUUID(),
        ...dto,
        createdAt: now,
        updatedAt: now,
      } as TasksResponseDTO
      store.set(entity.id, entity)
      return entity
    },

    async update(id: string, dto: UpdateTasksDTO): Promise<TasksResponseDTO> {
      const existing = store.get(id)
      if (!existing) throw HttpException.notFound('Tasks not found')
      const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() }
      store.set(id, updated)
      return updated
    },

    async delete(id: string): Promise<void> {
      if (!store.has(id)) throw HttpException.notFound('Tasks not found')
      store.delete(id)
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type TasksRepository = ReturnType<typeof createTasksRepository>

/**
 * Collision-safe DI token bound to `TasksRepository`.
 * `container.resolve(TASKS_REPOSITORY)` and
 * `@Inject(TASKS_REPOSITORY)` both return the typed
 * contract — no manual generic, no `any` cast.
 *
 * The `'sdeploy/'` prefix matches the project scope so
 * `kick-lint`'s `token-reserved-prefix` rule never fires —
 * adopters must NOT use the reserved `'kick/'` namespace.
 */
export const TASKS_REPOSITORY = createToken<TasksRepository>('sdeploy/Tasks/repository')
