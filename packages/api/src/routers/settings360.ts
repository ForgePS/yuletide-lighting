import { z } from 'zod';
import {
  getSettingsDashboard,
  getCompanySettings,
  updateCompanySettings,
  getBrandingSettings,
  updateBrandingSettings,
  listOrgUsers,
  updateOrgUser,
  inviteOrgUser,
  listRoles,
  updateRolePermissions,
  getNotificationSettings,
  updateNotificationSettings,
  updateNotificationRule,
  getAutomationSettings,
  updateAutomationRule,
  getProposalSettings,
  updateProposalSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getJobSettings,
  updateJobSettings,
  getSeasonSettings,
  updateSeasonSettings,
  getBrandingForCustomerFacing,
  getInventorySettings,
  updateInventorySettings,
  getPortalSettings,
  updatePortalSettings,
  getIntegrationsSettings,
  updateIntegration,
  getAiSettings,
  updateAiSettings,
  getSecuritySettings,
  updateSecuritySettings,
  getSystemPreferences,
  updateSystemPreferences,
  listFeatureFlags,
  toggleFeatureFlag,
  listAuditLogs,
  listBackups,
  createBackup,
  getReportsSettings,
  updateReportsSettings,
  getPublicSeasonConfig,
} from '@yuletide/firebase';
import {
  companySettingsSchema,
  brandingSettingsSchema,
  updateUserSchema,
  inviteUserSchema,
  updateRolePermissionsSchema,
  notificationSettingsSchema,
  notificationRuleUpdateSchema,
  automationRuleUpdateSchema,
  proposalSettingsSchema,
  invoiceSettingsConfigSchema,
  jobSettingsConfigSchema,
  seasonSettingsSchema,
  inventorySettingsConfigSchema,
  customerPortalSettingsSchema,
  integrationToggleSchema,
  aiSettingsConfigSchema,
  securitySettingsSchema,
  systemPreferencesSchema,
  featureFlagToggleSchema,
  auditLogFilterSchema,
  settingsRoleSchema,
} from '@clcrm/validators';
import { router, adminProcedure, officeProcedure, permissionProcedure, publicProcedure } from '../trpc';

