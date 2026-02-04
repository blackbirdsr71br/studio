
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Inter, Roboto, Lato, Oswald, Merriweather, Playfair_Display, Source_Code_Pro, Poppins, Montserrat, Raleway, Nunito, Open_Sans, EB_Garamond, DM_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-merriweather',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair-display',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-source-code-pro',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
});

const raleway = Raleway({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-raleway',
});

const nunito = Nunito({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-nunito',
});

const openSans = Open_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-open-sans',
});

const ebGaramond = EB_Garamond({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-eb-garamond',
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-dm-sans',
});



export const metadata: Metadata = {
  title: 'Compose Builder',
  description: 'Design Jetpack Compose UIs with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${roboto.variable} ${lato.variable} ${oswald.variable} ${merriweather.variable} ${playfairDisplay.variable} ${sourceCodePro.variable} ${poppins.variable} ${montserrat.variable} ${raleway.variable} ${nunito.variable} ${openSans.variable} ${ebGaramond.variable} ${dmSans.variable}`}>
      <head>
        {/* The new next/font loader handles the links automatically */}
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
