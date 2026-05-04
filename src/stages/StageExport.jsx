import { useState } from 'react'
import useStore from '../store.js'
import { exportSpritesheet, exportZip, exportGif, exportWebP, exportCSS, exportGodot, exportUnity, exportMugen } from '../lib/exporter.js'

const Spinner = () => (
  <div className="spin" style={{width:14,height:14,border:'2px solid rgba(255,255,255,.25)',borderTopColor:'#fff',borderRadius:'50%',flexShrink:0}}/>
)

function ExportCard({ icon, title, desc, tags, accent='#7c5cfc', onExport, loading, done, disabled, children }) {
  return (
    <div style={{
      background:'#16161a',
      border:`1.5px solid ${done?'#c2f567':loading?accent+'55':'#2e2e38'}`,
      borderRadius:18, padding:'28px 32px', marginBottom:24, transition:'border-color .2s',
      opacity:disabled?.5:1,
    }}>
      <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:children?20:0}}>
        <span style={{fontSize:26,lineHeight:1,flexShrink:0,marginTop:2}}>{icon}</span>
        <div style={{flex:1}}>
          <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:17,color:'#e8e8f2',marginBottom:4}}>{title}</h3>
          <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a',lineHeight:1.6,marginBottom:8}}>{desc}</p>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {tags.map(t=>(
              <span key={t} style={{fontFamily:'JetBrains Mono',fontSize:10,background:'#1e1e24',
                border:'1.5px solid #2e2e38',borderRadius:5,padding:'2px 8px',color:'#72728a'}}>{t}</span>
            ))}
          </div>
        </div>
        <button className="btn" disabled={!!loading||disabled} onClick={onExport}
          style={{background:done?'transparent':accent,borderColor:done?'#c2f567':accent,
            color:done?'#c2f567':'#fff',minWidth:110,flexShrink:0}}>
          {loading?<><Spinner/> Working…</>:done?'✓ Done':'↓ Export'}
        </button>
      </div>
      {children && <div style={{borderTop:'1.5px solid #2e2e38',paddingTop:16}}>{children}</div>}
      {loading && (
        <div style={{marginTop:12}}>
          <div style={{height:3,background:'#1e1e24',borderRadius:99,overflow:'hidden',marginBottom:5}}>
            <div className="pulsing" style={{height:'100%',background:accent,width:'55%',borderRadius:99}}/>
          </div>
          <p style={{fontFamily:'JetBrains Mono',fontSize:11,color:'#72728a'}}>{loading}</p>
        </div>
      )}
    </div>
  )
}

