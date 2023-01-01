export type ManagedIdentityAuthConfig = {
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  userAssignedEntityClientId: string;
  scope: string;
};

export type AuthHeader = {
  headers: {
    Authorization: string;
  };
};
