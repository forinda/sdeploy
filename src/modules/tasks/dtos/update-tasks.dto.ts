import { z } from 'zod'

export const updateTasksSchema = z.object({
  name: z.string().min(1).max(200).optional(),
})

export type UpdateTasksDTO = z.infer<typeof updateTasksSchema>
