export function withCreateAudit(doc, user, now = new Date()) {
  return { ...doc, createdBy: user, updatedBy: user, createdAt: now, updatedAt: now }
}

export function withUpdateAudit(patch, user, now = new Date()) {
  return { ...patch, updatedBy: user, updatedAt: now }
}
