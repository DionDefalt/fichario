// Lista de Compras — persistência local via localStorage, sem backend.

const CHAVE_STORAGE = "lista-compras-itens";
const CHAVE_TEMA = "lista-compras-tema";

const NOMES_CATEGORIA = {
  hortifruti: "Hortifruti",
  laticinios: "Laticínios",
  limpeza: "Limpeza",
  higiene: "Higiene",
  outros: "Outros",
};

const EMOJI_CATEGORIA = {
  hortifruti: "🥦",
  laticinios: "🧀",
  limpeza: "🧽",
  higiene: "🧴",
  outros: "📦",
};

// Ordem em que as categorias aparecem quando a lista está agrupada
// (visão "Todos") — mesma ordem dos chips de filtro.
const ORDEM_CATEGORIAS = ["hortifruti", "laticinios", "limpeza", "higiene", "outros"];

const lista = document.getElementById("lista");
const mensagemVazia = document.getElementById("mensagem-vazia");
const form = document.getElementById("form-adicionar");
const inputItem = document.getElementById("input-item");
const inputBusca = document.getElementById("input-busca");
const qtdValorEl = document.getElementById("qtd-valor");
const qtdMenosBtn = document.getElementById("qtd-menos");
const qtdMaisBtn = document.getElementById("qtd-mais");
const filtrosContainer = document.getElementById("filtros");
const botaoLimpar = document.getElementById("botao-limpar");
const botaoCompartilhar = document.getElementById("botao-compartilhar");
const botaoTema = document.getElementById("botao-tema");
const progressoTexto = document.getElementById("progresso-texto");
const progressoPreenchido = document.getElementById("progresso-preenchido");

let itens = carregarItens();
let quantidadeAtual = 1;
let filtroAtivo = "todos";
let termoBusca = "";
let itemEmEdicaoId = null;

function carregarItens() {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    return salvo ? JSON.parse(salvo) : [];
  } catch (erro) {
    console.error("Não foi possível carregar a lista salva:", erro);
    return [];
  }
}

