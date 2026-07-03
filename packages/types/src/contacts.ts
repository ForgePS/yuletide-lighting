export type ContactRole =
  | 'primary'
  | 'spouse'
  | 'property_manager'
  | 'billing'
  | 'operations'
  | 'other';

export type ContactRecord = {
  id: string;
  organizationId: string;
  customerId?: string | null;
  customerName?: string | null;
  firstName: string;
  lastName: string;
  role: ContactRole;
  title?: string | null;
  phone?: string | null;
  phoneExtension?: string | null;
  email?: string | null;
  notes?: string | null;
  isPrimary: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  tags: string[];
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ContactListResult = {
  items: ContactRecord[];
  total: number;
  page: number;
  pageSize: number;
};
