import type { Metadata } from "next";
import LookupApp from "./components/LookupApp";

export const metadata: Metadata = {
  title: "THE MONKE BAR | SMB Gen2 Gen3 Barrel Lookup",
  description:
    "Lookup Solana Monkey Business Gen2, Gen3, and Barrel NFTs by number, mint, wallet, or SNS. Floor prices, rarity, Tensor + Magic Eden.",
  alternates: { canonical: "https://monke.bar/" },
};

export default function Home() {
  return <LookupApp />;
}
