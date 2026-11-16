// Locked foods and allergens of a household, read from the active locks.
export async function getActiveLocks(repos, householdId) {
  const docs = await repos.locks.listActive(householdId)
  return docs.map((d) => ({ targetType: d.targetType, targetId: d.targetId }))
}

export async function getLockedIds(repos, householdId) {
  const locks = await getActiveLocks(repos, householdId)
  return {
    lockedFoodIds: locks.filter((l) => l.targetType === 'food').map((l) => l.targetId),
    lockedAllergenIds: locks.filter((l) => l.targetType === 'allergen').map((l) => l.targetId),
  }
}
