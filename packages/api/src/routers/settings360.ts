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
  claimStaffInvite,
  lookupStaffInviteByToken,
  listRoles,
  updateRolePermissions,
  getNotificationSettings,
  updateNotificationSettings,
  updateNotificationRule,
  getAutomationSettings,
  updateAutomationRule,
  getProposalSettings,
  updateProposalSettings,
  getAgreementSettings,
  updateAgreementSettings,
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
  testIntegrationConnection,
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
  claimStaffInviteSchema,
  updateRolePermissionsSchema,
  notificationSettingsSchema,
  notificationRuleUpdateSchema,
  automationRuleUpdateSchema,
  proposalSettingsSchema,
  agreementSettingsSchema,
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
import {
  router,
  permissionProcedure,
  publicProcedure,
  protectedProcedure,
} from '../trpc';

export const settings360Router = router({
  public: router({
    seasonConfig: publicProcedure.query(() => getPublicSeasonConfig()),
  }),

  dashboard: permissionProcedure('settings', 'view').query(({ ctx }) => getSettingsDashboard(ctx.auth.organizationId)),

  company: permissionProcedure('settings', 'view').query(({ ctx }) => getCompanySettings(ctx.auth.organizationId)),
  updateCompany: permissionProcedure('settings', 'edit')
    .input(companySettingsSchema)
    .mutation(({ ctx, input }) =>
      updateCompanySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  branding: permissionProcedure('settings', 'view').query(({ ctx }) => getBrandingSettings(ctx.auth.organizationId)),
  updateBranding: permissionProcedure('settings', 'edit')
    .input(brandingSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateBrandingSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  users: permissionProcedure('settings', 'view').query(({ ctx }) => listOrgUsers(ctx.auth.organizationId)),
  updateUser: permissionProcedure('settings', 'edit')
    .input(updateUserSchema)
    .mutation(({ ctx, input }) => {
      const { userId, ...fields } = input;
      return updateOrgUser(
        ctx.auth.organizationId,
        userId,
        fields,
        ctx.auth.userId,
        ctx.auth.email,
      );
    }),
  inviteUser: permissionProcedure('settings', 'edit')
    .input(inviteUserSchema)
    .mutation(({ ctx, input }) =>
      inviteOrgUser(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),
  previewInvite: publicProcedure
    .input(z.object({ token: z.string().min(16).max(256) }))
    .query(async ({ input }) => {
      const invite = await lookupStaffInviteByToken(input.token);
      if (!invite) return { ok: false as const };
      return {
        ok: true as const,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
      };
    }),
  claimInvite: publicProcedure
    .input(claimStaffInviteSchema)
    .mutation(({ input }) => claimStaffInvite(input)),

  roles: permissionProcedure('settings', 'view').query(({ ctx }) => listRoles(ctx.auth.organizationId)),
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

  myPermissions: protectedProcedure.query(({ ctx }) => ctx.auth.permissions),

  notifications: permissionProcedure('settings', 'view').query(({ ctx }) =>
    getNotificationSettings(ctx.auth.organizationId),
  ),
  updateNotifications: permissionProcedure('settings', 'edit')
    .input(notificationSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateNotificationSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),
  updateNotificationRule: permissionProcedure('settings', 'edit')
    .input(notificationRuleUpdateSchema)
    .mutation(({ ctx, input }) => {
      const { ruleId, ...fields } = input;
      return updateNotificationRule(
        ctx.auth.organizationId,
        ruleId,
        fields,
        ctx.auth.userId,
        ctx.auth.email,
      );
    }),

  automation: permissionProcedure('settings', 'view').query(({ ctx }) => getAutomationSettings(ctx.auth.organizationId)),
  updateAutomationRule: permissionProcedure('settings', 'edit')
    .input(automationRuleUpdateSchema)
    .mutation(({ ctx, input }) =>
      updateAutomationRule(
        ctx.auth.organizationId,
        input.ruleId,
        input,
        ctx.auth.userId,
        ctx.auth.email,
      ),
    ),

  proposals: permissionProcedure('settings', 'view').query(({ ctx }) => getProposalSettings(ctx.auth.organizationId)),
  updateProposals: permissionProcedure('settings', 'edit')
    .input(proposalSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateProposalSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  agreements: permissionProcedure('settings', 'view').query(({ ctx }) => getAgreementSettings(ctx.auth.organizationId)),
  updateAgreements: permissionProcedure('settings', 'edit')
    .input(agreementSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateAgreementSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  invoices: permissionProcedure('settings', 'view').query(({ ctx }) => getInvoiceSettings(ctx.auth.organizationId)),
  updateInvoices: permissionProcedure('settings', 'edit')
    .input(invoiceSettingsConfigSchema)
    .mutation(({ ctx, input }) =>
      updateInvoiceSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  jobs: permissionProcedure('settings', 'view').query(({ ctx }) => getJobSettings(ctx.auth.organizationId)),
  updateJobs: permissionProcedure('settings', 'edit')
    .input(jobSettingsConfigSchema)
    .mutation(({ ctx, input }) =>
      updateJobSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  season: permissionProcedure('settings', 'view').query(({ ctx }) => getSeasonSettings(ctx.auth.organizationId)),
  updateSeason: permissionProcedure('settings', 'edit')
    .input(seasonSettingsSchema)
    .mutation(({ ctx, input }) =>
      updateSeasonSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  inventory: permissionProcedure('settings', 'view').query(({ ctx }) => getInventorySettings(ctx.auth.organizationId)),
  updateInventory: permissionProcedure('settings', 'edit')
    .input(inventorySettingsConfigSchema)
    .mutation(({ ctx, input }) =>
      updateInventorySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  portal: permissionProcedure('settings', 'view').query(({ ctx }) => getPortalSettings(ctx.auth.organizationId)),
  updatePortal: permissionProcedure('settings', 'edit')
    .input(customerPortalSettingsSchema)
    .mutation(({ ctx, input }) =>
      updatePortalSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  integrations: permissionProcedure('settings', 'view').query(({ ctx }) =>
    getIntegrationsSettings(ctx.auth.organizationId),
  ),
  updateIntegration: permissionProcedure('settings', 'edit')
    .input(integrationToggleSchema)
    .mutation(({ ctx, input }) =>
      updateIntegration(
        ctx.auth.organizationId,
        input.integrationId,
        input,
        ctx.auth.userId,
        ctx.auth.email,
      ),
    ),
  testIntegration: permissionProcedure('settings', 'edit')
    .input(z.object({ integrationId: z.enum(['stripe', 'twilio', 'resend', 'mapbox', 'inngest']) }))
    .mutation(({ ctx, input }) =>
      testIntegrationConnection(ctx.auth.organizationId, input.integrationId),
    ),

  ai: permissionProcedure('settings', 'view').query(({ ctx }) => getAiSettings(ctx.auth.organizationId)),
  updateAi: permissionProcedure('settings', 'edit')
    .input(aiSettingsConfigSchema)
    .mutation(({ ctx, input }) =>
      updateAiSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  security: permissionProcedure('settings', 'view').query(({ ctx }) => getSecuritySettings(ctx.auth.organizationId)),
  updateSecurity: permissionProcedure('settings', 'edit')
    .input(securitySettingsSchema)
    .mutation(({ ctx, input }) =>
      updateSecuritySettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  system: permissionProcedure('settings', 'view').query(({ ctx }) => getSystemPreferences(ctx.auth.organizationId)),
  updateSystem: permissionProcedure('settings', 'edit')
    .input(systemPreferencesSchema)
    .mutation(({ ctx, input }) =>
      updateSystemPreferences(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  reports: permissionProcedure('settings', 'view').query(({ ctx }) => getReportsSettings(ctx.auth.organizationId)),
  updateReports: permissionProcedure('settings', 'edit')
    .input(
      z.object({
        defaultDashboardRole: settingsRoleSchema.optional(),
        autoRefreshSeconds: z.number().min(10).max(300).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateReportsSettings(ctx.auth.organizationId, input, ctx.auth.userId, ctx.auth.email),
    ),

  featureFlags: permissionProcedure('settings', 'view').query(({ ctx }) => listFeatureFlags(ctx.auth.organizationId)),
  toggleFeatureFlag: permissionProcedure('settings', 'edit')
    .input(featureFlagToggleSchema)
    .mutation(({ ctx, input }) =>
      toggleFeatureFlag(
        ctx.auth.organizationId,
        input.flagId,
        input.enabled,
        ctx.auth.userId,
        ctx.auth.email,
      ),
    ),

  auditLogs: permissionProcedure('settings', 'view')
    .input(auditLogFilterSchema.optional())
    .query(({ ctx, input }) =>
      listAuditLogs(ctx.auth.organizationId, input?.limit ?? 50, input?.resource),
    ),

  backups: permissionProcedure('settings', 'view').query(({ ctx }) => listBackups(ctx.auth.organizationId)),
  createBackup: permissionProcedure('settings', 'edit').mutation(({ ctx }) =>
    createBackup(ctx.auth.organizationId, ctx.auth.userId, ctx.auth.email),
  ),

  me: protectedProcedure.query(async ({ ctx }) => {
    const users = await listOrgUsers(ctx.auth.organizationId);
    const profile =
      users.find((u) => u.firebaseUid === ctx.auth.firebaseUid || u.id === ctx.auth.userId) ?? null;
    const role = profile?.role ?? 'installer';
    const fieldRoles = new Set(['installer', 'crew_leader', 'warehouse_staff']);
    const officeRoles = new Set([
      'owner',
      'administrator',
      'sales_manager',
      'sales_rep',
      'operations_manager',
      'dispatcher',
      'office_staff',
    ]);
    return {
      id: profile?.id ?? ctx.auth.userId,
      email: profile?.email ?? ctx.auth.email,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      role,
      legacyRole: ctx.auth.role,
      isFieldUser: fieldRoles.has(role) || ctx.auth.role === 'crew',
      isFieldOnly:
        fieldRoles.has(role) &&
        !officeRoles.has(role) &&
        !['owner', 'admin', 'office'].includes(ctx.auth.role),
      canAccessOfficeCrm:
        ['owner', 'admin', 'office'].includes(ctx.auth.role) ||
        officeRoles.has(role) ||
        role === 'crew_leader',
    };
  }),
});
