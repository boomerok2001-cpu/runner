import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Game styles imported in page.tsx

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_URL || "https://run-from-justice.vercel.app";

export const metadata: Metadata = {
  title: "Run From Justice",
  description: "Can you escape the long arm of the law? An endless runner game.",
  openGraph: {
    title: "Run From Justice",
    description: "Can you escape the long arm of the law?",
    images: [`${APP_URL}/splash.png`],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/splash.png`,
      button: {
        title: "Play Now",
        action: {
          type: "launch_miniapp",
          name: "Run From Justice",
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: "#0d0d0d",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;700&family=Orbitron:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
