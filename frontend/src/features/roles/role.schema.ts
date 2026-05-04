import { z } from 'zod';

export const roleSchema = z.object({
  role_code: z
    .string()
    .min(2, 'Role code is required.')
    .regex(/^[A-Z0-9_]+$/i, 'Use letters, numbers, and underscores only.'),
  role_name: z.string().min(2, 'Role name is required.'),
  description: z.string().min(3, 'Description is required.'),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
