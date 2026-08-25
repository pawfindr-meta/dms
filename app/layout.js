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
    <html lang="en" className="h-full bg-black text-white antialiased">
      <body className="h-full bg-black overflow-hidden">{children}</body>
    </html>
  );
}