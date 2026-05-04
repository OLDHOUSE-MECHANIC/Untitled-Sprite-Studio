import { useState, useEffect, memo } from 'react'
import useStore from '../store.js'

const SIZES = { small:96, medium:140, large:200 }

export default function StageReview() {
  const { frames, selectedIds, selectFrame, selectAll, clearSelect, setKept, goToStage, sourceVideo } = useStore()
  const [size,     setSize]     = useState('medium')
  const [filter,   setFilter]   = useState('all')
  const [lightbox, setLightbox] = useState(null)

  const sz       = SIZES[size]
  const kept     = frames.filter(f=>f.kept).length
  const selected = Object.keys(selectedIds)

  const visible = filter==='all' ? frames
    : frames.filter(f => filter==='kept' ? f.kept : !f.kept)

  useEffect(() => {
    const h = e => {
      if (e.target.tagName==='INPUT') return
      if ((e.metaKey||e.ctrlKey)&&e.key==='a') { e.preventDefault(); selectAll() }
      if (e.key==='Escape')  { clearSelect(); setLightbox(null) }
      if (e.key==='k' && selected.length) setKept(selected, true)
      if ((e.key==='d'||e.key==='Delete') && selected.length) setKept(selected, false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selectedIds])

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflowY:'auto'}}>

      {/* Sticky header */}
      <div style={{padding:'28px 40px 16px',background:'#0d0d0f',
        position:'sticky',top:0,zIndex:10,borderBottom:'1.5px solid #2e2e38'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div>
            <h2 style={{fontFamily:'Syne',fontWeight:700,fontSize:26,color:'#e8e8f2',marginBottom:2}}>Review frames</h2>
            <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a'}}>
              {sourceVideo?.name} ·&nbsp;
              <span style={{color:'#c2f567'}}>{kept} kept</span>
              {frames.length-kept>0 && <span style={{color:'#fc7c7c'}}> · {frames.length-kept} discarded</span>}
              {selected.length>0    && <span style={{color:'#a898ff'}}> · {selected.length} selected</span>}
            </p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {selected.length>0 && <>
              <button className="btn btn-ghost btn-sm" style={{color:'#c2f567',borderColor:'#2e4a1a'}}
                onClick={()=>setKept(selected,true)}>✓ Keep</button>
              <button className="btn btn-danger btn-sm"
                onClick={()=>setKept(selected,false)}>✕ Discard</button>
            </>}
            <button className="btn btn-ghost btn-sm" onClick={selectAll}>Select all</button>
            {selected.length>0 && <button className="btn btn-ghost btn-sm" onClick={clearSelect}>Clear</button>}
          </div>
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {/* Filter */}
          <div style={{display:'flex',gap:3,background:'#0d0d0f',border:'1.5px solid #2e2e38',borderRadius:9,padding:3}}>
            {[['all',`All (${frames.length})`],['kept',`Kept (${kept})`],['discarded',`Discard (${frames.length-kept})`]].map(([v,l])=>(
              <button key={v} className={`btn btn-xs ${filter===v?'btn-primary':'btn-ghost'}`}
                style={filter!==v?{border:'none',color:'#72728a'}:{}} onClick={()=>setFilter(v)}>{l}</button>
            ))}
          </div>
          {/* Size */}
          <div style={{display:'flex',gap:3,background:'#0d0d0f',border:'1.5px solid #2e2e38',borderRadius:9,padding:3,marginLeft:'auto'}}>
            {Object.keys(SIZES).map(s=>(
              <button key={s} className={`btn btn-xs ${size===s?'btn-primary':'btn-ghost'}`}
                style={size!==s?{border:'none',color:'#72728a'}:{}} onClick={()=>setSize(s)}>{s}</button>
            ))}
          </div>
        </div>
        <p style={{fontFamily:'JetBrains Mono',fontSize:10,color:'#3a3a48',marginTop:8}}>
          Click · Shift+click range · ⌘A all · K keep · D discard · Double-click zoom
        </p>
      </div>

      {/* Grid */}
      <div style={{padding:'20px 40px 80px',display:'grid',
        gridTemplateColumns:`repeat(auto-fill,minmax(${sz}px,1fr))`,gap:sz>130?18:12}}>
        {visible.map(f => (
          <FrameCard key={f.id} frame={f} sz={sz}
            selected={!!selectedIds[f.id]}
            onSelect={e=>selectFrame(f.id, e.metaKey||e.ctrlKey, e.shiftKey)}
            onZoom={()=>setLightbox(f)}
          />
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{position:'sticky',bottom:0,background:'rgba(13,13,15,.96)',
        borderTop:'1.5px solid #2e2e38',padding:'18px 40px',backdropFilter:'blur(8px)',
        display:'flex',gap:14,alignItems:'center'}}>
        <div style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#72728a',flex:1}}>
          {kept===0
            ? <span style={{color:'#fc7c7c'}}>No frames kept — select and press K</span>
            : <span><span style={{color:'#c2f567',fontWeight:600}}>{kept}</span> frames ready</span>}
        </div>
        <button className="btn btn-ghost" onClick={()=>goToStage('drop')}>← Re-import</button>
        <button className="btn btn-lime btn-lg" disabled={kept===0} onClick={()=>goToStage('processing')}>
          Continue →
        </button>
      </div>

      {lightbox && (
        <Lightbox frame={lightbox} frames={frames}
          onClose={()=>setLightbox(null)}
          onChange={setLightbox}/>
      )}
    </div>
  )
}

// Memoized — only re-renders when its own props change (not when other frames are clicked)
const FrameCard = memo(({ frame, sz, selected, onSelect, onZoom }) => {
  const { setKept } = useStore()
  return (
    <div className={`frame-card${selected?' selected':''}${!frame.kept?' discarded':''}`}
      onClick={onSelect} onDoubleClick={onZoom} style={{cursor:'pointer',userSelect:'none'}}>
      <div className="checker" style={{width:'100%',paddingTop:'100%',position:'relative'}}>
        <img src={frame.thumbUrl} alt={`#${frame.index+1}`} draggable={false}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated'}}/>
        {/* Override dot */}
        {(frame.overrides.brightness!==null||frame.overrides.contrast!==null||
          frame.overrides.nudge.x||frame.overrides.nudge.y) && (
          <div style={{position:'absolute',top:5,right:5,width:7,height:7,borderRadius:'50%',background:'#c2f567'}}/>
        )}
      </div>
      <div style={{padding:'6px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'#72728a'}}>#{frame.index+1}</span>
        <div style={{display:'flex',gap:2}}>
          {[['✓',true,'#c2f567'],['✕',false,'#fc7c7c']].map(([label,kept,color])=>(
            <button key={label} title={kept?'Keep':'Discard'}
              onClick={e=>{e.stopPropagation();setKept([frame.id],kept)}}
              style={{background:'none',border:'none',cursor:'pointer',padding:'2px 5px',borderRadius:4,
                fontFamily:'JetBrains Mono',fontSize:12,
                color:frame.kept===kept?color:'#3a3a48',transition:'color .15s'}}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})

function Lightbox({ frame, frames, onClose, onChange }) {
  const i = frames.indexOf(frame)
  const prev = () => i>0 && onChange(frames[i-1])
  const next = () => i<frames.length-1 && onChange(frames[i+1])

  useEffect(() => {
    const h = e => {
      if (e.key==='Escape')      onClose()
      if (e.key==='ArrowLeft')   prev()
      if (e.key==='ArrowRight')  next()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [frame])

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:100,
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      {[['‹',e=>{e.stopPropagation();prev()},32],['›',e=>{e.stopPropagation();next()},null]].map(([ch,fn,left])=>(
        <button key={ch} onClick={fn} style={{position:'absolute',[left!=null?'left':'right']:left??32,
          background:'#1e1e24',border:'1.5px solid #2e2e38',color:'#e8e8f2',
          width:44,height:44,borderRadius:10,fontSize:20,cursor:'pointer'}}>{ch}</button>
      ))}
      <div className="checker" onClick={e=>e.stopPropagation()}
        style={{maxWidth:'80vw',maxHeight:'80vh',borderRadius:12,overflow:'hidden',border:'1.5px solid #2e2e38'}}>
        <img src={frame.thumbUrl} alt="" style={{maxWidth:'80vw',maxHeight:'80vh',imageRendering:'pixelated',display:'block'}}/>
      </div>
      <p style={{position:'absolute',bottom:28,fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a',textAlign:'center'}}>
        Frame #{frame.index+1} · {frame.width}×{frame.height} ·&nbsp;
        {frame.kept?<span style={{color:'#c2f567'}}>kept</span>:<span style={{color:'#fc7c7c'}}>discarded</span>}
        &nbsp;· ESC close · ← → navigate
      </p>
    </div>
  )
}
