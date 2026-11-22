import { ApiError } from '../../core/models/api-error'
import { saveErrorText } from './tracker-errors'

describe('saveErrorText', () => {
  it('appends the error code on the fallback path', () => {
    const err: ApiError = { status: 500, code: 'internal', message: 'x', requestId: 'abcdef1234' }
    expect(saveErrorText(err, 'השמירה נכשלה')).toBe('השמירה נכשלה · קוד תקלה: abcdef12')
  })

  it('leaves the fallback alone without a request id', () => {
    const err: ApiError = { status: 500, code: 'internal', message: 'x' }
    expect(saveErrorText(err, 'השמירה נכשלה')).toBe('השמירה נכשלה')
  })
})
