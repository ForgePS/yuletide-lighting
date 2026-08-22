import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  listInventoryItems360,
  getInventoryItem360,
  createInventoryItem360,
  updateInventoryItem360,
  bulkUpdateInventoryItems360,
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
  bulkUpdateInventoryItemsSchema,
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
import { router, permissionProcedure, officeProcedure } from '../trpc';

export const inventory360Router = router({
  dashboard: permissionProcedure('inventory', 'view').query(({ ctx }) =>
    getInventoryDashboard(ctx.auth.organizationId),
  ),

  lowStock: permissionProcedure('inventory', 'view').query(({ ctx }) =>
    listLowStockInventory360(ctx.auth.organizationId),
  ),

  locations: router({
    summary: permissionProcedure('inventory', 'view').query(({ ctx }) =>
      getInventoryLocationSummary(ctx.auth.organizationId),
    ),
  }),

  analytics: permissionProcedure('inventory', 'view').query(({ ctx }) =>
    getInventoryAnalytics(ctx.auth.organizationId),
  ),

  forecasts: permissionProcedure('inventory', 'view').query(({ ctx }) =>
    generateForecasts(ctx.auth.organizationId),
  ),

  aiQuery: permissionProcedure('inventory', 'view')
    .input(aiInventoryQuerySchema)
    .query(({ ctx, input }) => aiInventoryQuery(ctx.auth.organizationId, input.question)),

  items: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) =>
      listInventoryItems360(ctx.auth.organizationId),
    ),
    getById: permissionProcedure('inventory', 'view')
      .input(z.object({ itemId: z.string() }))
      .query(async ({ ctx, input }) => {
        const item = await getInventoryItem360(ctx.auth.organizationId, input.itemId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND' });
        const allocations = await getItemJobAllocations(ctx.auth.organizationId, input.itemId);
        return { item, allocations };
      }),
    create: permissionProcedure('inventory', 'create')
      .input(createInventoryItem360Schema)
      .mutation(({ ctx, input }) =>
        createInventoryItem360(ctx.auth.organizationId, input as never, ctx.auth.userId),
      ),
    update: permissionProcedure('inventory', 'edit')
      .input(z.object({ itemId: z.string(), data: updateInventoryItem360Schema }))
      .mutation(({ ctx, input }) =>
        updateInventoryItem360(ctx.auth.organizationId, input.itemId, input.data as never, ctx.auth.userId),
      ),
    bulkUpdate: officeProcedure.input(bulkUpdateInventoryItemsSchema).mutation(({ ctx, input }) => {
      const { itemIds, ...patch } = input;
      return bulkUpdateInventoryItems360(ctx.auth.organizationId, itemIds, patch, ctx.auth.userId);
    }),
    markDamaged: permissionProcedure('inventory', 'edit')
      .input(
        z.object({
          itemId: z.string(),
          quantity: z.number().positive(),
          status: z.enum(['repair', 'replace', 'dispose']),
        }),
      )
      .mutation(({ ctx, input }) =>
        markItemDamaged(
          ctx.auth.organizationId,
          input.itemId,
          input.quantity,
          input.status,
          ctx.auth.userId,
        ),
      ),
  }),

  categories: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) =>
      listCategories(ctx.auth.organizationId),
    ),
  }),

  warehouses: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) =>
      ensureDefaultWarehouses(ctx.auth.organizationId),
    ),
    create: permissionProcedure('inventory', 'create')
      .input(createWarehouseSchema)
      .mutation(({ ctx, input }) =>
        createWarehouse(
          ctx.auth.organizationId,
          { organizationId: ctx.auth.organizationId, ...input, isActive: true } as never,
          ctx.auth.userId,
        ),
      ),
    locations: router({
      list: permissionProcedure('inventory', 'view')
        .input(z.object({ warehouseId: z.string() }))
        .query(({ ctx, input }) => listWarehouseLocations(ctx.auth.organizationId, input.warehouseId)),
      create: permissionProcedure('inventory', 'create')
        .input(createWarehouseLocationSchema)
        .mutation(({ ctx, input }) =>
          createWarehouseLocation(ctx.auth.organizationId, input.warehouseId, input, ctx.auth.userId),
        ),
    }),
  }),

  trucks: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) => listTrucks(ctx.auth.organizationId)),
  }),

  customers: router({
    list: permissionProcedure('inventory', 'view')
      .input(z.object({ customerId: z.string().optional() }).optional())
      .query(({ ctx, input }) => listCustomerInventory(ctx.auth.organizationId, input?.customerId)),
    assign: permissionProcedure('inventory', 'edit')
      .input(assignCustomerInventorySchema)
      .mutation(({ ctx, input }) => assignToCustomer(ctx.auth.organizationId, input, null, ctx.auth.userId)),
  }),

  vendors: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) => listVendors(ctx.auth.organizationId)),
    create: permissionProcedure('inventory', 'create')
      .input(createVendorSchema)
      .mutation(({ ctx, input }) =>
        createVendor(
          ctx.auth.organizationId,
          { organizationId: ctx.auth.organizationId, ...input } as never,
          ctx.auth.userId,
        ),
      ),
  }),

  purchaseOrders: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) =>
      listPurchaseOrders(ctx.auth.organizationId),
    ),
    create: permissionProcedure('inventory', 'create')
      .input(createPurchaseOrderSchema)
      .mutation(({ ctx, input }) => createPurchaseOrder(ctx.auth.organizationId, input, ctx.auth.userId)),
    updateStatus: permissionProcedure('inventory', 'edit')
      .input(
        z.object({
          poId: z.string(),
          status: z.enum(['draft', 'ordered', 'partially_received', 'received', 'closed']),
        }),
      )
      .mutation(({ ctx, input }) =>
        updatePurchaseOrderStatus(ctx.auth.organizationId, input.poId, input.status, ctx.auth.userId),
      ),
  }),

  transfers: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) => listTransfers(ctx.auth.organizationId)),
    create: permissionProcedure('inventory', 'create')
      .input(createTransferSchema)
      .mutation(({ ctx, input }) =>
        createTransfer(
          ctx.auth.organizationId,
          { ...input, transferredAt: new Date() } as never,
          ctx.auth.userId,
          ctx.auth.email,
        ),
      ),
  }),

  audits: router({
    list: permissionProcedure('inventory', 'view').query(({ ctx }) => listAudits(ctx.auth.organizationId)),
    create: permissionProcedure('inventory', 'create')
      .input(createAuditSchema)
      .mutation(({ ctx, input }) =>
        createAudit(ctx.auth.organizationId, input, ctx.auth.email, ctx.auth.userId),
      ),
  }),

  jobs: router({
    allocate: permissionProcedure('inventory', 'edit')
      .input(allocateJobMaterialSchema)
      .mutation(({ ctx, input }) => allocateJobMaterial(ctx.auth.organizationId, input, ctx.auth.userId)),
    pickList: permissionProcedure('inventory', 'view')
      .input(z.object({ jobId: z.string() }))
      .query(({ ctx, input }) => generatePickList(ctx.auth.organizationId, input.jobId)),
  }),

  barcode: router({
    scan: permissionProcedure('inventory', 'edit')
      .input(barcodeActionSchema)
      .mutation(({ ctx, input }) =>
        processBarcodeAction(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
      ),
  }),
});
