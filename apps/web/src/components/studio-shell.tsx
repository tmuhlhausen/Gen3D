'use client';

import { useMemo, useState } from 'react';
import {
  Boxes,
  Bot,
  Braces,
  CheckCircle2,
  CircleDollarSign,
  Cuboid,
  Download,
  Folder,
  Gauge,
  Image,
  LayoutDashboard,
  Library,
  Loader2,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Workflow,
  Cpu,
  Layers3,
  Rocket,
  TerminalSquare,
  UploadCloud,
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
  { id: 'export', title: 'Export Presets', detail: 'GLB, FBX, OBJ, USDZ', icon: Rocket }
] as const;

const initialAssets = [
  { id: 'asset-drone', name: 'Stylized Sci-Fi Drone', kind: 'Text to 3D', status: 'ready', polycount: '42k', texture: '4K PBR', progress: 100 },
  { id: 'asset-helmet', name: 'Combat Helmet', kind: 'Image to 3D', status: 'processing', polycount: '88k', texture: '2K PBR', progress: 64 },
  { id: 'asset-crate', name: 'Cargo Crate', kind: 'Text to 3D', status: 'queued', polycount: '18k', texture: '2K PBR', progress: 16 }
];

const pipeline = ['Prompt plan', 'Shape generation', 'Mesh cleanup', 'UV unwrap', 'PBR texture', 'Export pack'];
const modelRows = ['Public LLM Planner', 'Text-to-3D Fast: stub', 'PBR Texture Worker: stub', 'Mesh Optimizer: stub'];

type ModeId = (typeof modes)[number]['id'];

type Asset = {
  id: string;
  name: string;
  kind: string;
  status: string;
  polycount: string;
  texture: string;
  progress: number;
};

