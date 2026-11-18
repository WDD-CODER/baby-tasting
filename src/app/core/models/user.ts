export type ParentType = 'PARENT_A' | 'PARENT_B'

export interface User {
  username: string
  parentType: ParentType
  /** The parent's display name from the Tracker settings. */
  parentName: string
}

/** `env`: accounts come from APP_USERS and sign-up is off; `db`: accounts live in the database. */
export type AccountsMode = 'env' | 'db'

export interface SignupStatus {
  mode: AccountsMode
  firstAccountOpen: boolean
}

/** What `/auth/me` says besides who you are: which parent card Settings shows. */
export interface AccountInfo {
  mode: AccountsMode
  partnerExists: boolean
}

export interface Invite {
  token: string
  expiresAt: string
}
