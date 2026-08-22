import type { PermissionResource } from '@clcrm/types';
import {
  importCsvContacts,
  importCsvCustomers,
  importCsvInventory,
  importCsvInvoices,
  importCsvProjects,
  previewCsvContacts,
  previewCsvCustomers,
  previewCsvInventory,
  previewCsvInvoices,
  previewCsvProjects,
} from '@yuletide/firebase';
import { importPreviewInputSchema, importRunInputSchema } from '@clcrm/validators';
import { assertAuthCan } from '../permissions';
import { router, protectedProcedure } from '../trpc';

const previewHandlers = {
  customers: previewCsvCustomers,
  contacts: previewCsvContacts,
  projects: previewCsvProjects,
  invoices: previewCsvInvoices,
  inventory: previewCsvInventory,
} as const;

const importHandlers = {
  customers: importCsvCustomers,
  contacts: importCsvContacts,
  projects: importCsvProjects,
  invoices: importCsvInvoices,
  inventory: importCsvInventory,
} as const;

const importEntityCreateResource: Record<keyof typeof importHandlers, PermissionResource> = {
  customers: 'customers',
  contacts: 'customers',
  projects: 'jobs',
  invoices: 'invoices',
  inventory: 'inventory',
};

function assertImportCreate(
  auth: Parameters<typeof assertAuthCan>[0],
  entity: keyof typeof importEntityCreateResource,
) {
  const resource = importEntityCreateResource[entity] ?? 'customers';
  assertAuthCan(auth, resource, 'create');
}

export const import360Router = router({
  preview: protectedProcedure.input(importPreviewInputSchema).mutation(({ ctx, input }) => {
    assertImportCreate(ctx.auth, input.entity);
    return previewHandlers[input.entity](input.rows);
  }),

  run: protectedProcedure.input(importRunInputSchema).mutation(async ({ ctx, input }) => {
    assertImportCreate(ctx.auth, input.entity);
    const orgId = ctx.auth.organizationId;
    const userId = ctx.auth.userId;
    return importHandlers[input.entity](orgId, userId, input.rows, { skipDuplicates: input.skipDuplicates });
  }),
});
