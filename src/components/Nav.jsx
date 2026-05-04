import useStore from '../store.js'

const STEPS = [
  { key:'drop',       label:'01  Import'  },
  { key:'review',     label:'02  Review'  },
  { key:'processing', label:'03  Process' },
  { key:'export',     label:'04  Export'  },
]
const ORDER = ['drop','extracting','review','processing','export']

export default function Nav() {
  const { stage, frames, goToStage } = useStore()
  const cur      = ORDER.indexOf(stage)
  const hasFrames = frames.length > 0
  const kept     = frames.filter(f=>f.kept).length
  const isExtracting = stage==='extracting'

  return (
    <nav style={{background:'#16161a',borderBottom:'1.5px solid #2e2e38',
      padding:'0 40px',display:'flex',alignItems:'center',height:58,flexShrink:0,gap:8}}>

      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginRight:28}}>
        <div style={{width:30,height:30,borderRadius:7,background:'#7c5cfc',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            {[[0,0],[6,0],[12,0],[0,6],[6,6],[12,6],[0,12],[6,12],[12,12]].map(([x,y],i)=>(
              <rect key={i} x={x} y={y} width="4" height="4" fill="white" opacity={[.9,.6,.4,.6,1,.6,.4,.6,.9][i]}/>
            ))}
          </svg>
        </div>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:15,color:'#e8e8f2'}}>
          sprite<span style={{color:'#7c5cfc'}}>studio</span>
        </span>
      </div>

      {/* Steps */}
      <div style={{display:'flex',alignItems:'center',gap:3,flex:1}}>
        {STEPS.map(s => {
          const idx      = ORDER.indexOf(s.key)
          const isDone   = cur > idx
          const isActive = stage===s.key || (isExtracting && s.key==='drop')
          const canClick = isDone && hasFrames && s.key!=='drop'
          return (
            <button key={s.key} onClick={()=>canClick&&goToStage(s.key)}
              style={{background:isActive?'#7c5cfc':'transparent',
                color:isActive?'#fff':isDone?'#c2f567':'#3a3a48',
                border:'none',borderRadius:8,padding:'6px 14px',
                fontFamily:'JetBrains Mono',fontSize:12,fontWeight:500,
                cursor:canClick?'pointer':'default',transition:'all .2s'}}>
              {s.label}
              {/* Spinner during extraction under Import step */}
              {isExtracting && s.key==='drop' && (
                <span className="spin" style={{display:'inline-block',width:8,height:8,
                  border:'1.5px solid rgba(255,255,255,.4)',borderTopColor:'#fff',
                  borderRadius:'50%',marginLeft:8,verticalAlign:'middle'}}/>
              )}
            </button>
          )
        })}
      </div>

      {/* Frame count */}
      {hasFrames && (
        <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#72728a'}}>
          <span style={{color:'#c2f567'}}>{kept}</span>/{frames.length} kept
        </div>
      )}
    </nav>
  )
}
