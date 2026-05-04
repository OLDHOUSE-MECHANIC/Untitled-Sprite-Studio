// Non-destructive frame processor — returns an OffscreenCanvas.
export function processFrame(imageData, width, height, global, overrides={}) {
  const buf = new Uint8ClampedArray(imageData.data)

  // 1. Brightness / Contrast
  const br = overrides.brightness ?? global.adjustments.brightness
  const co = overrides.contrast   ?? global.adjustments.contrast
  if (br!==0 || co!==0) applyBC(buf, br, co)

  // 2. Chroma key
  const ck = overrides.chromaKey ?? (global.chromaKey.enabled ? global.chromaKey : null)
  if (ck) applyChroma(buf, ck.color, ck.tolerance, ck.feather)

  let canvas = new OffscreenCanvas(width, height)
  let ctx    = canvas.getContext('2d')
  ctx.putImageData(new ImageData(buf, width, height), 0, 0)

  // 3. Pixelate
  if (global.pixelate.enabled) applyPixelate(ctx, canvas, global.pixelate)

  // 4. Auto-crop (reuses buf — no second getImageData needed)
  if (global.autoCrop?.enabled) {
    const trimmed = autoTrim(buf, width, height, global.autoCrop.padding ?? 2)
    if (trimmed) {
      canvas = new OffscreenCanvas(trimmed.w, trimmed.h)
      ctx    = canvas.getContext('2d')
      ctx.putImageData(new ImageData(trimmed.data, trimmed.w, trimmed.h), 0, 0)
      width  = trimmed.w; height = trimmed.h
    }
  }

  // 5. Flip / Rotate / Scale
  const { flipH, flipV, rotate, scale } = global.adjustments
  if (flipH || flipV || rotate || scale!==1) {
    const rw = (rotate===90||rotate===270) ? height : width
    const rh = (rotate===90||rotate===270) ? width  : height
    const sw = Math.round(rw*scale), sh = Math.round(rh*scale)
    const out = new OffscreenCanvas(Math.max(1,sw), Math.max(1,sh))
    const oc  = out.getContext('2d')
    oc.save(); oc.translate(sw/2, sh/2)
    if (rotate) oc.rotate(rotate*Math.PI/180)
    oc.scale((flipH?-1:1)*scale, (flipV?-1:1)*scale)
    oc.drawImage(canvas, -width/2, -height/2)
    oc.restore()
    canvas = out; ctx = out.getContext('2d'); width=sw; height=sh
  }

  // 6. Outline (8-directional — capped at 8 draws not size²)
  if (global.outline?.enabled) canvas = applyOutline(canvas, global.outline)

  // 7. Drop shadow
  if (global.shadow?.enabled) canvas = applyShadow(canvas, global.shadow)

  return canvas
}

// ── Brightness / Contrast ─────────────────────────────────────────────────────
function applyBC(buf, b, c) {
  const bv = b*2.55, f = (259*(c+255))/(255*(259-c))
  for (let i=0; i<buf.length; i+=4) {
    if (buf[i+3]===0) continue
    buf[i]   = clamp(f*(buf[i]  -128)+128+bv)
    buf[i+1] = clamp(f*(buf[i+1]-128)+128+bv)
    buf[i+2] = clamp(f*(buf[i+2]-128)+128+bv)
  }
}

// ── Chroma key ────────────────────────────────────────────────────────────────
function applyChroma(buf, hex, tol, feather) {
  const [kr,kg,kb] = hexRgb(hex), t2=tol*tol, fr=Math.max(1,feather*12)
  for (let i=0; i<buf.length; i+=4) {
    const dr=buf[i]-kr, dg=buf[i+1]-kg, db=buf[i+2]-kb
    const d2 = dr*dr+dg*dg+db*db
    if (d2 < t2) buf[i+3]=0
    else if (d2 < t2+fr*fr) buf[i+3]=Math.round(buf[i+3]*Math.min(1,(Math.sqrt(d2)-Math.sqrt(t2))/fr))
  }
}

