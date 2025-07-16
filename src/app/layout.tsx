
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'UI Compose Builder',
  description: 'Design Jetpack Compose UIs with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicitly prevent favicon requests to avoid 404 errors in browser console */}
        <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          defaultTheme="system"
          storageKey="compose-builder-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
