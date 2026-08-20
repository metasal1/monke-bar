import type { Metadata } from "next";
import LookupApp from "./components/LookupApp";

export const metadata: Metadata = {
  title: "monke.bar — SMB lookup",
  description:
    "Lookup Solana Monkey Business Gen2, Gen3, and Barrel by number, mint, wallet, or SNS.",
  alternates: { canonical: "https://monke.bar/" },
};

export default function Home() {
  return <LookupApp />;
}
