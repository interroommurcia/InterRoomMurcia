import type { Metadata } from "next";
import ChatsManager from "./ChatsManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chats — Backoffice",
  robots: { index: false, follow: false },
};

export default function ChatsPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/chats" />
        <div className="section-head">
          <h2>Chats del asistente</h2>
          <p>Conversaciones del chatbot de la web. Las importantes quedan marcadas como escaladas.</p>
        </div>
        <ChatsManager />
      </div>
    </section>
  );
}
