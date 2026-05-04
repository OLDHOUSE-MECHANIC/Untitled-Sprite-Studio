import { create } from 'zustand'

const DEFAULT_GLOBAL = {
  chromaKey:   { enabled:false, color:'#00ff00', tolerance:30, feather:1 },
  pixelate:    { enabled:false, blockSize:4, paletteSize:16 },
  outline:     { enabled:false, size:1, color:'#000000' },
  shadow:      { enabled:false, offsetX:2, offsetY:4, blur:0, color:'#000000', opacity:0.5 },
  adjustments: { flipH:false, flipV:false, rotate:0, scale:1, brightness:0, contrast:0 },
  autoCrop:    { enabled:false, padding:2 },
}

const useStore = create((set, get) => ({
  stage: 'drop',
  sourceVideo: null,   // { name, duration, width, height, fps }
  sourceFile:  null,   // actual File object — persisted so export never re-prompts
  extractProgress: { done:0, total:0 },
  frames:      [],     // { id, index, thumbUrl, imageData, width, height, timestamp, kept, pivot, overrides }
  selectedIds: {},     // plain object { [id]: true } — avoids Set reference churn
  activeId:    null,
  global:      { ...DEFAULT_GLOBAL },
  palette:     [],
  segments:    [],
  preview:     { playing:false, fps:12, idx:0 },

  // Navigation
  goToStage: (s) => set({ stage:s }),

  // Source
  setSourceVideo: (meta) => set({ sourceVideo:meta }),
  setSourceFile:  (file) => set({ sourceFile:file }),
  setExtractProgress: (done, total) => set({ extractProgress:{ done, total } }),

  // Frames
  addFrame:  (f) => set(s => ({ frames:[...s.frames, f] })),
  setPalette: (p) => set({ palette:p }),
  finishExtraction: () => set({ stage:'review' }),

  reset: () => set({
    stage:'drop', sourceVideo:null, sourceFile:null,
    extractProgress:{ done:0, total:0 },
    frames:[], selectedIds:{}, activeId:null,
    global:structuredClone(DEFAULT_GLOBAL), palette:[], segments:[],
    preview:{ playing:false, fps:12, idx:0 },
  }),

  // Selection — plain object avoids new Set() ref on every update
  selectFrame: (id, multi, range) => set(s => {
    if (range && s.activeId) {
      const ids = s.frames.map(f => f.id)
      const a = ids.indexOf(s.activeId), b = ids.indexOf(id)
      const [lo, hi] = a < b ? [a,b] : [b,a]
      const sel = {}; ids.slice(lo,hi+1).forEach(i => sel[i]=true)
      return { selectedIds:sel, activeId:id }
    }
    if (multi) {
      const sel = { ...s.selectedIds }
      sel[id] ? delete sel[id] : (sel[id]=true)
      return { selectedIds:sel, activeId:id }
    }
    return { selectedIds:{ [id]:true }, activeId:id }
  }),
  selectAll:   () => set(s => { const sel={}; s.frames.forEach(f=>sel[f.id]=true); return { selectedIds:sel } }),
  clearSelect: () => set({ selectedIds:{}, activeId:null }),

  setKept:    (ids, kept) => set(s => ({ frames:s.frames.map(f => ids.includes(f.id)?{...f,kept}:f) })),
  toggleKept: (ids)       => set(s => ({ frames:s.frames.map(f => ids.includes(f.id)?{...f,kept:!f.kept}:f) })),

  setOverride: (id, key, val) => set(s => ({
    frames: s.frames.map(f => f.id===id ? {...f, overrides:{...f.overrides,[key]:val}} : f)
  })),
  setPivot: (id, pivot) => set(s => ({
    frames: s.frames.map(f => f.id===id ? {...f, pivot} : f)
  })),
  hydrateFrame: (id, imageData) => set(s => ({
    frames: s.frames.map(f => f.id===id ? {...f, imageData} : f)
  })),

  // Global settings — dot-path setter
  setGlobal: (path, val) => set(s => {
    const g = structuredClone(s.global)
    const parts = path.split('.'); let cur = g
    for (let i=0; i<parts.length-1; i++) cur = cur[parts[i]]
    cur[parts[parts.length-1]] = val
    return { global:g }
  }),

  // Segments
  addSegment:    (seg)       => set(s => ({ segments:[...s.segments, seg] })),
  updateSegment: (id, patch) => set(s => ({ segments:s.segments.map(sg => sg.id===id?{...sg,...patch}:sg) })),
  removeSegment: (id)        => set(s => ({ segments:s.segments.filter(sg => sg.id!==id) })),

  // Preview
  setPreview: (patch) => set(s => ({ preview:{...s.preview,...patch} })),

  // Project save
  exportProject: () => {
    const s = get()
    return JSON.stringify({
      version:4, sourceVideo:s.sourceVideo, global:s.global,
      palette:s.palette, segments:s.segments,
      frames:s.frames.map(({ imageData, ...r }) => r),
    }, null, 2)
  },
}))

export default useStore
