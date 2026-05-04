import { processFrame } from './processor.js'
import { openVideoForHydration, hydrateFrame } from './extractor.js'

// ── Core helpers ──────────────────────────────────────────────────────────────

// Build one shared video element per export run, process all kept frames.
async function getCanvases(frames, file, global, onProgress) {
  const kept = frames.filter(f => f.kept)
  const { video, revoke } = await openVideoForHydration(file)
  const result = []
  try {
    for (let i=0; i<kept.length; i++) {
      const imageData = kept[i].imageData ?? await hydrateFrame(video, kept[i])
      result.push(processFrame(imageData, kept[i].width, kept[i].height, global, kept[i].overrides))
      onProgress?.(i+1, kept.length)
    }
  } finally { revoke() }
  return result
}

function dl(blob, name) {
  const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:name })
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

function buildSheet(cvs, cols, pad) {
  const fw=cvs[0].width, fh=cvs[0].height
  const c=Math.min(cols,cvs.length), r=Math.ceil(cvs.length/c)
  const sheet = new OffscreenCanvas(c*(fw+pad)+pad, r*(fh+pad)+pad)
  const ctx   = sheet.getContext('2d')
  cvs.forEach((cv,i) => ctx.drawImage(cv, (i%c)*(fw+pad)+pad, Math.floor(i/c)*(fh+pad)+pad))
  return { sheet, fw, fh, c, r }
}

// ── Spritesheet PNG + JSON ────────────────────────────────────────────────────
export async function exportSpritesheet(frames, file, global, { cols=8, pad=1, name='sprite' }={}, onProgress) {
  const cvs = await getCanvases(frames, file, global, onProgress)
  if (!cvs.length) return
  const { sheet, fw, fh, c } = buildSheet(cvs, cols, pad)
  const meta = { frames: cvs.map((_,i) => ({ i, x:(i%c)*(fw+pad)+pad, y:Math.floor(i/c)*(fh+pad)+pad, w:fw, h:fh })), fw, fh }
  dl(await sheet.convertToBlob({ type:'image/png' }), `${name}.png`)
  dl(new Blob([JSON.stringify(meta,null,2)], { type:'application/json' }), `${name}.json`)
}

// ── ZIP of individual PNGs ────────────────────────────────────────────────────
export async function exportZip(frames, file, global, { name='frames' }={}, onProgress) {
  const JSZip = await loadJSZip()
  const cvs   = await getCanvases(frames, file, global, onProgress)
  const zip   = new JSZip()
  await Promise.all(cvs.map(async (cv,i) =>
    zip.file(`frame_${String(i).padStart(4,'0')}.png`, await cv.convertToBlob({ type:'image/png' }))
  ))
  dl(await zip.generateAsync({ type:'blob', compression:'DEFLATE' }), `${name}.zip`)
}

// ── Animated GIF ──────────────────────────────────────────────────────────────
export async function exportGif(frames, file, global, { fps=12, name='animation' }={}, onProgress) {
  const GIF = await loadGifJs()
  const cvs = await getCanvases(frames, file, global, onProgress)
  if (!cvs.length) return
  return new Promise((res, rej) => {
    const gif = new GIF({ workers:2, quality:10, width:cvs[0].width, height:cvs[0].height,
      workerScript:'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js' })
    cvs.forEach(cv => {
      const rc = document.createElement('canvas')
      rc.width=cv.width; rc.height=cv.height; rc.getContext('2d').drawImage(cv,0,0)
      gif.addFrame(rc, { delay:Math.round(1000/fps) })
    })
    gif.on('finished', blob => { dl(blob, `${name}.gif`); res() })
    gif.on('error', rej)
    gif.render()
  })
}

// ── WebP frames ZIP ───────────────────────────────────────────────────────────
export async function exportWebP(frames, file, global, { name='frames_webp' }={}, onProgress) {
  const JSZip = await loadJSZip()
  const cvs   = await getCanvases(frames, file, global, onProgress)
  const zip   = new JSZip()
  await Promise.all(cvs.map(async (cv,i) =>
    zip.file(`frame_${String(i).padStart(4,'0')}.webp`, await cv.convertToBlob({ type:'image/webp', quality:.9 }))
  ))
  dl(await zip.generateAsync({ type:'blob', compression:'DEFLATE' }), `${name}.zip`)
}

