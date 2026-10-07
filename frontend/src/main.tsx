import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import axios from "axios";
import {BrowserRouter} from "react-router-dom";
import {ShieldCheck,UploadCloud,FileCheck2,AlertTriangle,Activity,ClipboardCheck,ChevronRight,Download,Search,CheckCircle2,XCircle,Clock3,BrainCircuit,Scale,History,LayoutDashboard,ArrowLeft,BookOpen} from "lucide-react";
import "./styles.css";

const API="http://127.0.0.1:8000/api";
type Page="dashboard"|"new"|"analysis"|"audit"|"rules";
type Row={requirement_id:string;requirement:string;status:string;risk:string;confidence:number;reason:string;evidence:string;source:number|null};
type Analysis={evaluation_id:string;tender:string;requirements:{id:string;requirement:string}[];results:Record<string,Row[]>};
type AuditItem={id:number;evaluation_id:string;action:string;actor:string;details:string;created_at:string};
type Decision={id:string;evaluation_id:string;bidder:string;requirement_id:string;decision:string;comment:string;created_at:string};
type Rule={id:string;requirement:string;keywords:string[]};

function Badge({children,type="neutral"}:{children:React.ReactNode,type?:string}){return <span className={"badge "+type}>{children}</span>}
function statusType(s:string){return s==="Compliant"?"good":s==="Non-Compliant"?"bad":"warn"}

function App(){
 const [analysis,setAnalysis]=useState<Analysis|null>(null);
 const [page,setPage]=useState<Page>("dashboard");
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [tender,setTender]=useState<File|null>(null);
 const [bidders,setBidders]=useState<File[]>([]);
 const [selected,setSelected]=useState("");
 const [query,setQuery]=useState("");
 const [audit,setAudit]=useState<AuditItem[]>([]);
 const [decisions,setDecisions]=useState<Decision[]>([]);
 const [rules,setRules]=useState<Rule[]>([]);
 const [loadingGov,setLoadingGov]=useState(false);

 useEffect(()=>{const s=localStorage.getItem("nishtha-analysis");if(s){try{setAnalysis(JSON.parse(s))}catch{}}},[]);
 function go(p:Page){setPage(p);setError("")}
 async function openAudit(){
   if(!analysis){setError("Run an evaluation first to view its Audit Trail.");return}
   setLoadingGov(true);setError("");
   try{const r=await axios.get(`${API}/evaluations/${analysis.evaluation_id}`);setAudit(r.data.audit||[]);setDecisions(r.data.decisions||[]);go("audit")}
   catch(e:any){setError(e?.response?.data?.detail||"Could not load Audit Trail.")}
   finally{setLoadingGov(false)}
 }
 async function openRules(){
   setLoadingGov(true);setError("");
   try{const r=await axios.get(`${API}/rules`);setRules(r.data.rules||[]);go("rules")}
   catch(e:any){setError(e?.response?.data?.detail||"Could not load Evaluation Rules.")}
   finally{setLoadingGov(false)}
 }
 async function analyze(){
   if(!tender || bidders.length===0){setError("Please upload one tender PDF and at least one bidder PDF.");return}
   setLoading(true);setError("");
   try{
    const f=new FormData();f.append("tender",tender);bidders.forEach(b=>f.append("bidders",b));
    const r=await axios.post(API+"/evaluations",f,{headers:{"Content-Type":"multipart/form-data"}});
    setAnalysis(r.data);localStorage.setItem("nishtha-analysis",JSON.stringify(r.data));setSelected(Object.keys(r.data.results)[0]||"");setPage("analysis");
   }catch(e:any){setError(e?.response?.data?.detail||"Backend connection failed. Start FastAPI on port 8000.")}
   finally{setLoading(false)}
 }
 const bidderNames=analysis?Object.keys(analysis.results):[];
 const totals=useMemo(()=>{if(!analysis)return {total:0,good:0,bad:0,warn:0};const a=Object.values(analysis.results).flat();return {total:a.length,good:a.filter(x=>x.status==="Compliant").length,bad:a.filter(x=>x.status==="Non-Compliant").length,warn:a.filter(x=>x.status==="Needs Review").length}},[analysis]);
 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><div className="logo"><ShieldCheck size={25}/></div><div><b>Nishtha</b><small>GeM Intelligence</small></div></div>
   <div className="side-section">WORKSPACE</div>
   <button className={page==="dashboard"?"nav active":"nav"} onClick={()=>go("dashboard")}><LayoutDashboard size={18}/>Dashboard</button>
   <button className={page==="new"?"nav active":"nav"} onClick={()=>go("new")}><UploadCloud size={18}/>New Evaluation</button>
   <button className={page==="analysis"?"nav active":"nav"} disabled={!analysis} onClick={()=>go("analysis")}><ClipboardCheck size={18}/>Bid Evaluation</button>
   <div className="side-section">GOVERNANCE</div>
   <button className={page==="audit"?"nav active":"nav"} onClick={openAudit} disabled={loadingGov}><History size={18}/>Audit Trail</button>
   <button className={page==="rules"?"nav active":"nav"} onClick={openRules} disabled={loadingGov}><Scale size={18}/>Evaluation Rules</button>
   <div className="side-bottom"><div className="secure"><ShieldCheck size={17}/><span><b>Evidence-first</b><small>Human decision remains final</small></span></div></div>
  </aside>
  <main className="main">
   <header><div><div className="crumb">SMART AUTOMATION / PROCUREMENT</div><h1>{page==="dashboard"?"Procurement Intelligence":page==="new"?"New Bid Evaluation":page==="analysis"?"Evidence-backed Bid Evaluation":page==="audit"?"Audit Trail":"Evaluation Rules"}</h1></div><div className="profile"><div className="avatar">PO</div><span>Procurement Officer</span></div></header>
   {error&&<div className="error"><AlertTriangle size={18}/>{error}</div>}
   {page==="dashboard"&&<Dashboard analysis={analysis} totals={totals} onNew={()=>go("new")} onView={()=>go("analysis")}/>} 
   {page==="new"&&<NewEval tender={tender} setTender={setTender} bidders={bidders} setBidders={setBidders} analyze={analyze} loading={loading}/>} 
   {page==="analysis"&&analysis&&<Evaluation analysis={analysis} totals={totals} selected={selected||bidderNames[0]} setSelected={setSelected} query={query} setQuery={setQuery}/>} 
   {page==="audit"&&<AuditPage analysis={analysis} audit={audit} decisions={decisions} onBack={()=>go(analysis?"analysis":"dashboard")}/>} 
   {page==="rules"&&<RulesPage rules={rules} onBack={()=>go(analysis?"analysis":"dashboard")}/>} 
  </main>
 </div>
}

