import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listInventoryItems360,
  getInventoryItem360,
  createInventoryItem360,
  updateInventoryItem360,
  listCategories,
  ensureDefaultWarehouses,
  createWarehouse,
  listWarehouseLocations,
  createWarehouseLocation,
  listVendors,
  createVendor,
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  listTransfers,
  createTransfer,
  listAudits,
  createAudit,
  listTrucks,
  listCustomerInventory,
  assignToCustomer,
  allocateJobMaterial,
  generatePickList,
  getInventoryDashboard,
  generateForecasts,
  getInventoryAnalytics,
  processBarcodeAction,
  aiInventoryQuery,
  markItemDamaged,
  listLowStockInventory360,
  getInventoryLocationSummary,
  getItemJobAllocations,
} from '@yuletide/firebase';
import {
  createInventoryItem360Schema,
  updateInventoryItem360Schema,
  createWarehouseSchema,
  createWarehouseLocationSchema,
  createVendorSchema,
  createPurchaseOrderSchema,
  createTransferSchema,
  createAuditSchema,
  assignCustomerInventorySchema,
  allocateJobMaterialSchema,
  barcodeActionSchema,
  aiInventoryQuerySchema,
} from '@clcrm/validators';
import { router, officeProcedure } from '../trpc';

export const inventory360Router = router({
  dashboard: officeProcedure.query(({ ctx }) => getInventoryDashboard(ctx.auth.organizationId)),

  lowStock: officeProcedure.query(({ ctx }) => listLowStockInventory360(ctx.auth.organizationId)),

  locations: router({
    summary: officeProcedure.query(({ ctx }) => getInventoryLocationSummary(ctx.auth.organizationId)),
  }),

  analytics: officeProcedure.query(({ ctx }) => getInventoryAnalytics(ctx.auth.organizationId)),

  forecasts: officeProcedure.query(({ ctx }) => generateForecasts(ctx.auth.organizationId)),

  aiQuery: officeProcedure.input(aiInventoryQuerySchema).query(({ ctx, input }) =>
    aiInventoryQuery(ctx.auth.organizationId, input.question),
  ),

  items: router({
    list: officeProcedure.query(({ ctx }) => listInventoryItems360(ctx.auth.organizationId)),
    getById: officeProcedure.input(z.object({ itemId: z.string() })).query(async ({ ctx, input }) => {
      const item = await getInventoryItem360(ctx.auth.organizationId, input.itemId);
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
      const allocations = await getItemJobAllocations(ctx.auth.organizationId, input.itemId);
      return { item, allocations };
    }),
    create: officeProcedure.input(createInventoryItem360Schema).mutation(({ ctx, input }) =>
      createInventoryItem360(ctx.auth.organizationId, input as never, ctx.auth.userId),
    ),
    update: officeProcedure
      .input(z.object({ itemId: z.string(), data: updateInventoryItem360Schema }))
      .mutation(({ ctx, input }) =>
        updateInventoryItem360(ctx.auth.organizationId, input.itemId, input.data as never, ctx.auth.userId),
      ),
    markDamaged: officeProcedure
      .input(z.object({ itemId: z.string(), quantity: z.number().positive(), status: z.enum(['repair', 'replace', 'dispose']) }))
      .mutation(({ ctx, input }) =>
        markItemDamaged(ctx.auth.organizationId, input.itemId, input.quantity, input.status, ctx.auth.userId),
      ),
  }),

  categories: router({
    list: officeProcedure.query(({ ctx }) => listCategories(ctx.auth.organizationId)),
  }),

  warehouses: router({
    list: officeProcedure.query(({ ctx }) => ensureDefaultWarehouses(ctx.auth.organizationId)),
    create: officeProcedure.input(createWarehouseSchema).mutation(({ ctx, input }) =>
      createWarehouse(ctx.auth.organizationId, { organizationId: ctx.auth.organizationId, ...input, isActive: true } as never, ctx.auth.userId),
    ),
    locations: router({
      list: officeProcedure.input(z.object({ warehouseId: z.string() })).query(({ ctx, input }) =>
        listWarehouseLocations(ctx.auth.organizationId, input.warehouseId),
      ),
      create: officeProcedure.input(createWarehouseLocationSchema).mutation(({ ctx, input }) =>
        createWarehouseLocation(ctx.auth.organizationId, input.warehouseId, input, ctx.auth.userId),
      ),
    }),
  }),

  trucks: router({
    list: officeProcedure.query(({ ctx }) => listTrucks(ctx.auth.organizationId)),
  }),

  customers: router({
    list: officeProcedure.input(z.object({ customerId: z.string().optional() }).optional()).query(({ ctx, input }) =>
      listCustomerInventory(ctx.auth.organizationId, input?.customerId),
    ),
    assign: officeProcedure.input(assignCustomerInventorySchema).mutation(({ ctx, input }) =>
      assignToCustomer(ctx.auth.organizationId, input, null, ctx.auth.userId),
    ),
  }),

  vendors: router({
    list: officeProcedure.query(({ ctx }) => listVendors(ctx.auth.organizationId)),
    create: officeProcedure.input(createVendorSchema).mutation(({ ctx, input }) =>
      createVendor(ctx.auth.organizationId, { organizationId: ctx.auth.organizationId, ...input } as never, ctx.auth.userId),
    ),
  }),

  purchaseOrders: router({
    list: officeProcedure.query(({ ctx }) => listPurchaseOrders(ctx.auth.organizationId)),
    create: officeProcedure.input(createPurchaseOrderSchema).mutation(({ ctx, input }) =>
      createPurchaseOrder(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    updateStatus: officeProcedure
      .input(z.object({ poId: z.string(), status: z.enum(['draft', 'ordered', 'partially_received', 'received', 'closed']) }))
      .mutation(({ ctx, input }) =>
        updatePurchaseOrderStatus(ctx.auth.organizationId, input.poId, input.status, ctx.auth.userId),
      ),
  }),

  transfers: router({
    list: officeProcedure.query(({ ctx }) => listTransfers(ctx.auth.organizationId)),
    create: officeProcedure.input(createTransferSchema).mutation(({ ctx, input }) =>
      createTransfer(ctx.auth.organizationId, { ...input, transferredAt: new Date() } as never, ctx.auth.userId, ctx.auth.email),
    ),
  }),

  audits: router({
    list: officeProcedure.query(({ ctx }) => listAudits(ctx.auth.organizationId)),
    create: officeProcedure.input(createAuditSchema).mutation(({ ctx, input }) =>
      createAudit(ctx.auth.organizationId, input, ctx.auth.email, ctx.auth.userId),
    ),
  }),

  jobs: router({
    allocate: officeProcedure.input(allocateJobMaterialSchema).mutation(({ ctx, input }) =>
      allocateJobMaterial(ctx.auth.organizationId, input, ctx.auth.userId),
    ),
    pickList: officeProcedure.input(z.object({ jobId: z.string() })).query(({ ctx, input }) =>
      generatePickList(ctx.auth.organizationId, input.jobId),
    ),
  }),

  barcode: router({
    scan: officeProcedure.input(barcodeActionSchema).mutation(({ ctx, input }) =>
      processBarcodeAction(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),
  }),
});
