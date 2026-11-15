// Locked foods and allergens of a household. Plan 007 fills this in; until then nothing is locked.
export async function getLockedIds(_repos, _householdId) {
  return { lockedFoodIds: [], lockedAllergenIds: [] }
}
