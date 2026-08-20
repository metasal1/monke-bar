import type { Metadata } from "next";
import LookupApp from "./components/LookupApp";
import { HOUSE_MONKE } from "@/lib/house-monke";

export const metadata: Metadata = {
  title: "monke.bar — SMB lookup",
  description:
    "Lookup Solana Monkey Business Gen2, Gen3, and Barrel by number, mint, wallet, or SNS.",
  alternates: { canonical: "https://monke.bar/" },
};

export default function Home() {
  return (
    <LookupApp
      initialCollection="smb_gen3"
      initialQuery={String(HOUSE_MONKE.number)}
    />
  );
}
