export type Symptom =
  'rash' | 'mouth_redness' | 'swelling' | 'vomiting' | 'diarrhea' | 'breathing' | 'other'
export type Severity = 'mild' | 'moderate' | 'severe'

export const SYMPTOMS: readonly Symptom[] = [
  'rash',
  'mouth_redness',
  'swelling',
  'vomiting',
  'diarrhea',
  'breathing',
  'other',
]
export const SEVERITIES: readonly Severity[] = ['mild', 'moderate', 'severe']

export interface ReactionPhoto {
  publicId: string
  url: string
}

export interface Reaction {
  id: string
  /** ISO timestamp */
  noticedAt: string
  /** YYYY-MM-DD */
  date: string
  itemIds: string[]
  foodIds: string[]
  symptoms: Symptom[]
  severity: Severity
  text: string
  photos: ReactionPhoto[]
  createdBy: string | null
}

export interface ReactionInput {
  noticedAt: string
  itemIds: string[]
  symptoms: Symptom[]
  severity: Severity
  text: string
  photos: ReactionPhoto[]
}
