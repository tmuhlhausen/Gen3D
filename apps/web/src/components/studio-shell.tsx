'use client';

import { useMemo, useState } from 'react';
import {
  Boxes,
  Bot,
  Braces,
  CheckCircle2,
  CircleDollarSign,
  Command,
  Cpu,
  Cuboid,
  Download,
  Eye,
  Folder,
  Gauge,
  Image,
  Layers3,
  LayoutDashboard,
  Library,
  Maximize2,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  UploadCloud,
  Wand2,
  Workflow,
  Zap
} from 'lucide-react';
import { Viewport } from './viewport';
import { StatCard } from './stats';

const nav = [
  ['Dashboard', LayoutDashboard],
  ['Text to 3D', Sparkles],
  ['Image to 3D', Image],
  ['Modelling Studio', Cuboid],
  ['Texture Studio', Palette],
  ['Asset Library', Library],
  ['Projects', Folder],
  ['API', Braces],
  ['Settings', Settings]
] as const;

const modes = [
  { id: 'text', title: 'Text to 3D', detail: 'Prompt planner + mesh worker', icon: Sparkles },
  { id: 'image', title: 'Image to 3D', detail: 'Reference reconstruction', icon: Image },
  { id: 'edit', title: 'Language Edit', detail: 'Agentic mesh actions', icon: Workflow },
  { id: 'export', title: 'Export Presets', detail: 'GLB, FBX, OBJ, USDZ', icon: Download }
] as const;

const initialAssets = [
  { id: 'asset-drone', name: 'Stylized Sci-Fi Drone', kind: 'Text to 3D', status: 'ready', polycount: '42k', texture: '4K PBR', progress: 100, tone: 'from-lime-300/35 to-cyan-300/10' },
  { id: 'asset-helmet', name: 'Combat Helmet', kind: 'Image to 3D', status: 'processing', polycount: '88k', texture: '2K PBR', progress: 64, tone: 'from-violet-300/30 to-slate-300/10' },
  { id: 'asset-crate', name: 'Cargo Crate', kind: 'Text to 3D', status: 'queued', polycount: '18k', texture: '2K PBR', progress: 16, tone: 'from-orange-300/30 to-lime-300/10' }
];

const pipeline = ['Prompt plan', 'Shape generation', 'Mesh cleanup', 'UV unwrap', 'PBR texture', 'Export pack'];
const modelRows = ['Public LLM Planner', 'Text-to-3D Fast: stub', 'PBR Texture Worker: stub', 'Mesh Optimizer: stub'];
const tabs = ['Generate', 'Refine', 'Optimize', 'Render'] as const;

type ModeId = (typeof modes)[number]['id'];
type TabId = (typeof tabs)[number];

type Asset = {
  id: string;
  name: string;
  kind: string;
  status: string;
  polycount: string;
  texture: string;
  progress: number;
  tone: string;
};

