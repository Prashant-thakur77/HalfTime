import type { Metadata } from "next";
import { VsChatbot } from "@/components/vs/VsChatbot";

export const metadata: Metadata = {
  title: "Chatbot vs HalfTime",
  description: "The same court order, the same model: a plain chatbot answer next to HalfTime's checked, step-by-step working."
};

export default function Page() {
  return <VsChatbot />;
}
