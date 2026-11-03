import { ChangeEvent, useState } from 'react'
import {
  ArrowDownToLine, ArrowUpRight, Check, ChevronDown, ChevronRight, CircleHelp,
  FileText, FolderOpen, Grid2X2, Info, Leaf, LockKeyhole, Menu, MoreHorizontal,
  Network, Plus, Search, Settings, Share2, Sparkles, Star, Upload, UserRound,
  X, ZoomIn, ZoomOut,
} from 'lucide-react'
import logo from './assets/LOGO.png'

type View = 'new' | 'summary' | 'map' | 'profile'

const recent = [
  { title: 'The focused team', meta: '12 pages · Today', type: 'pdf' },
  { title: 'Customer discovery', meta: '8 pages · Yesterday', type: 'pdf' },
  { title: 'A guide to systems', meta: 'Pasted text · Oct 30', type: 'text' },
]

function IconButton({ children, label }: { children: React.ReactNode; label?: string }) {
  return <button aria-label={label} className="[display:grid] [place-items:center] [width:25px] [height:25px]">{children}</button>
}

function Sidebar({ view, setView, width, onWidthChange }: { view: View; setView: (v: View) => void; width: number; onWidthChange: (width: number) => void }) {
  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = width
    const move = (moveEvent: React.PointerEvent<HTMLDivElement>) => {
      onWidthChange(startWidth + moveEvent.clientX - startX)
    }
    const end = () => {
      event.currentTarget.releasePointerCapture(event.pointerId)
      event.currentTarget.removeEventListener('pointermove', move as unknown as EventListener)
      event.currentTarget.removeEventListener('pointerup', end)
    }
    event.currentTarget.addEventListener('pointermove', move as unknown as EventListener)
    event.currentTarget.addEventListener('pointerup', end)
  }

  return (
    <aside className="[width:var(--sidebar-width,230px)] [height:100vh] [max-height:100vh] [overflow-x:hidden] [overflow-y:auto] [scrollbar-gutter:stable] [background:var(--sidebar)] [color:#e8f0e9] [padding:22px_10px_12px] [display:flex] [flex-direction:column] [position:fixed] [inset:0_auto_0_0] [z-index:10] max-[760px]:[width:64px] max-[760px]:[padding:18px_8px_10px] max-[760px]:[align-items:stretch]" style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}>
      <div className="[display:flex] [align-items:center] [gap:8px] [font-size:21px] [margin:0_6px_21px] [font-family:'IBM_3270_Semi_Condensed','IBM_Plex_Mono',monospace] max-[760px]:[justify-content:center] max-[760px]:[margin:0_0_22px] max-[760px]:[font-size:0]"><img src={logo} alt="" className="[width:42px] [height:32px] [object-fit:contain] [flex:none] max-[760px]:[width:42px] max-[760px]:[height:32px]" /> MindIt</div>
      <nav className="[display:grid] [gap:4px]">
        <button className={view === 'new' ? '[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px] [background:#214737] [color:#f1f7f0]' : '[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px]'} onClick={() => setView('new')}><Plus size={15} /> New document</button>
        <button className={view === 'summary' || view === 'map' ? '[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px] [background:#214737] [color:#f1f7f0]' : '[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px]'} onClick={() => setView('summary')}><FolderOpen size={15} /> My library <small>12</small></button>
        <button className="[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px]"><Star size={15} /> Favorites <small>3</small></button>
      </nav>
      <div className="[text-transform:uppercase] [letter-spacing:1.5px] [font-size:8px] [font-weight:bold] [color:#87968a] [margin:22px_8px_9px] max-[760px]:[display:none]">Recent</div>
      <div className="[display:grid] [gap:3px] max-[760px]:[gap:6px]">
        {recent.map((item, index) => (
          <button key={item.title} className={`[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] text-[11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] max-[760px]:[align-items:flex-start] [padding:8px_7px] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] max-[760px]:text-[0px] ${view !== 'new' && index === 0 ? '[background:#214737] [color:#f1f7f0]' : ''}`} onClick={() => setView(index === 0 ? 'summary' : 'summary')}>
            <FileText size={14} /><span className="[display:grid] [gap:4px] [min-width:0] max-[760px]:[display:none]"><b className="text-[10px] [font-weight:500] [overflow:hidden] [text-overflow:ellipsis]">{item.title}</b><small className="text-[8px] [color:#8da094]">{item.meta}</small></span>
          </button>
        ))}
      </div>
      <div className="[flex:1] [min-height:0]" />
      <button className="[background:var(--sidebar2)] [border-radius:8px] [color:#dce9df] [text-align:left] [padding:10px_9px] [margin-bottom:10px] [flex:none] max-[760px]:[display:none]" onClick={() => setView('profile')}>
        <div><b>Personal workspace</b><Leaf size={14} /></div>
        <small>8 of 20 documents this month</small>
        <div className="[height:2px] [background:#486353] [margin:9px_0]" /><span>Manage plan <ArrowUpRight size={11} /></span>
      </button>
      <button className={`[text-align:left] [display:flex] [align-items:center] [gap:9px] [color:#aab8ad] [font-size:11px] [padding:8px_8px] [border-radius:6px] [white-space:nowrap] [width:100%] [padding:7px_5px] [flex:none] max-[760px]:[justify-content:center] max-[760px]:[padding:9px_5px] max-[760px]:[gap:0] [margin-top:8px] ${view === 'profile' ? '[background:#214737] [color:#f1f7f0]' : ''}`} onClick={() => setView('profile')}>
        <span className="[display:grid] [place-items:center] [border-radius:50%] [background:#c9d6c3] [color:#46614d] [width:21px] [height:21px] [font-size:9px] max-[760px]:[width:27px] max-[760px]:[height:27px]">AL</span><span className="[display:grid] [gap:3px] [flex:1]"><b>Alex Lee</b><small className="[font-size:8px] [color:#8da094]">Personal account</small></span><ChevronDown size={13} />
      </button>
      <div
        className="[position:absolute] [top:0] [right:-3px] [width:7px] [height:100%] [cursor:col-resize] [z-index:5]"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={180}
        aria-valuemax={360}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onWidthChange(width - 10)
          if (event.key === 'ArrowRight') onWidthChange(width + 10)
        }}
      />
    </aside>
  )
}

