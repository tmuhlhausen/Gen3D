import React, { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, OrbitControls, RoundedBox } from "@react-three/drei";
import {
  AlertTriangle,
  Boxes,
  Download,
  ImagePlus,
  Layers3,
  RefreshCw,
  Server,
  Upload,
  Wifi,
  WifiOff,
  Wrench
} from "lucide-react";

const defaultBaseUrl = localStorage.getItem("gen3d-api-base") || "http://localhost:8000";
const defaultToken = localStorage.getItem("gen3d-api-token") || "";

const demoJobs = [
  {
    id: "demo-helmet",
    source: "demo",
    name: "Studio helmet concept",
    modeLabel: "Text → 3D",
    statusLabel: "running",
    progress: 61,
    shape: "helmet",
    prompt: "Studio helmet concept",
    outputUrl: "",
    referenceUploadIds: [],
    outputFormat: "glb",
    error: ""
  },
  {
    id: "demo-drone",
    source: "demo",
    name: "Drone remesh sample",
    modeLabel: "Remesh",
    statusLabel: "queued",
    progress: 18,
    shape: "vehicle",
    prompt: "Drone remesh sample",
    outputUrl: "",
    referenceUploadIds: ["local-mesh"],
    outputFormat: "glb",
    error: ""
  }
];

function inferShape(prompt) {
  const text = (prompt || "").toLowerCase();
  if (text.includes("helmet")) return "helmet";
  if (text.includes("shoe") || text.includes("sneaker")) return "shoe";
  if (text.includes("dragon") || text.includes("toy") || text.includes("character")) return "character";
  if (text.includes("chair") || text.includes("stool")) return "stool";
  if (text.includes("car") || text.includes("bike") || text.includes("drone") || text.includes("vehicle")) return "vehicle";
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
    prompt,
    modeLabel:
      remote.mode === "image_to_3d"
        ? "Image → 3D"
        : remote.mode === "mesh_to_mesh"
          ? "Remesh"
          : "Text → 3D",
    statusLabel: status === "completed" ? "done" : status === "processing" ? "running" : status,
    progress: typeof remote.progress === "number" ? remote.progress : status === "completed" ? 100 : 0,
    shape: inferShape(prompt),
    outputUrl: remote.output_url || remote.asset_url || "",
    referenceUploadIds: Array.isArray(remote.reference_upload_ids) ? remote.reference_upload_ids : [],
    outputFormat: remote.output_format || "glb",
    error: remote.error || "",
    metadata: remote.metadata || {},
    createdAt: remote.created_at || "",
    updatedAt: remote.updated_at || ""
  };
}

async function apiRequest(path, options = {}, baseUrl, token) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

async function withVersionFallback(requestFn) {
  try {
    return await requestFn("/v1");
  } catch {
    return requestFn("");
  }
}

async function pingHealth(baseUrl, token) {
  return withVersionFallback((prefix) => apiRequest(`${prefix}/health`, { method: "GET" }, baseUrl, token));
}

async function fetchJobs(baseUrl, token) {
  return withVersionFallback((prefix) => apiRequest(`${prefix}/jobs`, { method: "GET" }, baseUrl, token));
}

async function fetchJob(jobId, baseUrl, token) {
  return withVersionFallback((prefix) => apiRequest(`${prefix}/jobs/${jobId}`, { method: "GET" }, baseUrl, token));
}

async function createGeneration(payload, baseUrl, token) {
  return withVersionFallback((prefix) =>
    apiRequest(`${prefix}/generate-3d`, { method: "POST", body: JSON.stringify(payload) }, baseUrl, token)
  );
}

async function uploadReference(file, baseUrl, token) {
  const body = new FormData();
  body.append("file", file);
  return withVersionFallback((prefix) =>
    apiRequest(`${prefix}/uploads/reference`, { method: "POST", body }, baseUrl, token)
  );
}

