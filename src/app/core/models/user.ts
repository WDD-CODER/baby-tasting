export type ParentType = 'PARENT_A' | 'PARENT_B'

export interface User {
  username: string
  parentType: ParentType
  /** The parent's display name from the Tracker settings. */
  parentName: string
}
