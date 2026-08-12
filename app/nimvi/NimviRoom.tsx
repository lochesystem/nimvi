"use client";

import type { CSSProperties } from "react";

import { withBasePath } from "../base-path";
import { ROOM_ITEMS, ROOM_SLOTS, roomItem } from "./room";
import type { NimviRoom, RoomItemId, RoomSlot } from "./types";

type RoomProps = {
  room: NimviRoom;
  decorating: boolean;
  selectedItem: RoomItemId | null;
  clearMode: boolean;
  onSlot: (slot: RoomSlot) => void;
  onObject: (item: RoomItemId) => void;
};

function ItemArt({ id, room }: { id: RoomItemId; room: NimviRoom }) {
  const state = room.objectStates;
  const item = roomItem(id);
  const style = item?.asset
    ? ({ "--room-art-image": `url("${withBasePath(item.asset)}?v=2")` } as CSSProperties)
    : undefined;
  return (
    <span className={`room-art art-${id} ${id === "tv" && state.tvOn ? "is-on" : ""} ${id === "lamp" && state.lampOn ? "is-on" : ""} growth-${state.plantGrowth}`} style={style} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

export function NimviRoom({ room, decorating, selectedItem, clearMode, onSlot, onObject }: RoomProps) {
  const selected = roomItem(selectedItem);
  return (
    <div className="room-layer" aria-label="Decoração do quarto">
      {ROOM_SLOTS.map((slot) => {
        const id = room.slots[slot];
        const item = roomItem(id);
        const compatible = Boolean(decorating && selected && selected.slots.includes(slot));
        return (
          <button
            type="button"
            className={`room-slot slot-${slot} ${compatible ? "is-compatible" : ""} ${decorating ? "is-editing" : ""}`}
            key={slot}
            onClick={() => decorating && (selectedItem || clearMode || id) ? onSlot(slot) : item?.interactive && id ? onObject(id) : undefined}
            aria-label={decorating ? id && !selectedItem ? `Guardar ${item?.name}` : `${id ? "Substituir" : "Colocar em"} ${slot}` : item?.interactive ? `Interagir com ${item.name}` : item?.name ?? "Espaço vazio"}
            disabled={decorating ? !selectedItem && !clearMode && !id : !item?.interactive}
          >
            {id && <ItemArt id={id} room={room} />}
            {decorating && <span className="slot-marker">{clearMode && id ? "−" : compatible ? "+" : id ? "×" : "·"}</span>}
          </button>
        );
      })}
      {room.objectStates.lampOn && <span className="room-light" aria-hidden="true" />}
    </div>
  );
}

type DecoratorProps = {
  room: NimviRoom;
  selectedItem: RoomItemId | null;
  clearMode: boolean;
  onSelect: (item: RoomItemId) => void;
  onClear: () => void;
};

export function RoomInventory({ room, selectedItem, clearMode, onSelect, onClear }: DecoratorProps) {
  const inventory = ROOM_ITEMS.filter((item) => room.inventory.includes(item.id));
  return (
    <div className="room-inventory">
      <p>{clearMode ? "Escolha no quarto o item que quer guardar." : selectedItem ? "Agora escolha um espaço destacado no quarto." : "Escolha um item para colocar ou toque no × de um móvel para guardá-lo."}</p>
      <div className="inventory-grid">
        {inventory.map((item) => (
          <button type="button" className={selectedItem === item.id ? "selected" : ""} key={item.id} onClick={() => onSelect(item.id)}>
            <ItemArt id={item.id} room={room} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <button type="button" className={`clear-slot-button ${clearMode ? "selected" : ""}`} onClick={onClear}>Guardar item do quarto</button>
    </div>
  );
}
