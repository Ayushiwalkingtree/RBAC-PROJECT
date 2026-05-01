import { z } from 'zod';

export const userSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  department: z.string().min(2, 'Department is required.'),
  role_ids: z.array(z.string()).min(1, 'Select at least one role.'),
  is_active: z.boolean(),
});

export type UserFormValues = z.infer<typeof userSchema>;
