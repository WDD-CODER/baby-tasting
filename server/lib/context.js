import { HttpError } from './http-error.js'

export async function requireBabyId(repos, householdId) {
  const baby = await repos.babies.getForHousehold(householdId)
  if (!baby) throw new HttpError(409, 'no_baby', 'No baby profile yet')
  return String(baby._id)
}