export function StudioShell() {
  const [activeNav, setActiveNav] = useState('Text to 3D');
  const [activeMode, setActiveMode] = useState<ModeId>('text');
  const [activeTab, setActiveTab] = useState<TabId>('Generate');
  const [prompt, setPrompt] = useState('Generate a modular sci-fi drone with clean panels, orange trim, and PBR textures');
  const [negativePrompt, setNegativePrompt] = useState('broken topology, noisy surfaces, low detail, warped symmetry');
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssets[0].id);
  const [quality, setQuality] = useState(82);
  const [polyBudget, setPolyBudget] = useState(30000);
  const [textureResolution, setTextureResolution] = useState(4096);
  const [assistantCommand, setAssistantCommand] = useState('Reduce this to 20k triangles and add worn metal edges');
  const [activity, setActivity] = useState<string[]>(['Studio booted', 'Model router online', 'Viewport ready']);
  const [exportFormat, setExportFormat] = useState('GLB');
  const [search, setSearch] = useState('');

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0], [assets, selectedAssetId]);
  const runningCount = assets.filter((asset) => asset.status !== 'ready').length;
  const averageProgress = Math.round(assets.reduce((total, asset) => total + asset.progress, 0) / assets.length);
  const filteredAssets = assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase()) || asset.kind.toLowerCase().includes(search.toLowerCase()));

  function addActivity(message: string) {
    setActivity((current) => [message, ...current].slice(0, 6));
  }

  function enhancePrompt() {
    setPrompt((current) => `${current}. Production-ready, UV-clean, game-scale, PBR material zones, optimized silhouette.`);
    addActivity('Prompt enhanced with production constraints');
  }

  function generateAsset() {
    const tones = ['from-lime-300/35 to-cyan-300/10', 'from-violet-300/30 to-lime-300/10', 'from-orange-300/30 to-cyan-300/10'];
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      name: prompt.length > 38 ? `${prompt.slice(0, 38)}…` : prompt,
      kind: activeMode === 'image' ? 'Image to 3D' : activeMode === 'edit' ? 'Language Edit' : 'Text to 3D',
      status: 'processing',
      polycount: `${Math.round(polyBudget / 1000)}k`,
      texture: `${textureResolution / 1024}K PBR`,
      progress: 22,
      tone: tones[assets.length % tones.length]
    };
    setAssets((current) => [newAsset, ...current]);
    setSelectedAssetId(newAsset.id);
    addActivity(`Queued ${newAsset.kind} job`);
  }

  function advanceQueue() {
    setAssets((current) =>
      current.map((asset) => {
        if (asset.status === 'ready') return asset;
        const progress = Math.min(100, asset.progress + 28);
        return { ...asset, progress, status: progress >= 100 ? 'ready' : 'processing' };
      })
    );
    addActivity('Advanced mock generation queue');
  }

  function runAssistant() {
    addActivity(`Assistant planned action: ${assistantCommand}`);
  }

  return (
    <main className="noise-layer min-h-screen bg-forge-bg p-4 text-slate-100">
      <div className="mx-auto max-w-[1940px] space-y-4">
        <header className="glass-panel flex items-center justify-between rounded-3xl px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forge-lime text-black shadow-glow"><Boxes size={24}/></div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">LatticeForge 3D</p>
              <h1 className="text-2xl font-semibold tracking-tight">AI modelling command deck</h1>
            </div>
          </div>
          <div className="hidden min-w-[420px] items-center gap-3 rounded-2xl border border-forge-line bg-black/25 px-4 py-3 lg:flex">
            <Search size={17} className="text-slate-500"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets, modes, exports..." className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600" />
            <kbd className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-500">⌘K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-2xl border border-forge-line px-4 py-3 text-sm text-slate-300 hover:border-forge-lime"><UploadCloud className="mr-2 inline" size={16}/>Import</button>
            <button onClick={generateAsset} className="rounded-2xl bg-forge-lime px-5 py-3 font-semibold text-black shadow-glow"><Play className="mr-2 inline" size={16}/>Generate</button>
          </div>
        </header>

        <div className="grid grid-cols-[280px_1fr_390px] gap-4">
          <aside className="glass-panel rounded-3xl p-4">
            <div className="mb-6 rounded-3xl border border-forge-line bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4">
              <p className="text-sm font-medium">Thomas Workspace</p>
              <p className="mt-1 text-xs text-slate-400">Interactive founder console</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-forge-lime"><span className="h-2 w-2 rounded-full bg-forge-lime"/>All systems nominal</div>
            </div>
            <nav className="space-y-1">
              {nav.map(([label, Icon]) => (
                <button key={label} onClick={() => setActiveNav(label)} className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${activeNav === label ? 'neon-ring bg-forge-lime/10 text-white' : 'text-slate-300 hover:bg-white/[0.06]'}`}>
                  <span className="flex items-center gap-3"><Icon size={18}/>{label}</span>
                  {activeNav === label && <span className="h-2 w-2 rounded-full bg-forge-lime"/>}
                </button>
              ))}
            </nav>
            <div className="soft-divider my-6" />
            <div className="rounded-3xl border border-forge-line bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-300"><CircleDollarSign size={16}/> Credits</div>
              <p className="text-3xl font-semibold text-forge-lime">12,540</p>
              <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-forge-lime"/></div>
              <button className="mt-4 w-full rounded-2xl border border-forge-line px-3 py-2 text-sm text-slate-300 hover:border-forge-lime">Manage plan</button>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="text-xs uppercase tracking-[0.28em] text-slate-500">{activeNav}</p><h2 className="mt-1 text-2xl font-semibold">Generation cockpit</h2></div>
                <div className="flex rounded-2xl border border-forge-line bg-black/25 p-1">
                  {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm ${activeTab === tab ? 'bg-white/12 text-white' : 'text-slate-400 hover:text-white'}`}>{tab}</button>)}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_250px] gap-4">
                <div className="rounded-3xl border border-forge-line bg-black/25 p-3">
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500"><Command size={14}/>Prompt command</label>
                  <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-100 outline-none transition focus:border-forge-lime" />
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={enhancePrompt} className="rounded-2xl border border-forge-line px-4 py-2 text-sm hover:border-forge-lime"><Wand2 className="mr-2 inline" size={16}/>Enhance</button>
                    <input value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} className="flex-1 rounded-2xl border border-forge-line bg-white/[0.03] px-4 py-2 text-sm text-slate-300 outline-none focus:border-forge-lime" placeholder="Negative prompt" />
                  </div>
                </div>
                <div className="rounded-3xl border border-forge-line bg-gradient-to-br from-forge-lime/10 to-cyan-300/5 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Current recipe</p>
                  <p className="mt-3 text-lg font-semibold">{activeMode === 'image' ? 'Reference Reconstruction' : activeMode === 'edit' ? 'Scene Edit Plan' : 'Text Asset Forge'}</p>
                  <p className="mt-2 text-sm text-slate-400">{quality}% quality • {polyBudget.toLocaleString()} tris • {textureResolution}px</p>
                  <button onClick={generateAsset} className="mt-5 w-full rounded-2xl bg-forge-lime px-4 py-3 font-semibold text-black"><Zap className="mr-2 inline" size={16}/>Launch job</button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-3">
                {modes.map((mode) => <ModeCard key={mode.id} active={activeMode === mode.id} icon={mode.icon} title={mode.title} detail={mode.detail} onClick={() => setActiveMode(mode.id)} />)}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4"><StatCard label="Queue" value={String(runningCount)} detail="active jobs"/><StatCard label="Progress" value={`${averageProgress}%`} detail="avg generation"/><StatCard label="Assets" value={String(assets.length)} detail="workspace total"/><StatCard label="Export" value={exportFormat} detail="selected format"/></div>

            <div className="glass-panel overflow-hidden rounded-3xl p-3">
              <div className="mb-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm text-slate-400"><Eye size={16}/> Live viewport</div>
                <div className="flex gap-2 text-xs text-slate-400">{['Solid','Wire','PBR','Render'].map((tool) => <button key={tool} className="rounded-xl border border-forge-line px-3 py-1.5 hover:border-forge-lime hover:text-white">{tool}</button>)}<button className="rounded-xl border border-forge-line px-3 py-1.5 hover:border-forge-lime"><Maximize2 size={13}/></button></div>
              </div>
              <Viewport />
            </div>

            <div className="grid grid-cols-[1.2fr_.8fr] gap-4">
              <div className="glass-panel rounded-3xl p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Asset browser</h3><button onClick={generateAsset} className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"><Plus className="mr-1 inline" size={14}/>New</button></div>
                <div className="grid grid-cols-3 gap-3">
                  {filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} selected={asset.id === selectedAssetId} onClick={() => setSelectedAssetId(asset.id)} />)}
                </div>
              </div>
              <div className="glass-panel rounded-3xl p-4">
                <h3 className="mb-3 font-semibold">Activity log</h3>
                <div className="space-y-2">{activity.map((line) => <div key={line} className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><TerminalSquare className="mr-2 inline text-forge-lime" size={14}/>{line}</div>)}</div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Inspector</h2><Gauge className="text-forge-lime" size={18}/></div>
              <div className={`mb-4 h-32 rounded-3xl border border-white/10 bg-gradient-to-br ${selectedAsset.tone} p-4`}><div className="h-full rounded-2xl border border-white/10 bg-black/20" /></div>
              <p className="text-lg font-semibold">{selectedAsset.name}</p><p className="text-sm text-slate-400">{selectedAsset.kind} • {selectedAsset.polycount} • {selectedAsset.texture}</p>
              <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-forge-lime" style={{ width: `${selectedAsset.progress}%` }} /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Badge label={selectedAsset.status}/><Badge label="UV ready"/><Badge label="PBR"/><Badge label="Game scale"/></div>
            </div>

            <ControlSlider label="Mesh Quality" value={quality} min={1} max={100} onChange={setQuality} suffix="%" />
            <ControlSlider label="Poly Budget" value={polyBudget} min={1000} max={150000} step={1000} onChange={setPolyBudget} suffix=" tris" />
            <ControlSlider label="Texture Resolution" value={textureResolution} min={512} max={8192} step={512} onChange={setTextureResolution} suffix=" px" />

            <Panel title="Model Router" lines={modelRows}/>
            <Panel title="Pipeline" lines={pipeline}/>

            <div className="glass-panel rounded-3xl p-4">
              <h3 className="mb-3 font-semibold">Export</h3>
              <div className="grid grid-cols-4 gap-2 text-xs">{['GLB','FBX','OBJ','USDZ'].map(format => <button key={format} onClick={() => setExportFormat(format)} className={`rounded-xl border px-2 py-2 ${exportFormat === format ? 'border-forge-lime bg-forge-lime text-black' : 'border-forge-line hover:border-forge-lime'}`}>{format}</button>)}</div>
              <button onClick={() => addActivity(`Prepared ${exportFormat} export for ${selectedAsset.name}`)} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15"><Download className="mr-2 inline" size={16}/>Export Asset</button>
            </div>

            <div className="glass-panel rounded-3xl p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><Bot size={18}/> AI Assistant</h3>
              <textarea value={assistantCommand} onChange={(event) => setAssistantCommand(event.target.value)} className="min-h-20 w-full resize-none rounded-2xl border border-forge-line bg-black/20 p-3 text-sm outline-none focus:border-forge-lime" />
              <button onClick={runAssistant} className="mt-3 w-full rounded-2xl bg-forge-lime px-4 py-3 text-sm font-semibold text-black"><Zap className="mr-2 inline" size={16}/>Plan scene action</button>
              <div className="mt-3 flex gap-2 text-xs text-slate-300"><span className="rounded-full bg-white/10 px-2 py-1"><Cpu size={12} className="mr-1 inline"/>actions</span><span className="rounded-full bg-white/10 px-2 py-1"><Layers3 size={12} className="mr-1 inline"/>scene-aware</span></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ModeCard({ active, icon: Icon, title, detail, onClick }: { active: boolean; icon: React.ElementType; title: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-3xl border p-4 text-left transition ${active ? 'neon-ring border-forge-lime bg-forge-lime/10 text-white' : 'border-forge-line bg-white/[0.035] hover:border-forge-lime'}`}><div className={`mb-3 grid h-9 w-9 place-items-center rounded-2xl ${active ? 'bg-forge-lime text-black' : 'bg-white/10 text-forge-lime'}`}><Icon size={18}/></div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></button>;
}

function AssetCard({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`group rounded-3xl border p-3 text-left transition ${selected ? 'neon-ring border-forge-lime bg-forge-lime/10' : 'border-forge-line bg-white/[0.035] hover:border-forge-lime'}`}><div className={`mb-3 h-24 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${asset.tone} p-2`}><div className="h-full rounded-xl bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.22),transparent_35%),linear-gradient(135deg,rgba(0,0,0,.18),transparent)] transition group-hover:scale-105" /></div><div className="flex items-start justify-between gap-2"><div><p className="line-clamp-1 text-sm font-medium">{asset.name}</p><p className="text-xs text-slate-400">{asset.kind}</p></div><span className="rounded-full bg-black/25 px-2 py-1 text-[10px] text-slate-300">{asset.status}</span></div><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-forge-lime" style={{ width: `${asset.progress}%` }} /></div></button>;
}

function ControlSlider({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="glass-panel rounded-3xl p-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><SlidersHorizontal size={15}/>{label}</span><span className="text-slate-400">{value.toLocaleString()}{suffix}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-lime-300" /></div>;
}

function Badge({ label }: { label: string }) { return <span className="rounded-full bg-white/10 px-2 py-1 text-center text-slate-300"><CheckCircle2 className="mr-1 inline text-forge-lime" size={12}/>{label}</span>; }
function Panel({ title, lines }: { title: string; lines: string[] }) { return <div className="glass-panel rounded-3xl p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="space-y-2">{lines.map((line) => <p key={line} className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">{line}</p>)}</div></div>; }
