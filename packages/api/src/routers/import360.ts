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
import { router, officeProcedure } from '../trpc';

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

export const import360Router = router({
  preview: officeProcedure.input(importPreviewInputSchema).mutation(({ input }) => previewHandlers[input.entity](input.rows)),

  run: officeProcedure.input(importRunInputSchema).mutation(async ({ ctx, input }) => {
    const orgId = ctx.auth.organizationId;
    const userId = ctx.auth.userId;
    return importHandlers[input.entity](orgId, userId, input.rows, { skipDuplicates: input.skipDuplicates });
  }),
});
