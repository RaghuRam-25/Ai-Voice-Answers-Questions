import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI Assistant',
  description: 'A premium voice-first AI assistant powered by cutting-edge neural technology.',
  icons: {
    icon: [
      { url: '/vercel.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/vercel.svg',
    apple: '/vercel.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/vercel.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/vercel.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/vercel.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">

        {/* ── Ambient background glows ── */}
        <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, hsla(237,76%,62%,0.08) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[600px] h-[500px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, hsla(272,68%,62%,0.05) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-[500px] h-[400px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, hsla(190,78%,52%,0.04) 0%, transparent 70%)',
            }}
          />
        </div>

        <main className="flex-1 flex flex-col relative">{children}</main>
      </body>
    </html>
  );
}