"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { EvolutionLab } from "./EvolutionLab";
import { EVOLUTIONS, evolutionForModel, evolutionReadiness } from "./evolution";
import { addFriend, decodeRoomSnapshot, DEV_FRIENDS_KEY, encodeRoomSnapshot, FRIENDS_KEY, friendVisitPath, parseFriends, removeFriend, type NimviFriend } from "./friends";
import { NimviSprite, type NimviSpriteHandle } from "./NimviSprite";
import { NimviRoom, RoomInventory } from "./NimviRoom";
import { clearRoomSlot, createRoom, placeRoomItem, roomItem } from "./room";
import { spriteModelForGenome } from "./spriteCatalog";
import { SPEECH_DURATION_MS, speechBubbleColumns } from "./speech";
import { currentTimePeriod, TIME_PERIOD_LABELS, type TimePeriod } from "./timeOfDay";
import type { NimviCareAction, NimviReaction, NimviSave, RoomItemId, RoomSlot } from "./types";

const DEV_SAVE_KEY = "nimvi.dev.save.v1";
const TOBIRU_DEV_SEED = "N2TOBIRU0000";
const VELUME_DEV_SEED = "N2VELUME0004";
const SORULI_DEV_SEED = "N2SORULI0003";
const LUMELI_DEV_SEED = "N2LUMELI0013";
type DevEvolutionModel = "tobiru" | "velume" | "soruli" | "lumeli";
const DEV_EVOLUTIONS = {
  tobiru: { ...EVOLUTIONS[7], seed: TOBIRU_DEV_SEED },
  velume: { ...EVOLUTIONS[2], seed: VELUME_DEV_SEED },
  soruli: { ...EVOLUTIONS[4], seed: SORULI_DEV_SEED },
  lumeli: { ...EVOLUTIONS[9], seed: LUMELI_DEV_SEED },
} as const;

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
  const [friendInvite, setFriendInvite] = useState(false);
  const [visitorRoom, setVisitorRoom] = useState<NimviSave["room"] | undefined>();
  const [friends, setFriends] = useState<NimviFriend[]>([]);
  const [reaction, setReaction] = useState<NimviReaction>("idle");
  const [notice, setNotice] = useState("Ele ainda está entendendo este lugar.");
  const [speechVisible, setSpeechVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const [devMode, setDevMode] = useState(false);
  const [decorating, setDecorating] = useState(false);
  const [selectedRoomItem, setSelectedRoomItem] = useState<RoomItemId | null>(null);
  const [clearRoomMode, setClearRoomMode] = useState(false);
  const [evolutionDemo, setEvolutionDemo] = useState(false);
  const [normalEvolutionDemo, setNormalEvolutionDemo] = useState(false);
  const [devEvolutionModel, setDevEvolutionModel] = useState<DevEvolutionModel>("tobiru");
  const [devEvolutionStage, setDevEvolutionStage] = useState<1 | 2>(1);
  const spriteRef = useRef<NimviSpriteHandle>(null);
  const reactionTimer = useRef<number | null>(null);
  const speechTimer = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    if (speechTimer.current) window.clearTimeout(speechTimer.current);
    setNotice(message);
    setSpeechVisible(true);
    speechTimer.current = window.setTimeout(() => setSpeechVisible(false), SPEECH_DURATION_MS);
  }, []);

  useEffect(() => {
    speechTimer.current = window.setTimeout(() => setSpeechVisible(false), SPEECH_DURATION_MS);
    return () => {
      if (speechTimer.current) window.clearTimeout(speechTimer.current);
    };
  }, []);

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
    localStorage.setItem(devMode ? DEV_SAVE_KEY : SAVE_KEY, JSON.stringify(next));
    setSave(next);
  }, [devMode]);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const visiting = params.get("dna");
      const isDev = params.get("dev") === "1";
      setDevMode(isDev);
      if (visiting) {
        setVisitorSeed(visiting);
        setFriendInvite(params.get("amizade") === "1");
        setVisitorRoom(decodeRoomSnapshot(params.get("quarto")));
      }
      setFriends(parseFriends(localStorage.getItem(isDev ? DEV_FRIENDS_KEY : FRIENDS_KEY)));
      const storageKey = isDev ? DEV_SAVE_KEY : SAVE_KEY;
      const existing = parseSave(localStorage.getItem(storageKey), isDev);
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
        localStorage.setItem(storageKey, JSON.stringify(next));
        setSave(next);
      } else if (isDev && !visiting) {
        const next = createFreshSave("NIMVI-DEV-ROOM", true);
        localStorage.setItem(storageKey, JSON.stringify(next));
        setSave(next);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    if (!hasLocalSave || visitorSeed) return;
    const timer = window.setInterval(() => {
      setSave((current) => {
        if (!current) return current;
        const next = advanceCare(current);
        localStorage.setItem(devMode ? DEV_SAVE_KEY : SAVE_KEY, JSON.stringify(next));
        return next;
      });
    }, CARE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [hasLocalSave, visitorSeed, devMode]);

  const localSeed = save?.seed;
  const illness = save?.care.illness;
  useEffect(() => {
    if (!illness || illness === "none" || visitorSeed) return;
    const timer = window.setTimeout(() => {
      showNotice(illness === "stomach" ? "A barriga está doendo. Ele precisa de medicamento." : "Ele parece abatido e espirrou baixinho.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [illness, visitorSeed, showNotice]);

  useEffect(() => {
    if (!localSeed) return;
    let hiddenAt: number | null = null;
    let resizeTimer: number | null = null;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        showNotice(`${generateGenome(localSeed).name} foi sonhar um pouco.`);
        return;
      }
      const elapsed = hiddenAt ? Math.min(86_400, Math.floor((Date.now() - hiddenAt) / 1000)) : 0;
      hiddenAt = null;
      setReaction("wake");
      showNotice("Você voltou. Ele percebeu.");
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
        localStorage.setItem(devMode ? DEV_SAVE_KEY : SAVE_KEY, JSON.stringify(next));
        return next;
      });
    };

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        showNotice("A casa mudou de tamanho. Curioso.");
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
  }, [localSeed, devMode, showNotice]);

  const react = useCallback((nextReaction: NimviReaction, nextNotice: string) => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setReaction(nextReaction);
    showNotice(nextNotice);
    reactionTimer.current = window.setTimeout(() => setReaction("idle"), 1_500);
  }, [showNotice]);

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

  const updateRoom = (room: NimviSave["room"], nextNotice: string) => {
    if (!save || visitorSeed) return;
    persist({ ...save, room, lastSeenAt: Date.now() });
    react("love", nextNotice);
  };

  const placeSelectedItem = (slot: RoomSlot) => {
    if (!save) return;
    const selectedCatalogItem = roomItem(selectedRoomItem);
    const occupied = Boolean(save.room.slots[slot]);
    const clickedRemovalMark = occupied && (!selectedRoomItem || !selectedCatalogItem?.slots.includes(slot));
    if (clearRoomMode || clickedRemovalMark) {
      updateRoom(clearRoomSlot(save.room, slot), "O espaço ficou livre para uma nova ideia.");
      setClearRoomMode(false);
      return;
    }
    if (!selectedRoomItem) return;
    const next = placeRoomItem(save.room, selectedRoomItem, slot);
    if (next === save.room) {
      showNotice("Esse item não cabe nesse espaço.");
      return;
    }
    updateRoom(next, `${roomItem(selectedRoomItem)?.name ?? "O item"} encontrou seu lugar.`);
    setSelectedRoomItem(null);
  };

  const chooseRoomItem = (item: RoomItemId) => {
    if (!save) return;
    const catalogItem = roomItem(item);
    setClearRoomMode(false);
    if (catalogItem?.category === "parede" || catalogItem?.category === "piso") {
      updateRoom(placeRoomItem(save.room, item), `${catalogItem.name} mudou o clima da casa.`);
      setSelectedRoomItem(null);
      return;
    }
    setSelectedRoomItem(item);
    showNotice(`Onde devemos colocar ${catalogItem?.name.toLowerCase()}?`);
  };

  const interactWithRoom = (itemId: RoomItemId) => {
    if (!save || visitorSeed) return;
    const item = roomItem(itemId);
    const room = save.room;
    if (item?.interactive === "tv") {
      const tvOn = !room.objectStates.tvOn;
      updateRoom({ ...room, objectStates: { ...room.objectStates, tvOn } }, tvOn ? "A TV acendeu. Ele ficou atento aos pixels." : "A TV descansou e o quarto ficou quieto.");
    } else if (item?.interactive === "lamp") {
      const lampOn = !room.objectStates.lampOn;
      updateRoom({ ...room, objectStates: { ...room.objectStates, lampOn } }, lampOn ? "Uma luz morna envolveu o quarto." : "A luminária se apagou devagar.");
    } else if (item?.interactive === "plant") {
      const growth = Math.min(2, room.objectStates.plantGrowth + 1);
      updateRoom({ ...room, objectStates: { ...room.objectStates, plantGrowth: growth, plantLastWateredAt: Date.now() } }, growth === 2 ? "A planta floresceu. Ele parece orgulhoso." : "A planta bebeu cada gota.");
    } else if (item?.interactive === "toy") {
      interact("play");
    }
  };

  const devCare = (preset: "hungry" | "tired" | "sick" | "restore") => {
    if (!save || !devMode) return;
    const care = preset === "restore"
      ? { ...save.care, hunger: 18, hygiene: 92, energy: 82, happiness: 72, health: 100, illness: "none" as const, neglectMinutes: 0, isSleeping: false, sleepStartedAt: null, lastActions: {} }
      : preset === "hungry"
        ? { ...save.care, hunger: 92, energy: 55, isSleeping: false, sleepStartedAt: null, lastActions: {} }
        : preset === "tired"
          ? { ...save.care, energy: 12, hunger: 35, isSleeping: false, sleepStartedAt: null, lastActions: {} }
          : { ...save.care, health: 58, illness: "cold" as const, neglectMinutes: 210, isSleeping: false, sleepStartedAt: null, lastActions: {} };
    persist({ ...save, care });
    showNotice(`DEV: estado ${preset} aplicado.`);
  };

  const prepareDevEvolution = (model: DevEvolutionModel, stage: 1 | 2) => {
    if (!save || !devMode) return;
    persist({ ...save, seed: DEV_EVOLUTIONS[model].seed, lastSeenAt: Date.now() });
    setDevEvolutionModel(model);
    setDevEvolutionStage(stage);
  };
  const startEvolution = (model: DevEvolutionModel) => {
    prepareDevEvolution(model, 1);
    setEvolutionDemo(true);
  };
  const completeDevEvolution = useCallback(() => setDevEvolutionStage(2), []);
  const completeNormalEvolution = useCallback(() => {
    setSave((current) => {
      if (!current) return current;
      const next: NimviSave = { ...current, evolutionStage: 2, lastSeenAt: Date.now() };
      localStorage.setItem(devMode ? DEV_SAVE_KEY : SAVE_KEY, JSON.stringify(next));
      return next;
    });
  }, [devMode]);

  const copyLink = async (seed: string, invitation = false, room?: NimviSave["room"]) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("dna", seed);
    if (invitation) url.searchParams.set("amizade", "1");
    if (room) url.searchParams.set("quarto", encodeRoomSnapshot(room));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      window.prompt("Copie o link de visita:", url.toString());
    }
  };

  const persistFriends = (next: NimviFriend[]) => {
    localStorage.setItem(devMode ? DEV_FRIENDS_KEY : FRIENDS_KEY, JSON.stringify(next));
    setFriends(next);
  };

  const acceptFriend = () => {
    if (!visitorSeed) return;
    const next = addFriend(friends, visitorSeed, save?.seed, visitorRoom);
    persistFriends(next);
    showNotice(next === friends ? "Vocês já são amigos." : "Agora vocês são amigos!");
  };

  const forgetFriend = (seed: string) => {
    persistFriends(removeFriend(friends, seed));
    showNotice("A amizade foi removida deste navegador.");
  };

  const activeSeed = visitorSeed || save?.seed;
  const genome = useMemo(() => activeSeed ? generateGenome(activeSeed) : null, [activeSeed]);
  const speechColumns = speechBubbleColumns(notice);
  const activeSave = useMemo(() => {
    if (!visitorSeed || !genome) return save;
    const visitor = createFreshSave(genome.seed);
    return {
      ...visitor,
      room: visitorRoom ?? visitor.room,
      bond: 28,
      metrics: { ...visitor.metrics, visits: 5, interactions: 8, focusReturns: 4, hiddenSeconds: 900, resizes: 1, nightVisits: 2 },
    };
  }, [genome, save, visitorSeed, visitorRoom]);
  const evolution = genome ? evolutionForModel(genome.model) : null;
  const evolutionStatus = activeSave ? evolutionReadiness(activeSave) : null;
  const startNormalEvolution = () => {
    if (!evolution || !evolutionStatus?.ready || !save || visitorSeed || save.evolutionStage === 2) return;
    if (!window.confirm(`${genome?.name} está pronto para alcançar o estágio 2. Começar a evolução?`)) return;
    setNormalEvolutionDemo(true);
    setEvolutionDemo(true);
  };
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
        <div className={`status-pill ${devMode ? "dev" : ""}`}><span /> {devMode ? "conta dev" : visitorSeed ? "visita" : "vivendo agora"}</div>
        <button className="quiet-button" onClick={() => copyLink(visitorSeed ? genome.seed : save?.seed ?? genome.seed, !visitorSeed, activeSave.room)}>{copied ? "link copiado" : visitorSeed ? "compartilhar visita" : "convidar um amigo"}</button>
      </header>

      {visitorSeed && (
        <div className={`visitor-banner ${friendInvite ? "friend-invite" : ""}`}>
          <span>{friendInvite ? `${genome.name} quer fazer amizade com seu Nimvi.` : `Você está visitando ${genome.name}.`}</span>
          {friendInvite && (
            <button onClick={acceptFriend} disabled={friends.some((friend) => friend.seed === genome.seed)}>
              {friends.some((friend) => friend.seed === genome.seed) ? "Amizade aceita" : "Aceitar amizade"}
            </button>
          )}
          <a href={withBasePath("/")}>Voltar ao meu Nimvi</a>
        </div>
      )}

      <div className="game-layout">
      <section
        className={`habitat wallpaper-${activeSave.room.wallpaper} floor-${activeSave.room.floor} ${activeSave.room.objectStates.tvOn ? "tv-on" : ""}`}
        style={{
          "--floor-stone-image": `url("${withBasePath("/floors/porcelain-white.png")}?v=1")`,
          "--floor-wood-image": `url("${withBasePath("/floors/vinyl-oak.png")}?v=1")`,
          "--wall-mint-image": `url("${withBasePath("/wallpapers/botanical-mint.png")}?v=1")`,
          "--wall-dusk-image": `url("${withBasePath("/wallpapers/celestial-violet.png")}?v=1")`,
          "--wall-peach-image": `url("${withBasePath("/wallpapers/geometric-peach.png")}?v=1")`,
        } as CSSProperties}
        aria-label={`Habitat de ${genome.name}`}
      >
        <div className={`pixel-window time-${timePeriod}`} aria-hidden="true">
          <span className="time-label">{TIME_PERIOD_LABELS[timePeriod]}</span>
          <span className="sun" />
          <span className="moon" />
          <span className="cloud"><i /></span>
          <span className="horizon" />
          <i className="star one" /><i className="star two" /><i className="star three" />
        </div>
        <NimviRoom room={activeSave.room} decorating={decorating && !visitorSeed} selectedItem={selectedRoomItem} clearMode={clearRoomMode} onSlot={placeSelectedItem} onObject={interactWithRoom} />
        <div className="ambient-dots" aria-hidden="true"><i /><i /><i /></div>
        <button
          className={`creature-stage reaction-${reaction}`}
          onClick={() => !visitorSeed && interact("love")}
          aria-label={visitorSeed ? `${genome.name}, um Nimvi visitante` : `Fazer carinho em ${genome.name}`}
        >
          <NimviSprite
            ref={spriteRef}
            genome={genome}
            modelSrc={devMode
              ? genome.model === DEV_EVOLUTIONS[devEvolutionModel].model && devEvolutionStage === 2
                ? withBasePath(DEV_EVOLUTIONS[devEvolutionModel].stage2Src)
                : undefined
              : evolution && activeSave.evolutionStage === 2 ? withBasePath(evolution.stage2Src) : undefined}
            reaction={reaction}
            sleeping={activeSave.care.isSleeping}
            label={`${genome.name}, Nimvi ${trait.name.toLowerCase()}${activeSave.care.isSleeping ? ", dormindo" : ""}`}
          />
          {devMode && genome.model === DEV_EVOLUTIONS[devEvolutionModel].model && <span className="dev-stage-badge">ESTÁGIO {devEvolutionStage} · DEV</span>}
          {reaction === "love" && <span className="pixel-heart">♥</span>}
          {activeSave.care.isSleeping && <span className="sleep-symbol" aria-hidden="true">z Z</span>}
        </button>
        {speechVisible && (
          <div
            className="speech-bubble"
            style={{ "--speech-columns": speechColumns } as CSSProperties}
            role="status"
            aria-live="polite"
          >
            {notice}
          </div>
        )}
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

      <details className="panel-toggle decorate-toggle" onToggle={(event) => {
        const open = event.currentTarget.open;
        setDecorating(open);
        if (!open) {
          setSelectedRoomItem(null);
          setClearRoomMode(false);
        }
      }}>
        <summary><span>Decorar</span><strong>{activeSave.room.inventory.length} itens<i aria-hidden="true" /></strong></summary>
        <div className="toggle-content">
          {visitorSeed ? <p>O quarto de uma visita só pode ser observado.</p> : (
            <RoomInventory room={activeSave.room} selectedItem={selectedRoomItem} clearMode={clearRoomMode} onSelect={chooseRoomItem} onClear={() => { setSelectedRoomItem(null); setClearRoomMode((current) => !current); }} />
          )}
        </div>
      </details>

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
          {!devMode && !visitorSeed && <a className="dev-account-link" href="?dev=1">Abrir conta DEV de testes</a>}
          <p className="privacy-copy">Seu Nimvi é reconstruído localmente pelo DNA. Nenhum hábito de outras páginas é observado.</p>
        </div>
      </details>
      {evolution && !visitorSeed && (
        <details className="panel-toggle evolution-toggle">
          <summary><span>Evolução</span><strong>estágio {activeSave.evolutionStage}<i aria-hidden="true" /></strong></summary>
          <div className="toggle-content evolution-content">
            {activeSave.evolutionStage === 2 ? (
              <p>{genome.name} já alcançou sua forma evoluída.</p>
            ) : (
              <>
                <p>A evolução só acontece quando ele estiver preparado. Nada é perdido enquanto você espera.</p>
                <ul className="evolution-requirements">
                  <li className={evolutionStatus?.ageReady ? "ready" : ""}>3 dias de vida</li>
                  <li className={evolutionStatus?.bondReady ? "ready" : ""}>20% de vínculo</li>
                  <li className={evolutionStatus?.healthReady ? "ready" : ""}>Saudável</li>
                </ul>
                <button className="evolution-start-button" disabled={!evolutionStatus?.ready} onClick={startNormalEvolution}>
                  {evolutionStatus?.ready ? "Iniciar evolução" : "Ainda não está pronto"}
                </button>
              </>
            )}
          </div>
        </details>
      )}
      {!visitorSeed && (
        <details className="panel-toggle friends-toggle">
          <summary><span>Amigos</span><strong>{friends.length} {friends.length === 1 ? "Nimvi" : "Nimvis"}<i aria-hidden="true" /></strong></summary>
          <div className="toggle-content friends-content">
            <p>Ao aceitar um convite recebido, o Nimvi do seu amigo fica guardado neste navegador. Envie o seu para aparecer na coleção dele.</p>
            <button className="friend-invite-button" onClick={() => copyLink(genome.seed, true, activeSave.room)}>{copied ? "Convite copiado" : "Copiar convite de amizade"}</button>
            {friends.length === 0 ? <p className="empty-friends">Nenhum amigo ainda.</p> : (
              <div className="friends-list">
                {friends.map((friend) => {
                  const friendGenome = generateGenome(friend.seed);
                  return (
                    <div className="friend-row" key={friend.seed}>
                      <span><strong>{friendGenome.name}</strong><small>{friend.seed}</small></span>
                      <a href={withBasePath(friendVisitPath(friend))}>Visitar</a>
                      <button onClick={() => forgetFriend(friend.seed)} aria-label={`Remover amizade com ${friendGenome.name}`}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
            <small className="friend-note">Nesta versão, seu amigo também precisa enviar o convite dele para a amizade aparecer nos dois navegadores.</small>
          </div>
        </details>
      )}
      {devMode && !visitorSeed && (
        <details className="panel-toggle dev-toggle">
          <summary><span>Laboratório DEV</span><strong>não afeta seu Nimvi<i aria-hidden="true" /></strong></summary>
          <div className="toggle-content dev-controls">
            <button onClick={() => devCare("hungry")}>Testar fome</button>
            <button onClick={() => devCare("tired")}>Testar sono</button>
            <button onClick={() => devCare("sick")}>Testar doença</button>
            <button onClick={() => devCare("restore")}>Restaurar cuidados</button>
            <button onClick={() => save && updateRoom(createRoom(true), "DEV: quarto restaurado.")}>Resetar quarto</button>
            <button onClick={() => startEvolution("tobiru")}>Iniciar evolução Tobiru</button>
            <button onClick={() => prepareDevEvolution("tobiru", 1)}>Ver Tobiru estágio 1</button>
            <button onClick={() => prepareDevEvolution("tobiru", 2)}>Ver Tobiru estágio 2</button>
            <button onClick={() => startEvolution("velume")}>Iniciar evolução Velume</button>
            <button onClick={() => prepareDevEvolution("velume", 1)}>Ver Velume estágio 1</button>
            <button onClick={() => prepareDevEvolution("velume", 2)}>Ver Velume estágio 2</button>
            <button onClick={() => startEvolution("soruli")}>Iniciar evolução Soruli</button>
            <button onClick={() => prepareDevEvolution("soruli", 1)}>Ver Soruli estágio 1</button>
            <button onClick={() => prepareDevEvolution("soruli", 2)}>Ver Soruli estágio 2</button>
            <button onClick={() => startEvolution("lumeli")}>Iniciar evolução Lumeli</button>
            <button onClick={() => prepareDevEvolution("lumeli", 1)}>Ver Lumeli estágio 1</button>
            <button onClick={() => prepareDevEvolution("lumeli", 2)}>Ver Lumeli estágio 2</button>
            <a href="?">Voltar à conta normal</a>
          </div>
        </details>
      )}
      </div>
      </div>
      {evolutionDemo && <EvolutionLab
        genome={genome}
        evolution={normalEvolutionDemo && evolution ? evolution : DEV_EVOLUTIONS[devEvolutionModel]}
        onClose={() => { setEvolutionDemo(false); setNormalEvolutionDemo(false); }}
        onComplete={normalEvolutionDemo ? completeNormalEvolution : completeDevEvolution}
      />}
    </main>
  );
}