function Topbar({ view }: { view: View }) {
  const crumb = view === 'new' ? 'New document' : view === 'profile' ? 'Profile & account' : 'The focused team'
  return <header className="[height:53px] [border-bottom:1px_solid_var(--line)] [display:flex] [align-items:center] [justify-content:space-between] [padding:0_27px] [background:#f0f3eb] max-[760px]:[padding:0_16px]"><div className="[display:flex] [align-items:center] [gap:12px] [font-size:10px] [color:#566258] max-[760px]:[gap:8px] max-[760px]:[font-size:9px]"><Grid2X2 size={15} /><span>Personal workspace</span><ChevronRight size={13} /><b>{crumb}</b></div><div className="[display:flex] [gap:10px] max-[760px]:[gap:2px]"><IconButton label="Search"><Search size={17} /></IconButton><IconButton label="Help"><CircleHelp size={17} /></IconButton></div></header>
}

function NewDocument({ openSummary }: { openSummary: () => void }) {
  const [file, setFile] = useState('The focused team.pdf')
  const [text, setText] = useState('')
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.[0]) setFile(event.target.files[0].name)
  }
  return <div className="[max-width:848px] [margin:0_auto] [padding:29px_0_32px] max-[1100px]:[width:100%] max-[1100px]:[padding-left:24px] max-[1100px]:[padding-right:24px] max-[760px]:[padding:24px_16px_28px] new-page">
    <section className="[margin-bottom:20px]"><div className="[text-transform:uppercase] [letter-spacing:1.45px] [font-size:8px] [color:#667267] [font-weight:600]">New document</div><h1 className="[font-family:Manrope,sans-serif] [font-size:23px] [margin:8px_0_6px] [letter-spacing:-.7px] max-[760px]:[font-size:21px]">Make room for understanding.</h1><p className="[margin:0] [color:#58645b] [font-size:11px]">Add a document or paste your text. Turn the details into a clear summary and a connected mind map.</p></section>
    <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:16px] max-[760px]:[grid-template-columns:1fr]">
      <section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] max-[760px]:[padding:14px]"><div className="[display:flex] [justify-content:space-between] [align-items:center] [font-size:12px] [margin-bottom:15px]"><span className="[display:flex] [align-items:center] [gap:8px] [font-weight:600]"><FileText size={16} /> Upload a PDF</span><em className="[display:flex] [align-items:center] [gap:4px] [padding:4px_7px] [background:#e1eadb] [border-radius:12px] [color:#58705a] [font-size:8px] [font-style:normal]"><Check size={12} /> Selected source</em></div>
        <label className="[height:163px] [border:1px_dashed_#c8d1c1] [border-radius:8px] [background:#f0f3e9] [display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [gap:7px] [color:#4f5f52] [position:relative] [cursor:pointer] max-[760px]:[gap:8px] max-[760px]:[height:145px]"><Upload size={19} /><b>Drop your PDF here</b><small>PDF files up to 25 MB · Up to 200 pages</small><span className="[border:1px_solid_#d1d9cc] [background:#fbfcf8] [border-radius:5px] [padding:5px_10px] [font-size:10px]">Browse files</span><input className="[position:absolute] [inset:0] [width:100%] [height:100%] [opacity:0] [cursor:pointer]" type="file" accept=".pdf" onChange={chooseFile} /></label>
        <div className="[margin-top:15px] [background:#dce5d2] [border-radius:6px] [padding:9px] [display:flex] [align-items:center] [gap:8px] [font-size:10px]"><span className="[background:#f8fbf6] [padding:7px] [border-radius:5px]"><FileText size={18} /></span><span className="[flex:1] [display:grid] [gap:3px]"><b>{file}</b><small className="[font-size:8px] [color:#5a685b]">1.8 MB · 12 pages · Ready to generate</small></span><Check size={15} /><X size={15} /></div>
      </section>
      <section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] max-[760px]:[padding:14px] paste-card"><div className="[display:flex] [justify-content:space-between] [align-items:center] [font-size:12px] [margin-bottom:15px]"><span><FileText size={16} /> Or paste text</span><small>Use instead of a PDF</small></div>
        <textarea className="[width:100%] [height:201px] [resize:none] [background:#eef2e8] [border:1px_solid_#d6ddce] [border-radius:8px] [padding:12px] [font-size:10px] [color:var(--ink)] placeholder:[color:#7b877c]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your article, meeting notes, research, or any text you want to make sense of..." />
        <div className="[display:flex] [justify-content:space-between] [color:#748075] [font-size:8px] [margin-top:-22px] [padding:0_12px] [position:relative]"><span>At least 100 words</span><span>{text.trim() ? text.trim().split(/\s+/).length : 0} / 20,000 words</span></div>
        <p className="[display:flex] [align-items:center] [gap:5px] [color:#687469] [font-size:9px] [line-height:1.45] [margin:16px_0_0]"><Info size={13} className="[flex:none]" /><span>One source at a time. Pasting text will replace your PDF.</span></p>
      </section>
    </div>
    <section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [margin-top:20px] [padding:16px] [display:grid] [grid-template-columns:1fr_auto] [align-items:start] max-[760px]:[grid-template-columns:1fr] max-[760px]:[gap:12px]"><div><b>Two ways to see the big picture</b><p>Both views are created from the same source.</p></div><div className="[display:flex] [gap:18px] [font-size:9px] [color:#405646] max-[760px]:[flex-wrap:wrap] max-[760px]:[gap:10px_16px]"><span><FileText size={14} /> Structured summary <Check size={13} /></span><span><Network size={14} /> Connected mind map <Check size={13} /></span></div><div className="[grid-column:1/-1] [border-top:1px_solid_var(--line)] [margin-top:15px] [padding-top:13px] [display:flex] [align-items:end] [gap:16px] max-[760px]:[align-items:stretch] max-[760px]:[flex-wrap:wrap] [gap:10px]"><label>Summary length<select><option>Standard</option><option>Short</option><option>Detailed</option></select></label><label>Output language<select><option>English</option><option>Spanish</option></select></label><button className="[margin-left:auto] [background:#365b43] [color:white] [border-radius:6px] [padding:8px_13px] [font-size:10px] [display:flex] [align-items:center] [gap:7px] max-[480px]:[margin-left:0] max-[480px]:[width:100%] max-[760px]:[justify-content:center]" onClick={openSummary}><Sparkles size={15} /> Generate summary &amp; mind map</button></div></section>
    <div className="[text-align:center] [color:#718071] [font-size:9px] [display:flex] max-[760px]:[justify-content:center] [gap:5px] [align-items:center] [margin-top:20px]"><LockKeyhole size={12} /> Your documents stay private. Only you can access them unless you choose to share.</div>
  </div>
}

