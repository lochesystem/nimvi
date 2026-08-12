"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { withBasePath } from "../base-path";
import {
  createFreshSave,
  generateGenome,
  getTrait,
  PALETTES,
  parseSave,
  rarityLabel,
  SAVE_KEY,
} from "./generator";
import { advanceCare, careMood, CARE_TICK_MS, performCareAction } from "./care";
import { NimviSprite, type NimviSpriteHandle } from "./NimviSprite";
import { spriteModelForGenome } from "./spriteCatalog";
import { currentTimePeriod, TIME_PERIOD_LABELS, type TimePeriod } from "./timeOfDay";
import type { NimviCareAction, NimviReaction, NimviSave } from "./types";

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

  const hasLocalSave = Boolean(save);
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
        const advanced = advanceCare(existing);
        const next: NimviSave = {
          ...advanced,
          lastSeenAt: Date.now(),
          metrics: {
            ...advanced.metrics,
            visits: advanced.metrics.visits + 1,
            nightVisits: advanced.metrics.nightVisits + (hour >= 20 || hour < 6 ? 1 : 0),
          },
        };
        persist(next);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, [persist]);

  useEffect(() => {
    if (!hasLocalSave || visitorSeed) return;
    const timer = window.setInterval(() => {
      setSave((current) => {
        if (!current) return current;
        const next = advanceCare(current);
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
        return next;
      });
    }, CARE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [hasLocalSave, visitorSeed]);

  const localSeed = save?.seed;
  const illness = save?.care.illness;
  useEffect(() => {
    if (!illness || illness === "none" || visitorSeed) return;
    const timer = window.setTimeout(() => {
      setNotice(illness === "stomach" ? "A barriga está doendo. Ele precisa de medicamento." : "Ele parece abatido e espirrou baixinho.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [illness, visitorSeed]);

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
        const advanced = advanceCare(current);
        const next = {
          ...advanced,
          lastSeenAt: Date.now(),
          metrics: {
            ...advanced.metrics,
            focusReturns: advanced.metrics.focusReturns + 1,
            hiddenSeconds: advanced.metrics.hiddenSeconds + elapsed,
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

  const interact = (kind: NimviCareAction) => {
    if (!save) return;
    const result = performCareAction(save, kind);
    persist({ ...result.save, lastSeenAt: Date.now() });
    react(result.reaction, result.notice);
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

  const activeSeed = visitorSeed || save?.seed;
  const genome = useMemo(() => activeSeed ? generateGenome(activeSeed) : null, [activeSeed]);
  const activeSave = useMemo(() => {
    if (!visitorSeed || !genome) return save;
    const visitor = createFreshSave(genome.seed);
    return {
      ...visitor,
      bond: 28,
      metrics: { ...visitor.metrics, visits: 5, interactions: 8, focusReturns: 4, hiddenSeconds: 900, resizes: 1, nightVisits: 2 },
    };
  }, [genome, save, visitorSeed]);
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
  const mood = careMood(activeSave.care);
  const illnessLabel = activeSave.care.illness === "cold" ? "resfriado" : activeSave.care.illness === "stomach" ? "dor de barriga" : null;
  const needs = [
    { label: "saciedade", value: 100 - activeSave.care.hunger, tone: activeSave.care.hunger >= 75 ? "critical" : "" },
    { label: "higiene", value: activeSave.care.hygiene, tone: activeSave.care.hygiene <= 25 ? "critical" : "" },
    { label: "energia", value: activeSave.care.energy, tone: activeSave.care.energy <= 25 ? "critical" : "" },
    { label: "alegria", value: activeSave.care.happiness, tone: activeSave.care.happiness <= 30 ? "critical" : "" },
    { label: "saúde", value: activeSave.care.health, tone: activeSave.care.illness !== "none" ? "sick" : "" },
  ];
  const priorityNeed = needs.reduce((lowest, need) => need.value < lowest.value ? need : lowest);

  return (
    <main className="game-shell" style={{ "--nimvi-accent": palette.accent, "--nimvi-body": palette.body } as React.CSSProperties}>
      <header className="topbar">
        <Link className="brand-mark small" href={withBasePath("/")} aria-label="Nimvi, início">nimvi<i /></Link>
        <div className="status-pill"><span /> {visitorSeed ? "visita" : "vivendo agora"}</div>
        <button className="quiet-button" onClick={() => share(genome.seed)}>{copied ? "link copiado" : "visitar por link"}</button>
      </header>

      {visitorSeed && (
        <div className="visitor-banner">
          Você está visitando {genome.name}. <Link href={withBasePath("/")}>Voltar ao meu Nimvi</Link>
        </div>
      )}

      <div className="game-layout">
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
          <NimviSprite
            ref={spriteRef}
            genome={genome}
            reaction={reaction}
            sleeping={activeSave.care.isSleeping}
            label={`${genome.name}, Nimvi ${trait.name.toLowerCase()}${activeSave.care.isSleeping ? ", dormindo" : ""}`}
          />
          {reaction === "love" && <span className="pixel-heart">♥</span>}
          {activeSave.care.isSleeping && <span className="sleep-symbol" aria-hidden="true">z Z</span>}
        </button>
        <div className="floor-shadow" aria-hidden="true" />
        <div className="speech-line" role="status">{notice}</div>
      </section>

      <div className="game-sidebar">
      <section className="identity-panel identity-compact">
        <div>
          <p className="eyebrow">SEU NIMVI</p>
          <div className="identity-title">
            <h1>{genome.name}</h1>
            <span>{mood}</span>
          </div>
        </div>
      </section>

      <details className="panel-toggle actions-toggle">
        <summary>
          <span>Cuidados</span>
          <strong>{activeSave.care.isSleeping ? "dormindo" : "acordado"}<i aria-hidden="true" /></strong>
        </summary>
        <div className="toggle-content">
          <p>Ele decide como responder de acordo com o que sente agora.</p>
          <div className="care-glance" aria-label="Resumo rápido das necessidades">
            {needs.map((need) => (
              <span className={need.tone} key={need.label} title={`${need.label}: ${need.value}%`}>
                <i style={{ height: `${need.value}%` }} />
                <b>{need.label.slice(0, 3)}</b>
              </span>
            ))}
          </div>
          <div className="care-actions">
            <button onClick={() => interact("feed")} disabled={Boolean(visitorSeed)}>Dar comida</button>
            <button onClick={() => interact("bath")} disabled={Boolean(visitorSeed)}>Dar banho</button>
            <button onClick={() => interact("sleep")} disabled={Boolean(visitorSeed)}>{activeSave.care.isSleeping ? "Acordar" : "Colocar para dormir"}</button>
            <button onClick={() => interact("medicine")} disabled={Boolean(visitorSeed)}>Dar medicamento</button>
            <button onClick={() => interact("love")} disabled={Boolean(visitorSeed)}>Fazer carinho</button>
            <button onClick={() => interact("play")} disabled={Boolean(visitorSeed)}>Brincar</button>
          </div>
        </div>
      </details>

      <details className="panel-toggle needs-toggle">
        <summary>
          <span>Necessidades</span>
          <strong>{priorityNeed.label} {priorityNeed.value}%<i aria-hidden="true" /></strong>
        </summary>
        <div className="toggle-content">
          <div className="card-heading"><span>vínculo</span><strong>{activeSave.bond}%</strong></div>
          <div className="meter"><i style={{ width: `${activeSave.bond}%` }} /></div>
          <div className="needs-grid" aria-label="Necessidades do Nimvi">
            {needs.map((need) => (
              <div className={`need ${need.tone}`} key={need.label}>
                <span>{need.label}</span><strong>{need.value}%</strong>
                <div className="need-meter"><i style={{ width: `${need.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="panel-toggle info-toggle">
        <summary><span>Informações</span><strong>DNA e histórico<i aria-hidden="true" /></strong></summary>
        <div className="toggle-content">
          <p className="trait-copy">
            <strong>{illnessLabel ? `Está com ${illnessLabel}.` : `${trait.name}.`}</strong>{" "}
            {illnessLabel ? "Precisa de medicamento e um pouco de descanso." : trait.description}
          </p>
          <div className="dna-card">
            <span>DNA NIMVI</span>
            <strong>{genome.seed}</strong>
            <small>Modelo {spriteModelForGenome(genome).name} · {PALETTES[genome.palette].name} · raridade {rarityLabel(genome)}</small>
          </div>
          <section className="life-summary" aria-label="Resumo da vida do Nimvi">
            <span>idade <strong>{formatAge(activeSave.bornAt)}</strong></span>
            <span>refeições <strong>{activeSave.metrics.meals}</strong></span>
            <span>banhos <strong>{activeSave.metrics.baths}</strong></span>
            <span>sonos <strong>{activeSave.metrics.sleepSessions}</strong></span>
            <span>tratamentos <strong>{activeSave.metrics.medicines}</strong></span>
          </section>
          <button className="portrait-button" onClick={() => spriteRef.current?.download()}>Salvar retrato</button>
          <p className="privacy-copy">Seu Nimvi é reconstruído localmente pelo DNA. Nenhum hábito de outras páginas é observado.</p>
        </div>
      </details>
      </div>
      </div>
    </main>
  );
}
