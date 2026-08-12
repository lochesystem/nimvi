import type { Metadata } from "next";
import { NimviGame } from "./nimvi/NimviGame";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Nimvi — algo está vivendo nesta aba",
  description: "Desperte uma criatura pixel art única, criada por um DNA procedural que evolui com as suas visitas.",
};

export default function Home() {
  return <NimviGame />;
}
