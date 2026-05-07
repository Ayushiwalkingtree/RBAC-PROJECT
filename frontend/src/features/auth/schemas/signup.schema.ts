import { z } from 'zod';

const passwordMessage = 'Use 8+ chars with uppercase, number, and special character.';
const publicEmailDomains = new Set([
  'aol.com',
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'mail.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
  'yandex.com',
  'zoho.com',
]);

const isBusinessEmail = (email: string) => {
  const parts = email.trim().toLowerCase().split('@');
  const domain = parts[parts.length - 1] ?? '';
  return !publicEmailDomains.has(domain);
};

export const signupSchema = z.object({
  org_name: z.string().min(2, 'Organization name is required.'),
  admin_name: z.string().min(2, 'Admin name is required.'),
  admin_email: z
    .string()
    .email('Enter a valid email address.')
    .refine(isBusinessEmail, 'Use your organization email, not a public email provider.'),
  password: z
    .string()
    .min(8, passwordMessage)
    .regex(/[A-Z]/u, passwordMessage)
    .regex(/[0-9]/u, passwordMessage)
    .regex(/[^A-Za-z0-9]/u, passwordMessage),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
