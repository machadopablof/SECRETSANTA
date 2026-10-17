const test = require("node:test");
const assert = require("node:assert/strict");
const Sorteio = require("../sorteio.js");

test("ninguém tira a si mesmo (10.000 sorteios)", () => {
  const nomes = ["Ana", "Bruno", "Carla", "Diego", "Eva"];
  for (let i = 0; i < 10000; i++) {
    const pares = Sorteio.sortear(nomes);
    for (const p of nomes) {
      assert.notEqual(pares[p], p);
    }
    assert.ok(Sorteio.verificarResultado(nomes, pares).valido);
  }
});

test("todos tiram alguém e todos são tirados uma única vez", () => {
  const nomes = ["Ana", "Bruno", "Carla", "Diego"];
  const pares = Sorteio.sortear(nomes);
  assert.deepEqual(Object.keys(pares).sort(), [...nomes].sort());
  assert.deepEqual(Object.values(pares).sort(), [...nomes].sort());
});

test("todas as combinações válidas aparecem (3 pessoas → 2 combinações)", () => {
  const vistos = new Set();
  for (let i = 0; i < 200; i++) {
    vistos.add(JSON.stringify(Sorteio.sortear(["A", "B", "C"])));
  }
  assert.equal(vistos.size, 2);
});

test("reconhece a mesma pessoa com grafias diferentes", () => {
  assert.ok(Sorteio.mesmaPessoa("João Silva", "  joao   SILVA "));
  assert.ok(!Sorteio.mesmaPessoa("João", "Joana"));

  const r = Sorteio.validarParticipantes(["João", "Maria", "joão", "Pedro"]);
  assert.equal(r.valido, false);
  assert.match(r.erros[0], /mesma pessoa/);
  assert.throws(() => Sorteio.sortear(["João", "Maria", "JOAO", "Pedro"]), /mesma pessoa/);
});

test("exige número mínimo de participantes e ignora linhas vazias", () => {
  assert.throws(() => Sorteio.sortear(["Ana", "Bruno"]), /pelo menos 3/);
  assert.throws(() => Sorteio.sortear(["Ana", "", "   ", "Bruno"]), /pelo menos 3/);
});

test("verificarResultado detecta autossorteio e repetições", () => {
  const nomes = ["Ana", "Bruno", "Carla"];
  const r1 = Sorteio.verificarResultado(nomes, { Ana: "Ana", Bruno: "Carla", Carla: "Bruno" });
  assert.equal(r1.valido, false);
  assert.match(r1.problemas.join(), /a si mesmo/);

  const r2 = Sorteio.verificarResultado(nomes, { Ana: "Bruno", Bruno: "Ana", Carla: "Ana" });
  assert.equal(r2.valido, false);
  assert.match(r2.problemas.join(), /mais de uma vez/);
});

test("link pessoal: código ida e volta, com acentos", () => {
  const codigo = Sorteio.criarCodigo("João", "Márcia Ção");
  assert.match(codigo, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(Sorteio.lerCodigo(codigo), { quem: "João", amigo: "Márcia Ção" });
});

test("link pessoal: código inválido ou de autossorteio é recusado", () => {
  assert.equal(Sorteio.lerCodigo("lixo!!"), null);
  assert.equal(Sorteio.lerCodigo(""), null);
  assert.equal(Sorteio.lerCodigo(Sorteio.criarCodigo("Ana", "ana")), null);
});
