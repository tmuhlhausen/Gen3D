'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Grid, OrbitControls, Float } from '@react-three/drei';
import { Suspense } from 'react';

function DroneProxy() {
  return (
    <group rotation={[0.15, -0.5, 0]}>
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.25}>
        <mesh castShadow position={[0, 0.2, 0]}><boxGeometry args={[2.4, 0.35, 1.1]} /><meshStandardMaterial color="#e8edf2" metalness={0.35} roughness={0.28} /></mesh>
        <mesh position={[0, 0.42, -0.05]}><boxGeometry args={[1.35, 0.28, 0.78]} /><meshStandardMaterial color="#c8d0da" metalness={0.55} roughness={0.22} /></mesh>
        {[-1.65, 1.65].map((x) => <group key={x} position={[x, 0.05, 0]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.075, 18, 72]} /><meshStandardMaterial color="#1b222c" metalness={0.65} roughness={0.2} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.08, 24]} /><meshStandardMaterial color="#a8ff3e" emissive="#6cff00" emissiveIntensity={0.55} /></mesh></group>)}
        <mesh position={[0, 0.12, -0.62]}><sphereGeometry args={[0.22, 32, 32]} /><meshStandardMaterial color="#111827" metalness={0.9} roughness={0.12} /></mesh>
        <mesh position={[0, 0.12, -0.85]}><sphereGeometry args={[0.09, 32, 32]} /><meshStandardMaterial color="#35e7ff" emissive="#35e7ff" emissiveIntensity={1.5} /></mesh>
      </Float>
    </group>
  );
}

export function Viewport() {
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-3xl border border-forge-line bg-gradient-to-br from-forge-panel2 to-[#0b1018] shadow-glow">
      <div className="absolute inset-0 grid-fade opacity-70" />
      <Canvas camera={{ position: [3, 2.2, 4.5], fov: 45 }} shadows>
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 6, 3]} intensity={2.2} castShadow />
          <DroneProxy />
          <Grid infiniteGrid cellSize={0.5} sectionSize={3} fadeDistance={18} fadeStrength={2} position={[0, -0.45, 0]} />
          <Environment preset="city" />
          <OrbitControls enableDamping />
        </Suspense>
      </Canvas>
      <div className="absolute left-5 top-5 rounded-2xl border border-forge-line bg-black/35 px-4 py-3 backdrop-blur"><p className="text-xs uppercase tracking-[0.28em] text-slate-400">Viewport</p><p className="mt-1 text-sm text-slate-100">Generated drone proxy</p></div>
      <div className="absolute bottom-5 left-5 flex gap-2 rounded-2xl border border-forge-line bg-black/35 p-2 backdrop-blur">{['Select','Move','Rotate','Scale','UV','Wire','Render'].map(tool => <button key={tool} className="rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/10">{tool}</button>)}</div>
    </div>
  );
}