function salvarItens() {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// --- Filtro + busca ---

function itensVisiveis() {
  let resultado =
    filtroAtivo === "todos"
      ? itens
      : itens.filter((item) => item.categoria === filtroAtivo);

  if (termoBusca.trim()) {
    const termo = termoBusca.trim().toLowerCase();
    resultado = resultado.filter((item) => item.nome.toLowerCase().includes(termo));
  }

  return resultado;
}

// --- Renderização ---

function renderizar() {
  const itensFiltrados = itensVisiveis();

  lista.innerHTML = "";

  if (itensFiltrados.length === 0) {
    mensagemVazia.style.display = "block";
    mensagemVazia.textContent = mensagemParaListaVazia();
  } else {
    mensagemVazia.style.display = "none";

    if (filtroAtivo === "todos" && !termoBusca.trim()) {
      renderizarAgrupadoPorCategoria(itensFiltrados);
    } else {
      itensFiltrados.forEach((item) => lista.appendChild(criarElementoItem(item)));
    }
  }

  atualizarProgresso();
  atualizarBotaoLimpar();
  atualizarBotaoCompartilhar();
}

function mensagemParaListaVazia() {
  if (itens.length === 0) return "Sua lista está vazia. Adicione o primeiro item abaixo! 👇";
  if (termoBusca.trim()) return `Nenhum item encontrado para "${termoBusca}".`;
  return "Nenhum item nessa categoria.";
}

function renderizarAgrupadoPorCategoria(itensFiltrados) {
  // Na visão "Todos" (sem busca ativa), agrupa por categoria com um
  // pequeno cabeçalho — mais fácil de escanear visualmente que uma
  // lista só cronológica quando há itens de vários tipos misturados.
  ORDEM_CATEGORIAS.forEach((categoria) => {
    const doGrupo = itensFiltrados.filter((item) => item.categoria === categoria);
    if (doGrupo.length === 0) return;

    const cabecalho = document.createElement("li");
    cabecalho.className = "grupo-cabecalho";
    cabecalho.textContent = `${EMOJI_CATEGORIA[categoria]} ${NOMES_CATEGORIA[categoria]}`;
    lista.appendChild(cabecalho);

    doGrupo.forEach((item) => lista.appendChild(criarElementoItem(item)));
  });
}

function criarElementoItem(item) {
  if (item.id === itemEmEdicaoId) {
    return criarFormularioEdicao(item);
  }

  const li = document.createElement("li");
  li.className = "item" + (item.comprado ? " comprado" : "");
  li.dataset.categoria = item.categoria;

  li.innerHTML = `
    <button class="item-checkbox" aria-label="Marcar como comprado">✓</button>
    <div class="item-info">
      <div class="item-nome">${escaparHTML(item.nome)}</div>
      <span class="item-qtd">${item.quantidade}x</span>
    </div>
    <button class="item-editar" aria-label="Editar item">✏️</button>
    <button class="item-excluir" aria-label="Excluir item">✕</button>
  `;

  li.querySelector(".item-checkbox").addEventListener("click", () => {
    alternarComprado(item.id);
  });
  li.querySelector(".item-editar").addEventListener("click", () => {
    itemEmEdicaoId = item.id;
    renderizar();
  });
  li.querySelector(".item-excluir").addEventListener("click", () => {
    excluirItem(item.id);
  });

  return li;
}

function criarFormularioEdicao(item) {
  const li = document.createElement("li");
  li.className = "item item-em-edicao";

  const opcoesCategoria = ORDEM_CATEGORIAS.map(
    (cat) =>
      `<option value="${cat}" ${cat === item.categoria ? "selected" : ""}>${EMOJI_CATEGORIA[cat]} ${NOMES_CATEGORIA[cat]}</option>`
  ).join("");

  li.innerHTML = `
    <input type="text" class="edicao-nome" value="${escaparHTML(item.nome)}" />
    <select class="edicao-categoria">${opcoesCategoria}</select>
    <div class="edicao-stepper">
      <button type="button" class="edicao-qtd-menos" aria-label="Diminuir">−</button>
      <span class="edicao-qtd-valor">${item.quantidade}</span>
      <button type="button" class="edicao-qtd-mais" aria-label="Aumentar">+</button>
    </div>
    <button class="edicao-salvar" aria-label="Salvar">💾</button>
    <button class="edicao-cancelar" aria-label="Cancelar">✕</button>
  `;

  let qtdEdicao = item.quantidade;
  const qtdValorSpan = li.querySelector(".edicao-qtd-valor");

  li.querySelector(".edicao-qtd-menos").addEventListener("click", () => {
    if (qtdEdicao > 1) {
      qtdEdicao -= 1;
      qtdValorSpan.textContent = qtdEdicao;
    }
  });
  li.querySelector(".edicao-qtd-mais").addEventListener("click", () => {
    if (qtdEdicao < 99) {
      qtdEdicao += 1;
      qtdValorSpan.textContent = qtdEdicao;
    }
  });

  li.querySelector(".edicao-salvar").addEventListener("click", () => {
    const novoNome = li.querySelector(".edicao-nome").value.trim();
    const novaCategoria = li.querySelector(".edicao-categoria").value;
    if (!novoNome) return;

    editarItem(item.id, { nome: novoNome, categoria: novaCategoria, quantidade: qtdEdicao });
    itemEmEdicaoId = null;
    renderizar();
  });

  li.querySelector(".edicao-cancelar").addEventListener("click", () => {
    itemEmEdicaoId = null;
    renderizar();
  });

  return li;
}

// --- Progresso / botões auxiliares ---

function atualizarProgresso() {
  const total = itens.length;
  const comprados = itens.filter((i) => i.comprado).length;
  progressoTexto.textContent = `${comprados} de ${total} comprado${total === 1 ? "" : "s"}`;
  const percentual = total === 0 ? 0 : Math.round((comprados / total) * 100);
  progressoPreenchido.style.width = `${percentual}%`;
}

function atualizarBotaoLimpar() {
  const temComprados = itens.some((i) => i.comprado);
  botaoLimpar.hidden = !temComprados;
}

function atualizarBotaoCompartilhar() {
  botaoCompartilhar.hidden = itens.length === 0;
}

// --- Operações sobre os itens ---

function adicionarItem(nome, categoria, quantidade) {
  itens.unshift({
    id: gerarId(),
    nome: nome.trim(),
    categoria,
    quantidade,
    comprado: false,
  });
  salvarItens();
  renderizar();
}

function editarItem(id, dadosNovos) {
  const item = itens.find((i) => i.id === id);
  if (item) {
    item.nome = dadosNovos.nome;
    item.categoria = dadosNovos.categoria;
    item.quantidade = dadosNovos.quantidade;
    salvarItens();
  }
}

function alternarComprado(id) {
  const item = itens.find((i) => i.id === id);
  if (item) {
    item.comprado = !item.comprado;
    salvarItens();
    renderizar();
  }
}

function excluirItem(id) {
  itens = itens.filter((i) => i.id !== id);
  if (itemEmEdicaoId === id) itemEmEdicaoId = null;
  salvarItens();
  renderizar();
}

function limparComprados() {
  itens = itens.filter((i) => !i.comprado);
  salvarItens();
  renderizar();
}

// --- Categoria de destino do formulário de adicionar ---

function categoriaParaAdicionar() {
  // "Todos" não é uma categoria de verdade — nesse caso, novos itens
  // caem em "Outros" por padrão. Qualquer categoria específica tocada
  // nos filtros vira o destino do próximo item adicionado.
  return filtroAtivo === "todos" ? "outros" : filtroAtivo;
}

function atualizarPlaceholder() {
  const nomeCategoria = NOMES_CATEGORIA[categoriaParaAdicionar()];
  inputItem.placeholder = `Adicionar em ${nomeCategoria}...`;
}

// --- Modo escuro ---

function aplicarTema(tema) {
  document.body.classList.toggle("tema-escuro", tema === "escuro");
  botaoTema.textContent = tema === "escuro" ? "☀️" : "🌙";
  localStorage.setItem(CHAVE_TEMA, tema);
}

function temaInicial() {
  const salvo = localStorage.getItem(CHAVE_TEMA);
  if (salvo) return salvo;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}

// --- Exportar / compartilhar ---

function montarTextoDaLista() {
  const linhas = ["🧺 Lista de Compras", ""];

  ORDEM_CATEGORIAS.forEach((categoria) => {
    const doGrupo = itens.filter((item) => item.categoria === categoria);
    if (doGrupo.length === 0) return;

    linhas.push(`${EMOJI_CATEGORIA[categoria]} ${NOMES_CATEGORIA[categoria]}`);
    doGrupo.forEach((item) => {
      const marcador = item.comprado ? "☑" : "☐";
      linhas.push(`${marcador} ${item.nome} (${item.quantidade}x)`);
    });
    linhas.push("");
  });

  return linhas.join("\n").trim();
}

async function compartilharLista() {
  const texto = montarTextoDaLista();

  if (navigator.share) {
    try {
      await navigator.share({ title: "Lista de Compras", text: texto });
      return;
    } catch (erro) {
      // Usuário cancelou o compartilhamento — não é um erro real, só ignora.
      if (erro.name === "AbortError") return;
    }
  }

  // Navegador sem suporte a Web Share (a maioria dos desktops): abre
  // o WhatsApp Web/app já com o texto pronto, como alternativa gratuita.
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// --- Eventos ---

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = inputItem.value.trim();
  if (!nome) return;

  adicionarItem(nome, categoriaParaAdicionar(), quantidadeAtual);

  inputItem.value = "";
  quantidadeAtual = 1;
  qtdValorEl.textContent = "1";
  inputItem.focus();
});

