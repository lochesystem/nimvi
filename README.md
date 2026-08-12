# Nimvi

> Um Nimvi nasceu na sua aba. Nenhum nasce igual.

## Estado atual

Vertical slice jogável com nascimento, DNA determinístico, três modelos fixos animados, oito paletas, seis padrões corporais, reações a foco/ausência, vínculo, retrato e visita por link.

## Como funciona

- Cada instalação gera um DNA criptograficamente aleatório.
- O DNA escolhe um dos três modelos desenhados, uma das oito paletas e um de seis padrões de manchas.
- Folhas, antenas, asas, barbatanas e caudas usam uma cor de destaque própria e uniforme.
- A spritesheet é recortada e colorida localmente; o servidor não precisa armazenar a criatura.
- O save usa a chave versionada `nimvi.save.v1` no armazenamento do navegador.
- Links com `?dna=...` abrem uma visita sem substituir o Nimvi local.

## Desenvolvimento

```bash
npm run dev
npm test
npm run build
```

## Limites conscientes desta versão

- O save ainda é local ao dispositivo.
- A progressão usa hábitos da própria página; nesta fase ela ainda não muda a anatomia.
- A visita é uma reconstrução determinística, não uma sessão multiplayer.