const ideas = [
  ['Protect focus', 'Reserve two-hour focus blocks', 'Make uninterrupted time a team agreement', 'Batch notifications', '42% fewer interruptions in the pilot'],
  ['Default to async', 'Keep a shared decision log', 'One place for context and decisions', 'Set a 24-hour response window', 'Separate important from truly urgent'],
  ['Meet with intention', 'Share a pre-read', 'Move status updates out of meetings', 'Name a decision owner', 'Use live time for debate and decisions'],
  ['Measure outcomes', 'Review clear deliverables weekly', 'Track progress, not online presence', 'Reclaim six hours a week', 'Time saved per person in the pilot'],
]

function DocumentHeader({ tab, setTab }: { tab: 'summary' | 'map'; setTab: (t: 'summary' | 'map') => void }) {
  return <><div className="[display:flex] [justify-content:space-between] [align-items:end] max-[760px]:[align-items:flex-start] [gap:14px] max-[480px]:[display:block]"><div><div className="[font-size:8px] [color:#68746a] [margin-bottom:10px]">My library&nbsp; / &nbsp;Research &amp; ideas</div><h1 className="[font-family:Manrope,sans-serif] [font-size:23px] [letter-spacing:-.7px] [margin:0_0_5px] max-[760px]:[font-size:21px]">The focused team</h1><p className="[display:flex] [align-items:center] [color:#667267] [font-size:9px] [margin:0] max-[760px]:[flex-wrap:wrap] max-[760px]:[line-height:1.6]"><FileText size={13} /> The focused team.pdf&nbsp; · &nbsp;12 pages · 4,280 words&nbsp; · &nbsp;Saved just now</p></div><div className="[display:flex] [gap:9px] [flex:none] [margin-top:12px]"><button className="[border:1px_solid_var(--line)] [border-radius:6px] [padding:7px_12px] [font-size:9px] [display:flex] [align-items:center] [gap:6px] [background:#fafcf8]"><Share2 size={14} /> Share</button><button className="[border:1px_solid_var(--line)] [border-radius:6px] [padding:7px_12px] [font-size:9px] [display:flex] [align-items:center] [gap:6px] [background:#fafcf8]"><ArrowDownToLine size={14} /> Export</button></div></div><div className="[height:57px] [border-bottom:1px_solid_var(--line)] [display:flex] [align-items:end] [gap:20px] [margin-top:12px] max-[760px]:[height:49px]"><button className={`[padding:0_0_12px] [font-size:10px] [color:#617064] [display:flex] [gap:7px] [align-items:center] [border-bottom:2px_solid_transparent] ${tab === 'summary' ? '[border-color:#6a8b70] [color:#30563c] [font-weight:bold]' : ''}`} onClick={() => setTab('summary')}><Menu size={14} /> Summary</button><button className={`[padding:0_0_12px] [font-size:10px] [color:#617064] [display:flex] [gap:7px] [align-items:center] [border-bottom:2px_solid_transparent] ${tab === 'map' ? '[border-color:#6a8b70] [color:#30563c] [font-weight:bold]' : ''}`} onClick={() => setTab('map')}><Network size={14} /> Mind map</button><span className="[display:flex] [align-items:center] [gap:5px] [font-size:9px] [color:#617064]"><Check size={13} /> Generated from your source</span></div></>
}

