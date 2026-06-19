import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'ASI Life Agent',
  description: 'Autonomous AI agent dashboard for life management',
  keywords: ['AI', 'agent', 'automation', 'dashboard', 'autonomous'],
  authors: [{ name: 'ASI Life Agent' }],
  openGraph: {
    title: 'ASI Life Agent',
    description: 'Autonomous AI agent dashboard for life management',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${space.variable} dark`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-asi-bg text-asi-text font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}