import './globals.css';

export const metadata = {
  title: 'SalesIQ / Dispatch Management System',
  description: 'ISP & Fiber Field Operations Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}