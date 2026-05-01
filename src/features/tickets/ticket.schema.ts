import { z } from 'zod';

export const ticketSchema = z.object({
  subject: z.string().min(3, 'Subject is required.'),
  status: z.enum(['Open', 'In Progress', 'Resolved']),
  priority: z.enum(['Low', 'Medium', 'High']),
  owner: z.string().min(2, 'Owner is required.'),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;
