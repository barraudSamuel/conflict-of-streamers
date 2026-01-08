// Shared Zod validation schemas
// Export all schemas here
import { z } from 'zod'

// Placeholder schema
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Player schemas will be added in future stories
// Game schemas will be added in future stories
// Territory schemas will be added in future stories