function Dashboard({analysis,totals,onNew,onView}:any){return <div className="content">
 <section className="hero"><div><div className="eyebrow">AI + RULES • AUDIT READY</div><h2>Turn tender documents into <em>defensible</em> decisions.</h2><p>Nishtha extracts requirements, verifies bidder evidence, detects risks and gives officers a transparent comparison view.</p><button className="primary" onClick={onNew}><UploadCloud size={18}/> Start Evaluation <ChevronRight size={17}/></button></div><div className="hero-art"><BrainCircuit size={68}/><div className="orbit o1"></div><div className="orbit o2"></div></div></section>
 <div className="metrics"><Metric icon={<FileCheck2/>} label="Requirements checked" value={totals.total||"—"} note={analysis?"Across current evaluation":"Awaiting evaluation"}/><Metric icon={<CheckCircle2/>} label="Compliant findings" value={totals.good||"—"} note={analysis?"Evidence verified":"—"}/><Metric icon={<AlertTriangle/>} label="Risk findings" value={totals.bad+totals.warn||"—"} note={analysis?"Needs officer attention":"—"}/><Metric icon={<Activity/>} label="Traceability" value="100%" note="Evidence-linked workflow"/></div>
 <div className="section-head"><div><h3>Decision workflow</h3><p>From unstructured documents to accountable procurement.</p></div>{analysis&&<button className="ghost" onClick={onView}>Open latest evaluation <ChevronRight size={16}/></button>}</div>
 <div className="steps">{["Requirement extraction","Evidence verification","Compliance analysis","Risk detection","Officer decision"].map((x,i)=><div className="step" key={x}><div className="stepno">0{i+1}</div><b>{x}</b><span>{["AI identifies tender conditions","Finds supporting bidder evidence","Rules validate exact thresholds","Surfaces gaps and mismatches","Human remains final authority"][i]}</span></div>)}</div>
 </div>}
