// The only place that reaches Cloudinary. Without keys `configured` is false and nothing is called.
import { v2 as cloudinary } from 'cloudinary'

export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic'

export function createPhotoStore(cfg) {
  if (!cfg) {
    return { configured: false, sign: () => null, destroy: async () => {} }
  }
  return {
    configured: true,
    sign({ folder, now = new Date() }) {
      const timestamp = Math.floor(now.getTime() / 1000)
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder, allowed_formats: ALLOWED_FORMATS },
        cfg.apiSecret,
      )
      return {
        cloudName: cfg.cloudName,
        apiKey: cfg.apiKey,
        timestamp,
        signature,
        folder,
        allowedFormats: ALLOWED_FORMATS,
      }
    },
    async destroy(publicId) {
      await cloudinary.uploader.destroy(publicId, {
        cloud_name: cfg.cloudName,
        api_key: cfg.apiKey,
        api_secret: cfg.apiSecret,
      })
    },
  }
}
