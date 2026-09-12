import type heic2anyType from 'heic2any'

// Batas sinkron dengan validasi form (2MB file) & limit body server (5mb).
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.82

const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp']

function extOf(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function isHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || ['heic', 'heif'].includes(extOf(file.name))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Format gambar tidak bisa dibaca browser ini.'))
    img.src = src
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal memproses gambar.'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Gagal membaca gambar.'))
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

async function downscaleToDataUrl(img: HTMLImageElement): Promise<string> {
  let { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h))
  w = Math.max(1, Math.round(w * scale))
  h = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Gagal memproses gambar.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  // Turunkan kualitas bertahap sampai muat batas (foto iPhone 12MP sering >2MB)
  let quality = JPEG_QUALITY
  for (let i = 0; i < 4; i++) {
    const url = await canvasToDataUrl(canvas, quality)
    // Panjang base64 ≈ 4/3 ukuran biner
    if (url.length <= (MAX_FILE_BYTES * 4) / 3 + 1024) return url
    quality -= 0.15
  }
  throw new Error('Hasil kompresi masih di atas 2MB, pilih foto lain.')
}

/**
 * Terima jpg/jpeg/png/heic/heif/webp (termasuk foto iPhone) lalu kembalikan
 * dataURL JPEG yang sudah di-resize + dikompres (dijamin tampil di semua browser
 * dan muat batas upload). Throw Error dengan pesan siap tampil bila gagal.
 */
export async function processUploadImage(file: File): Promise<string> {
  const ext = extOf(file.name)
  const typeOk = file.type.startsWith('image/') || file.type === '' || ACCEPTED_EXT.includes(ext)
  if (!typeOk) throw new Error('File harus berupa gambar (jpg, jpeg, png, heic, webp).')
  if (!ACCEPTED_EXT.includes(ext) && file.type === '') {
    throw new Error('Format file tidak dikenali. Gunakan jpg, png, atau heic.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('File terlalu besar (maks 12MB sebelum kompresi).')
  }

  let decodable: Blob = file
  if (isHeic(file)) {
    try {
      // Lazy-load: decoder HEIC (+WASM ±1MB) hanya diunduh saat benar-benar ada file HEIC,
      // tidak membebani bundle utama pengguna lain.
      const { default: heic2any } = (await import('heic2any')) as { default: typeof heic2anyType }
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
      decodable = Array.isArray(converted) ? converted[0] : (converted as Blob)
    } catch {
      throw new Error('Foto HEIC iPhone gagal dikonversi. Coba ubah ke JPG dulu (atau kirim via WhatsApp agar otomatis jadi JPG).')
    }
  }

  const objectUrl = URL.createObjectURL(decodable)
  try {
    const img = await loadImage(objectUrl)
    return await downscaleToDataUrl(img)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
