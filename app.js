(function () {
  "use strict";

  const CHAVE_STORAGE = "amigo-oculto";
  const $ = (id) => document.getElementById(id);

  let estado = carregar() || { participantes: [], pares: null, vistos: [] };

  function carregar() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_STORAGE));
    } catch (e) {
      return null;
    }
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
    } catch (e) {
      // Sem storage disponível: o app continua funcionando só nesta aba.
    }
  }

  function mostrarMensagem(texto) {
    const el = $("mensagem");
    el.textContent = texto;
    el.hidden = !texto;
  }

  function renderizarCadastro() {
    const lista = $("lista-participantes");
    lista.replaceChildren();
    estado.participantes.forEach((nome, i) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = nome;
      const remover = document.createElement("button");
      remover.textContent = "✕";
      remover.title = "Remover " + nome;
      remover.className = "remover";
      remover.addEventListener("click", () => {
        estado.participantes.splice(i, 1);
        salvar();
        mostrarMensagem("");
        renderizarCadastro();
      });
      li.append(span, remover);
      lista.append(li);
    });
    $("botao-sortear").disabled = estado.participantes.length < Sorteio.MINIMO_PARTICIPANTES;
  }

  function renderizarRevelacao() {
    const selecao = $("selecao-pessoa");
    selecao.replaceChildren();
    Object.keys(estado.pares).forEach((nome) => {
      const opt = document.createElement("option");
      opt.value = nome;
      opt.textContent = estado.vistos.includes(nome) ? nome + " ✓ (já viu)" : nome;
      selecao.append(opt);
    });
    const total = Object.keys(estado.pares).length;
    $("progresso").textContent = estado.vistos.length + " de " + total + " já viram seu amigo oculto.";
  }

  function linkPessoal(quem) {
    const base = location.href.split("#")[0];
    return base + "#c=" + Sorteio.criarCodigo(quem, estado.pares[quem]);
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      window.prompt("Copie o link:", texto);
      return false;
    }
  }

  function renderizarLinks() {
    const lista = $("lista-links");
    lista.replaceChildren();
    Object.keys(estado.pares).forEach((quem) => {
      const link = linkPessoal(quem);
      const li = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = quem;

      const acoes = document.createElement("span");
      acoes.className = "acoes";
      const botaoCopiar = document.createElement("button");
      botaoCopiar.textContent = "Copiar link";
      botaoCopiar.addEventListener("click", async () => {
        if (await copiar(link)) $("aviso-copiado").textContent = "Link de " + quem + " copiado!";
      });
      const whatsapp = document.createElement("a");
      whatsapp.className = "botao";
      whatsapp.textContent = "WhatsApp";
      whatsapp.target = "_blank";
      whatsapp.rel = "noopener";
      whatsapp.href =
        "https://wa.me/?text=" +
        encodeURIComponent("🎁 " + quem + ", veja quem você tirou no amigo oculto: " + link);
      acoes.append(botaoCopiar, whatsapp);

      li.append(nome, acoes);
      lista.append(li);
    });
  }

  /** Quem abre um link pessoal vê só o próprio resultado, sem tocar no sorteio salvo. */
  function abrirConvite(codigo) {
    const dados = Sorteio.lerCodigo(codigo);
    $("tela-cadastro").hidden = true;
    $("tela-revelacao").hidden = true;
    if (!dados) {
      $("tela-convite-invalido").hidden = false;
      return;
    }
    $("convite-quem").textContent = dados.quem;
    $("convite-amigo").textContent = dados.amigo;
    $("tela-convite").hidden = false;
    $("botao-revelar-convite").addEventListener("click", () => {
      $("cartao-convite").hidden = false;
      $("botao-revelar-convite").hidden = true;
    });
  }

  function mostrarTela() {
    const sorteado = !!estado.pares;
    $("tela-cadastro").hidden = sorteado;
    $("tela-revelacao").hidden = !sorteado;
    $("cartao").hidden = true;
    if (sorteado) {
      renderizarLinks();
      renderizarRevelacao();
    } else {
      renderizarCadastro();
    }
  }

  $("form-participante").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const campo = $("campo-nome");
    const nome = campo.value.replace(/\s+/g, " ").trim();
    if (!nome) return;

    const existente = estado.participantes.find((p) => Sorteio.mesmaPessoa(p, nome));
    if (existente) {
      mostrarMensagem('"' + nome + '" já está na lista como "' + existente + '".');
      return;
    }
    estado.participantes.push(nome);
    salvar();
    mostrarMensagem("");
    campo.value = "";
    campo.focus();
    renderizarCadastro();
  });

  $("botao-sortear").addEventListener("click", () => {
    try {
      estado.pares = Sorteio.sortear(estado.participantes);
      estado.vistos = [];
      salvar();
      mostrarMensagem("");
      mostrarTela();
    } catch (e) {
      mostrarMensagem(e.message);
    }
  });

  $("botao-revelar").addEventListener("click", () => {
    const quem = $("selecao-pessoa").value;
    if (!quem) return;
    if (estado.vistos.includes(quem) && !confirm(quem + " já viu o amigo oculto. Mostrar de novo?")) {
      return;
    }
    $("cartao-quem").textContent = quem;
    $("cartao-amigo").textContent = estado.pares[quem];
    $("cartao").hidden = false;
    if (!estado.vistos.includes(quem)) {
      estado.vistos.push(quem);
      salvar();
    }
  });

  $("botao-esconder").addEventListener("click", () => {
    $("cartao").hidden = true;
    renderizarRevelacao();
  });

  $("botao-novo").addEventListener("click", () => {
    if (!confirm("Descartar este sorteio e voltar à lista de participantes?")) return;
    estado.pares = null;
    estado.vistos = [];
    salvar();
    mostrarTela();
  });

  const convite = location.hash.match(/^#c=(.+)$/);
  if (convite) abrirConvite(convite[1]);
  else mostrarTela();
})();
