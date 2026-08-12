# Geração dos dez novos modelos

Modo usado: geração raster integrada (`imagegen`), seguida por remoção local de chroma key e QA de sprites.

## Prompt-base

- Spritesheet de produção para mascote virtual web.
- Exatamente 4 colunas × 2 linhas: idle em cima e feliz/carinho embaixo.
- Anatomia, escala e orientação constantes nos oito quadros.
- Pixel art nítida, contorno quase preto, interior branco, sem antialiasing ou sombras.
- Fundo uniforme `#00ff00`, sem caixas, grade, texto, chão ou elementos decorativos.
- Idle: repouso, inspiração, repouso e expiração.
- Feliz: sorriso, elevação, reação afetuosa e retorno suspenso antes do pouso.

## Silhuetas solicitadas

- **Mocori:** cogumelo de chapéu largo e assimétrico.
- **Soruli:** criatura baixa com grande concha espiral.
- **Aguari:** sino flutuante com três tentáculos e estrela no topo.
- **Cravim:** criatura larga com uma pinça grande e outra pequena.
- **Tobiru:** ave-gota com crista alta e asas curtas.
- **Paturi:** quadrúpede baixo com três placas sobrepostas e cauda-pá.
- **Lumeli:** lanterna viva em losango, alça e dois pendões.
- **Castu:** semente com cúpula angular, raízes e broto lateral.
- **Orumo:** criatura-balão redonda com coroa assimétrica de espinhos curtos.
- **Ziru:** criatura flutuante em vírgula, cauda enrolada e crista dorsal.

Os PNGs originais com chroma key e as versões com transparência ficam em `docs/source-art/`. Os assets finais ficam em `public/sprites/`.
