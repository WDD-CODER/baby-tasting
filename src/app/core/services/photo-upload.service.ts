import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { ApiError } from '../models/api-error'
import { ReactionPhoto } from '../models/reaction'
import { ApiService } from './api.service'

interface Signature {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  allowedFormats: string
}

interface UploadResponse {
  public_id: string
  secure_url: string
}

const MAX_SIDE = 1600
const QUALITY = 0.85

/** Resizes a phone photo, gets a short-lived signature from the server and uploads straight to Cloudinary. */
@Injectable({ providedIn: 'root' })
export class PhotoUploadService {
  private readonly api = inject(ApiService)

  /** True unless the server says photos are not configured. */
  async isConfigured(): Promise<boolean> {
    try {
      await this.signature()
      return true
    } catch (err) {
      return (err as Partial<ApiError> | null)?.code !== 'photos_not_configured'
    }
  }

  async upload(file: File): Promise<ReactionPhoto> {
    const [blob, sig] = await Promise.all([this.resize(file), this.signature()])
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    form.append('api_key', sig.apiKey)
    form.append('timestamp', String(sig.timestamp))
    form.append('signature', sig.signature)
    form.append('folder', sig.folder)
    form.append('allowed_formats', sig.allowedFormats)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) throw new Error(`upload failed: ${res.status}`)
    const body = (await res.json()) as UploadResponse
    return { publicId: body.public_id, url: body.secure_url }
  }

  private signature(): Promise<Signature> {
    return firstValueFrom(this.api.post<Signature>('/uploads/signature'))
  }

  /** At most 1600px on the long side, JPEG at quality 0.85. */
  private async resize(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('resize failed'))),
        'image/jpeg',
        QUALITY,
      )
    })
  }
}
