"use client";
import FormPage from "../components/FormPage";
import SectorPicker from "../components/SectorPicker";
import { SDGContext } from "../components/SDGContext";
import { useContext } from "react";

export default function Form() {
  // Gate on the context’s selectedSector
  const ctx = useContext(SDGContext);
  if (!ctx) return null;

  const { selectedSector } = ctx;

  // If the user hasn't made a choice yet (or explicitly wants to pick),
  // show the SectorPicker first. You can tweak this condition to your flow.
  const needsPick = !selectedSector || selectedSector === "__pick__";

  return needsPick ? <SectorPicker /> : <FormPage />;
}