function SummaryView({ setTab }: { setTab: (t: 'summary' | 'map') => void }) {
  return <div className="[max-width:848px] [margin:0_auto] [padding:29px_0_32px] max-[1100px]:[width:100%] max-[1100px]:[padding-left:24px] max-[1100px]:[padding-right:24px] max-[760px]:[padding:24px_16px_28px] document-page"><DocumentHeader tab="summary" setTab={setTab} /><div className="[display:grid] [grid-template-columns:minmax(0,1fr)_201px] [gap:16px] [margin-top:15px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[gap:14px]"><section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:18px_19px] max-[760px]:[padding:15px]"><div className="[display:flex] [align-items:center] [gap:8px] [font-size:11px]"><b className="[display:flex] [align-items:center] [gap:8px]"><Menu size={16} /> Summary</b><small className="[font-size:8px] [color:#778378] [flex:1]">3 min read</small><MoreHorizontal size={17} /></div><div className="[background:#e5eadc] [border-radius:9px] [margin:17px_0] [padding:14px]"><div className="[text-transform:uppercase] [letter-spacing:1.45px] [font-size:8px] [color:#667267] [font-weight:600]">The big idea</div><h2 className="[font-family:Manrope,sans-serif] [font-size:17px] [letter-spacing:-.3px] [margin:7px_0]">Design work around focus, not availability.</h2><p className="[font-size:10px] [line-height:1.6] [color:#526155] [margin:0]">High-performing teams don’t communicate more; they communicate more intentionally. This guide outlines four habits that replace constant responsiveness with time for meaningful work.</p></div><h3 className="[font-size:12px] [margin:0_0_6px]">Key takeaways <small className="[font-size:8px] [color:#778378]">4 connected ideas</small></h3><div className="[display:grid] [gap:2px]">{ideas.map((idea, i) => <div className="[display:grid] [grid-template-columns:20px_1fr_auto] [gap:7px] [padding:10px_0] max-[760px]:[grid-template-columns:20px_1fr]" key={idea[0]}><span className="[font-size:8px] [color:#6e7c6f]">0{i + 1}</span><div><b className="[font-size:10px]">{idea[0]}{i === 0 ? ' as a shared resource' : i === 1 ? ' work the default' : i === 2 ? ' meeting in a reason to exist' : ' outcomes, not online presence'}</b><p className="[font-size:9px] [color:#687469] [margin:4px_0_0]">{idea[2]}. {idea[4]}.</p></div><em className="[font-size:8px] [color:#778378] [font-style:normal]">pp. {i * 2 + 3}–{i * 2 + 4}</em></div>)}</div><div className="[border-top:1px_solid_var(--line)] [margin-top:8px] [padding-top:13px]"><b className="[display:flex] [align-items:center] [gap:5px] [font-size:10px]"><ArrowUpRight size={14} /> Put it into practice <small className="[font-size:8px] [color:#778378]">pp. 11–12</small></b><div className="[display:flex] [gap:14px] [margin-top:10px] max-[760px]:[display:grid]"><label className="[font-size:9px]"><input type="checkbox" /> Audit your team’s calendar</label><label className="[font-size:9px]"><input type="checkbox" /> Agree on response windows</label><label className="[font-size:9px]"><input type="checkbox" /> Run a six-week pilot</label></div></div></section><SourcePanel setTab={setTab} /></div></div>
}

