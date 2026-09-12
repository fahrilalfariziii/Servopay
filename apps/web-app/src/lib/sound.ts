// Bunyi notifikasi pesanan masuk via Web Audio API (tanpa file aset).
// Browser memblokir audio sebelum ada interaksi user — panggil unlockAudioOnGesture()
// sekali (mis. saat login/klik pertama) agar beep berikutnya diizinkan.

let ctx: AudioContext | null = null
let unlocked = false

function getContext(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Daftarkan resume AudioContext pada gesture pertama (sekali saja). */
export function unlockAudioOnGesture(): void {
  if (unlocked || typeof window === 'undefined') return
  unlocked = true
  const resume = () => getContext()
  window.addEventListener('pointerdown', resume, { once: true })
  window.addEventListener('keydown', resume, { once: true })
}

function beep(audio: AudioContext, freq: number, startAt: number, duration: number): void {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.5, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

/** Chime kasir ±3 detik: 3 rangkaian naik + nada penutup panjang.
 *  Sengaja agak panjang (2-5 dtk) agar tidak salah dengar di ruangan bising.
 *  Diam jika AudioContext tidak tersedia. */
export function playNewOrderBeep(): void {
  const audio = getContext()
  if (!audio) return
  const now = audio.currentTime
  const phrase = [880, 1174.66]
  for (let i = 0; i < 3; i++) {
    const t = now + i * 1.0
    beep(audio, phrase[0], t, 0.18)
    beep(audio, phrase[1], t + 0.22, 0.3)
  }
  // Nada penutup panjang
  beep(audio, 1318.5, now + 3.0, 0.5)
}

/** Konfirmasi simpan manual ±1 detik: 2 nada cepat.
 *  Pola beda dari chime order-masuk agar kasir bedakan "saya menyimpan"
 *  vs "ada order baru dari pelanggan". */
export function playShortConfirmBeep(): void {
  const audio = getContext()
  if (!audio) return
  const now = audio.currentTime
  beep(audio, 987.77, now, 0.15)
  beep(audio, 1318.5, now + 0.18, 0.35)
}

const BROWSER_NOTIFY_KEY = 'servopay_notify_browser'

export function isBrowserNotifyEnabled(): boolean {
  try {
    return localStorage.getItem(BROWSER_NOTIFY_KEY) === '1'
  } catch {
    return false
  }
}

export function setBrowserNotifyEnabled(v: boolean): void {
  try {
    localStorage.setItem(BROWSER_NOTIFY_KEY, v ? '1' : '0')
  } catch {}
}

export async function ensureBrowserNotifyPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/** Notifikasi sistem hanya saat tab tidak fokus (anti-spam saat kasir aktif). */
export function notifyBrowserNewOrder(title: string, body: string): void {
  try {
    if (!isBrowserNotifyEnabled() || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!document.hidden) return
    new Notification(title, { body })
  } catch {}
}