// ── Pixelate ──────────────────────────────────────────────────────────────────
function applyPixelate(ctx, canvas, { blockSize, paletteSize }) {
  const bs = Math.max(1, blockSize)
  const sw = Math.max(1, Math.ceil(canvas.width/bs))
  const sh = Math.max(1, Math.ceil(canvas.height/bs))
  const small = new OffscreenCanvas(sw, sh)
  const sc    = small.getContext('2d')
  sc.drawImage(canvas, 0, 0, sw, sh)
  if (paletteSize<256) quantize(sc, sw, sh, paletteSize)
  ctx.clearRect(0,0,canvas.width,canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height)
}

function quantize(ctx, w, h, max) {
  const d = ctx.getImageData(0,0,w,h), buf = d.data
  const steps = Math.max(2, Math.round(Math.pow(max,1/3)))
  const step  = Math.floor(256/steps)
  for (let i=0; i<buf.length; i+=4) {
    if (buf[i+3]<128) continue
    buf[i]   = Math.round(buf[i]  /step)*step
    buf[i+1] = Math.round(buf[i+1]/step)*step
    buf[i+2] = Math.round(buf[i+2]/step)*step
  }
  ctx.putImageData(d, 0, 0)
}

// ── Auto-crop — operates directly on the existing buf, no second getImageData ──
function autoTrim(buf, w, h, padding=2) {
  let minX=w, maxX=0, minY=h, maxY=0
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    if (buf[(y*w+x)*4+3]>10) {
      if (x<minX) minX=x; if (x>maxX) maxX=x
      if (y<minY) minY=y; if (y>maxY) maxY=y
    }
  }
  if (minX>maxX || minY>maxY) return null
  minX=Math.max(0,minX-padding); minY=Math.max(0,minY-padding)
  maxX=Math.min(w-1,maxX+padding); maxY=Math.min(h-1,maxY+padding)
  if (minX===0&&minY===0&&maxX===w-1&&maxY===h-1) return null

  const tw=maxX-minX+1, th=maxY-minY+1
  const out=new Uint8ClampedArray(tw*th*4)
  for (let y=0; y<th; y++)
    out.set(buf.subarray(((minY+y)*w+minX)*4, ((minY+y)*w+minX+tw)*4), y*tw*4)
  return { data:out, w:tw, h:th }
}

// ── Outline — fixed 8-directional (not size² quadratic) ──────────────────────
function applyOutline(src, { size, color }) {
  const sz = Math.max(1, size)
  const w  = src.width+sz*2, h = src.height+sz*2
  const out = new OffscreenCanvas(w, h)
  const ctx = out.getContext('2d')
  const [r,g,b] = hexRgb(color)
  // 8 cardinal + diagonal offsets — constant cost regardless of size
  const dirs = [[-sz,0],[sz,0],[0,-sz],[0,sz],[-sz,-sz],[sz,-sz],[-sz,sz],[sz,sz]]
  dirs.forEach(([dx,dy]) => ctx.drawImage(src, dx+sz, dy+sz))
  const d = ctx.getImageData(0,0,w,h), buf=d.data
  for (let i=0; i<buf.length; i+=4)
    if (buf[i+3]>0) { buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255 }
  ctx.putImageData(d, 0, 0)
  ctx.drawImage(src, sz, sz)
  return out
}

// ── Drop shadow ───────────────────────────────────────────────────────────────
function applyShadow(src, { offsetX, offsetY, blur, color, opacity }) {
  const pad = Math.abs(offsetX)+Math.abs(offsetY)+blur*2+4
  const out = new OffscreenCanvas(src.width+pad*2, src.height+pad*2)
  const ctx = out.getContext('2d')
  const [r,g,b] = hexRgb(color)
  ctx.shadowColor   = `rgba(${r},${g},${b},${opacity})`
  ctx.shadowBlur    = blur
  ctx.shadowOffsetX = offsetX
  ctx.shadowOffsetY = offsetY
  ctx.drawImage(src, pad, pad)
  return out
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function hexRgb(hex) {
  const h = hex.replace('#','')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
export function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))) }
