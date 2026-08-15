import type { Metadata } from "next";
import "./globals.css";
import "@/lib/fontawesome";

export const metadata: Metadata = {
  title: "Zoom Chat Manager",
  description: "Personal archive for saved Zoom chats",
};

// Runs before paint so the page never flashes the wrong theme: prefers a
// saved choice, otherwise falls back to the OS preference.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
