/**
 * Lógica do sorteio de amigo oculto.
 *
 * Regra principal: ninguém pode tirar a si mesmo.
 * O sistema "reconhece" a mesma pessoa mesmo que o nome venha escrito
 * de forma diferente (maiúsculas/minúsculas, acentos, espaços extras),
 * e valida o resultado final antes de devolvê-lo.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Sorteio = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MINIMO_PARTICIPANTES = 3;

  /** Gera uma chave de identidade: "  João  Silva " e "joao silva" viram a mesma pessoa. */
  function normalizarNome(nome) {
    return String(nome)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** Limpa espaços extras mantendo a grafia original para exibição. */
  function limparNome(nome) {
    return String(nome).replace(/\s+/g, " ").trim();
  }

  /** Mesma pessoa? Compara pelos nomes normalizados. */
  function mesmaPessoa(a, b) {
    return normalizarNome(a) === normalizarNome(b);
  }

  /**
   * Valida a lista de participantes.
   * Retorna { valido, erros, participantes } — participantes já limpos.
   */
  function validarParticipantes(nomes) {
    const erros = [];
    const participantes = [];
    const vistos = new Map();

    (nomes || []).forEach(function (bruto) {
      const nome = limparNome(bruto);
      if (!nome) return;
      const chave = normalizarNome(nome);
      if (vistos.has(chave)) {
        erros.push(
          '"' + nome + '" é a mesma pessoa que "' + vistos.get(chave) + '" (nome repetido).'
        );
        return;
      }
      vistos.set(chave, nome);
      participantes.push(nome);
    });

    if (participantes.length < MINIMO_PARTICIPANTES) {
      erros.push(
        "São necessários pelo menos " + MINIMO_PARTICIPANTES + " participantes para o sorteio."
      );
    }

    return { valido: erros.length === 0, erros: erros, participantes: participantes };
  }

  function inteiroAleatorio(max) {
    // Usa gerador criptográfico quando disponível (navegador e Node 19+).
    const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    if (c && typeof c.getRandomValues === "function") {
      const limite = Math.floor(0x100000000 / max) * max;
      const buf = new Uint32Array(1);
      do {
        c.getRandomValues(buf);
      } while (buf[0] >= limite);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function embaralhar(lista, aleatorio) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = aleatorio(i + 1);
      const tmp = copia[i];
      copia[i] = copia[j];
      copia[j] = tmp;
    }
    return copia;
  }

  /**
   * Confere um resultado: todos tiram exatamente uma pessoa,
   * todos são tirados exatamente uma vez e ninguém tira a si mesmo.
   */
  function verificarResultado(participantes, pares) {
    const problemas = [];
    const recebidos = new Set();

    participantes.forEach(function (p) {
      const amigo = pares[p];
      if (amigo === undefined) {
        problemas.push(p + " ficou sem amigo oculto.");
        return;
      }
      if (mesmaPessoa(p, amigo)) {
        problemas.push(p + " tirou a si mesmo.");
      }
      if (recebidos.has(normalizarNome(amigo))) {
        problemas.push(amigo + " foi sorteado mais de uma vez.");
      }
      recebidos.add(normalizarNome(amigo));
    });

    if (recebidos.size !== participantes.length) {
      problemas.push("Nem todos os participantes foram sorteados.");
    }

    return { valido: problemas.length === 0, problemas: problemas };
  }

  /**
   * Faz o sorteio. Retorna um objeto { [quemTira]: amigoOculto }.
   * Lança erro se a lista for inválida.
   *
   * Embaralha até obter uma permutação em que ninguém fica consigo mesmo
   * (todas as combinações válidas têm a mesma chance; em média ~2,7 tentativas).
   */
  function sortear(nomes, opcoes) {
    const aleatorio = (opcoes && opcoes.aleatorio) || inteiroAleatorio;
    const validacao = validarParticipantes(nomes);
    if (!validacao.valido) {
      throw new Error(validacao.erros.join(" "));
    }
    const participantes = validacao.participantes;

    let sorteados;
    do {
      sorteados = embaralhar(participantes, aleatorio);
    } while (
      sorteados.some(function (amigo, i) {
        return mesmaPessoa(amigo, participantes[i]);
      })
    );

    const pares = {};
    participantes.forEach(function (p, i) {
      pares[p] = sorteados[i];
    });

    // Checagem final de segurança antes de liberar o resultado.
    const verificacao = verificarResultado(participantes, pares);
    if (!verificacao.valido) {
      throw new Error("Sorteio inválido: " + verificacao.problemas.join(" "));
    }
    return pares;
  }

  /**
   * Gera o código que vai no link pessoal de cada participante.
   * O resultado fica na parte "#" do link, que o navegador não envia ao servidor.
   */
  function criarCodigo(quem, amigo) {
    const bytes = new TextEncoder().encode(JSON.stringify({ q: quem, a: amigo }));
    let binario = "";
    bytes.forEach(function (b) {
      binario += String.fromCharCode(b);
    });
    return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /** Lê um código de link pessoal. Retorna { quem, amigo } ou null se for inválido. */
  function lerCodigo(codigo) {
    try {
      const base64 = String(codigo).replace(/-/g, "+").replace(/_/g, "/");
      const binario = atob(base64);
      const bytes = Uint8Array.from(binario, function (c) {
        return c.charCodeAt(0);
      });
      const dados = JSON.parse(new TextDecoder().decode(bytes));
      if (typeof dados.q !== "string" || typeof dados.a !== "string") return null;
      if (mesmaPessoa(dados.q, dados.a)) return null;
      return { quem: dados.q, amigo: dados.a };
    } catch (e) {
      return null;
    }
  }

  return {
    MINIMO_PARTICIPANTES: MINIMO_PARTICIPANTES,
    criarCodigo: criarCodigo,
    lerCodigo: lerCodigo,
    normalizarNome: normalizarNome,
    mesmaPessoa: mesmaPessoa,
    validarParticipantes: validarParticipantes,
    verificarResultado: verificarResultado,
    sortear: sortear,
  };
});
