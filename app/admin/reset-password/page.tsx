import type { Metadata } from "next";
import { Suspense } from "react";
import ResetForm from "./ResetForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña — InterRoom",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <section className="section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Suspense>
        <ResetForm />
      </Suspense>
    </section>
  );
}