function SourcePanel({ setTab }: { setTab: (t: 'summary' | 'map') => void }) {
  return <aside className="[display:grid] [gap:15px] [align-content:start] [min-width:0] [grid-template-columns:1fr_1fr] max-[760px]:[grid-template-columns:1fr]"><div className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] [min-width:0] [overflow:hidden]"><b className="[display:flex] [justify-content:space-between] [align-items:center] [font-size:11px]">Your source <Info size={14} /></b><div className="[background:#204739] [color:#eef6eb] [border-radius:6px] [height:116px] [margin:14px_0] [padding:13px] [overflow:hidden]"><small>WORKLIFE RESEARCH / 2026</small><strong className="[display:block] [font-family:Manrope,sans-serif] [font-size:18px] [margin:8px_0_4px]">The focused<br />team.</strong><i className="[font-size:9px]">A practical guide to async work</i></div><p className="[font-size:9px] [line-height:1.6] [color:#687469]"><b>The focused team.pdf</b><br />12 pages · PDF · 1.8 MB<br />Added today, 9:41 AM</p><button><ArrowUpRight size={13} /> Open original</button><hr /><small>FROM THE DOCUMENT <span>p. 3</span></small><blockquote className="[border-left:2px_solid_#cbd4c8] [padding-left:9px] [font-size:9px] [line-height:1.5] [color:#566258]">“Focus is not an individual perk. It is a team agreement about how attention is spent.”</blockquote></div><div className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [background:#e2e9da] max-[760px]:[padding:15px] [display:grid] [gap:9px] [align-content:start]"><Network size={18} /><b>See how the ideas connect</b><p>Explore the same four themes as a connected, visual outline.</p><button onClick={() => setTab('map')}>Open mind map <ArrowRightIcon /></button></div></aside>
}

