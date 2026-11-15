import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, throwError } from 'rxjs'
import { AuthService } from '../services/auth.service'

const EXEMPT = ['/auth/login', '/auth/me']

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const router = inject(Router)
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !EXEMPT.some((p) => req.url.endsWith(p))
      ) {
        auth.clear()
        void router.navigate(['/login'])
      }
      return throwError(() => err)
    }),
  )
}
