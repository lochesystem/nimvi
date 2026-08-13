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

## Amizades 0.4

- Cada tutor pode gerar um link de convite do próprio Nimvi.
- Abrir um convite permite visitar a criatura antes de aceitar.
- O convite leva uma fotografia compacta do quarto, incluindo papel de parede, piso, móveis e estados visuais dos objetos.
- Aceitar guarda o DNA do amigo localmente e exige confirmação explícita.
- A coleção de amigos permite visitar ou remover cada Nimvi.
- Na versão local, reciprocidade acontece quando cada pessoa aceita o convite da outra.
- Contas e backend serão necessários para solicitações bilaterais automáticas, sincronização entre dispositivos e interações sociais persistentes.

## Integrações futuras

O plano de agenda local, Web Push e Google Calendar está em `docs/INTEGRACOES-E-AGENDA.md`.

## Protótipo de evolução — Tobiru

- Tobiru possui um estágio 2 desenhado, maior e inequivocamente relacionado ao estágio 1.
- O estágio 2 tem quatro frames de idle e quatro frames de felicidade; o ciclo de vida normal ainda não o ativa.
- A conta DEV oferece uma demonstração isolada em laboratório: carga de energia, tela branca, silhueta, revelação e reação feliz.
- A demonstração prepara um Tobiru de teste e mantém o estágio 2 no habitat ao terminar; controles DEV alternam livremente entre os dois estágios.
- O GIF de demonstração serve como QA e apresentação; critérios reais de evolução permanecem para uma etapa futura.

## Protótipo de evolução — Velume

- Velume possui um estágio 2 mais alto e maduro, preservando folhas, chifre, quatro patas e cauda espiral.
- O estágio 2 tem quatro frames de idle e quatro frames de felicidade, ambos disponíveis para comparação na conta DEV.
- A demonstração usa o mesmo laboratório e sequência visual do Tobiru, com textos e asset próprios do Velume.

## Protótipo de evolução — Soruli

- Soruli possui um estágio 2 mais alto e expressivo, preservando o corpo de caracol, as antenas e a grande concha espiral.
- A concha ganha uma segunda borda ornamental e uma crista de cristais, criando uma mudança clara sem descaracterizar o modelo.
- A conta DEV permite iniciar a evolução no laboratório ou comparar diretamente os estágios 1 e 2.

## Protótipo de evolução — Lumeli

- Lumeli evolui para uma lanterna viva mais alta, mantendo o corpo de sino, o aro luminoso e as duas pernas finas.
- O estágio 2 ganha uma borda inferior ornamental, aletas laterais simétricas e uma joia frontal.
- A conta DEV permite iniciar a evolução no laboratório ou comparar diretamente os estágios 1 e 2.

## Condição comum para o estágio 2

- Ter pelo menos 3 dias de vida.
- Alcançar 20% de vínculo.
- Estar saudável no momento da evolução.
- A evolução exige confirmação explícita; ausência não reduz progresso e doença apenas adia o evento.
- As condições são verificadas no save normal e a evolução é persistida no navegador.
- Somente Tobiru, Velume, Soruli e Lumeli podem evoluir nesta versão, pois são os únicos modelos com estágio 2 desenhado e animado.
- Modelos sem arte de evolução não exibem painel, botão ou promessa de evolução.