// ── CSS Spritesheet ───────────────────────────────────────────────────────────
export async function exportCSS(frames, file, global, { cols=8, pad=1, name='sprite', fps=12 }={}, onProgress) {
  const cvs = await getCanvases(frames, file, global, onProgress)
  if (!cvs.length) return
  const { sheet, fw, fh, c } = buildSheet(cvs, cols, pad)
  dl(await sheet.convertToBlob({ type:'image/png' }), `${name}.png`)

  const delay = Math.round(1000/fps)
  const total = cvs.length * delay
  const steps = cvs.map((_,i) => {
    const pct   = ((i/cvs.length)*100).toFixed(2)
    const x     = -((i%c)*(fw+pad)+pad)
    const y     = -(Math.floor(i/c)*(fh+pad)+pad)
    return `  ${pct}% { background-position: ${x}px ${y}px; }`
  })
  // Close the loop with the same position as frame 0
  const x0 = -((0%c)*(fw+pad)+pad), y0 = -(Math.floor(0/c)*(fh+pad)+pad)
  steps.push(`  100% { background-position: ${x0}px ${y0}px; }`)

  const css = `.sprite-${name}{width:${fw}px;height:${fh}px;background-image:url('${name}.png');background-repeat:no-repeat;animation:sprite-${name} ${total}ms steps(1) infinite}\n@keyframes sprite-${name}{\n${steps.join('\n')}\n}`
  dl(new Blob([css], { type:'text/css' }), `${name}.css`)
}

// ── Godot 4 SpriteFrames .tres ────────────────────────────────────────────────
export async function exportGodot(frames, file, global, { cols=8, pad=1, name='sprite', fps=12 }={}, onProgress) {
  const cvs = await getCanvases(frames, file, global, onProgress)
  if (!cvs.length) return
  const { sheet, fw, fh, c } = buildSheet(cvs, cols, pad)
  dl(await sheet.convertToBlob({ type:'image/png' }), `${name}.png`)

  // Correct Godot 4 format: one AtlasTexture sub_resource per frame
  const subResources = cvs.map((_,i) => {
    const x=(i%c)*(fw+pad)+pad, y=Math.floor(i/c)*(fh+pad)+pad
    return `[sub_resource type="AtlasTexture" id="frame_${i}"]\natlas = ExtResource("sheet")\nregion = Rect2(${x}, ${y}, ${fw}, ${fh})`
  }).join('\n\n')

  const frameRefs = cvs.map((_,i) =>
    `{"duration":1.0,"texture":SubResource("frame_${i}")}`
  ).join(',')

  const tres = `[gd_resource type="SpriteFrames" format=3]\n\n[ext_resource type="Texture2D" path="res://${name}.png" id="sheet"]\n\n${subResources}\n\n[resource]\nanimations=[{"frames":[${frameRefs}],"loop":true,"name":&"default","speed":${fps}.0}]`
  dl(new Blob([tres], { type:'text/plain' }), `${name}.tres`)
}

// ── Unity .meta ───────────────────────────────────────────────────────────────
export async function exportUnity(frames, file, global, { cols=8, pad=1, name='sprite' }={}, onProgress) {
  const cvs = await getCanvases(frames, file, global, onProgress)
  if (!cvs.length) return
  const { sheet, fw, fh, c } = buildSheet(cvs, cols, pad)
  const sheetH = sheet.height
  dl(await sheet.convertToBlob({ type:'image/png' }), `${name}.png`)

  const sprites = cvs.map((_,i) => {
    const x=(i%c)*(fw+pad)+pad
    const y=sheetH-Math.floor(i/c)*(fh+pad)-pad-fh // Unity flips Y
    return `  - serializedVersion: 2\n    name: ${name}_${String(i).padStart(4,'0')}\n    rect:\n      serializedVersion: 2\n      x: ${x}\n      y: ${y}\n      width: ${fw}\n      height: ${fh}\n    alignment: 0\n    pivot: {x: 0.5, y: 0}`
  }).join('\n')

  const meta = `fileFormatVersion: 2\nguid: ${randomGuid()}\nTextureImporter:\n  spritePivot: {x: 0.5, y: 0}\n  spritePixelsToUnits: 1\n  spriteSheet:\n    serializedVersion: 2\n    sprites:\n${sprites}\n  spriteMode: 2\n  mipmaps:\n    enableMipmaps: 0`
  dl(new Blob([meta], { type:'text/plain' }), `${name}.png.meta`)
}

// ── MUGEN SFF v1 ──────────────────────────────────────────────────────────────
export async function exportMugen(frames, file, global, { group=0, name='sprite', fps=12 }={}, onProgress) {
  const JSZip    = await loadJSZip()
  const canvases = await getCanvases(frames, file, global, onProgress)
  const zip      = new JSZip()
  zip.file(`${name}.sff`, buildSff(canvases, group))
  zip.file(`${name}.air`, buildAir(canvases.length, fps, group))
  zip.file(`${name}.act`, buildAct())
  dl(await zip.generateAsync({ type:'blob' }), `${name}_mugen.zip`)
}