function Metric({icon,label,value,note}:any){return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>}
function NewEval({tender,setTender,bidders,setBidders,analyze,loading}:any){const add=(e:any)=>{const f=e.target.files?.[0];if(f)setTender(f)};const addB=(e:any)=>{const fs=Array.from(e.target.files||[]) as File[];setBidders((x:File[])=>[...x,...fs])};return <div className="content narrow">
 <div className="panel intro"><div className="panel-icon"><BrainCircuit/></div><div><h2>Build an evidence-backed evaluation</h2><p>Upload the GeM tender and bidder submissions. The prototype will extract requirements and run deterministic compliance rules automatically.</p></div></div>
 <div className="upload-grid"><UploadBox title="Tender / Bid document" subtitle="PDF • requirement source" file={tender} onChange={add} primary/><UploadBox title="Bidder submissions" subtitle="PDF • one or more bidders" files={bidders} onChange={addB} multiple/></div>
 <div className="pipeline"><span>PDF extraction</span><ChevronRight/><span>Requirement NLP</span><ChevronRight/><span>Rules engine</span><ChevronRight/><span>Evidence</span><ChevronRight/><span>Risk & comparison</span></div>
 <button className="primary large" onClick={analyze} disabled={loading}>{loading?<><span className="spinner"/>Analyzing documents…</>:<><BrainCircuit size={19}/> Analyze Bids</>}</button>
 <div className="note"><ShieldCheck size={17}/><span><b>Prototype safety:</b> no document is sent to an external LLM. Analysis runs locally through the included FastAPI service.</span></div>
 </div>}