export const settings360Router = router({
  public: router({
    seasonConfig: publicProcedure.query(() => getPublicSeasonConfig()),
  }),

  dashboard: officeProcedure.query(({ ctx }) => getSettingsDashboard(ctx.auth.organizationId)),

  company: officeProcedure.query(({ ctx }) => getCompanySettings(ctx.auth.organizationId)),
  updateCompany: permissionProcedure('settings', 'edit')
    .input(companySettingsSchema)
    .mutation(({ ctx, input }) =>
      updateCompanySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  branding: officeProcedure.query(({ ctx }) => getBrandingSettings(ctx.auth.organizationId)),
  updateBranding: permissionProcedure('settings', 'edit')
    .input(brandingSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateBrandingSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  users: officeProcedure.query(({ ctx }) => listOrgUsers(ctx.auth.organizationId)),
  updateUser: permissionProcedure('settings', 'edit').input(updateUserSchema).mutation(({ ctx, input }) => {
    const { userId, ...fields } = input;
    return updateOrgUser(ctx.auth.organizationId, userId, fields, ctx.auth.userId, ctx.auth.email);
  }),
  inviteUser: permissionProcedure('settings', 'edit')
    .input(inviteUserSchema)
    .mutation(({ ctx, input }) =>
      inviteOrgUser(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  roles: officeProcedure.query(({ ctx }) => listRoles(ctx.auth.organizationId)),
  updateRolePermissions: permissionProcedure('settings', 'edit')
    .input(updateRolePermissionsSchema)
    .mutation(({ ctx, input }) =>
      updateRolePermissions(
        ctx.auth.organizationId,
        input.roleId,
        input.permissions as import('@clcrm/types').PermissionMatrix,
        ctx.auth.userId,
        ctx.auth.email,
      ),
    ),

  myPermissions: officeProcedure.query(async ({ ctx }) => {
    return ctx.auth.permissions;
  }),

  notifications: officeProcedure.query(({ ctx }) => getNotificationSettings(ctx.auth.organizationId)),
  updateNotifications: adminProcedure.input(notificationSettingsSchema).mutation(({ ctx, input }) =>
    updateNotificationSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),
  updateNotificationRule: adminProcedure.input(notificationRuleUpdateSchema).mutation(({ ctx, input }) => {
    const { ruleId, ...fields } = input;
    return updateNotificationRule(ctx.auth.organizationId, ruleId, fields, ctx.auth.userId, ctx.auth.email);
  }),

  automation: officeProcedure.query(({ ctx }) => getAutomationSettings(ctx.auth.organizationId)),
  updateAutomationRule: adminProcedure.input(automationRuleUpdateSchema).mutation(({ ctx, input }) =>
    updateAutomationRule(ctx.auth.organizationId, input.ruleId, input, ctx.auth.userId, ctx.auth.email),
  ),

  proposals: officeProcedure.query(({ ctx }) => getProposalSettings(ctx.auth.organizationId)),
  updateProposals: adminProcedure.input(proposalSettingsSchema).mutation(({ ctx, input }) =>
    updateProposalSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  invoices: officeProcedure.query(({ ctx }) => getInvoiceSettings(ctx.auth.organizationId)),
  updateInvoices: adminProcedure.input(invoiceSettingsConfigSchema).mutation(({ ctx, input }) =>
    updateInvoiceSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  jobs: officeProcedure.query(({ ctx }) => getJobSettings(ctx.auth.organizationId)),
  updateJobs: adminProcedure.input(jobSettingsConfigSchema).mutation(({ ctx, input }) =>
    updateJobSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  season: officeProcedure.query(({ ctx }) => getSeasonSettings(ctx.auth.organizationId)),
  updateSeason: adminProcedure.input(seasonSettingsSchema).mutation(({ ctx, input }) =>
    updateSeasonSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  inventory: officeProcedure.query(({ ctx }) => getInventorySettings(ctx.auth.organizationId)),
  updateInventory: adminProcedure.input(inventorySettingsConfigSchema).mutation(({ ctx, input }) =>
    updateInventorySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  portal: officeProcedure.query(({ ctx }) => getPortalSettings(ctx.auth.organizationId)),
  updatePortal: adminProcedure.input(customerPortalSettingsSchema).mutation(({ ctx, input }) =>
    updatePortalSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  integrations: officeProcedure.query(({ ctx }) => getIntegrationsSettings(ctx.auth.organizationId)),
  updateIntegration: adminProcedure.input(integrationToggleSchema).mutation(({ ctx, input }) =>
    updateIntegration(ctx.auth.organizationId, input.integrationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  ai: officeProcedure.query(({ ctx }) => getAiSettings(ctx.auth.organizationId)),
  updateAi: adminProcedure.input(aiSettingsConfigSchema).mutation(({ ctx, input }) =>
    updateAiSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  security: officeProcedure.query(({ ctx }) => getSecuritySettings(ctx.auth.organizationId)),
  updateSecurity: adminProcedure.input(securitySettingsSchema).mutation(({ ctx, input }) =>
    updateSecuritySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  system: officeProcedure.query(({ ctx }) => getSystemPreferences(ctx.auth.organizationId)),
  updateSystem: adminProcedure.input(systemPreferencesSchema).mutation(({ ctx, input }) =>
    updateSystemPreferences(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
  ),

  reports: officeProcedure.query(({ ctx }) => getReportsSettings(ctx.auth.organizationId)),
  updateReports: adminProcedure
    .input(z.object({ defaultDashboardRole: settingsRoleSchema.optional(), autoRefreshSeconds: z.number().min(10).max(300).optional() }))
    .mutation(({ ctx, input }) => updateReportsSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email)),

  featureFlags: officeProcedure.query(({ ctx }) => listFeatureFlags(ctx.auth.organizationId)),
  toggleFeatureFlag: adminProcedure.input(featureFlagToggleSchema).mutation(({ ctx, input }) =>
    toggleFeatureFlag(ctx.auth.organizationId, input.flagId, input.enabled, ctx.auth.userId, ctx.auth.email),
  ),

  auditLogs: officeProcedure.input(auditLogFilterSchema.optional()).query(({ ctx, input }) =>
    listAuditLogs(ctx.auth.organizationId, input?.limit ?? 50, input?.resource),
  ),

  backups: officeProcedure.query(({ ctx }) => listBackups(ctx.auth.organizationId)),
  createBackup: adminProcedure.mutation(({ ctx }) =>
    createBackup(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email),
  ),
});