function buildSff(canvases, group) {
  const n=canvases.length, hsz=512, sub=32
  const pcx  = canvases.map(encodePcx)
  let off    = hsz+sub*n
  const offs = pcx.map(b => { const o=off; off+=b.byteLength; return o })
  const buf  = new ArrayBuffer(off), dv=new DataView(buf), u8=new Uint8Array(buf)
  'ElecbyteSpr\0'.split('').forEach((c,i) => u8[i]=c.charCodeAt(0))
  u8[12]=1; u8[13]=1
  dv.setUint32(16,1,true); dv.setUint32(20,n,true)
  dv.setUint32(24,hsz,true); dv.setUint32(28,sub,true)
  for (let i=0; i<n; i++) {
    const b=hsz+i*sub
    dv.setUint32(b,   i<n-1?hsz+(i+1)*sub:0, true)
    dv.setUint32(b+4, pcx[i].byteLength, true)
    dv.setInt16 (b+8, Math.round(canvases[i].width/2), true)
    dv.setInt16 (b+10,canvases[i].height, true)
    dv.setUint16(b+12,group, true); dv.setUint16(b+14,i, true)
    u8[b+18] = i>0 ? 1 : 0
  }
  pcx.forEach((p,i) => u8.set(new Uint8Array(p), offs[i]))
  return buf
}

function encodePcx(canvas) {
  const ctx=canvas.getContext('2d'), {width:w,height:h}=canvas
  const rgba=ctx.getImageData(0,0,w,h).data
  const pal=buildPal256(), idx=toIndexed(rgba,pal)
  const hdr=new Uint8Array(128), dv=new DataView(hdr.buffer)
  hdr[0]=0x0a;hdr[1]=0x05;hdr[2]=0x01;hdr[3]=0x08
  dv.setUint16(8,w-1,true);dv.setUint16(10,h-1,true)
  dv.setUint16(12,72,true);dv.setUint16(14,72,true)
  hdr[65]=1;dv.setUint16(66,w,true);dv.setUint16(68,1,true)
  const rows=[]; for(let y=0;y<h;y++) rows.push(rle(idx.subarray(y*w,(y+1)*w)))
  const pb=new Uint8Array(1+768); pb[0]=0x0c
  for(let i=0;i<256;i++){pb[1+i*3]=pal[i*3];pb[2+i*3]=pal[i*3+1];pb[3+i*3]=pal[i*3+2]}
  const total=128+rows.reduce((s,r)=>s+r.length,0)+pb.length
  const out=new Uint8Array(total); out.set(hdr)
  let p=128; rows.forEach(r=>{out.set(r,p);p+=r.length}); out.set(pb,p)
  return out.buffer
}

function rle(row){const o=[];let i=0;while(i<row.length){const v=row[i];let c=1;while(i+c<row.length&&row[i+c]===v&&c<63)c++;if(c>1||v>=0xc0)o.push(0xc0|c,v);else o.push(v);i+=c}return new Uint8Array(o)}
function buildPal256(){const p=new Uint8Array(768);let i=1;for(let r=0;r<6&&i<256;r++)for(let g=0;g<6&&i<256;g++)for(let b=0;b<6&&i<256;b++){p[i*3]=r*51;p[i*3+1]=g*51;p[i*3+2]=b*51;i++}return p}
function toIndexed(rgba,pal){const n=rgba.length/4,idx=new Uint8Array(n);for(let i=0;i<n;i++){if(rgba[i*4+3]<128){idx[i]=0;continue}const ri=Math.round(rgba[i*4]/51),gi=Math.round(rgba[i*4+1]/51),bi=Math.round(rgba[i*4+2]/51);idx[i]=Math.min(255,1+ri*36+gi*6+bi)}return idx}
function buildAir(n,fps,g){const d=Math.max(1,Math.round(60/fps));return['; SpriteStudio','','[Begin Action 0]',...Array.from({length:n},(_,i)=>`${g},${i},0,0,${d}`),''].join('\r\n')}
function buildAct(){return buildPal256().buffer}

// ── CDN loaders ───────────────────────────────────────────────────────────────
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip)
  return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=()=>res(window.JSZip);s.onerror=rej;document.head.appendChild(s)})
}
function loadGifJs() {
  if (window.GIF) return Promise.resolve(window.GIF)
  return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';s.onload=()=>res(window.GIF);s.onerror=rej;document.head.appendChild(s)})
}
function randomGuid(){return'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g,()=>Math.floor(Math.random()*16).toString(16))}
