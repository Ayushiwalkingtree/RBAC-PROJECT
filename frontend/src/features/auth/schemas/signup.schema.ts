import { z } from 'zod';

const passwordMessage = 'Use 8+ chars with uppercase, number, and special character.';

export const signupSchema = z.object({
  org_name: z.string().min(2, 'Organization name is required.'),
  org_code: z
    .string()
    .min(2, 'Organization code is required.')
    .regex(/^[A-Za-z0-9_ -]+$/u, 'Use letters, numbers, spaces, hyphen, or underscore.'),
  admin_name: z.string().min(2, 'Admin name is required.'),
  admin_email: z.string().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, passwordMessage)
    .regex(/[A-Z]/u, passwordMessage)
    .regex(/[0-9]/u, passwordMessage)
    .regex(/[^A-Za-z0-9]/u, passwordMessage),
  timezone: z.string().min(2, 'Timezone is required.'),
  plan: z.string().min(2, 'Plan is required.'),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
