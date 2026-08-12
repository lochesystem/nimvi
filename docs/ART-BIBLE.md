---
versão: 0.1.0
data: 2026-08-11
status: implementado
fonte_de_verdade: app/nimvi/spriteCatalog.ts
---

# Nimvi — Art Bible

## Grade e leitura

- Folha por modelo: 4 colunas × 5 linhas.
- Célula de origem: 313×250 pixels, com aparência pixel art e escala nearest-neighbor.
- Renderização: nearest-neighbor, sem antialiasing.
- Baseline estável no idle; movimento e pulo possuem deslocamento corporal intencional.
- Contorno recebe `outline`; mapas semânticos fixos separam corpo, acessórios e detalhes internos pixel a pixel.

## Paleta

Estado visual temporário: todas as regiões internas são brancas e contornos/traços faciais usam um único tom escuro. As oito paletas e os seis padrões continuam registrados no DNA, mas não são aplicados pelo renderer enquanto a estratégia definitiva de cor é estudada.

Os mapas semânticos continuam preservados para uma futura retomada da cor sem precisar reconstruir a anatomia.

## Modelos fixos

O runtime não cria geometria. DNAs legados continuam escolhendo deterministicamente um dos treze modelos originais; novos DNAs `N2` escolhem entre os vinte e três modelos aprovados. Os três modelos iniciais são:

- **Brotinho:** corpo arredondado, folhas assimétricas e cauda espiral.
- **Lúnula:** criatura baixa com antenas flexíveis, dorso em crescente e cauda espiral.
- **Velume:** criatura alada, chifres curtos e cauda em fita.

Os dez modelos adicionados são Mocori, Soruli, Aguari, Cravim, Tobiru, Paturi, Lumeli, Castu, Orumo e Ziru. Eles foram desenhados como famílias de silhueta distintas: cogumelo, concha, sino flutuante, caranguejo, ave-gota, criatura encouraçada, lanterna viva, semente, balão espinhoso e criatura em vírgula.

Os três modelos iniciais possuem 20 frames isolados. Os dez novos possuem somente oito frames aprovados: quatro de idle e quatro de feliz. Suas três linhas restantes são transparentes e reservadas; o jogo não inventa movimento ou pulo para elas.

Folhas do Brotinho, antenas/barbatana da Lúnula e asas do Velume são regiões semânticas. Cada acessório recebe uma única cor, sem manchas corporais atravessando suas superfícies.

Os arquivos `public/sprites/roles/*-roles.png` são a fonte de verdade da pintura. Branco representa corpo, magenta representa acessórios, amarelo representa detalhes e preto representa contorno. O runtime apenas traduz esses papéis para a paleta do DNA; ele não tenta inferir regiões pela proximidade ou pelo brilho do desenho.

## Meta de qualidade

- Silhueta legível em miniatura e sem depender da cor.
- Anatomia e proporções consistentes entre todos os frames do mesmo modelo.
- Máscara explícita para quadros cujo contorno possui aberturas intencionais, evitando vazamento ou desaparecimento da cor.
- Apêndices conectados e expressão legível na escala real do jogo.

## Animação idle

- Linhas ativas em toda a coleção: idle e carinho/feliz.
- Quatro frames únicos por linha, da esquerda para a direita.
- Idle: 320 ms por frame. Carinho: 180 ms. Brincadeira frontal: 160 ms. Acordar: 240 ms.
- Triste, movimento e pulo existem apenas nos três modelos iniciais e ficam reservados; não são usados enquanto o Nimvi permanece parado no habitat.

## Relógio do habitat

A janela acompanha a hora local do dispositivo e recalcula a fase a cada minuto e quando a aba volta ao foco:

- Madrugada: 00:00–05:59, céu violeta, lua baixa e estrelas.
- Dia: 06:00–11:59, céu claro, sol alto e nuvens.
- Tarde: 12:00–17:59, céu coral e sol descendo.
- Noite: 18:00–23:59, céu índigo, lua e estrelas.

As cores da janela transitam suavemente na troca de fase. O rótulo dentro da janela mantém o período legível mesmo sem depender apenas da cor.

## Proibições

- Não copiar silhuetas das referências de mercado.
- Não gerar geometria procedural no runtime desta fase.
- Não interpolar pixels nem redimensionar com filtro suave.
- Não misturar quadros de emoções diferentes.
- Não recolorir pixels externos ao corpo, aplicar manchas em acessórios nem permitir vazamento entre células.
- Não reintroduzir classificação automática de anatomia no runtime; qualquer correção de região deve ser feita no mapa semântico do modelo.