function UploadBox({title,subtitle,file,files,onChange,multiple,primary}:any){return <label className={"upload "+(primary?"primary-upload":"")}><input type="file" accept=".pdf" multiple={multiple} onChange={onChange}/><div className="upload-icon"><UploadCloud/></div><b>{title}</b><span>{subtitle}</span><strong>{file?file.name:files?.length?`${files.length} PDF(s) selected`:"Choose PDF files"}</strong>{files?.length>0&&<div className="file-list">{files.map((x:File,i:number)=><span key={i}><FileCheck2 size={13}/>{x.name}</span>)}</div>}</label>}
function Evaluation({analysis,totals,selected,setSelected,query,setQuery}:any){const rows=analysis.results[selected]||[];const filtered=rows.filter((r:Row)=>[r.requirement,r.status,r.risk,r.evidence].join(" ").toLowerCase().includes(query.toLowerCase()));const score=Math.round((rows.filter((r:Row)=>r.status==="Compliant").length/Math.max(rows.length,1))*100);return <div className="content">
 <div className="eval-top"><div><div className="tag">EVALUATION #{analysis.evaluation_id}</div><h2>{analysis.tender}</h2><p><Clock3 size={14}/> Automated analysis complete • Human review pending</p></div><a className="download" href={`${API}/evaluations/${analysis.evaluation_id}/report.csv`}><Download size={16}/> Download report</a></div>
 <div className="eval-stats"><div><span>Overall evidence score</span><b>{score}%</b><div className="progress"><i style={{width:score+"%"}}/></div></div><div><span>Requirements</span><b>{analysis.requirements.length}</b></div><div><span>Compliant</span><b className="txt-good">{totals.good}</b></div><div><span>Risk / review</span><b className="txt-bad">{totals.bad+totals.warn}</b></div></div>
 <div className="eval-layout"><section className="panel bidders"><div className="panel-title"><div><h3>Bidder comparison</h3><p>Requirement-level compliance</p></div></div>{Object.keys(analysis.results).map((name:string)=><button key={name} className={"bidder "+(name===selected?"selected":"")} onClick={()=>setSelected(name)}><div className="company-mark">{name.slice(0,2).toUpperCase()}</div><div><b>{name}</b><span>{analysis.results[name].filter((r:Row)=>r.status==="Compliant").length}/{analysis.results[name].length} compliant</span></div><div className="bid-score">{Math.round(analysis.results[name].filter((r:Row)=>r.status==="Compliant").length/analysis.results[name].length*100)}%</div></button>)}</section>
 <section className="panel findings"><div className="panel-title"><div><h3>{selected}</h3><p>AI-assisted findings with traceable evidence</p></div><div className="search"><Search size={16}/><input placeholder="Filter findings…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="finding-list">{filtered.map((r:Row)=><Finding key={r.requirement_id} row={r} eid={analysis.evaluation_id} bidder={selected}/>)}</div></section></div></div>}
function Finding({row,eid,bidder}:any){const [decision,setDecision]=useState("");async function decide(d:string){setDecision(d);try{await axios.post(API+"/decisions",{evaluation_id:eid,bidder,requirement_id:row.requirement_id,decision:d,comment:"Officer decision recorded from prototype UI."})}catch{}}return <div className="finding"><div className="finding-head"><div className="reqid">{row.requirement_id}</div><div className="finding-main"><b>{row.requirement}</b><div className="chips"><Badge type={statusType(row.status)}>{row.status}</Badge><Badge type={row.risk==="High"?"bad":row.risk==="Medium"?"warn":"good"}>{row.risk} risk</Badge><span className="confidence">AI confidence {Math.round(row.confidence*100)}%</span></div></div></div><div className="reason"><b>Verification rationale</b><span>{row.reason}</span></div><div className="evidence"><div><span>Evidence</span>{row.source&&<small>Page {row.source}</small>}</div><blockquote>{row.evidence}</blockquote></div><div className="decision"><span>Officer decision</span><div><button className={decision==="Accept"?"chosen":""} onClick={()=>decide("Accept")}><CheckCircle2 size={15}/> Accept</button><button className={decision==="Reject"?"chosen":""} onClick={()=>decide("Reject")}><XCircle size={15}/> Reject</button><button className={decision==="Review"?"chosen":""} onClick={()=>decide("Review")}><Clock3 size={15}/> Review</button></div>{decision&&<small className="saved">✓ Audit event recorded</small>}</div></div>}

function AuditPage({analysis,audit,decisions,onBack}:any){return <div className="content narrow"><div className="gov-toolbar"><button className="ghost" onClick={onBack}><ArrowLeft size={16}/> Back</button></div><div className="panel intro"><div className="panel-icon"><History/></div><div><h2>Audit Trail</h2><p>Every important action in this evaluation is recorded for accountability.</p></div></div>{!analysis?<div className="panel gov-empty"><h3>No evaluation yet</h3><p>Run an evaluation first, then open Audit Trail.</p></div>:<><div className="gov-summary"><div><span>Evaluation</span><b>#{analysis.evaluation_id}</b></div><div><span>Audit events</span><b>{audit.length}</b></div><div><span>Officer decisions</span><b>{decisions.length}</b></div></div><div className="panel"><div className="panel-title"><div><h3>Activity history</h3><p>Newest events appear first.</p></div></div><div className="audit-list">{audit.length===0?<p className="muted">No audit events recorded yet.</p>:audit.map((x:AuditItem)=><div className="audit-item" key={x.id}><div className="audit-icon"><History size={16}/></div><div><b>{x.action}</b><span>{x.details}</span><small>{x.actor} • {x.created_at}</small></div></div>)}</div></div><div className="panel"><div className="panel-title"><div><h3>Officer decisions</h3><p>Decisions recorded against individual requirements.</p></div></div><div className="audit-list">{decisions.length===0?<p className="muted">No officer decisions yet. Use Accept, Reject or Review on the Bid Evaluation page.</p>:decisions.map((x:Decision)=><div className="audit-item" key={x.id}><div className="audit-icon"><CheckCircle2 size={16}/></div><div><b>{x.decision} — {x.requirement_id}</b><span>{x.bidder}</span><small>{x.created_at} • {x.comment}</small></div></div>)}</div></div></>}</div>}
function RulesPage({rules,onBack}:any){return <div className="content narrow"><div className="gov-toolbar"><button className="ghost" onClick={onBack}><ArrowLeft size={16}/> Back</button></div><div className="panel intro"><div className="panel-icon"><Scale/></div><div><h2>Evaluation Rules</h2><p>These are the deterministic checks used by the current prototype to evaluate bidder evidence.</p></div></div><div className="rules-grid">{rules.length===0?<div className="panel gov-empty"><h3>Rules could not be loaded</h3><p>Make sure FastAPI is running on port 8000 and try again.</p></div>:rules.map((r:Rule)=><div className="panel rule-card" key={r.id}><div className="reqid">{r.id}</div><div><h3>{r.requirement}</h3><p>Evidence keywords: {r.keywords.join(", ")}</p></div></div>)}</div><div className="note"><BookOpen size={17}/><span><b>Prototype note:</b> these rules are deterministic. The production architecture can combine semantic AI/NLP understanding with exact rules and human review.</span></div></div>}

createRoot(document.getElementById("root")!).render(<BrowserRouter><App/></BrowserRouter>);