function ArrowRightIcon() { return <ArrowUpRight size={13} /> }

function MapView({ setTab }: { setTab: (t: 'summary' | 'map') => void }) {
  return <div className="[max-width:848px] [margin:0_auto] [padding:29px_0_32px] max-[1100px]:[width:100%] max-[1100px]:[padding-left:24px] max-[1100px]:[padding-right:24px] max-[760px]:[padding:24px_16px_28px] document-page"><DocumentHeader tab="map" setTab={setTab} /><div className="[display:flex] [justify-content:space-between] [align-items:center] [margin-top:18px] [font-size:12px] max-[760px]:[align-items:flex-start] [gap:10px] max-[480px]:[display:block]"><b>Mind map <small>4 themes · 8 supporting ideas</small></b><div><button>✣ &nbsp;Expand all</button><button><Network size={13} /> Layout</button><IconButton label="More"><MoreHorizontal size={16} /></IconButton></div></div><section className="[height:454px] [background:#fafcf8] [border:1px_solid_var(--line)] [border-radius:12px] [margin-top:10px] [position:relative] [overflow:hidden] [padding:18px] max-[480px]:[height:auto] max-[480px]:[min-height:0] [padding:16px]"><div className="[font-size:8px] [color:#778377]">➤ &nbsp; Select an idea to explore its source</div><div className="[position:absolute] [left:23px] [top:172px] [width:174px] [height:86px] [padding:13px_15px] [background:#204739] [color:white] [border-radius:7px] [z-index:2] max-[480px]:[position:static] max-[480px]:[width:auto] max-[480px]:[height:auto] max-[480px]:[margin:20px_0_16px]"><small>▧ &nbsp; THE FOCUSED TEAM</small><span>Design work around<br />focus, not availability.</span></div><div className="[position:absolute] [left:210px] [right:45px] [top:33px] [display:grid] [gap:11px] max-[1100px]:[right:18px] max-[1100px]:[gap:7px] max-[480px]:[position:static] max-[480px]:[gap:10px]">{ideas.map((idea, i) => <div className="[display:grid] [grid-template-columns:142px_1fr] [gap:98px] [align-items:center] [position:relative] max-[1100px]:[gap:45px] max-[760px]:[grid-template-columns:1fr] max-[760px]:[gap:8px]" key={idea[0]}><div className={`[border:1px_solid_#cbd4c8] [border-radius:7px] [background:#f2f4ed] [padding:10px_12px] [position:relative] [z-index:1] [height:55px] max-[480px]:[height:auto] ${i === 0 ? '[background:#dce5d2]' : ''}`}><b>{idea[0]}</b><small>pp. {i * 2 + 3}–{i * 2 + 4} · 2 ideas</small></div><div className="[display:grid] [gap:7px] [grid-template-columns:1fr_1fr] max-[760px]:[grid-template-columns:1fr]"><div><b>{idea[1]}</b><small>{idea[2]}</small></div><div><b>{idea[3]}</b><small>{idea[4]}</small></div></div></div>)}</div><div className="[position:absolute] [bottom:10px] [left:15px] [right:15px] [display:flex] [justify-content:space-between] [color:#5c705e] [font-size:8px]"><span>● &nbsp; Protect focus &nbsp; 2 ideas · Source pp. 3–4</span><span><ZoomOut size={14} /> 100% <ZoomIn size={14} /> ⛶ &nbsp; Fit</span></div></section><p className="[font-size:8px] [color:#778378]">◎ Every idea is connected to your original document.</p></div>
}

