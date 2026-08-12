# Nimvi

> Um Nimvi nasceu na sua aba. Nenhum nasce igual.

## Estado atual

Vertical slice jogável com nascimento, DNA determinístico, 23 modelos animados, necessidades persistentes, Casa Viva decorável, vínculo, retrato e visita por link.

## Como funciona

- Cada instalação gera um DNA criptograficamente aleatório.
- O DNA escolhe um dos três modelos desenhados, uma das oito paletas e um de seis padrões de manchas.
- Folhas, antenas, asas, barbatanas e caudas usam uma cor de destaque própria e uniforme.
- A spritesheet é recortada e colorida localmente; o servidor não precisa armazenar a criatura.
- O save usa a chave versionada `nimvi.save.v1` no armazenamento do navegador.
- Links com `?dna=...` abrem uma visita sem substituir o Nimvi local.
- O quarto possui quatro posições laterais seguras, inventário local e objetos interativos.
- `?dev=1` abre um perfil de testes separado, com catálogo completo e controles de estado.

## Desenvolvimento

```bash
npm run dev
npm test
npm run build
```

## Limites conscientes desta versão

- O save ainda é local ao dispositivo.
- O modo DEV é local e não é uma conta autenticada no servidor.
- A visita é uma reconstrução determinística, não uma sessão multiplayer.