export default function StageExport() {
  const { frames, global, segments, sourceVideo, sourceFile, goToStage, exportProject } = useStore()
  const kept = frames.filter(f=>f.kept)

  const [name,       setName]       = useState(sourceVideo?.name?.replace(/\.[^.]+$/,'') || 'sprite')
  const [cols,       setCols]       = useState(8)
  const [pad,        setPad]        = useState(1)
  const [gifFps,     setGifFps]     = useState(global.fps||12)
  const [mugenGroup, setMugenGroup] = useState(0)
  const [loading,    setLoading]    = useState({})
  const [done,       setDone]       = useState({})
  const [error,      setError]      = useState(null)

  const doneCount = Object.values(done).filter(Boolean).length

  // Get the source file — from store if available, else prompt once
  const getFile = () => {
    if (sourceFile) return Promise.resolve(sourceFile)
    return new Promise(res => {
      const i = Object.assign(document.createElement('input'), { type:'file', accept:'video/*,.gif' })
      i.onchange = e => res(e.target.files[0])
      i.click()
    })
  }

  const run = async (key, fn) => {
    setError(null)
    setLoading(l => ({...l,[key]:'Preparing…'}))
    try {
      const file = await getFile()
      if (!file) throw new Error('No file selected')
      await fn(file, (cur,total) => setLoading(l => ({...l,[key]:`Frame ${cur} / ${total}`})))
      setDone(d => ({...d,[key]:true}))
    } catch(e) {
      setError(e.message || 'Export failed — check the console')
    }
    setLoading(l => ({...l,[key]:null}))
  }

  const saveProject = () => {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([exportProject()], {type:'application/json'})),
      download: `${name}.spriteproject`,
    }); a.click()
  }

  const noFrames = kept.length===0
  const opts = { cols, pad, name, fps:gifFps }

  return (
    <div style={{flex:1,overflowY:'auto'}}>
      <div style={{maxWidth:720,margin:'0 auto',padding:'48px 32px 140px'}}>

        <h2 style={{fontFamily:'Syne',fontWeight:800,fontSize:32,color:'#e8e8f2',marginBottom:8}}>Export</h2>
        <p style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#72728a',marginBottom:36}}>
          <span style={{color:'#c2f567',fontWeight:600}}>{kept.length} frames</span>
          {sourceVideo && <> · {sourceVideo.width}×{sourceVideo.height}</>}
          {segments.length>0 && <> · <span style={{color:'#a898ff'}}>{segments.length} segments</span></>}
        </p>

        {noFrames && (
          <div style={{background:'rgba(252,124,124,.08)',border:'1.5px solid rgba(252,124,124,.25)',
            borderRadius:12,padding:'16px 20px',marginBottom:24,fontFamily:'JetBrains Mono',fontSize:13,color:'#fc7c7c'}}>
            No kept frames — go back to Review to select some.
          </div>
        )}

        {error && (
          <div className="fade-in" style={{background:'rgba(252,124,124,.08)',border:'1.5px solid rgba(252,124,124,.3)',
            borderRadius:12,padding:'14px 18px',marginBottom:24,fontFamily:'JetBrains Mono',fontSize:13,color:'#fc7c7c'}}>
            {error}
          </div>
        )}

        {!sourceFile && kept.some(f=>!f.imageData) && (
          <div style={{background:'rgba(194,245,103,.05)',border:'1.5px solid rgba(194,245,103,.2)',
            borderRadius:12,padding:'14px 18px',marginBottom:24,fontFamily:'JetBrains Mono',fontSize:12,color:'#c2f567',lineHeight:1.7}}>
            You'll be asked to re-select your source video once. Thumbnails are low-res — full frames are decoded on demand.
          </div>
        )}

        {/* Filename */}
        <div style={{marginBottom:32}}>
          <span className="label">Base filename</span>
          <input type="text" value={name} onChange={e=>setName(e.target.value||'sprite')} style={{width:280}}/>
        </div>

        {/* Shared layout options */}
        <div style={{display:'flex',gap:20,marginBottom:32,flexWrap:'wrap'}}>
          <div><span className="label">Columns</span><input type="number" value={cols} min={1} max={64} onChange={e=>setCols(+e.target.value)} style={{width:70}}/></div>
          <div><span className="label">Padding (px)</span><input type="number" value={pad} min={0} max={32} onChange={e=>setPad(+e.target.value)} style={{width:70}}/></div>
          <div style={{display:'flex',flexDirection:'column'}}>
            <span className="label">GIF / CSS fps</span>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <input type="range" min={1} max={30} value={gifFps} onChange={e=>setGifFps(+e.target.value)} style={{width:110}}/>
              <span style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#7c5cfc'}}>{gifFps}</span>
            </div>
          </div>
        </div>

        <ExportCard icon="🗂" title="Spritesheet PNG + JSON" tags={['PNG','JSON','atlas']}
          desc="All frames packed into a texture atlas with a JSON coordinate map."
          loading={loading.sheet} done={done.sheet} disabled={noFrames}
          onExport={()=>run('sheet',(f,p)=>exportSpritesheet(frames,f,global,opts,p))}/>

        <ExportCard icon="📦" title="Frames ZIP" tags={['ZIP','PNG sequence']}
          desc="Every kept frame as an individual PNG in a ZIP archive."
          loading={loading.zip} done={done.zip} disabled={noFrames}
          onExport={()=>run('zip',(f,p)=>exportZip(frames,f,global,{name},p))}/>

        <ExportCard icon="🎞" title="Animated GIF" tags={['GIF','animated']}
          desc="Classic looping animation — great for previews and web embeds."
          loading={loading.gif} done={done.gif} disabled={noFrames}
          onExport={()=>run('gif',(f,p)=>exportGif(frames,f,global,{fps:gifFps,name},p))}/>

        <ExportCard icon="🌐" title="WebP Frames ZIP" tags={['WebP','ZIP']}
          desc="Frames as WebP images — smaller than PNG for web pipelines."
          loading={loading.webp} done={done.webp} disabled={noFrames}
          onExport={()=>run('webp',(f,p)=>exportWebP(frames,f,global,{name:`${name}_webp`},p))}/>

        <ExportCard icon="✨" title="CSS Spritesheet" tags={['PNG','CSS','@keyframes']}
          desc="Spritesheet PNG + CSS @keyframes animation. Drop into any web project."
          loading={loading.css} done={done.css} disabled={noFrames}
          onExport={()=>run('css',(f,p)=>exportCSS(frames,f,global,opts,p))}/>

        <ExportCard icon="🤖" title="Godot SpriteFrames" tags={['.tres','Godot 4','PNG']} accent="#478cbf"
          desc="Spritesheet PNG + .tres SpriteFrames resource for AnimatedSprite2D."
          loading={loading.godot} done={done.godot} disabled={noFrames}
          onExport={()=>run('godot',(f,p)=>exportGodot(frames,f,global,{...opts,fps:global.fps||12},p))}/>

        <ExportCard icon="🎮" title="Unity Sprite Sheet" tags={['.meta','Unity','PNG']} accent="#555"
          desc="Spritesheet PNG + .meta file with all sprite slice coordinates."
          loading={loading.unity} done={done.unity} disabled={noFrames}
          onExport={()=>run('unity',(f,p)=>exportUnity(frames,f,global,{...opts,fps:global.fps||12},p))}/>

        <ExportCard icon="🕹" title="MUGEN Package" tags={['.sff','.air','.act','ZIP']} accent="#c2f567"
          desc="Full MUGEN character package: SFF v1 binary, AIR animation, ACT palette."
          loading={loading.mugen} done={done.mugen} disabled={noFrames}
          onExport={()=>run('mugen',(f,p)=>exportMugen(frames,f,global,{group:mugenGroup,name,fps:global.fps||12},p))}>
          <div>
            <span className="label">MUGEN group number</span>
            <input type="number" value={mugenGroup} min={0} max={9999} onChange={e=>setMugenGroup(+e.target.value)} style={{width:90}}/>
          </div>
        </ExportCard>

        {/* Save project */}
        <div style={{background:'#16161a',border:'1.5px solid #2e2e38',borderRadius:16,padding:'24px 28px',
          display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1}}>
            <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:16,color:'#e8e8f2',marginBottom:4}}>Save project</h3>
            <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a'}}>
              Saves settings, selections, segments and palette as a <code style={{color:'#a898ff'}}>.spriteproject</code> file.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={saveProject}>💾 Save project</button>
        </div>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:20,background:'rgba(13,13,15,.96)',
        borderTop:'1.5px solid #2e2e38',padding:'18px 48px',backdropFilter:'blur(8px)',
        display:'flex',gap:14,alignItems:'center'}}>
        <span style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#72728a',flex:1}}>
          {doneCount>0
            ? <span style={{color:'#c2f567'}}>✓ {doneCount} export{doneCount>1?'s':''} complete</span>
            : 'Choose a format above to export'}
        </span>
        <button className="btn btn-ghost" onClick={()=>goToStage('processing')}>← Back</button>
      </div>
    </div>
  )
}
