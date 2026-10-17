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

  function mostrarTela() {
    const sorteado = !!estado.pares;
    $("tela-cadastro").hidden = sorteado;
    $("tela-revelacao").hidden = !sorteado;
    $("cartao").hidden = true;
    if (sorteado) renderizarRevelacao();
    else renderizarCadastro();
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

  mostrarTela();
})();
