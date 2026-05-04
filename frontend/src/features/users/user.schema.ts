import { z } from 'zod';

const passwordMessage = 'Password needs 8+ chars with uppercase, number, and special character.';

export const userSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.'),
  email: z.string().email('Enter a valid email address.'),
  password: z
    .string()
    .refine(
      (value) =>
        value === '' ||
        (value.length >= 8 && /[A-Z]/u.test(value) && /[0-9]/u.test(value) && /[^A-Za-z0-9]/u.test(value)),
      passwordMessage,
    )
    .optional(),
  department: z.string().min(2, 'Department is required.'),
  role_ids: z.array(z.string()).min(1, 'Select at least one role.'),
  is_active: z.boolean(),
});

export type UserFormValues = z.infer<typeof userSchema>;
