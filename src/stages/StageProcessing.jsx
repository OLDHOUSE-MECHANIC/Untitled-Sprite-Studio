import { useState, useEffect, useRef, useCallback } from 'react'
import useStore from '../store.js'
import { processFrame } from '../lib/processor.js'

// ── Primitives ────────────────────────────────────────────────────────────────

const Toggle = ({ on, onChange }) => (
  <div className={`toggle-track${on?' on':''}`} onClick={onChange} style={{cursor:'pointer',flexShrink:0}}>
    <div className="toggle-thumb"/>
  </div>
)

function Slider({ label, val, min, max, step=1, fmt, onChange }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <span className="label" style={{marginBottom:0}}>{label}</span>
        <span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#7c5cfc'}}>{fmt?fmt(val):val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e=>onChange(+e.target.value)}/>
    </div>
  )
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div style={{marginBottom:20}}>
      <span className="label">{label}</span>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{width:38,height:38,borderRadius:8,background:value,
          border:'1.5px solid #2e2e38',position:'relative',overflow:'hidden',flexShrink:0}}>
          <input type="color" value={value} onChange={e=>onChange(e.target.value)}
            style={{opacity:0,position:'absolute',inset:0,width:'100%',height:'100%',cursor:'pointer'}}/>
        </div>
        <input type="text" value={value} style={{width:96}}
          onChange={e=>/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)&&onChange(e.target.value)}/>
      </div>
    </div>
  )
}

function Card({ title, badge, enabled, onToggle, accent='#7c5cfc', children }) {
  return (
    <div style={{background:'#16161a',border:`1.5px solid ${enabled?accent+'55':'#2e2e38'}`,
      borderRadius:16,padding:'24px 28px',marginBottom:20,transition:'border-color .2s'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:enabled?20:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {onToggle && <Toggle on={!!enabled} onChange={onToggle}/>}
          <span style={{fontFamily:'Syne',fontWeight:700,fontSize:16,color:'#e8e8f2'}}>{title}</span>
          {badge && <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'#72728a',
            background:'#1e1e24',border:'1.5px solid #2e2e38',borderRadius:5,padding:'2px 8px'}}>{badge}</span>}
        </div>
      </div>
      {enabled && <div className="fade-in">{children}</div>}
      {!enabled && onToggle && (
        <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#3a3a48',marginTop:10}}>Toggle to enable</p>
      )}
    </div>
  )
}

// ── Live preview panel ────────────────────────────────────────────────────────
// Debounced — renders a processed frame whenever global settings change.

function PreviewPanel() {
  const { frames, global, activeId } = useStore()
  const canvasRef = useRef(null)
  const timerRef  = useRef(null)

  // Pick the active frame, or first kept frame
  const frame = frames.find(f=>f.id===activeId) || frames.find(f=>f.kept)

  const render = useCallback(() => {
    if (!frame?.imageData || !canvasRef.current) return
    const canvas = processFrame(frame.imageData, frame.width, frame.height, global, frame.overrides)
    const out = canvasRef.current
    out.width  = canvas.width
    out.height = canvas.height
    out.getContext('2d').drawImage(canvas, 0, 0)
  }, [frame, global])

  // Debounce render on any settings change
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(render, 120)
    return () => clearTimeout(timerRef.current)
  }, [render])

  if (!frame) return null

  return (
    <div style={{position:'sticky',top:20,background:'#16161a',border:'1.5px solid #2e2e38',
      borderRadius:16,padding:20,marginBottom:20,textAlign:'center'}}>
      <span className="label" style={{marginBottom:12,display:'block'}}>Live Preview — Frame #{frame.index+1}</span>
      <div className="checker" style={{borderRadius:10,overflow:'hidden',display:'inline-block',
        maxWidth:'100%',border:'1.5px solid #2e2e38'}}>
        {frame.imageData
          ? <canvas ref={canvasRef} style={{display:'block',maxWidth:'100%',imageRendering:'pixelated'}}/>
          : <div style={{padding:'40px 60px',fontFamily:'JetBrains Mono',fontSize:11,color:'#3a3a48'}}>
              Thumbnail only — full-res loads at export
            </div>
        }
      </div>
    </div>
  )
}

// ── Sprite Playback Player ────────────────────────────────────────────────────