qtdMenosBtn.addEventListener("click", () => {
  if (quantidadeAtual > 1) {
    quantidadeAtual -= 1;
    qtdValorEl.textContent = quantidadeAtual;
  }
});

qtdMaisBtn.addEventListener("click", () => {
  if (quantidadeAtual < 99) {
    quantidadeAtual += 1;
    qtdValorEl.textContent = quantidadeAtual;
  }
});

filtrosContainer.addEventListener("click", (e) => {
  const botao = e.target.closest(".filtro");
  if (!botao) return;

  filtrosContainer
    .querySelectorAll(".filtro")
    .forEach((b) => b.classList.remove("filtro-ativo"));
  botao.classList.add("filtro-ativo");
  filtroAtivo = botao.dataset.categoria;
  renderizar();

  // Melhoria de usabilidade: tocar num filtro (ex: "Hortifruti") já
  // deixa claro, pelo texto do campo, em qual categoria o próximo item
  // digitado vai cair — sem precisar de um seletor separado.
  atualizarPlaceholder();
  if (filtroAtivo !== "todos") {
    inputItem.focus();
  }
});

inputBusca.addEventListener("input", () => {
  termoBusca = inputBusca.value;
  renderizar();
});

botaoLimpar.addEventListener("click", limparComprados);
botaoCompartilhar.addEventListener("click", compartilharLista);
botaoTema.addEventListener("click", () => {
  const temaAtual = document.body.classList.contains("tema-escuro") ? "escuro" : "claro";
  aplicarTema(temaAtual === "escuro" ? "claro" : "escuro");
});

// --- Inicialização ---
aplicarTema(temaInicial());
atualizarPlaceholder();
renderizar();
