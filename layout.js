import "./globals.css";

export const metadata = {
  title: "Groq Chat",
  description: "A ChatGPT-style chatbot powered by Groq",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
