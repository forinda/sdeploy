import type { QueryFieldConfig } from '@forinda/kickjs'

export const TASKS_QUERY_CONFIG: QueryFieldConfig = {
  filterable: ['name'],
  sortable: ['name', 'createdAt'],
  searchable: ['name'],
}
