import useStore from '../store.js'

export default function StageExtracting() {
  const { extractProgress, sourceVideo } = useStore()
  const { done, total } = extractProgress
  const pct = total > 0 ? Math.round((done/total)*100) : 0

  return (
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
      <div style={{width:'100%',maxWidth:480,textAlign:'center'}} className="fade-in">
        {/* Pixel animation */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,width:120,margin:'0 auto 40px'}}>
          {Array.from({length:64},(_,i)=>(
            <div key={i} style={{
              width:'100%',paddingTop:'100%',borderRadius:3,
              background: i < Math.floor((done/Math.max(total,1))*64) ? '#7c5cfc' : '#1e1e24',
              transition:'background .15s',
              transitionDelay:`${(i%8)*20}ms`,
            }}/>
          ))}
        </div>

        <h2 style={{fontFamily:'Syne',fontWeight:700,fontSize:24,color:'#e8e8f2',marginBottom:8}}>
          Extracting frames
        </h2>
        {sourceVideo && (
          <p style={{fontFamily:'JetBrains Mono',fontSize:13,color:'#72728a',marginBottom:32,
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:400,margin:'0 auto 32px'}}>
            {sourceVideo.name}
          </p>
        )}

        <div style={{display:'flex',justifyContent:'center',alignItems:'baseline',gap:8,marginBottom:24}}>
          <span style={{fontFamily:'JetBrains Mono',fontSize:40,fontWeight:600,color:'#7c5cfc'}}>{done}</span>
          <span style={{fontFamily:'JetBrains Mono',fontSize:20,color:'#3a3a48'}}>/ {total}</span>
        </div>

        <div style={{height:4,background:'#1e1e24',borderRadius:99,overflow:'hidden',maxWidth:320,margin:'0 auto'}}>
          <div style={{height:'100%',background:'#7c5cfc',borderRadius:99,width:`${pct}%`,transition:'width .2s'}}/>
        </div>
        <p style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#3a3a48',marginTop:8}}>{pct}%</p>
      </div>
    </div>
  )
}
