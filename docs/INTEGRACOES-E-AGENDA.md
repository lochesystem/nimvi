---
versão: 0.1.0
data: 2026-08-13
status: planejado
---

# Nimvi — agenda, notificações e integrações

## Objetivo

Transformar o Nimvi em um companheiro capaz de lembrar compromissos sem acoplar a experiência a um único provedor de agenda.

## Arquitetura proposta

Todas as fontes alimentam um motor único de eventos:

`agenda local → motor de eventos → fala do Nimvi + notificação web`

Google Calendar e outros serviços entram depois como fontes adicionais. Um evento deve possuir identificador, origem (`local` ou `google`), título, início, antecedência do aviso, estado e referência externa opcional.

## Fases

### 1. Agenda local

- Criar, editar, concluir e excluir lembretes.
- Mostrar o próximo compromisso em uma seção compacta.
- Fazer o Nimvi reagir e falar quando chegar o momento.
- Incluir na conta DEV um evento para daqui a 30 segundos.
- Persistir inicialmente no navegador.

### 2. Push com o aplicativo fechado

- Registrar um Service Worker e solicitar permissão somente após ação explícita.
- Guardar inscrições Web Push no backend.
- Usar Cloudflare Worker, D1 e Cron Trigger para localizar eventos próximos e disparar notificações.
- Ao tocar na notificação, abrir o Nimvi já contextualizado no evento.
- Em iOS/iPadOS, explicar que push exige a instalação do web app na tela inicial.

### 3. Google Calendar

- OAuth com escopo somente de leitura inicialmente.
- Tokens mantidos no backend, nunca no `localStorage`.
- Escolha explícita dos calendários acompanhados.
- Sincronização simples ao abrir o Nimvi no protótipo.
- Em produção, webhook HTTPS do Google Calendar, consulta incremental e renovação periódica dos canais de notificação.
- Criar ou editar eventos do Google somente em uma fase posterior.

## Regras de produto

- O Nimvi não cria compromissos ou altera agendas externas sem confirmação.
- Notificações devem ser configuráveis por evento e globalmente.
- Eventos privados devem poder ocultar o título na notificação.
- O usuário pode desconectar uma integração e apagar seus dados associados.
- A agenda local continua funcionando mesmo sem Google Calendar.

## Primeiro experimento recomendado

Adicionar uma seção `Agenda` com criação local, resumo do próximo evento, permissão de notificação e o teste DEV de 30 segundos. Depois validar Service Worker e backend antes de iniciar OAuth com Google.
