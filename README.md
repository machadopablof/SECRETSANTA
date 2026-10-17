# 🎁 Amigo Oculto

Sistema de sorteio de amigo oculto que roda direto no navegador, sem instalar nada.

**Acesse:** https://machadopablof.github.io/SECRETSANTA/

## Como usar

1. Abra o site (ou o arquivo `index.html` no navegador).
2. Adicione os participantes (mínimo de 3).
3. Clique em **Sortear**.
4. Envie a cada pessoa o **link pessoal** dela (botão **Copiar link** ou
   **WhatsApp**). Quem abre o link vê só o próprio amigo oculto.
   Também dá para revelar no mesmo aparelho, passando-o de mão em mão.

O resultado vai dentro do próprio link (depois do `#`), então nada é salvo em
servidor. Quem organiza não deve abrir os links dos outros para não estragar a
surpresa.

## Publicação

O workflow `.github/workflows/pages.yml` roda os testes e publica o site no
GitHub Pages a cada push.

## Garantia de que ninguém tira a si mesmo

- **Reconhecimento da pessoa:** o sistema compara nomes ignorando maiúsculas,
  acentos e espaços extras. `João Silva` e `joao  SILVA` são tratados como a
  mesma pessoa — o nome repetido é recusado no cadastro, evitando que alguém
  entre duas vezes e acabe tirando a si mesmo.
- **Sorteio:** a lista é embaralhada até que ninguém fique na própria posição
  (todas as combinações válidas têm a mesma chance).
- **Verificação final:** antes de liberar o resultado, `verificarResultado`
  confere que ninguém tirou a si mesmo, que todos tiraram alguém e que ninguém
  foi sorteado duas vezes. Se algo estiver errado, o sorteio é bloqueado.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `sorteio.js` | Lógica do sorteio e das validações (funciona no navegador e no Node) |
| `app.js` | Interface |
| `index.html`, `style.css` | Página |
| `tests/sorteio.test.js` | Testes automatizados |

## Testes

Requer Node.js 18+:

```bash
npm test
```