function Player() {
  const { frames, preview, setPreview } = useStore()
  const kept = frames.filter(f=>f.kept)
  const intervalRef = useRef(null)

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (preview.playing && kept.length>0) {
      intervalRef.current = setInterval(() => {
        setPreview({ idx:(preview.idx+1) % kept.length })
      }, Math.round(1000/preview.fps))
    }
    return () => clearInterval(intervalRef.current)
  }, [preview.playing, preview.fps, kept.length])

  if (kept.length===0) return null
  const current = kept[preview.idx % kept.length]

  return (
    <div style={{background:'#16161a',border:'1.5px solid #2e2e38',
      borderRadius:16,padding:20,marginBottom:20}}>
      <span className="label" style={{marginBottom:12,display:'block'}}>Animation Preview</span>
      <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
        {/* Frame display */}
        <div className="checker" style={{borderRadius:10,overflow:'hidden',
          width:96,height:96,flexShrink:0,border:'1.5px solid #2e2e38',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          {current && <img src={current.thumbUrl} alt="" style={{maxWidth:'100%',maxHeight:'100%',imageRendering:'pixelated'}}/>}
        </div>
        {/* Controls */}
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>setPreview({idx:Math.max(0,preview.idx-1),playing:false})}>‹</button>
            <button className={`btn btn-sm ${preview.playing?'btn-primary':'btn-ghost'}`}
              onClick={()=>setPreview({playing:!preview.playing})}>
              {preview.playing?'⏸ Pause':'▶ Play'}
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={()=>setPreview({idx:(preview.idx+1)%kept.length,playing:false})}>›</button>
            <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a',marginLeft:4,alignSelf:'center'}}>
              {preview.idx+1}/{kept.length}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span className="label" style={{marginBottom:0,minWidth:28}}>FPS</span>
            <input type="range" min={1} max={30} value={preview.fps}
              onChange={e=>setPreview({fps:+e.target.value})} style={{flex:1}}/>
            <span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#7c5cfc',minWidth:24}}>{preview.fps}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Chroma Key ────────────────────────────────────────────────────────────────

function ChromaCard() {
  const { global, setGlobal, frames, activeId } = useStore()
  const ck = global.chromaKey
  const [picking, setPicking] = useState(false)
  const canvasRef = useRef(null)

  // The frame used for color picking
  const frame = frames.find(f=>f.id===activeId) || frames.find(f=>f.kept)

  // Render the active frame thumb into the pick canvas
  useEffect(() => {
    if (!canvasRef.current || !frame) return
    const img = new Image()
    img.src = frame.thumbUrl
    img.onload = () => {
      const c = canvasRef.current; if(!c) return
      c.width=img.width; c.height=img.height
      c.getContext('2d').drawImage(img,0,0)
    }
  }, [frame])

  const pickFromCanvas = e => {
    if (!canvasRef.current || !ck.enabled) return
    const r = canvasRef.current.getBoundingClientRect()
    const sx = Math.floor((e.clientX-r.left)*(canvasRef.current.width/r.width))
    const sy = Math.floor((e.clientY-r.top)*(canvasRef.current.height/r.height))
    const [rd,g,b] = canvasRef.current.getContext('2d').getImageData(sx,sy,1,1).data
    setGlobal('chromaKey.color', `#${rd.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`)
  }

  const eyeDrop = async () => {
    if (!('EyeDropper' in window)) return
    setPicking(true)
    try { const r=await new window.EyeDropper().open(); setGlobal('chromaKey.color',r.sRGBHex) } catch(_){}
    setPicking(false)
  }

  return (
    <Card title="Chroma Key" badge="GLOBAL" enabled={ck.enabled}
      onToggle={()=>setGlobal('chromaKey.enabled',!ck.enabled)}>

      {/* In-canvas color picker */}
      {frame && (
        <div style={{marginBottom:16}}>
          <span className="label">Click sprite to pick key color</span>
          <div className="checker" style={{borderRadius:8,overflow:'hidden',border:'1.5px solid #2e2e38',
            display:'inline-block',cursor:'crosshair'}}>
            <canvas ref={canvasRef} onClick={pickFromCanvas}
              style={{display:'block',maxWidth:200,imageRendering:'pixelated'}}/>
          </div>
        </div>
      )}

      <div style={{marginBottom:16}}>
        <span className="label">Key color</span>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
          <div style={{width:38,height:38,borderRadius:8,background:ck.color,
            border:`2px solid ${picking?'#7c5cfc':'#2e2e38'}`,position:'relative',overflow:'hidden',flexShrink:0}}>
            <input type="color" value={ck.color} onChange={e=>setGlobal('chromaKey.color',e.target.value)}
              style={{opacity:0,position:'absolute',inset:0,width:'100%',height:'100%',cursor:'pointer'}}/>
          </div>
          <input type="text" value={ck.color} style={{width:96}}
            onChange={e=>/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)&&setGlobal('chromaKey.color',e.target.value)}/>
          {'EyeDropper' in window && (
            <button className={`btn btn-ghost btn-sm ${picking?'btn-primary':''}`} onClick={eyeDrop}>
              {picking?'🎯 Picking…':'🩸 Screen pick'}
            </button>
          )}
        </div>
        {/* Palette presets */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {['#00ff00','#00b140','#0000ff','#ff00ff','#ffffff','#000000'].map(c=>(
            <div key={c} onClick={()=>setGlobal('chromaKey.color',c)} title={c}
              style={{width:30,height:30,borderRadius:6,background:c,cursor:'pointer',
                border:`2px solid ${ck.color===c?'#7c5cfc':'transparent'}`,transition:'border-color .15s'}}/>
          ))}
        </div>
      </div>

      <Slider label="Tolerance" val={ck.tolerance} min={0} max={150} onChange={v=>setGlobal('chromaKey.tolerance',v)}/>
      <Slider label="Edge feather" val={ck.feather} min={0} max={10} step={0.5}
        fmt={v=>v.toFixed(1)} onChange={v=>setGlobal('chromaKey.feather',v)}/>
    </Card>
  )
}

// ── Pixelator ─────────────────────────────────────────────────────────────────

const PIX_PRESETS = [
  {l:'8-bit',b:4,p:16},{l:'16-bit',b:2,p:32},{l:'Game Boy',b:6,p:4},
  {l:'CGA',b:8,p:4},{l:'NES',b:3,p:8},{l:'1-bit',b:4,p:2},
]

function PixelCard() {
  const { global, setGlobal } = useStore()
  const px = global.pixelate
  return (
    <Card title="Pixelator" badge="GLOBAL" enabled={px.enabled}
      onToggle={()=>setGlobal('pixelate.enabled',!px.enabled)}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {PIX_PRESETS.map(p=>(
          <button key={p.l} className={`btn btn-sm ${px.blockSize===p.b&&px.paletteSize===p.p?'btn-primary':'btn-ghost'}`}
            onClick={()=>{setGlobal('pixelate.blockSize',p.b);setGlobal('pixelate.paletteSize',p.p)}}>{p.l}</button>
        ))}
      </div>
      <Slider label="Block size (px)" val={px.blockSize} min={1} max={32} onChange={v=>setGlobal('pixelate.blockSize',v)}/>
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span className="label" style={{marginBottom:0}}>Palette colors</span>
          <span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#7c5cfc'}}>{px.paletteSize>=256?'∞':px.paletteSize}</span>
        </div>
        <input type="range" min={2} max={256} value={px.paletteSize} onChange={e=>setGlobal('pixelate.paletteSize',+e.target.value)}/>
        <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
          {[2,4,8,16,32,64,256].map(n=>(
            <button key={n} className={`btn btn-xs ${px.paletteSize===n?'btn-primary':'btn-ghost'}`}
              onClick={()=>setGlobal('pixelate.paletteSize',n)}>{n===256?'∞':n}</button>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ── Outline ───────────────────────────────────────────────────────────────────

function OutlineCard() {
  const { global, setGlobal } = useStore()
  const ol = global.outline
  return (
    <Card title="Outline" badge="GLOBAL" enabled={ol.enabled}
      onToggle={()=>setGlobal('outline.enabled',!ol.enabled)}>
      <Slider label="Size (px)" val={ol.size} min={1} max={8} onChange={v=>setGlobal('outline.size',v)}/>
      <ColorPicker label="Color" value={ol.color} onChange={v=>setGlobal('outline.color',v)}/>
    </Card>
  )
}

// ── Drop Shadow ───────────────────────────────────────────────────────────────

function ShadowCard() {
  const { global, setGlobal } = useStore()
  const sh = global.shadow
  return (
    <Card title="Drop Shadow" badge="GLOBAL" enabled={sh.enabled}
      onToggle={()=>setGlobal('shadow.enabled',!sh.enabled)}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        {[['Offset X','offsetX'],['Offset Y','offsetY']].map(([l,k])=>(
          <div key={k}>
            <span className="label">{l}</span>
            <input type="number" value={sh[k]} onChange={e=>setGlobal(`shadow.${k}`,+e.target.value)} style={{width:'100%'}}/>
          </div>
        ))}
      </div>
      <Slider label="Blur" val={sh.blur} min={0} max={20} onChange={v=>setGlobal('shadow.blur',v)}/>
      <Slider label="Opacity" val={sh.opacity} min={0} max={1} step={0.05}
        fmt={v=>Math.round(v*100)+'%'} onChange={v=>setGlobal('shadow.opacity',v)}/>
      <ColorPicker label="Shadow color" value={sh.color} onChange={v=>setGlobal('shadow.color',v)}/>
    </Card>
  )
}

// ── Adjustments ───────────────────────────────────────────────────────────────

function AdjCard() {
  const { global, setGlobal } = useStore()
  const adj = global.adjustments
  const s   = k => v => setGlobal(`adjustments.${k}`,v)
  const dirty = adj.brightness||adj.contrast||adj.flipH||adj.flipV||adj.rotate||adj.scale!==1

  return (
    <Card title="Adjustments" badge="GLOBAL" enabled={true}>
      <div style={{marginBottom:16}}>
        <span className="label">Transform</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['⟺ Flip H','flipH'],['⟺ Flip V','flipV']].map(([l,k])=>(
            <button key={k} className={`btn btn-sm ${adj[k]?'btn-primary':'btn-ghost'}`}
              onClick={()=>s(k)(!adj[k])}>{l}</button>
          ))}
          {[0,90,180,270].map(r=>(
            <button key={r} className={`btn btn-sm ${adj.rotate===r?'btn-primary':'btn-ghost'}`}
              onClick={()=>s('rotate')(r)}>{r}°</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span className="label" style={{marginBottom:0}}>Scale</span>
          <span style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#7c5cfc'}}>{adj.scale.toFixed(2)}×</span>
        </div>
        <input type="range" min={.25} max={4} step={.25} value={adj.scale} onChange={e=>s('scale')(+e.target.value)}/>
        <div style={{display:'flex',gap:5,marginTop:8}}>
          {[.5,1,2,4].map(v=>(
            <button key={v} className={`btn btn-xs ${adj.scale===v?'btn-primary':'btn-ghost'}`}
              onClick={()=>s('scale')(v)}>{v}×</button>
          ))}
        </div>
      </div>
      <Slider label="Brightness" val={adj.brightness} min={-100} max={100} onChange={s('brightness')}/>
      <Slider label="Contrast"   val={adj.contrast}   min={-100} max={100} onChange={s('contrast')}/>
      {dirty && (
        <button className="btn btn-danger btn-sm" onClick={()=>{
          ['brightness','contrast','flipH','flipV','rotate'].forEach(k=>setGlobal(`adjustments.${k}`,typeof adj[k]==='boolean'?false:0))
          setGlobal('adjustments.scale',1)
        }}>↺ Reset</button>
      )}
    </Card>
  )
}

// ── Auto-Crop ─────────────────────────────────────────────────────────────────

function AutoCropCard() {
  const { global, setGlobal } = useStore()
  const ac = global.autoCrop
  return (
    <Card title="Auto-Crop" badge="GLOBAL" enabled={ac.enabled}
      onToggle={()=>setGlobal('autoCrop.enabled',!ac.enabled)}>
      <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a',marginBottom:16}}>
        Trims transparent padding from every frame after chroma keying.
      </p>
      <Slider label="Padding (px)" val={ac.padding} min={0} max={16} onChange={v=>setGlobal('autoCrop.padding',v)}/>
    </Card>
  )
}

// ── Frame Overrides ───────────────────────────────────────────────────────────

function OverridesCard() {
  const { frames, activeId, setOverride, setPivot } = useStore()
  const frame = frames.find(f=>f.id===activeId) || frames.find(f=>f.kept)
  if (!frame) return null

  const dirty = frame.overrides.brightness!==null || frame.overrides.contrast!==null ||
    frame.overrides.nudge.x || frame.overrides.nudge.y

  return (
    <Card title="Frame Overrides" badge={`#${frame.index+1}`} enabled={true} accent="#c2f567">
      {/* Thumbnail so user knows which frame */}
      <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:20,
        background:'#1e1e24',borderRadius:10,padding:'12px 14px'}}>
        <div className="checker" style={{width:48,height:48,borderRadius:8,overflow:'hidden',
          border:'1.5px solid #2e2e38',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src={frame.thumbUrl} alt="" style={{maxWidth:'100%',maxHeight:'100%',imageRendering:'pixelated'}}/>
        </div>
        <div>
          <p style={{fontFamily:'Syne',fontWeight:600,fontSize:14,color:'#e8e8f2',marginBottom:2}}>Frame #{frame.index+1}</p>
          <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a'}}>
            {frame.width}×{frame.height} · Overrides apply to this frame only
          </p>
        </div>
      </div>

      {/* Nudge */}
      <div style={{marginBottom:20}}>
        <span className="label">Position nudge (px)</span>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['X','x'],['Y','y']].map(([l,k])=>(
            <div key={k}>
              <span className="label">{l}</span>
              <input type="number" value={frame.overrides.nudge[k]}
                onChange={e=>setOverride(frame.id,'nudge',{...frame.overrides.nudge,[k]:+e.target.value})}
                style={{width:'100%'}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Brightness / Contrast override */}
      <div style={{marginBottom:20}}>
        <span className="label">Brightness / Contrast override</span>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['Brightness','brightness'],['Contrast','contrast']].map(([l,k])=>(
            <div key={k}>
              <span className="label">{l}</span>
              <input type="number" placeholder="— global" value={frame.overrides[k]??''}
                onChange={e=>setOverride(frame.id,k,e.target.value===''?null:+e.target.value)}
                style={{width:'100%'}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Pivot */}
      <div style={{marginBottom:dirty?16:0}}>
        <span className="label">Pivot point</span>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
          {[['X','x'],['Y','y']].map(([l,k])=>(
            <div key={k}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span className="label" style={{marginBottom:0}}>{l}</span>
                <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#c2f567'}}>{frame.pivot[k].toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={.01} value={frame.pivot[k]}
                onChange={e=>setPivot(frame.id,{...frame.pivot,[k]:+e.target.value})}/>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['Center-bottom',.5,1],['Center',.5,.5],['Top-left',0,0],['Top-right',1,0]].map(([l,x,y])=>(
            <button key={l} className="btn btn-ghost btn-xs" onClick={()=>setPivot(frame.id,{x,y})}>{l}</button>
          ))}
        </div>
      </div>

      {dirty && (
        <button className="btn btn-danger btn-sm" style={{marginTop:12}} onClick={()=>{
          setOverride(frame.id,'nudge',{x:0,y:0})
          setOverride(frame.id,'brightness',null)
          setOverride(frame.id,'contrast',null)
        }}>↺ Clear overrides</button>
      )}
    </Card>
  )
}

// ── Segments ──────────────────────────────────────────────────────────────────

function SegmentsCard() {
  const { frames, segments, addSegment, updateSegment, removeSegment } = useStore()
  const [editing, setEditing] = useState(null)
  const total = frames.length

  const addNew = () => {
    const id = Math.random().toString(36).slice(2)
    addSegment({ id, name:'idle', startIdx:0, endIdx:Math.min(7,total-1) })
    setEditing(id)
  }

  return (
    <Card title="Animation Segments" badge="OPTIONAL" enabled={true}>
      <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a',marginBottom:16}}>
        Split frames into named animations (idle, walk, attack…). Each segment exports independently.
      </p>
      {segments.length===0 && (
        <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#3a3a48',marginBottom:12,textAlign:'center',padding:'16px 0'}}>
          No segments — all frames export as one animation
        </p>
      )}
      {segments.map(seg=>(
        <div key={seg.id} style={{background:'#1e1e24',border:'1.5px solid #2e2e38',
          borderRadius:10,padding:'14px 18px',marginBottom:10}}>
          {editing===seg.id ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,alignItems:'flex-end'}}>
              <div>
                <span className="label">Name</span>
                <input type="text" value={seg.name}
                  onChange={e=>updateSegment(seg.id,{name:e.target.value})} style={{width:'100%'}}/>
              </div>
              {[['Start','startIdx'],['End','endIdx']].map(([l,k])=>(
                <div key={k}>
                  <span className="label">{l}</span>
                  <input type="number" min={0} max={total-1} value={seg[k]}
                    onChange={e=>updateSegment(seg.id,{[k]:Math.max(0,Math.min(total-1,+e.target.value))})}
                    style={{width:60}}/>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(null)}>✓</button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:'Syne',fontWeight:600,fontSize:14,color:'#e8e8f2',flex:1}}>{seg.name}</span>
              <span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a'}}>
                {seg.startIdx+1}–{seg.endIdx+1} ({seg.endIdx-seg.startIdx+1}fr)
              </span>
              <button className="btn btn-ghost btn-xs" onClick={()=>setEditing(seg.id)}>Edit</button>
              <button className="btn btn-danger btn-xs" onClick={()=>removeSegment(seg.id)}>✕</button>
            </div>
          )}
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addNew} style={{marginTop:4}}>+ Add segment</button>
    </Card>
  )
}

// ── Palette ───────────────────────────────────────────────────────────────────

function PaletteCard() {
  const { palette, setGlobal, global } = useStore()
  const [copied, setCopied] = useState(null)
  if (!palette.length) return null

  const copy = (c, i) => {
    navigator.clipboard?.writeText(c)
    setCopied(i); setTimeout(()=>setCopied(null), 1200)
  }

  return (
    <Card title="Extracted Palette" enabled={true}>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
        {palette.map((c,i)=>(
          <div key={i} title={copied===i?'Copied!':c}
            style={{position:'relative',width:34,height:34,borderRadius:7,background:c,
              border:`2px solid ${copied===i?'#7c5cfc':'#2e2e38'}`,cursor:'pointer',
              transition:'transform .12s,border-color .15s'}}
            onMouseOver={e=>e.currentTarget.style.transform='scale(1.18)'}
            onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
            onClick={()=>copy(c,i)}>
            {/* Set as chroma key shortcut */}
            <div title="Use as chroma key color"
              style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                opacity:0,transition:'opacity .15s',fontSize:10,background:'rgba(0,0,0,.6)',borderRadius:6,color:'#fff'}}
              onMouseOver={e=>{e.currentTarget.style.opacity=1;e.stopPropagation()}}
              onMouseOut={e=>e.currentTarget.style.opacity=0}
              onClick={e=>{e.stopPropagation();setGlobal('chromaKey.color',c);setGlobal('chromaKey.enabled',true)}}>
              🔑
            </div>
          </div>
        ))}
      </div>
      <p style={{fontFamily:'JetBrains Mono',fontSize:10,color:'#3a3a48'}}>
        Click to copy hex · Hover → 🔑 to set as chroma key
      </p>
    </Card>
  )
}

// ── Main layout ───────────────────────────────────────────────────────────────

export default function StageProcessing() {
  const { goToStage, frames } = useStore()
  const kept = frames.filter(f=>f.kept).length

  return (
    <div style={{flex:1,overflowY:'auto'}}>
      <div style={{maxWidth:960,margin:'0 auto',padding:'40px 32px 140px',
        display:'grid',gridTemplateColumns:'1fr 280px',gap:24,alignItems:'start'}}>

        {/* Left — settings column */}
        <div>
          <h2 style={{fontFamily:'Syne',fontWeight:800,fontSize:30,color:'#e8e8f2',marginBottom:6}}>Processing</h2>
          <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a',marginBottom:28}}>
            Settings are non-destructive and apply globally unless overridden per-frame.
          </p>
          <ChromaCard/>
          <PixelCard/>
          <OutlineCard/>
          <ShadowCard/>
          <AdjCard/>
          <AutoCropCard/>
          <OverridesCard/>
          <SegmentsCard/>
          <PaletteCard/>
        </div>

        {/* Right — preview column (sticky) */}
        <div style={{position:'sticky',top:20}}>
          <PreviewPanel/>
          <Player/>
        </div>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:20,
        background:'rgba(13,13,15,.96)',borderTop:'1.5px solid #2e2e38',
        padding:'18px 48px',backdropFilter:'blur(8px)',display:'flex',gap:14,alignItems:'center'}}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#72728a',flex:1}}>
          <span style={{color:'#c2f567',fontWeight:600}}>{kept}</span> frames ready
        </span>
        <button className="btn btn-ghost" onClick={()=>goToStage('review')}>← Review</button>
        <button className="btn btn-lime btn-lg" disabled={kept===0} onClick={()=>goToStage('export')}>
          Export →
        </button>
      </div>
    </div>
  )
}
