import type { Metadata } from "next";
import SupportClient from "./SupportClient";

export const metadata: Metadata = {
  title: "Support · monke.bar",
  description: "Donate, share, and floors for monke.bar.",
  alternates: { canonical: "https://monke.bar/support" },
};

export default function SupportPage() {
  return <SupportClient />;
}
