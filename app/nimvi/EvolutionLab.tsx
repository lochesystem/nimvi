"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../base-path";
import { NimviSprite } from "./NimviSprite";
import type { EvolutionDefinition } from "./evolution";
import type { NimviGenome } from "./types";

type EvolutionPhase = "arrival" | "charge" | "flash" | "silhouette" | "reveal" | "happy" | "complete";

const PHASES: Array<[EvolutionPhase, number]> = [
  ["charge", 900],
  ["flash", 2_100],
  ["silhouette", 2_650],
  ["reveal", 3_350],
  ["happy", 4_150],
  ["complete", 5_800],
];

export function EvolutionLab({ genome, evolution, onClose, onComplete }: { genome: NimviGenome; evolution: EvolutionDefinition; onClose: () => void; onComplete: () => void }) {
  const [phase, setPhase] = useState<EvolutionPhase>("arrival");
  const [run, setRun] = useState(0);
  const evolutionGenome = { ...genome, model: evolution.model };
  const evolved = ["silhouette", "reveal", "happy", "complete"].includes(phase);

  useEffect(() => {
    const timers = PHASES.map(([next, delay]) => window.setTimeout(() => {
      setPhase(next);
      if (next === "complete") onComplete();
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [onComplete, run]);

  return (
    <section className={`evolution-lab phase-${phase}`} role="dialog" aria-modal="true" aria-label={`Evolução de ${evolution.name}`}>
      <div className="evolution-lab-grid" aria-hidden="true" />
      <div className="evolution-lab-sign"><span>LAB NIMVI</span><strong>EVOLUÇÃO 02</strong></div>
      <div className="evolution-platform" aria-hidden="true"><i /><i /><i /></div>
      <div className="evolution-aura" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="evolution-specimen">
        <NimviSprite
          genome={evolutionGenome}
          modelSrc={evolved ? withBasePath(evolution.stage2Src) : undefined}
          reaction={phase === "happy" || phase === "complete" ? "love" : "idle"}
          label={`${evolution.name} estágio ${evolved ? 2 : 1}`}
        />
      </div>
      <div className="evolution-whiteout" aria-hidden="true" />
      <div className="evolution-caption" aria-live="polite">
        {phase === "arrival" && `Os sinais de ${evolution.name} estão mudando...`}
        {phase === "charge" && "Uma nova forma está despertando."}
        {phase === "flash" && "Evoluindo..."}
        {phase === "silhouette" && "A silhueta cresceu."}
        {phase === "reveal" && `${evolution.name} alcançou o estágio 2!`}
        {(phase === "happy" || phase === "complete") && evolution.finalMessage}
      </div>
      <button className="evolution-close" onClick={onClose} aria-label="Fechar demonstração de evolução">×</button>
      {phase === "complete" && <button className="evolution-replay" onClick={() => { setPhase("arrival"); setRun((current) => current + 1); }}>Repetir evolução</button>}
    </section>
  );
}
