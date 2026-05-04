import useStore from './store.js'
import Nav from './components/Nav.jsx'
import StageImport from './stages/StageImport.jsx'
import StageExtracting from './stages/StageExtracting.jsx'
import StageReview from './stages/StageReview.jsx'
import StageProcessing from './stages/StageProcessing.jsx'
import StageExport from './stages/StageExport.jsx'

export default function App() {
  const { stage } = useStore()
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:'100vh'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden'}}>
        {stage==='drop'        && <StageImport/>}
        {stage==='extracting'  && <StageExtracting/>}
        {stage==='review'      && <StageReview/>}
        {stage==='processing'  && <StageProcessing/>}
        {stage==='export'      && <StageExport/>}
      </div>
    </div>
  )
}
