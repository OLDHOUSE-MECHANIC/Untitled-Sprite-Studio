import { useRef, useState, useCallback } from 'react'
import useStore from '../store.js'
import { extractFrames, extractPalette } from '../lib/extractor.js'

const ACCEPT = ['mp4','webm','gif','mov','apng']

export default function StageImport() {
  const [drag,   setDrag]   = useState(false)
  const [error,  setError]  = useState(null)
  const [meta,   setMeta]   = useState(null)  // { name, duration, width, height }
  const [file,   setFile]   = useState(null)
  const [fps,    setFps]    = useState(12)
  const inputRef = useRef(null)
  const { reset, goToStage, setSourceVideo, setSourceFile, setExtractProgress, addFrame, finishExtraction, setPalette } = useStore()

  const probe = useCallback(async (f) => {
    setError(null)
    const ext = f.name.split('.').pop().toLowerCase()
    if (!ACCEPT.includes(ext) && !f.type.startsWith('video')) {
      setError('Unsupported format. Drop an MP4, WebM, GIF, or MOV.'); return
    }
    const url   = URL.createObjectURL(f)
    const video = Object.assign(document.createElement('video'), { src:url, muted:true, playsInline:true })
    try {
      await new Promise((res,rej) => { video.onloadedmetadata=res; video.onerror=()=>rej(new Error('Cannot read video')) })
    } catch(e) { setError(e.message); URL.revokeObjectURL(url); return }
    URL.revokeObjectURL(url)
    setMeta({ name:f.name, duration:video.duration, width:video.videoWidth, height:video.videoHeight })
    setFile(f)
  }, [])

  const start = useCallback(async () => {
    if (!file) return
    reset()
    goToStage('extracting')
    setSourceVideo({ ...meta, fps })
    setSourceFile(file)                        // persist File to store — export will never re-prompt
    const thumbUrls = []
    await extractFrames({
      file, fps,
      onFrame:    f  => { addFrame(f); thumbUrls.push(f.thumbUrl) },
      onProgress: (d,t) => setExtractProgress(d,t),
    })
    setPalette(await extractPalette(thumbUrls))
    finishExtraction()
    setMeta(null); setFile(null)
  }, [file, meta, fps])

  const onDrop = e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) probe(f) }

  // ── Configure screen ──────────────────────────────────────────────────────
  if (meta) return (
    <div className="stage-enter" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
      <div style={{width:'100%',maxWidth:520}}>
        <h2 style={{fontFamily:'Syne',fontWeight:700,fontSize:28,color:'#e8e8f2',marginBottom:6}}>Configure extraction</h2>
        <p style={{color:'#72728a',fontFamily:'JetBrains Mono',fontSize:13,marginBottom:36}}>{meta.name}</p>

        <div className="card" style={{padding:28,marginBottom:20}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:28}}>
            {[['Duration',meta.duration.toFixed(1)+'s'],['Resolution',`${meta.width}×${meta.height}`],['Est. frames',Math.round(meta.duration*fps)]].map(([l,v])=>(
              <div key={l} style={{background:'#0d0d0f',borderRadius:10,padding:'14px 16px'}}>
                <div className="label">{l}</div>
                <div style={{fontFamily:'JetBrains Mono',fontSize:17,fontWeight:600,color:'#e8e8f2'}}>{v}</div>
              </div>
            ))}
          </div>
          <div className="label">Frame rate</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
            <input type="range" min={1} max={60} step={1} value={fps} onChange={e=>setFps(+e.target.value)} style={{flex:1}}/>
            <input type="number" min={1} max={60} value={fps} onChange={e=>setFps(+e.target.value)} style={{width:64}}/>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[6,8,12,15,24,30].map(f=>(
              <button key={f} className={`btn btn-sm ${fps===f?'btn-primary':'btn-ghost'}`} onClick={()=>setFps(f)}>{f} fps</button>
            ))}
          </div>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-ghost" onClick={()=>setMeta(null)}>← Back</button>
          <button className="btn btn-lime btn-lg" style={{flex:1}} onClick={start}>
            Extract {Math.round(meta.duration*fps)} frames →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Drop screen ───────────────────────────────────────────────────────────
  return (
    <div className="stage-enter" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
      <div style={{width:'100%',maxWidth:560,textAlign:'center'}}>
        <h1 style={{fontFamily:'Syne',fontWeight:800,fontSize:42,lineHeight:1.1,color:'#e8e8f2',marginBottom:12}}>
          AI sprites,<br/><span style={{color:'#7c5cfc'}}>game-ready.</span>
        </h1>
        <p style={{color:'#72728a',fontSize:15,fontFamily:'JetBrains Mono',marginBottom:44}}>
          Drop your AI-generated sprite video to begin
        </p>

        <div
          onDragOver={e=>{e.preventDefault();setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={onDrop}
          onClick={()=>inputRef.current?.click()}
          style={{
            border:`2px dashed ${drag?'#7c5cfc':'#2e2e38'}`,
            borderRadius:20, padding:'56px 40px',
            background:drag?'rgba(124,92,252,.06)':'#16161a',
            cursor:'pointer', transition:'all .2s', marginBottom:20,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round" style={{marginBottom:18}}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p style={{fontFamily:'Syne',fontSize:18,fontWeight:600,color:'#e8e8f2',marginBottom:6}}>
            {drag ? 'Release to load' : 'Drop video or click to browse'}
          </p>
          <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a'}}>
            {ACCEPT.map(s=>s.toUpperCase()).join(' · ')}
          </p>
          <input ref={inputRef} type="file" accept="video/*,.gif,.apng" style={{display:'none'}}
            onChange={e=>e.target.files[0]&&probe(e.target.files[0])}/>
        </div>

        {error && (
          <div style={{background:'rgba(252,124,124,.1)',border:'1.5px solid rgba(252,124,124,.3)',
            borderRadius:10,padding:'12px 18px',color:'#fc7c7c',fontFamily:'JetBrains Mono',fontSize:13,marginBottom:14}}>
            {error}
          </div>
        )}
        <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#3a3a48'}}>
          All processing is local — nothing is uploaded.
        </p>
      </div>
    </div>
  )
}
