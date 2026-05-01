import { mockDbService } from '@/mock/services/mockDb.service';
import type { Ticket } from '@/shared/types/domain.types';

export type TicketInput = {
  orgId: string;
  subject: string;
  status: Ticket['status'];
  priority: Ticket['priority'];
  owner: string;
};

export const ticketService = {
  listTickets: async (orgId: string): Promise<Ticket[]> => {
    const database = await mockDbService.getDatabase();
    return database.tickets.filter((ticket) => ticket.orgId === orgId && !ticket.isDeleted);
  },

  createTicket: async (input: TicketInput): Promise<Ticket> => {
    let createdTicket: Ticket | null = null;
    await mockDbService.updateDatabase((database) => {
      const ticketNumber = database.tickets.length + 1001;
      createdTicket = {
        id: `TCK-${ticketNumber}`,
        orgId: input.orgId,
        subject: input.subject.trim(),
        status: input.status,
        priority: input.priority,
        owner: input.owner.trim(),
        isDeleted: false,
      };

      return { ...database, tickets: [...database.tickets, createdTicket] };
    });

    if (!createdTicket) {
      throw new Error('Unable to create ticket.');
    }

    return createdTicket;
  },

  updateTicket: async (ticketId: string, input: TicketInput): Promise<Ticket> => {
    let updatedTicket: Ticket | null = null;
    await mockDbService.updateDatabase((database) => ({
      ...database,
      tickets: database.tickets.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket;
        }

        updatedTicket = {
          ...ticket,
          subject: input.subject.trim(),
          status: input.status,
          priority: input.priority,
          owner: input.owner.trim(),
        };

        return updatedTicket;
      }),
    }));

    if (!updatedTicket) {
      throw new Error('Ticket was not found.');
    }

    return updatedTicket;
  },

  assignTicket: async (ticketId: string, owner: string): Promise<Ticket> => {
    let updatedTicket: Ticket | null = null;
    await mockDbService.updateDatabase((database) => ({
      ...database,
      tickets: database.tickets.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket;
        }

        updatedTicket = { ...ticket, owner: owner.trim() };
        return updatedTicket;
      }),
    }));

    if (!updatedTicket) {
      throw new Error('Ticket was not found.');
    }

    return updatedTicket;
  },

  deleteTicket: async (ticketId: string): Promise<void> => {
    await mockDbService.updateDatabase((database) => ({
      ...database,
      tickets: database.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, isDeleted: true } : ticket,
      ),
    }));
  },
};
