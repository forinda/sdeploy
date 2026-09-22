import { Service, Inject, HttpException } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import { TASKS_REPOSITORY, type TasksRepository } from './tasks.repository'
import type { TasksResponseDTO } from './dtos/tasks-response.dto'
import type { CreateTasksDTO } from './dtos/create-tasks.dto'
import type { UpdateTasksDTO } from './dtos/update-tasks.dto'

@Service()
export class TasksService {
  constructor(@Inject(TASKS_REPOSITORY) private readonly repo: TasksRepository) {}

  async findById(id: string): Promise<TasksResponseDTO | null> {
    return this.repo.findById(id)
  }

  async findAll(): Promise<TasksResponseDTO[]> {
    return this.repo.findAll()
  }

  async findPaginated(parsed: ParsedQuery) {
    return this.repo.findPaginated(parsed)
  }

  async create(dto: CreateTasksDTO): Promise<TasksResponseDTO> {
    return this.repo.create(dto)
  }

  async update(id: string, dto: UpdateTasksDTO): Promise<TasksResponseDTO> {
    return this.repo.update(id, dto)
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
