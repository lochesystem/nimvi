"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createFreshSave,
  generateGenome,
  getStage,
  getTrait,
  PALETTES,
  parseSave,
  rarityLabel,
  SAVE_KEY,
} from "./generator";
import { NimviSprite, type NimviSpriteHandle } from "./NimviSprite";
import { spriteModelForGenome } from "./spriteCatalog";
import { currentTimePeriod, TIME_PERIOD_LABELS, type TimePeriod } from "./timeOfDay";
import type { NimviReaction, NimviSave } from "./types";

const formatAge = (bornAt: number) => {
  const minutes = Math.max(1, Math.floor((Date.now() - bornAt) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} dias`;
};

export function NimviGame() {
  const [save, setSave] = useState<NimviSave | null>(null);
  const [ready, setReady] = useState(false);
  const [visitorSeed, setVisitorSeed] = useState<string | null>(null);
  const [reaction, setReaction] = useState<NimviReaction>("idle");
  const [notice, setNotice] = useState("Ele ainda está entendendo este lugar.");
  const [copied, setCopied] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const spriteRef = useRef<NimviSpriteHandle>(null);
  const reactionTimer = useRef<number | null>(null);

  useEffect(() => {
    const refreshTimePeriod = () => setTimePeriod(currentTimePeriod());
    refreshTimePeriod();
    const timer = window.setInterval(refreshTimePeriod, 60_000);
    document.addEventListener("visibilitychange", refreshTimePeriod);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshTimePeriod);
    };
  }, []);

  const persist = useCallback((next: NimviSave) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    setSave(next);
  }, []);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const visiting = params.get("dna");
      if (visiting) setVisitorSeed(visiting);
      const existing = parseSave(localStorage.getItem(SAVE_KEY));
      if (existing) {
        const hour = new Date().getHours();
        const next: NimviSave = {
          ...existing,
          lastSeenAt: Date.now(),
          metrics: {
            ...existing.metrics,
            visits: existing.metrics.visits + 1,
            nightVisits: existing.metrics.nightVisits + (hour >= 20 || hour < 6 ? 1 : 0),
          },
        };
        persist(next);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, [persist]);

  const localSeed = save?.seed;
  useEffect(() => {
    if (!localSeed) return;
    let hiddenAt: number | null = null;
    let resizeTimer: number | null = null;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        setNotice(`${generateGenome(localSeed).name} foi sonhar um pouco.`);
        return;
      }
      const elapsed = hiddenAt ? Math.min(86_400, Math.floor((Date.now() - hiddenAt) / 1000)) : 0;
      hiddenAt = null;
      setReaction("wake");
      setNotice("Você voltou. Ele percebeu.");
      setSave((current) => {
        if (!current) return current;
        const next = {
          ...current,
          lastSeenAt: Date.now(),
          metrics: {
            ...current.metrics,
            focusReturns: current.metrics.focusReturns + 1,
            hiddenSeconds: current.metrics.hiddenSeconds + elapsed,
          },
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
        return next;
      });
    };

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setNotice("A casa mudou de tamanho. Curioso.");
        setSave((current) => {
          if (!current) return current;
          const next = { ...current, metrics: { ...current.metrics, resizes: current.metrics.resizes + 1 } };
          localStorage.setItem(SAVE_KEY, JSON.stringify(next));
          return next;
        });
      }, 500);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [localSeed]);

  const react = useCallback((nextReaction: NimviReaction, nextNotice: string) => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setReaction(nextReaction);
    setNotice(nextNotice);
    reactionTimer.current = window.setTimeout(() => setReaction("idle"), 1_500);
  }, []);

  const awaken = () => {
    const next = createFreshSave();
    persist(next);
    react("wake", "Ele abriu os olhos pela primeira vez.");
  };

  const interact = (kind: "love" | "play") => {
    if (!save) return;
    const next: NimviSave = {
      ...save,
      bond: Math.min(100, save.bond + (kind === "love" ? 3 : 2)),
      lastSeenAt: Date.now(),
      metrics: { ...save.metrics, interactions: save.metrics.interactions + 1 },
    };
    persist(next);
    react(kind, kind === "love" ? "Um brilho morno apareceu." : "Ele se sacudiu de alegria.");
  };

  const share = async (seed: string) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("dna", seed);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      window.prompt("Copie o link de visita:", url.toString());
    }
  };

  const reset = () => {
    if (!window.confirm("Despedir-se deste Nimvi e despertar outro? Esta ação não pode ser desfeita.")) return;
    const next = createFreshSave();
    persist(next);
    react("wake", "Um novo pulso apareceu na aba.");
  };

  const activeSeed = visitorSeed || save?.seed;
  const genome = useMemo(() => activeSeed ? generateGenome(activeSeed) : null, [activeSeed]);
  const activeSave = visitorSeed && genome
    ? { ...createFreshSave(genome.seed), bond: 28, metrics: { visits: 5, interactions: 8, focusReturns: 4, hiddenSeconds: 900, resizes: 1, nightVisits: 2 } }
    : save;
  const naturalStage = activeSave ? getStage(activeSave) : 1;
  const stage = naturalStage;
  const trait = activeSave ? getTrait(activeSave.metrics) : null;

  useEffect(() => {
    if (!genome) return;
    document.title = visitorSeed ? `Visitando ${genome.name} · Nimvi` : `${genome.name} está na sua aba · Nimvi`;
  }, [genome, visitorSeed]);

  if (!ready) return <main className="loading-screen" aria-label="Carregando Nimvi"><span /></main>;

  if (!save && !visitorSeed) {
    return (
      <main className="hatch-screen">
        <div className="brand-mark" aria-label="Nimvi">nimvi<i /></div>
        <section className="hatch-card">
          <div className="egg" aria-hidden="true"><span /><span /><span /></div>
          <p className="eyebrow">UM SINAL NOVO</p>
          <h1>Algo está vivendo nesta aba.</h1>
          <p>O que nascer aqui terá um DNA visual próprio — e vai mudar conforme você voltar.</p>
          <button className="primary-button" onClick={awaken}>Despertar meu Nimvi</button>
          <small>Nenhum cadastro. O DNA fica guardado neste navegador.</small>
        </section>
      </main>
    );
  }

  if (!genome || !activeSave || !trait) return null;
  const palette = PALETTES[genome.palette];
  const dreams = Math.floor(activeSave.metrics.hiddenSeconds / 300);

  return (
    <main className="game-shell" style={{ "--nimvi-accent": palette.accent, "--nimvi-body": palette.body } as React.CSSProperties}>
      <header className="topbar">
        <Link className="brand-mark small" href="/" aria-label="Nimvi, início">nimvi<i /></Link>
        <div className="status-pill"><span /> {visitorSeed ? "visita" : "vivendo agora"}</div>
        <button className="quiet-button" onClick={() => share(genome.seed)}>{copied ? "link copiado" : "visitar por link"}</button>
      </header>

      {visitorSeed && (
        <div className="visitor-banner">
          Você está visitando {genome.name}. <Link href="/">Voltar ao meu Nimvi</Link>
        </div>
      )}

      <section className="habitat" aria-label={`Habitat de ${genome.name}`}>
        <div className={`pixel-window time-${timePeriod}`} aria-hidden="true">
          <span className="time-label">{TIME_PERIOD_LABELS[timePeriod]}</span>
          <span className="sun" />
          <span className="moon" />
          <span className="cloud"><i /></span>
          <span className="horizon" />
          <i className="star one" /><i className="star two" /><i className="star three" />
        </div>
        <div className="shelf" aria-hidden="true"><span /><span /><span /></div>
        <div className="ambient-dots" aria-hidden="true"><i /><i /><i /></div>
        <button
          className={`creature-stage reaction-${reaction}`}
          onClick={() => !visitorSeed && interact("love")}
          aria-label={visitorSeed ? `${genome.name}, um Nimvi visitante` : `Fazer carinho em ${genome.name}`}
        >
          <NimviSprite ref={spriteRef} genome={genome} reaction={reaction} label={`${genome.name}, Nimvi ${trait.name.toLowerCase()}`} />
          {reaction === "love" && <span className="pixel-heart">♥</span>}
        </button>
        <div className="floor-shadow" aria-hidden="true" />
        <div className="speech-line" role="status">{notice}</div>
      </section>

      <section className="identity-panel">
        <div>
          <p className="eyebrow">SEU NIMVI</p>
          <div className="identity-title">
            <h1>{genome.name}</h1>
            <span>Estágio {stage}</span>
          </div>
          <p className="trait-copy"><strong>{trait.name}.</strong> {trait.description}</p>
        </div>
        <div className="dna-card">
          <span>DNA NIMVI</span>
          <strong>{genome.seed}</strong>
          <small>Modelo {spriteModelForGenome(genome).name} · {PALETTES[genome.palette].name} · raridade {rarityLabel(genome)}</small>
        </div>
      </section>

      <section className="dashboard">
        <article className="care-card">
          <div className="card-heading"><span>vínculo</span><strong>{activeSave.bond}%</strong></div>
          <div className="meter"><i style={{ width: `${activeSave.bond}%` }} /></div>
          <div className="action-row">
            <button onClick={() => interact("love")} disabled={Boolean(visitorSeed)}>Fazer carinho</button>
            <button onClick={() => interact("play")} disabled={Boolean(visitorSeed)}>Brincar</button>
          </div>
        </article>

        <article className="memory-card">
          <div><span>idade</span><strong>{formatAge(activeSave.bornAt)}</strong></div>
          <div><span>retornos</span><strong>{activeSave.metrics.focusReturns}</strong></div>
          <div><span>sonhos</span><strong>{dreams}</strong></div>
          <div><span>encontros</span><strong>{activeSave.metrics.visits}</strong></div>
        </article>
      </section>

      <footer className="game-footer">
        <button onClick={() => spriteRef.current?.download()}>Salvar retrato</button>
        {!visitorSeed && <button onClick={reset}>Despertar outro</button>}
        <p>Seu Nimvi é reconstruído localmente pelo DNA. Nenhum hábito de outras páginas é observado.</p>
      </footer>
    </main>
  );
}
