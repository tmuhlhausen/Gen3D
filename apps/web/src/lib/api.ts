export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`, { cache: 'no-store' });
  if (!response.ok) throw new Error('API health check failed');
  return response.json();
}

export async function enhancePrompt(prompt: string) {
  const response = await fetch(`${API_URL}/v1/prompts/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) throw new Error('Prompt enhancement failed');
  return response.json();
}

export async function createTextTo3D(prompt: string) {
  const response = await fetch(`${API_URL}/v1/generations/text-to-3d`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) throw new Error('Generation failed');
  return response.json();
}
