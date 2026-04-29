export type AuthRole = {
  code: string;
  name: string;
};

export type AuthBranch = {
  id: string;
  code: string;
  name: string;
};

export type AuthenticatedUser = {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  roles: ReadonlyArray<AuthRole>;
  permissions: ReadonlySet<string>;
  branches: ReadonlyArray<AuthBranch>;
  branchIds: ReadonlyArray<string>;
};
