import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — InterRoom",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <LoginForm />
    </section>
  );
}
