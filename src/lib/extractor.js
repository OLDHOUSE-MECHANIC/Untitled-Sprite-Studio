import { nanoid } from './nanoid.js'

// Extract frames from a video file at the given fps.
// Uses a single shared video element per run — not one per frame.
export async function extractFrames({ file, fps, onFrame, onProgress, signal }) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url; video.muted = true; video.playsInline = true

  await new Promise((res, rej) => { video.onloadedmetadata=res; video.onerror=rej })

  const { videoWidth:vw, videoHeight:vh, duration } = video
  const total = Math.max(1, Math.floor(duration * fps))

  const thumbW = 96, thumbH = Math.round(vh*(96/vw))
  const thumb  = new OffscreenCanvas(thumbW, thumbH)
  const thumbCtx = thumb.getContext('2d')

  for (let i=0; i<total; i++) {
    if (signal?.aborted) break
    await seekTo(video, i/fps)

    const bmp = await createImageBitmap(video, { resizeWidth:thumbW, resizeHeight:thumbH, resizeQuality:'medium' })
    thumbCtx.clearRect(0,0,thumbW,thumbH)
    thumbCtx.drawImage(bmp,0,0); bmp.close()
    const blob    = await thumb.convertToBlob({ type:'image/webp', quality:.8 })
    const thumbUrl = URL.createObjectURL(blob)

    onFrame({ id:nanoid(), index:i, thumbUrl, imageData:null, width:vw, height:vh,
      timestamp:i/fps, kept:true,
      pivot:{ x:.5, y:1 },
      overrides:{ nudge:{x:0,y:0}, brightness:null, contrast:null, chromaKey:null },
    })
    onProgress(i+1, total)
    await tick()
  }

  URL.revokeObjectURL(url)
  return { width:vw, height:vh }
}

// Decode a full-res frame from the source file.
// Caller passes a shared video element to avoid create-per-frame overhead.
export async function hydrateFrame(video, frame) {
  await seekTo(video, frame.timestamp)
  const canvas = new OffscreenCanvas(frame.width, frame.height)
  canvas.getContext('2d').drawImage(video, 0, 0)
  return canvas.getContext('2d').getImageData(0, 0, frame.width, frame.height)
}

// Open a video element ready for hydration — caller owns the lifecycle.
export async function openVideoForHydration(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url; video.muted = true; video.playsInline = true
  await new Promise((res, rej) => { video.onloadedmetadata=res; video.onerror=rej })
  return { video, revoke:() => URL.revokeObjectURL(url) }
}

// Extract dominant palette colors from a sample of thumbnails.
export async function extractPalette(thumbUrls, maxColors=24) {
  const colors = new Map()
  const step   = Math.max(1, Math.floor(thumbUrls.length/6))
  const sample = thumbUrls.filter((_,i) => i%step===0).slice(0,6)

  for (const url of sample) {
    const img  = await loadImage(url)
    const c    = new OffscreenCanvas(32,32)
    const ctx  = c.getContext('2d')
    ctx.drawImage(img,0,0,32,32)
    const { data } = ctx.getImageData(0,0,32,32)
    for (let i=0; i<data.length; i+=4) {
      if (data[i+3]<128) continue
      const key = ((data[i]&0xf8)<<8)|((data[i+1]&0xf8)<<2)|(data[i+2]>>3)
      colors.set(key, (colors.get(key)||0)+1)
    }
  }

  return [...colors.entries()]
    .sort((a,b) => b[1]-a[1]).slice(0,maxColors)
    .map(([k]) => {
      const r=(k>>8)&0xf8, g=(k>>2)&0xf8, b=(k<<3)&0xf8
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    })
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function seekTo(video, t) {
  return new Promise((res, rej) => {
    const timeout = setTimeout(() => rej(new Error(`Seek timeout at ${t.toFixed(2)}s`)), 4000)
    video.onseeked = () => { clearTimeout(timeout); res() }
    video.currentTime = t
  })
}
function tick()      { return new Promise(r => setTimeout(r, 0)) }
function loadImage(url) {
  return new Promise((res, rej) => { const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url })
}