function ProfileView() {
  return <div className="[max-width:848px] [margin:0_auto] [padding:29px_0_32px] max-[1100px]:[width:100%] max-[1100px]:[padding-left:24px] max-[1100px]:[padding-right:24px] max-[760px]:[padding:24px_16px_28px] profile-page"><div className="[display:flex] [justify-content:space-between] [align-items:end] max-[760px]:[align-items:flex-start] [gap:10px] max-[480px]:[display:block]"><div><div className="[text-transform:uppercase] [letter-spacing:1.45px] [font-size:8px] [color:#667267] [font-weight:600]">Your workspace</div><h1 className="[font-family:Manrope,sans-serif] [font-size:23px] [margin:8px_0_6px] [letter-spacing:-.7px] max-[760px]:[font-size:21px]">Profile &amp; account</h1><p className="[margin:0] [color:#58645b] [font-size:11px]">A little about you. A workspace that feels like yours.</p></div><span><LockKeyhole size={13} /> Only visible to you</span></div><div className="[display:flex] [gap:22px] [border-bottom:1px_solid_var(--line)] [margin-top:20px] [height:42px] [align-items:end]"><b>Profile</b><span>Preferences</span><span>Security</span><span>Plan &amp; billing</span></div><div className="[display:grid] [grid-template-columns:1fr_258px] [gap:16px] [margin-top:17px] max-[760px]:[grid-template-columns:1fr] [gap:14px]"><div><section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] details"><div className="[display:flex] [justify-content:space-between] [align-items:center] [font-size:12px] [margin-bottom:15px]"><b>Personal details</b><small>Personal account</small></div><div className="[display:flex] [align-items:center] [gap:11px]"><span className="[display:grid] [place-items:center] [border-radius:50%] [background:#c9d6c3] [color:#46614d] [width:47px] [height:47px] [font-size:17px] [border:1px_solid_#bdcbb7]">AL</span><div><b>Alex Lee</b><small>Make this space your own.</small></div><button>Change photo</button></div><hr /><div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:15px] max-[760px]:[gap:12px] max-[760px]:[grid-template-columns:1fr]"><label>Full name<input value="Alex Lee" readOnly /></label><label>Email address<input value="alex.lee@example.com" readOnly /></label><label>Language<select><option>English</option></select></label><label>Time zone<select><option>Pacific Time (UTC−08:00)</option></select></label></div><div className="[display:flex] [align-items:center] [gap:7px] [margin-top:14px]"><small>Your email is never shared with others.</small><button>Cancel</button><button className="[background:#365b43] [color:white] [border-radius:6px] [padding:8px_13px] [font-size:10px]">Save changes</button></div></section><section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] [margin-top:15px]"><b>A quieter workspace</b><p>Choose what reaches your inbox.</p><Toggle label="Document updates" detail="An email when your summary and mind map are ready." on /><Toggle label="Tips & product news" detail="Occasional ideas to help you get more from Folio." /></section><button className="[font-size:9px] [color:#69766a] [margin:14px_0_0_2px] [display:flex] [gap:5px]"><ArrowUpRight size={14} /> Sign out of Folio</button></div><div><section className="[background:#204739] [color:#eff6ed] [border-radius:12px] [padding:17px] [height:182px] max-[480px]:[height:auto] [min-height:182px]"><div className="[text-transform:uppercase] [letter-spacing:1.45px] [font-size:8px] [color:#667267] [font-weight:600]">Your plan <Leaf size={15} /></div><h2>Personal workspace</h2><p>Space to turn information into understanding.</p><strong>8<small> / 20</small></strong><span>documents this month</span><hr /><small>12 saved documents <u>Manage plan ↗</u></small></section><section className="[background:var(--paper)] [border:1px_solid_var(--line)] [border-radius:12px] [padding:16px] [margin-top:15px]"><div className="[display:flex] [justify-content:space-between] [align-items:center] [font-size:12px] [margin-bottom:15px]"><b>Security</b><LockKeyhole size={15} /></div><b>Password</b><small>Keep your account protected.</small><a>Change password ↗</a><hr /><b>Two-step verification <em>Off</em></b><small>Add an extra layer of protection.</small><button>Enable verification</button></section><p className="[text-align:center] [color:#718071] [font-size:9px] [display:flex] max-[760px]:[justify-content:center] [gap:5px] [align-items:center] [margin-top:20px]"><Check size={13} /> Your documents stay private. You’re always in control of what you share.</p></div></div></div>
}

