// Simplified ACL for object storage without Google Cloud Storage dependency

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

// Simple in-memory storage for ACL policies
const aclPolicies = new Map<string, ObjectAclPolicy>();

export async function setObjectAclPolicy(
  objectPath: string,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  aclPolicies.set(objectPath, aclPolicy);
}

export async function getObjectAclPolicy(
  objectPath: string,
): Promise<ObjectAclPolicy | null> {
  return aclPolicies.get(objectPath) || null;
}

export async function canAccessObject({
  userId,
  objectPath,
  requestedPermission,
}: {
  userId?: string;
  objectPath: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectPath);
  if (!aclPolicy) {
    return false;
  }

  // Public objects are always accessible for read
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Access control requires the user id
  if (!userId) {
    return false;
  }

  // The owner of the object can always access it
  if (aclPolicy.owner === userId) {
    return true;
  }

  // For simplicity, we're not implementing group-based access rules in this version
  return false;
}