import type { Ticket } from '@/shared/types/domain.types';

export type TicketInput = {
  orgId: string;
  subject: string;
  status: Ticket['status'];
  priority: Ticket['priority'];
  owner: string;
};

const unavailable = (): never => {
  throw new Error('Tickets API is not available in this backend.');
};

export const ticketService = {
  listTickets: async (orgId: string): Promise<Ticket[]> => {
    void orgId;
    return [];
  },

  createTicket: async (input: TicketInput): Promise<Ticket> => {
    void input;
    return unavailable();
  },

  updateTicket: async (ticketId: string, input: TicketInput): Promise<Ticket> => {
    void ticketId;
    void input;
    return unavailable();
  },

  assignTicket: async (ticketId: string, owner: string): Promise<Ticket> => {
    void ticketId;
    void owner;
    return unavailable();
  },

  deleteTicket: async (ticketId: string): Promise<void> => {
    void ticketId;
    return unavailable();
  },
};
