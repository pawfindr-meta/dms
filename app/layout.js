import './globals.css';

export const metadata = {
  title: 'Dispatch Matrix | FiberOps',
  description: 'Industrial Real-Time Dispatch Management System',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full w-full overflow-hidden bg-zinc-950 text-zinc-100 antialiased">
      <body className="h-[100dvh] w-screen overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col fixed inset-0 select-none">
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden min-h-0">
          {children}
        </div>
      </body>
    </html>
  );
}