export type Ticket = {
  id: string;
  orgId: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  owner: string;
  isDeleted?: boolean;
};

export type Report = {
  id: string;
  orgId: string;
  name: string;
  category: string;
  updatedAt: string;
};

export type TenantSetting = {
  orgId: string;
  key: string;
  value: string;
};
