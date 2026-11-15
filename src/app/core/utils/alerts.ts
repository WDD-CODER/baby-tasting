import { HE } from '../i18n/he'
import { Alert } from '../models/allergen-status'

/** The Hebrew text of an alert, parameters filled in. */
export function alertText(alert: Alert): string {
  const t = HE.alerts
  const text =
    alert.kind === 'intro_missing'
      ? t.intro_missing
      : alert.kind === 'maintenance_gap'
        ? t.maintenance_gap
        : t.maintenance_week
  return text
    .replace('{allergen}', alert.allergenName)
    .replace('{n}', String(alert.n ?? ''))
    .replace('{x}', String(alert.x ?? ''))
    .replace('{y}', String(alert.y ?? ''))
}