function Model({ type = "abstract", wireframe = false }) {
  const materialProps = { metalness: 0.38, roughness: 0.34, wireframe };

  switch (type) {
    case "vehicle":
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <capsuleGeometry args={[0.45, 1.3, 8, 18]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0.78, -0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.07, 16, 60]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[-0.78, -0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.22, 0.07, 16, 60]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "helmet":
      return (
        <group>
          <mesh position={[0, 0.42, 0]} castShadow>
            <sphereGeometry args={[0.8, 40, 40, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0, 0.18, 0.42]} castShadow>
            <boxGeometry args={[0.76, 0.18, 0.12]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "shoe":
      return (
        <group>
          <mesh position={[0, 0.02, 0]} rotation={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[1.7, 0.32, 0.82]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
          <mesh position={[0.34, 0.26, -0.05]} rotation={[0.25, 0, 0]} castShadow>
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
          <mesh position={[0, 0.18, 0]} castShadow>
            <capsuleGeometry args={[0.4, 0.95, 10, 20]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
    case "stool":
      return (
        <group>
          <mesh position={[0, 0.64, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.84, 0.24, 32]} />
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
          <RoundedBox args={[1.42, 1.42, 1.42]} radius={0.18} smoothness={5} castShadow>
            <meshStandardMaterial {...materialProps} />
          </RoundedBox>
          <mesh rotation={[0.34, 0.82, 0.2]} castShadow>
            <torusKnotGeometry args={[0.52, 0.16, 180, 24]} />
            <meshStandardMaterial {...materialProps} />
          </mesh>
        </group>
      );
  }
}

function StatusPill({ state, checking }) {
  if (checking) {
    return (
      <span className="pill warn">
        <RefreshCw size={14} className="spin" />
        Checking API
      </span>
    );
  }

  if (state === "online") {
    return (
      <span className="pill good">
        <Wifi size={14} />
        API online
      </span>
    );
  }

  return (
    <span className="pill">
      <WifiOff size={14} />
      Demo mode
    </span>
  );
}

export default function StudioApp() {
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultBaseUrl);
  const [apiToken, setApiToken] = useState(defaultToken);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiMessage, setApiMessage] = useState("Checking backend health...");
  const [mode, setMode] = useState("text");
  const [prompt, setPrompt] = useState("A premium sci-fi drone with folding arms, matte shell, and game-ready silhouette");
  const [negativePrompt, setNegativePrompt] = useState("low detail, broken geometry, asymmetry, noisy surface");
  const [quality, setQuality] = useState(82);
  const [textureStrength, setTextureStrength] = useState(64);
  const [symmetry, setSymmetry] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [outputFormat, setOutputFormat] = useState("glb");
  const [uploads, setUploads] = useState([]);
  const [jobs, setJobs] = useState(demoJobs);
  const [selectedJobId, setSelectedJobId] = useState(demoJobs[0].id);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
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
          if (job.statusLabel === "queued") {
            const next = Math.min(job.progress + 8, 30);
            return { ...job, statusLabel: next >= 22 ? "running" : "queued", progress: next };
          }
          if (job.statusLabel === "running") {
            const next = Math.min(job.progress + 7, 100);
            return { ...job, statusLabel: next >= 100 ? "done" : "running", progress: next };
          }
          return job;
        })
      );
    }, 1400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.source === "api" && (job.statusLabel === "queued" || job.statusLabel === "running"));
    if (apiStatus !== "online" || activeJobs.length === 0) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const refreshed = await Promise.all(
          activeJobs.map(async (job) => normalizeRemoteJob(await fetchJob(job.remoteId, apiBaseUrl, apiToken)))
        );
        setJobs((current) => {
          const lookup = new Map(refreshed.map((job) => [job.id, job]));
          return current.map((job) => lookup.get(job.id) || job);
        });
      } catch (error) {
        setErrorMessage(error.message || "Failed to poll running jobs.");
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [jobs, apiStatus, apiBaseUrl, apiToken]);

  function persistApiSettings() {
    localStorage.setItem("gen3d-api-base", apiBaseUrl);
    localStorage.setItem("gen3d-api-token", apiToken);
  }

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
      if (!initial) {
        setErrorMessage(error.message || "Could not reach backend.");
      }
    }
  }

  async function syncRemoteJobs() {
    if (apiStatus !== "online") return;
    setSyncing(true);
    setErrorMessage("");

    try {
      const response = await fetchJobs(apiBaseUrl, apiToken);
      const remoteJobs = Array.isArray(response) ? response : response.jobs || [];
      const normalized = remoteJobs.map(normalizeRemoteJob);
      setJobs((current) => [...normalized, ...current.filter((job) => job.source !== "api")].slice(0, 16));
      if (normalized[0]) {
        setSelectedJobId(normalized[0].id);
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to sync remote jobs.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileSelection(event) {
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) return;

    if (apiStatus !== "online") {
      setErrorMessage("Reference uploads require the backend to be online.");
      return;
    }

    setUploading(true);
    setErrorMessage("");

    try {
      const createdUploads = [];
      for (const file of incomingFiles) {
        const uploaded = await uploadReference(file, apiBaseUrl, apiToken);
        createdUploads.push(uploaded);
      }
      setUploads((current) => [...createdUploads, ...current]);
    } catch (error) {
      setErrorMessage(error.message || "Failed to upload reference asset.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  function removeUpload(uploadId) {
    setUploads((current) => current.filter((upload) => upload.upload_id !== uploadId));
  }

  async function generate() {
    const modeValue = mode === "image" ? "image_to_3d" : mode === "mesh" ? "mesh_to_mesh" : "text_to_3d";
    if (modeValue !== "text_to_3d" && uploads.length === 0) {
      setErrorMessage("Upload at least one reference asset for image or remesh flows.");
      return;
    }

    const payload = {
      prompt,
      negative_prompt: negativePrompt,
      mode: modeValue,
      quality,
      texture_strength: textureStrength,
      symmetry,
      output_format: outputFormat,
      reference_upload_ids: modeValue === "text_to_3d" ? [] : uploads.map((upload) => upload.upload_id),
      metadata: {
        entrypoint: "frontend-v2",
        upload_count: uploads.length
      }
    };

    setBusy(true);
    setErrorMessage("");

    if (apiStatus === "online") {
      try {
        const created = await createGeneration(payload, apiBaseUrl, apiToken);
        const normalized = normalizeRemoteJob(created.job || created);
        setJobs((current) => [normalized, ...current.filter((job) => job.id !== normalized.id)].slice(0, 16));
        setSelectedJobId(normalized.id);
        setBusy(false);
        return;
      } catch (error) {
        setErrorMessage(error.message || "Generation failed. Falling back to demo mode.");
      }
    }

    const localJob = {
      id: `demo-${Date.now()}`,
      source: "demo",
      name: prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt,
      prompt,
      modeLabel: modeValue === "image_to_3d" ? "Image → 3D" : modeValue === "mesh_to_mesh" ? "Remesh" : "Text → 3D",
      statusLabel: "queued",
      progress: 6,
      shape: inferShape(prompt),
      outputUrl: "",
      referenceUploadIds: modeValue === "text_to_3d" ? [] : uploads.map((upload) => upload.upload_id),
      outputFormat,
      error: ""
    };

    setJobs((current) => [localJob, ...current].slice(0, 16));
    setSelectedJobId(localJob.id);
    setBusy(false);
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Gen3D v2</div>
          <h1>Upload-aware 3D framework slice</h1>
          <p className="muted max-width-copy">
            This entrypoint adds persisted jobs, reference uploads, richer queue details, and a dedicated path for
            image-to-3D and remesh workflows.
          </p>
        </div>
        <StatusPill state={apiStatus} checking={apiStatus === "checking"} />
      </header>

      <section className="hero-grid">
        <div className="panel">
          <div className="panel-title">
            <Server size={18} />
            Backend connection
          </div>

          <div className="field-grid">
            <label>
              <span>API base URL</span>
              <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
            <label>
              <span>Bearer token</span>
              <input
                type="password"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="actions">
            <button className="button secondary" onClick={() => { persistApiSettings(); void checkBackend(); }}>
              <Wifi size={16} />
              Test API
            </button>
            <button className="button" onClick={() => { persistApiSettings(); void syncRemoteJobs(); }} disabled={apiStatus !== "online" || syncing}>
              {syncing ? <RefreshCw size={16} className="spin" /> : <Layers3 size={16} />}
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
          <div className="stat-card">
            <span>Reference assets</span>
            <strong>{uploads.length}</strong>
          </div>
          <div className="stat-card">
            <span>Remote jobs</span>
            <strong>{jobs.filter((job) => job.source === "api").length}</strong>
          </div>
          <div className="stat-card">
            <span>Output target</span>
            <strong>{outputFormat.toUpperCase()}</strong>
          </div>
        </div>
      </section>

      <main className="studio-grid">
        <section className="panel controls-panel">
          <div className="panel-title">
            <Boxes size={18} />
            Controls
          </div>

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

          <div className="two-up-grid">
            <label>
              <span>Quality: {quality}%</span>
              <input type="range" min="1" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
            </label>
            <label>
              <span>Texture strength: {textureStrength}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={textureStrength}
                onChange={(event) => setTextureStrength(Number(event.target.value))}
              />
            </label>
          </div>

          <label>
            <span>Output format</span>
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
              <option value="glb">GLB</option>
              <option value="obj">OBJ</option>
              <option value="fbx">FBX</option>
              <option value="usdz">USDZ</option>
            </select>
          </label>

          <div className="checkbox-row">
            <label className="checkbox">
              <input type="checkbox" checked={symmetry} onChange={(event) => setSymmetry(event.target.checked)} />
              <span>Symmetry assist</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} />
              <span>Wireframe preview</span>
            </label>
          </div>

          <div className="upload-panel">
            <div className="upload-headline">
              {mode === "text" ? <Wrench size={16} /> : <ImagePlus size={16} />}
              <strong>{mode === "text" ? "Optional reference staging" : "Reference assets"}</strong>
            </div>
            <p className="muted">
              {mode === "text"
                ? "You can leave uploads empty for text-only generations."
                : "The v2 backend persists uploaded files and validates them before job creation."}
            </p>
            <label className="upload-dropzone">
              <input type="file" multiple onChange={handleFileSelection} disabled={apiStatus !== "online" || uploading} />
              <Upload size={18} />
              <span>{uploading ? "Uploading..." : "Select images or meshes"}</span>
            </label>

            <div className="upload-list">
              {uploads.length === 0 ? <span className="muted">No staged uploads yet.</span> : null}
              {uploads.map((upload) => (
                <div key={upload.upload_id} className="upload-card">
                  <div>
                    <strong>{upload.filename}</strong>
                    <span className="muted">{Math.max(1, Math.round((upload.size_bytes || 0) / 1024))} KB</span>
                  </div>
                  <button className="button ghost" onClick={() => removeUpload(upload.upload_id)} type="button">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <button className="button wide" onClick={() => void generate()} disabled={busy || uploading}>
            {busy ? <RefreshCw size={16} className="spin" /> : <Layers3 size={16} />}
            {busy ? "Submitting..." : "Submit generation job"}
          </button>
        </section>

        <section className="panel viewport-panel">
          <div className="panel-title">Viewport</div>
          <div className="viewport">
            <Canvas camera={{ position: [3.2, 2.4, 3.8], fov: 42 }} shadows>
              <color attach="background" args={["#07111d"]} />
              <ambientLight intensity={0.7} />
              <directionalLight position={[5, 6, 5]} intensity={1.55} castShadow />
              <directionalLight position={[-3, 3, -4]} intensity={0.4} />
              <Float speed={1.7} rotationIntensity={0.35} floatIntensity={0.25}>
                <group position={[0, 0.85, 0]}>
                  <Model type={selectedJob?.shape || inferShape(prompt)} wireframe={wireframe} />
                </group>
              </Float>
              <ContactShadows position={[0, -0.85, 0]} opacity={0.55} scale={10} blur={2.4} far={2.2} />
              <Environment preset="city" />
              <OrbitControls enablePan={false} minDistance={2.5} maxDistance={8} />
            </Canvas>
          </div>

          <div className="job-meta-grid">
            <div className="meta-card">
              <span>Status</span>
              <strong>{selectedJob?.statusLabel || "idle"}</strong>
            </div>
            <div className="meta-card">
              <span>Mode</span>
              <strong>{selectedJob?.modeLabel || "Text → 3D"}</strong>
            </div>
            <div className="meta-card">
              <span>Output</span>
              <strong>{(selectedJob?.outputFormat || outputFormat).toUpperCase()}</strong>
            </div>
          </div>

          {selectedJob?.outputUrl ? (
            <a className="button secondary wide" href={selectedJob.outputUrl} target="_blank" rel="noreferrer">
              <Download size={16} />
              Download scaffold artifact
            </a>
          ) : (
            <button className="button secondary wide" disabled>
              <Download size={16} />
              Output unavailable
            </button>
          )}
        </section>

        <aside className="panel sidebar-panel">
          <div className="panel-title">Queue</div>
          <div className="job-list">
            {jobs.map((job) => (
              <button
                key={job.id}
                className={`job-card ${job.id === selectedJobId ? "selected" : ""}`}
                onClick={() => setSelectedJobId(job.id)}
              >
                <div className="job-top">
                  <strong>{job.name}</strong>
                  <span className={`pill ${job.statusLabel === "done" ? "good" : job.statusLabel === "running" ? "info" : "warn"}`}>
                    {job.statusLabel}
                  </span>
                </div>
                <span className="muted">{job.modeLabel} • {job.source === "api" ? "API" : "Demo"}</span>
                <div className="progress"><div className="progress-bar" style={{ width: `${job.progress}%` }} /></div>
                <span className="muted">{job.progress}% complete</span>
              </button>
            ))}
          </div>

          <div className="detail-card">
            <div className="panel-title small">Selected job</div>
            <strong>{selectedJob?.name || "No job selected"}</strong>
            <p className="muted detail-copy">{selectedJob?.prompt || prompt}</p>
            <div className="detail-list">
              <div>
                <span className="muted">References</span>
                <strong>{selectedJob?.referenceUploadIds?.length || 0}</strong>
              </div>
              <div>
                <span className="muted">Source</span>
                <strong>{selectedJob?.source === "api" ? "Persisted backend" : "Local demo"}</strong>
              </div>
              <div>
                <span className="muted">Error</span>
                <strong>{selectedJob?.error || "—"}</strong>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
