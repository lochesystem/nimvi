---
versão: 0.3.0
data: 2026-08-11
status: implementado
fonte_de_verdade: build web em app/
---

# Nimvi — GDD

## Pitch

Uma criatura pixel art irrepetível nasce na aba e desenvolve traços conforme o jogador retorna para vê-la.

## Pilares

1. **Coerência antes de variedade:** poucos corpos bem desenhados têm prioridade sobre muitas formas deformadas.
2. **Cuidado sem morte:** necessidades importam e podem causar doença, mas ausência nunca apaga o Nimvi.
3. **Curiosidade leve:** cada retorno deve revelar uma reação ou progresso pequeno.

## É / não é

É um companheiro determinístico com necessidades persistentes e vontade própria. Não monitora navegação externa, não exige conta e ainda não possui ciclo de vida ou evolução.

## Core loop

Voltar → observar o estado → entender a necessidade → oferecer um cuidado → Nimvi aceita ou recusa coerentemente → o estado continua mudando com o tempo.

## Vertical slice 0.1

- Despertar e persistir um Nimvi.
- Reconstruir o mesmo visual a partir do DNA.
- Escolher pelo DNA um de três modelos fixos e uma de oito paletas.
- Reproduzir cinco ciclos isolados de quatro frames: idle, carinho, tristeza, movimento e pulo.
- Registrar visitas, retornos de foco, tempo oculto, redimensionamentos e visitas noturnas.
- Manter fome, higiene, energia, alegria e saúde ao longo do tempo.
- Permitir comida, banho, sono, medicamento, carinho e brincadeira com limites e recusas contextuais.
- Gerar doença apenas por negligência acumulada, sem morte.
- Retirar evolução da interface até o ciclo de vida ser desenhado.
- Exportar retrato e copiar link de visita.

## Casa Viva 0.3

- O Nimvi permanece centralizado; móveis e ambiente produzem presença sem locomoção improvisada.
- O quarto usa três slots seguros; a área da janela fica reservada para uma futura categoria de cortinas.
- Inventário inicial contém papéis de parede, pisos, móveis e objetos de chão.
- TV, luminária, planta e caixa de brinquedos possuem interações contextuais.
- A decoração é persistida localmente e saves antigos migram sem trocar o DNA.
- O perfil `?dev=1` usa armazenamento separado, catálogo completo e presets de necessidades para QA.