export function StudioShell() {
  const [activeNav, setActiveNav] = useState('Text to 3D');
  const [activeMode, setActiveMode] = useState<ModeId>('text');
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

  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0], [assets, selectedAssetId]);
  const runningCount = assets.filter((asset) => asset.status !== 'ready').length;
  const averageProgress = Math.round(assets.reduce((total, asset) => total + asset.progress, 0) / assets.length);

  function addActivity(message: string) {
    setActivity((current) => [message, ...current].slice(0, 6));
  }

  function enhancePrompt() {
    setPrompt((current) => `${current}. Production-ready, UV-clean, game-scale, PBR material zones, optimized silhouette.`);
    addActivity('Prompt enhanced with production constraints');
  }

  function generateAsset() {
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      name: prompt.length > 38 ? `${prompt.slice(0, 38)}…` : prompt,
      kind: activeMode === 'image' ? 'Image to 3D' : activeMode === 'edit' ? 'Language Edit' : 'Text to 3D',
      status: 'processing',
      polycount: `${Math.round(polyBudget / 1000)}k`,
      texture: `${textureResolution / 1024}K PBR`,
      progress: 22
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
    <main className="min-h-screen bg-forge-bg p-4 text-slate-100">
      <div className="mx-auto grid max-w-[1920px] grid-cols-[280px_1fr_380px] gap-4">
        <aside className="rounded-3xl border border-forge-line bg-forge-panel/85 p-4 shadow-panel backdrop-blur-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-forge-lime text-black shadow-glow"><Boxes size={23}/></div>
            <div><h1 className="text-xl font-semibold">LatticeForge</h1><p className="text-xs text-slate-400">AI 3D Studio GUI</p></div>
          </div>
          <div className="mb-6 rounded-2xl border border-forge-line bg-white/[0.03] p-3">
            <p className="text-sm font-medium">Thomas Workspace</p>
            <p className="text-xs text-slate-400">Interactive founder console</p>
          </div>
          <nav className="space-y-1">
            {nav.map(([label, Icon]) => (
              <button key={label} onClick={() => setActiveNav(label)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${activeNav === label ? 'bg-forge-lime text-black' : 'text-slate-300 hover:bg-white/[0.06]'}`}>
                <Icon size={18}/>{label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-forge-line bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-300"><CircleDollarSign size={16}/> Credits</div>
            <p className="text-3xl font-semibold text-forge-lime">12,540</p>
            <div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-forge-lime"/></div>
            <button className="mt-4 w-full rounded-2xl border border-forge-line px-3 py-2 text-sm text-slate-300 hover:border-forge-lime">Manage plan</button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-3xl border border-forge-line bg-forge-panel/85 p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-xs uppercase tracking-[0.28em] text-slate-500">{activeNav}</p><h2 className="mt-1 text-2xl font-semibold">Generation cockpit</h2></div>
              <div className="flex gap-2"><button onClick={advanceQueue} className="rounded-2xl border border-forge-line px-4 py-2 text-sm hover:border-forge-lime"><RefreshCw className="mr-2 inline" size={16}/>Tick queue</button><button onClick={generateAsset} className="rounded-2xl bg-forge-lime px-5 py-2 font-semibold text-black shadow-glow"><Play className="mr-2 inline" size={16}/>Generate</button></div>
            </div>
            <div className="rounded-2xl border border-forge-line bg-black/25 p-3">
              <label className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">Prompt</label>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-24 w-full resize-none rounded-2xl border border-forge-line bg-black/25 p-4 text-sm text-slate-100 outline-none focus:border-forge-lime" />
              <div className="mt-3 flex items-center gap-2">
                <button onClick={enhancePrompt} className="rounded-2xl border border-forge-line px-4 py-2 text-sm hover:border-forge-lime"><Wand2 className="mr-2 inline" size={16}/>Enhance prompt</button>
                <input value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} className="flex-1 rounded-2xl border border-forge-line bg-white/[0.03] px-4 py-2 text-sm text-slate-300 outline-none focus:border-forge-lime" placeholder="Negative prompt" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {modes.map((mode) => <ModeCard key={mode.id} active={activeMode === mode.id} icon={mode.icon} title={mode.title} detail={mode.detail} onClick={() => setActiveMode(mode.id)} />)}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4"><StatCard label="Queue" value={String(runningCount)} detail="active jobs"/><StatCard label="Progress" value={`${averageProgress}%`} detail="avg generation"/><StatCard label="Assets" value={String(assets.length)} detail="workspace total"/><StatCard label="Export" value={exportFormat} detail="selected format"/></div>

          <Viewport />

          <div className="grid grid-cols-[1.2fr_.8fr] gap-4">
            <div className="rounded-3xl border border-forge-line bg-forge-panel/85 p-4 shadow-panel">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Asset browser</h3><button onClick={generateAsset} className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"><Plus className="mr-1 inline" size={14}/>New</button></div>
              <div className="grid grid-cols-3 gap-3">
                {assets.map((asset) => <AssetCard key={asset.id} asset={asset} selected={asset.id === selectedAssetId} onClick={() => setSelectedAssetId(asset.id)} />)}
              </div>
            </div>
            <div className="rounded-3xl border border-forge-line bg-forge-panel/85 p-4 shadow-panel">
              <h3 className="mb-3 font-semibold">Activity log</h3>
              <div className="space-y-2">{activity.map((line) => <div key={line} className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300"><TerminalSquare className="mr-2 inline text-forge-lime" size={14}/>{line}</div>)}</div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-forge-line bg-forge-panel/85 p-4 shadow-panel backdrop-blur-xl">
          <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Inspector</h2><Gauge className="text-forge-lime" size={18}/></div>
            <p className="text-lg font-semibold">{selectedAsset.name}</p><p className="text-sm text-slate-400">{selectedAsset.kind} • {selectedAsset.polycount} • {selectedAsset.texture}</p>
            <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-forge-lime" style={{ width: `${selectedAsset.progress}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Badge label={selectedAsset.status}/><Badge label="UV ready"/><Badge label="PBR"/><Badge label="Game scale"/></div>
          </div>

          <ControlSlider label="Mesh Quality" value={quality} min={1} max={100} onChange={setQuality} suffix="%" />
          <ControlSlider label="Poly Budget" value={polyBudget} min={1000} max={150000} step={1000} onChange={setPolyBudget} suffix=" tris" />
          <ControlSlider label="Texture Resolution" value={textureResolution} min={512} max={8192} step={512} onChange={setTextureResolution} suffix=" px" />

          <Panel title="Model Router" lines={modelRows}/>
          <Panel title="Pipeline" lines={pipeline}/>

          <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4">
            <h3 className="mb-3 font-semibold">Export</h3>
            <div className="grid grid-cols-4 gap-2 text-xs">{['GLB','FBX','OBJ','USDZ'].map(format => <button key={format} onClick={() => setExportFormat(format)} className={`rounded-xl border px-2 py-2 ${exportFormat === format ? 'border-forge-lime bg-forge-lime text-black' : 'border-forge-line hover:border-forge-lime'}`}>{format}</button>)}</div>
            <button onClick={() => addActivity(`Prepared ${exportFormat} export for ${selectedAsset.name}`)} className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15"><Download className="mr-2 inline" size={16}/>Export Asset</button>
          </div>

          <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><Bot size={18}/> AI Assistant</h3>
            <textarea value={assistantCommand} onChange={(event) => setAssistantCommand(event.target.value)} className="min-h-20 w-full resize-none rounded-2xl border border-forge-line bg-black/20 p-3 text-sm outline-none focus:border-forge-lime" />
            <button onClick={runAssistant} className="mt-3 w-full rounded-2xl bg-forge-lime px-4 py-3 text-sm font-semibold text-black"><Zap className="mr-2 inline" size={16}/>Plan scene action</button>
            <div className="mt-3 flex gap-2 text-xs text-slate-300"><span className="rounded-full bg-white/10 px-2 py-1"><Cpu size={12} className="mr-1 inline"/>actions</span><span className="rounded-full bg-white/10 px-2 py-1"><Layers3 size={12} className="mr-1 inline"/>scene-aware</span></div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ModeCard({ active, icon: Icon, title, detail, onClick }: { active: boolean; icon: React.ElementType; title: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-forge-lime bg-forge-lime text-black' : 'border-forge-line bg-white/[0.035] hover:border-forge-lime'}`}><div className="mb-2"><Icon size={18}/></div><p className="text-sm font-medium">{title}</p><p className={`text-xs ${active ? 'text-black/70' : 'text-slate-400'}`}>{detail}</p></button>;
}

function AssetCard({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-forge-lime bg-forge-lime/10' : 'border-forge-line bg-white/[0.035] hover:border-forge-lime'}`}><div className="mb-3 h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-black p-2"><div className="h-full rounded-xl bg-[radial-gradient(circle_at_50%_45%,rgba(168,255,62,.35),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.12),transparent)]" /></div><p className="line-clamp-1 text-sm font-medium">{asset.name}</p><p className="text-xs text-slate-400">{asset.kind}</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-forge-lime" style={{ width: `${asset.progress}%` }} /></div></button>;
}

function ControlSlider({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="flex items-center gap-2"><SlidersHorizontal size={15}/>{label}</span><span className="text-slate-400">{value.toLocaleString()}{suffix}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-lime-300" /></div>;
}

function Badge({ label }: { label: string }) { return <span className="rounded-full bg-white/10 px-2 py-1 text-center text-slate-300"><CheckCircle2 className="mr-1 inline text-forge-lime" size={12}/>{label}</span>; }
function Panel({ title, lines }: { title: string; lines: string[] }) { return <div className="rounded-2xl border border-forge-line bg-white/[0.035] p-4"><h3 className="mb-3 font-semibold">{title}</h3><div className="space-y-2">{lines.map((line) => <p key={line} className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">{line}</p>)}</div></div>; }
