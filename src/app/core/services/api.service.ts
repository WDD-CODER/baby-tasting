import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, throwError } from 'rxjs'
import { environment } from '../../../environments/environment'
import { HE } from '../i18n/he'
import { ApiError } from '../models/api-error'

interface ServerErrorBody {
  error?: { code?: string; message?: string }
}

function toApiError(err: HttpErrorResponse): ApiError {
  if (err.status === 0) {
    return { status: 0, code: 'network', message: HE.common.errorNetwork }
  }
  const body = err.error as ServerErrorBody | null
  return {
    status: err.status,
    code: body?.error?.code ?? 'unknown',
    message: body?.error?.message ?? HE.common.errorGeneric,
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient)
  private readonly base = `${environment.apiUrl}/api/v1`

  get<T>(path: string): Observable<T> {
    return this.wrap(this.http.get<T>(this.base + path, { withCredentials: true }))
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.wrap(this.http.post<T>(this.base + path, body, { withCredentials: true }))
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.wrap(this.http.put<T>(this.base + path, body, { withCredentials: true }))
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.wrap(this.http.patch<T>(this.base + path, body, { withCredentials: true }))
  }

  delete<T>(path: string): Observable<T> {
    return this.wrap(this.http.delete<T>(this.base + path, { withCredentials: true }))
  }

  private wrap<T>(source: Observable<T>): Observable<T> {
    return source.pipe(catchError((err: HttpErrorResponse) => throwError(() => toApiError(err))))
  }
}