function Toggle({ label, detail, on = false }: { label: string; detail: string; on?: boolean }) {
  return <div className="[display:flex] [justify-content:space-between] [align-items:center] [padding:11px_0] [border-top:1px_solid_var(--line)]"><div><b>{label}</b><small>{detail}</small></div><span className={on ? '[width:23px] [height:13px] [border-radius:8px] [background:#c9d1c3] [padding:2px] on' : '[width:23px] [height:13px] [border-radius:8px] [background:#c9d1c3] [padding:2px]'}><i /></span></div>
}

export default function App() {
  const [view, setView] = useState<View>('new')
  const [tab, setTab] = useState<'summary' | 'map'>('summary')
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('mindit-sidebar-width'))
    return Number.isFinite(saved) && saved >= 180 && saved <= 360 ? saved : 230
  })
  const updateSidebarWidth = (nextWidth: number) => {
    const next = Math.min(360, Math.max(180, nextWidth))
    setSidebarWidth(next)
    window.localStorage.setItem('mindit-sidebar-width', String(next))
  }
  const content = view === 'new' ? <NewDocument openSummary={() => { setView('summary'); setTab('summary') }} /> : view === 'profile' ? <ProfileView /> : tab === 'summary' ? <SummaryView setTab={setTab} /> : <MapView setTab={setTab} />
  return <div className="[min-height:100vh]" style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}><Sidebar view={view} setView={setView} width={sidebarWidth} onWidthChange={updateSidebarWidth} /><main className="[min-width:0] [margin-left:var(--sidebar-width,230px)] max-[760px]:[margin-left:64px]"><Topbar view={view} />{content}</main></div>
}
