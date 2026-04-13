import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, OrbitControls, RoundedBox } from "@react-three/drei";
import { AlertTriangle, Boxes, Database, Download, Play, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";

const defaultBaseUrl = localStorage.getItem("gen3d-api-base") || "http://localhost:8000";
const defaultToken = localStorage.getItem("gen3d-api-token") || "";

const demoJobs = [
  { id: 1, source: "demo", name: "Helmet concept", mode: "Text → 3D", status: "running", progress: 68, shape: "helmet", outputUrl: "" },
  { id: 2, source: "demo", name: "Toy dragon", mode: "Text → 3D", status: "queued", progress: 10, shape: "character", outputUrl: "" }
];

function inferShape(prompt) {
  const text = (prompt || "").toLowerCase();
  if (text.includes("helmet")) return "helmet";
  if (text.includes("shoe") || text.includes("sneaker")) return "shoe";
  if (text.includes("dragon") || text.includes("toy") || text.includes("character")) return "character";
  if (text.includes("chair") || text.includes("stool")) return "stool";
  if (text.includes("drone") || text.includes("car") || text.includes("bike") || text.includes("vehicle")) return "vehicle";
  return "abstract";
}

function normalizeRemoteJob(remote) {
  const prompt = remote.prompt || "Untitled generation";
  const status = (remote.status || "queued").toLowerCase();
  return {
    id: `remote-${remote.id}`,
    remoteId: remote.id,
    source: "api",
    name: prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt,
    mode: remote.mode === "image_to_3d" ? "Image → 3D" : remote.mode === "mesh_to_mesh" ? "Remesh" : "Text → 3D",
    status: status === "completed" ? "done" : status === "processing" ? "running" : status,
    progress: typeof remote.progress === "number" ? remote.progress : status === "completed" ? 100 : 8,
    shape: inferShape(prompt),
    outputUrl: remote.output_url || remote.asset_url || ""
  };
}

async function apiRequest(path, options = {}, baseUrl, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

async function pingHealth(baseUrl, token) {
  try {
    return await apiRequest("/health", { method: "GET" }, baseUrl, token);
  } catch {
    return await apiRequest("/v1/health", { method: "GET" }, baseUrl, token);
  }
}

async function createGeneration(payload, baseUrl, token) {
  try {
    return await apiRequest("/v1/generate-3d", { method: "POST", body: JSON.stringify(payload) }, baseUrl, token);
  } catch {
    return await apiRequest("/generate-3d", { method: "POST", body: JSON.stringify(payload) }, baseUrl, token);
  }
}

async function fetchJobs(baseUrl, token) {
  try {
    return await apiRequest("/v1/jobs", { method: "GET" }, baseUrl, token);
  } catch {
    return await apiRequest("/jobs", { method: "GET" }, baseUrl, token);
  }
}

async function fetchJob(jobId, baseUrl, token) {
  try {
    return await apiRequest(`/v1/jobs/${jobId}`, { method: "GET" }, baseUrl, token);
  } catch {
    return await apiRequest(`/jobs/${jobId}`, { method: "GET" }, baseUrl, token);
  }
}

function Model({ type = "abstract", wireframe = false }) {
  const materialProps = { metalness: 0.45, roughness: 0.3, wireframe };

  switch (type) {
    case "vehicle":
      return (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow>
            <capsuleGeometry args={[0.45, 1.4, 8, 18]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0.75, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.07, 16, 60]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[-0.75, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.07, 16, 60]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "helmet":
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.8, 40, 40, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0, 0.2, 0.45]} castShadow>
            <boxGeometry args={[0.75, 0.18, 0.1]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "shoe":
      return (
        <group>
          <mesh position={[0, 0.02, 0]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[1.7, 0.35, 0.8]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0.35, 0.27, -0.05]} rotation={[0.25, 0, 0]} castShadow>
            <capsuleGeometry args={[0.28, 1.0, 8, 20]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "character":
      return (
        <group>
          <mesh position={[0, 0.95, 0]} castShadow>
            <sphereGeometry args={[0.42, 32, 32]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <capsuleGeometry args={[0.42, 0.95, 10, 20]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "stool":
      return (
        <group>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.85, 0.24, 32]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          {[
            [-0.35, 0, -0.35],
            [0.35, 0, -0.35],
            [-0.35, 0, 0.35],
            [0.35, 0, 0.35]
          ].map((position, index) => (
            <mesh key={index} position={position} castShadow>
              <cylinderGeometry args={[0.07, 0.08, 1.0, 18]} />
              <meshStandardMaterial {...materialProps} />
            </mesh>
          ))}
        </group>
      );
    default:
      return (
        <group>
          <RoundedBox args={[1.45, 1.45, 1.45]} radius={0.18} smoothness={5} castShadow>
            <meshStandardMaterial {...materialProps} />
          </RoundedBox>
          <mesh rotation={[0.3, 0.9, 0.2]} castShadow>
            <torusKnotGeometry args={[0.52, 0.16, 180, 24]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
  }
}

function Status({ state, checking }) {
  if (checking) {
    return <span className="pill warn"><RefreshCw size={14} className="spin" />Checking API</span>;
  }
  if (state === "online") {
    return <span className="pill good"><Wifi size={14} />API online</span>;
  }
  return <span className="pill"><WifiOff size={14} />Demo mode</span>;
}

export default function App() {
  const [prompt, setPrompt] = useState("A premium sci-fi drone with folding arms, matte shell, and game-ready silhouette");
  const [negativePrompt, setNegativePrompt] = useState("low detail, broken geometry, asymmetry, noisy surface");
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultBaseUrl);
  const [apiToken, setApiToken] = useState(defaultToken);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiMessage, setApiMessage] = useState("Checking backend health...");
  const [jobs, setJobs] = useState(demoJobs);
  const [selectedJobId, setSelectedJobId] = useState(1);
  const [mode, setMode] = useState("text");
  const [wireframe, setWireframe] = useState(false);
  const [quality, setQuality] = useState(78);
  const [textureStrength, setTextureStrength] = useState(62);
  const [symmetry, setSymmetry] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) || jobs[0], [jobs, selectedJobId]);

  useEffect(() => {
    void checkBackend(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setJobs((current) =>
        current.map((job) => {
          if (job.source !== "demo") return job;
          if (job.status === "queued") {
            const next = Math.min(job.progress + 8, 25);
            return { ...job, status: next >= 20 ? "running" : "queued", progress: next };
          }
          if (job.status === "running") {
            const next = Math.min(job.progress + 7, 100);
            return { ...job, status: next >= 100 ? "done" : "running", progress: next };
          }
          return job;
        })
      );
    }, 1400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const active = jobs.filter((job) => job.source === "api" && (job.status === "queued" || job.status === "running"));
    if (apiStatus !== "online" || active.length === 0) return;

    const timer = window.setInterval(async () => {
      try {
        const refreshed = await Promise.all(active.map(async (job) => normalizeRemoteJob(await fetchJob(job.remoteId, apiBaseUrl, apiToken))));
        setJobs((current) => {
          const map = new Map(refreshed.map((job) => [job.id, job]));
          return current.map((job) => map.get(job.id) || job);
        });
      } catch (error) {
        setErrorMessage(error.message || "Failed to poll active jobs.");
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [jobs, apiStatus, apiBaseUrl, apiToken]);

  async function checkBackend(initial = false) {
    if (!initial) {
      setApiStatus("checking");
      setApiMessage("Checking backend health...");
    }

    try {
      const health = await pingHealth(apiBaseUrl, apiToken);
      setApiStatus("online");
      setApiMessage(health.message || health.status || "Backend connected");
      setErrorMessage("");
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("No API detected. Demo mode is active.");
      if (!initial) setErrorMessage(error.message || "Could not reach backend.");
    }
  }

  function persistApiSettings() {
    localStorage.setItem("gen3d-api-base", apiBaseUrl);
    localStorage.setItem("gen3d-api-token", apiToken);
  }

  async function syncRemoteJobs() {
    if (apiStatus !== "online") return;
    setSyncing(true);
    setErrorMessage("");
    try {
      const response = await fetchJobs(apiBaseUrl, apiToken);
      const remoteJobs = Array.isArray(response) ? response : response.jobs || [];
      const normalized = remoteJobs.map(normalizeRemoteJob);
      setJobs((current) => [...normalized, ...current.filter((job) => job.source !== "api")].slice(0, 12));
      if (normalized[0]) setSelectedJobId(normalized[0].id);
    } catch (error) {
      setErrorMessage(error.message || "Failed to sync jobs.");
    } finally {
      setSyncing(false);
    }
  }

  async function generate() {
    const payload = {
      prompt,
      negative_prompt: negativePrompt,
      mode: mode === "image" ? "image_to_3d" : mode === "mesh" ? "mesh_to_mesh" : "text_to_3d",
      quality,
      texture_strength: textureStrength,
      symmetry,
      output_format: "glb"
    };

    setBusy(true);
    setErrorMessage("");

    if (apiStatus === "online") {
      try {
        const created = await createGeneration(payload, apiBaseUrl, apiToken);
        const normalized = normalizeRemoteJob(created.job || created);
        setJobs((current) => [normalized, ...current.filter((job) => job.id !== normalized.id)].slice(0, 12));
        setSelectedJobId(normalized.id);
        setBusy(false);
        return;
      } catch (error) {
        setErrorMessage(error.message || "Generation failed. Falling back to demo mode.");
      }
    }

    const localJob = {
      id: Date.now(),
      source: "demo",
      name: prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt,
      mode: mode === "image" ? "Image → 3D" : mode === "mesh" ? "Remesh" : "Text → 3D",
      status: "queued",
      progress: 6,
      shape: inferShape(prompt),
      outputUrl: ""
    };
    setJobs((current) => [localJob, ...current].slice(0, 12));
    setSelectedJobId(localJob.id);
    setBusy(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Gen3D</div>
          <h1>3D generation studio scaffold</h1>
          <p className="muted">Vite + React frontend with a FastAPI backend contract already wired in.</p>
        </div>
        <Status state={apiStatus} checking={apiStatus === "checking"} />
      </header>

      <section className="hero-grid">
        <div className="panel">
          <div className="panel-title"><Server size={18} /> Backend connection</div>
          <div className="field-grid">
            <label>
              <span>API base URL</span>
              <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
            <label>
              <span>Bearer token</span>
              <input type="password" value={apiToken} onChange={(event) => setApiToken(event.target.value)} placeholder="Optional" />
            </label>
          </div>
          <div className="actions">
            <button className="button secondary" onClick={() => { persistApiSettings(); void checkBackend(); }}>
              <Wifi size={16} />
              Test API
            </button>
            <button className="button" onClick={() => { persistApiSettings(); void syncRemoteJobs(); }} disabled={apiStatus !== "online" || syncing}>
              {syncing ? <RefreshCw size={16} className="spin" /> : <Database size={16} />}
              Sync jobs
            </button>
          </div>
          <p className="muted">{apiMessage}</p>
          {errorMessage ? (
            <div className="error-box">
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="panel stats-grid">
          <div className="stat-card"><span>Supported flows</span><strong>Text / Image / Remesh</strong></div>
          <div className="stat-card"><span>Output target</span><strong>GLB by default</strong></div>
          <div className="stat-card"><span>Current source</span><strong>{selectedJob?.source === "api" ? "Remote backend" : "Local demo"}</strong></div>
        </div>
      </section>

      <main className="studio-grid">
        <section className="panel">
          <div className="panel-title"><Boxes size={18} /> Controls</div>

          <div className="tabs">
            <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>Text</button>
            <button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>Image</button>
            <button className={mode === "mesh" ? "active" : ""} onClick={() => setMode("mesh")}>Remesh</button>
          </div>

          <label>
            <span>Prompt</span>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} />
          </label>

          <label>
            <span>Negative prompt</span>
            <textarea value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} rows={3} />
          </label>

          <label>
            <span>Quality: {quality}%</span>
            <input type="range" min="1" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
          </label>

          <label>
            <span>Texture strength: {textureStrength}%</span>
            <input type="range" min="0" max="100" value={textureStrength} onChange={(event) => setTextureStrength(Number(event.target.value))} />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} />
            <span>Symmetry assist</span>
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} />
            <span>Wireframe preview</span>
          </label>

          <button className="button wide" onClick={() => void generate()} disabled={busy}>
            {busy ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
            {busy ? "Submitting..." : "Generate"}
          </button>
        </section>

        <section className="panel viewport-panel">
          <div className="panel-title">Viewport</div>
          <div className="viewport">
            <Canvas camera={{ position: [3.2, 2.4, 3.8], fov: 42 }} shadows>
              <color attach="background" args={["#07111d"]} />
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 6, 5]} intensity={1.6} castShadow />
              <directionalLight position={[-3, 3, -4]} intensity={0.4} />
              <Float speed={1.8} rotationIntensity={0.35} floatIntensity={0.25}>
                <group position={[0, 0.85, 0]}>
                  <Model type={selectedJob?.shape || "abstract"} wireframe={wireframe} />
                </group>
              </Float>
              <ContactShadows position={[0, -0.85, 0]} opacity={0.55} scale={10} blur={2.4} far={2.2} />
              <Environment preset="city" />
              <OrbitControls enablePan={false} minDistance={2.5} maxDistance={8} />
            </Canvas>
          </div>
          <div className="actions">
            <button className="button secondary" disabled={!selectedJob?.outputUrl}>
              <Download size={16} />
              {selectedJob?.outputUrl ? "Download asset" : "Export disabled"}
            </button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-title">Queue</div>
          <div className="job-list">
            {jobs.map((job) => (
              <button key={job.id} className={`job-card ${job.id === selectedJobId ? "selected" : ""}`} onClick={() => setSelectedJobId(job.id)}>
                <div className="job-top">
                  <strong>{job.name}</strong>
                  <span className={`pill ${job.status === "done" ? "good" : job.status === "running" ? "info" : "warn"}`}>{job.status}</span>
                </div>
                <span className="muted">{job.mode} • {job.source === "api" ? "API" : "Demo"}</span>
                <div className="progress"><div className="progress-bar" style={{ width: `${job.progress}%` }} /></div>
                <span className="muted">{job.progress}% complete</span>
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
