import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LatticeForge 3D',
  description: 'AI-native 3D modelling and asset generation studio.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
