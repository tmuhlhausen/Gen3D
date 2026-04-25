'use client';

import { Boxes, Bot, Braces, CircleDollarSign, Cuboid, Download, Folder, Gauge, Image, LayoutDashboard, Library, Palette, Settings, Sparkles, Wand2 } from 'lucide-react';
import { Viewport } from './viewport';

const nav = [
  ['Dashboard', LayoutDashboard], ['Text to 3D', Sparkles], ['Image to 3D', Image], ['Modelling Studio', Cuboid], ['Texture Studio', Palette], ['Asset Library', Library], ['Projects', Folder], ['API', Braces], ['Settings', Settings]
] as const;

const settings = [['Public LLM Router','Auto'], ['Prompt Enhancer','On'], ['Mesh Quality','High'], ['Retopology','Quad ready'], ['Texture Resolution','4K'], ['PBR Materials','Metal/Roughness']];

export function StudioShell() {
  return (
    <main className="min-h-screen bg-forge-bg p-4 text-slate-100">
      <div className="mx-auto grid max-w-[1800px] grid-cols-[260px_1fr_340px] gap-4">
        <aside className="rounded-3xl border border-forge-line bg-forge-panel/80 p-4 backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-forge-lime text-black"><Boxes size={22}/></div><div><h1 className="text-xl font-semibold">LatticeForge</h1><p className="text-xs text-slate-400">AI 3D Studio</p></div></div>
          <div className="mb-6 rounded-2xl border border-forge-line bg-white/[0.03] p-3"><p className="text-sm font-medium">Thomas Workspace</p><p className="text-xs text-slate-400">Founder build • MVP</p></div>
          <nav className="space-y-1">{nav.map(([label, Icon]) => <button key={label} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${label === 'Text to 3D' ? 'bg-forge-lime text-black' : 'text-slate-300 hover:bg-white/[0.06]'}`}><Icon size={18}/>{label}</button>)}</nav>
          <div className="mt-8 rounded-2xl border border-forge-line bg-white/[0.03] p-4"><div className="mb-2 flex items-center gap-2 text-sm text-slate-300"><CircleDollarSign size={16}/> Credits</div><p className="text-3xl font-semibold text-forge-lime">12,540</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-forge-lime"/></div></div>
        </aside>
        <section className="space-y-4">
          <div className="rounded-3xl border border-forge-line bg-forge-panel/80 p-4">
            <div className="flex items-center gap-3 rounded-2xl border border-forge-line bg-black/25 p-2"><div className="flex-1 px-4"><span className="mr-4 text-slate-400">Prompt</span><span>Generate a modular sci-fi drone with clean panels, orange trim, and PBR textures</span></div><button className="rounded-2xl bg-forge-lime px-5 py-3 font-semibold text-black shadow-glow"><Wand2 className="mr-2 inline" size={18}/>Generate</button></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">{['Hard Surface','Sci-Fi','Drone','Game Ready','4K PBR'].map(tag => <span key={tag} className="rounded-full border border-forge-line bg-white/[0.04] px-3 py-1">{tag}</span>)}</div>
          </div>
          <Viewport />
          <div className="grid grid-cols-3 gap-4"><Card title="Recent Generations" items={['Combat helmet','Cargo crate','Robot scout']}/><Card title="System Status" items={['Queue length: 3','Success rate: 98.7%','Avg time: 2m 31s']}/><Card title="Developer Tools" items={['REST API','Batch jobs','Model orchestration']}/></div>
        </section>
        <aside className="space-y-4 rounded-3xl border border-forge-line bg-forge-panel/80 p-4 backdrop-blur-xl">
          <div><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Generation Settings</h2><Gauge className="text-forge-lime" size={18}/></div><div className="space-y-3">{settings.map(([label,value]) => <button key={label} className="flex w-full items-center justify-between rounded-2xl border border-forge-line bg-white/[0.035] px-4 py-3 text-sm hover:bg-white/[0.06]"><span>{label}</span><span className="text-slate-400">{value}</span></button>)}</div></div>
          <Panel title="Generation Queue" lines={['Stylized Sci-Fi Drone','Completed','1.2M faces • 4K PBR • 2m 34s']}/>
          <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4"><h3 className="mb-3 font-semibold">Export</h3><div className="grid grid-cols-4 gap-2 text-xs">{['GLB','FBX','OBJ','USDZ'].map(format => <button key={format} className="rounded-xl border border-forge-line px-2 py-2 hover:border-forge-lime">{format}</button>)}</div><button className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15"><Download className="mr-2 inline" size={16}/>Export Asset</button></div>
          <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><Bot size={18}/> AI Assistant</h3><p className="text-sm text-slate-400">Try: “Reduce this to 20k triangles and add worn metal edges.”</p></div>
        </aside>
      </div>
    </main>
  );
}

function Card({ title, items }: { title: string; items: string[] }) { return <div className="rounded-3xl border border-forge-line bg-forge-panel/80 p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="space-y-2">{items.map(item => <div key={item} className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">{item}</div>)}</div></div>; }
function Panel({ title, lines }: { title: string; lines: string[] }) { return <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="rounded-2xl border border-forge-lime/30 bg-forge-lime/5 p-3">{lines.map((line, i) => <p key={line} className={i === 1 ? 'mt-1 text-xs text-forge-lime' : i === 2 ? 'mt-1 text-xs text-slate-400' : 'font-medium'}>{line}</p>)}</div></div>; }
