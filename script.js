// Lista de Compras — persistência local via localStorage, sem backend.

const CHAVE_STORAGE = "lista-compras-itens";
const CHAVE_TEMA = "lista-compras-tema";
const CHAVE_CATEGORIAS = "lista-compras-categorias";

// Sugestões de categoria oferecidas no painel "+ Categoria". O usuário
// escolhe quais quer usar — nenhuma vem pré-ativada por padrão (exceto
// "Outros", que é um destino interno sempre disponível, não removível,
// usado quando nenhuma categoria específica foi escolhida ainda).
const SUGESTOES_CATEGORIA = [
  { id: "mercado", nome: "Mercado", emoji: "🛒" },
  { id: "farmacia", nome: "Farmácia", emoji: "💊" },
  { id: "oficina", nome: "Oficina", emoji: "🔧" },
  { id: "padaria", nome: "Padaria", emoji: "🥖" },
  { id: "fastfood", nome: "Fastfood", emoji: "🍔" },
  { id: "guloseimas", nome: "Guloseimas", emoji: "🍬" },
  { id: "sobremesas", nome: "Sobremesas", emoji: "🍰" },
  { id: "vestuario", nome: "Vestuário", emoji: "👕" },
  { id: "calcados", nome: "Calçados", emoji: "👟" },
  { id: "papelaria", nome: "Papelaria", emoji: "📚" },
  { id: "eletronicos", nome: "Eletrônicos", emoji: "💻" },
  { id: "hortifruti", nome: "Hortifruti", emoji: "🥦" },
  { id: "laticinios", nome: "Laticínios", emoji: "🧀" },
  { id: "limpeza", nome: "Limpeza", emoji: "🧽" },
  { id: "higiene", nome: "Higiene", emoji: "🧴" },
  { id: "bebidas", nome: "Bebidas", emoji: "🥤" },
  { id: "pet", nome: "Pet", emoji: "🐾" },
  { id: "brinquedos", nome: "Brinquedos", emoji: "🧸" },
  { id: "ferramentas", nome: "Ferramentas", emoji: "🔨" },
  { id: "presentes", nome: "Presentes", emoji: "🎁" },
  { id: "moveis", nome: "Móveis", emoji: "🛋️" },
  { id: "livros", nome: "Livros", emoji: "📖" },
  { id: "automotivo", nome: "Automotivo", emoji: "🚗" },
  { id: "jardinagem", nome: "Jardinagem", emoji: "🌱" },
  { id: "congelados", nome: "Congelados", emoji: "🧊" },
];

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
let categoriasAtivas = carregarCategorias();
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
  // Avisa outros módulos (ex: proximidade.js) que a lista mudou, para
  // que possam recalcular o que depende dela (quais lojas buscar, etc.)
  document.dispatchEvent(new Event("lista-compras-atualizada"));
}

function carregarCategorias() {
  try {
    const salvo = localStorage.getItem(CHAVE_CATEGORIAS);
    return salvo ? JSON.parse(salvo) : [];
  } catch (erro) {
    console.error("Não foi possível carregar as categorias salvas:", erro);
    return [];
  }
}

function salvarCategorias() {
  localStorage.setItem(CHAVE_CATEGORIAS, JSON.stringify(categoriasAtivas));
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// --- Categorias (nome/emoji por id, incluindo o fallback "Outros") ---

function nomeCategoria(id) {
  if (id === "outros") return "Outros";
  const cat = categoriasAtivas.find((c) => c.id === id);
  return cat ? cat.nome : "Outros";
}

function emojiCategoria(id) {
  if (id === "outros") return "📦";
  const cat = categoriasAtivas.find((c) => c.id === id);
  return cat ? cat.emoji : "📦";
}

function ordemCategorias() {
  // "Outros" sempre por último, como destino residual — nunca aparece
  // como chip removível, só como grupo na listagem se tiver itens nela.
  return [...categoriasAtivas.map((c) => c.id), "outros"];
}

// Usado pelo comando de voz: se a categoria detectada pela IA de
// palavras-chave ainda não estiver ativa, adiciona ela automaticamente
// (usando a sugestão correspondente, se existir) — evita que o item
// fique "escondido" numa categoria sem chip visível na tela.
function garantirCategoriaExiste(id) {
  if (id === "outros" || categoriasAtivas.some((c) => c.id === id)) return id;
  const sugestao = SUGESTOES_CATEGORIA.find((s) => s.id === id);
  if (sugestao) {
    adicionarCategoria(sugestao);
    return id;
  }
  return "outros";
}

function adicionarCategoria(sugestao) {
  categoriasAtivas.push({ id: sugestao.id, nome: sugestao.nome, emoji: sugestao.emoji });
  salvarCategorias();
  renderizarFiltros();
}

// --- Modal "Categorias" (catálogo com toque para ativar/desativar) ---

const modalCategorias = document.getElementById("modal-categorias");
const catalogoCategorias = document.getElementById("catalogo-categorias");
const botaoFecharCategorias = document.getElementById("botao-fechar-categorias");

function abrirModalCategorias() {
  renderizarCatalogoCategorias();
  modalCategorias.hidden = false;
}

function fecharModalCategorias() {
  modalCategorias.hidden = true;
}

function renderizarCatalogoCategorias() {
  catalogoCategorias.innerHTML = "";

  SUGESTOES_CATEGORIA.forEach((sugestao) => {
    const ativa = categoriasAtivas.some((c) => c.id === sugestao.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "catalogo-item" + (ativa ? " catalogo-item-ativo" : "");
    btn.innerHTML = `${sugestao.emoji} ${sugestao.nome}`;
    btn.addEventListener("click", () => {
      if (ativa) {
        desativarCategoria(sugestao.id);
      } else {
        adicionarCategoria(sugestao);
      }
      renderizarCatalogoCategorias();
      renderizarFiltros();
      atualizarPlaceholder();
      renderizar();
    });
    catalogoCategorias.appendChild(btn);
  });
}

function desativarCategoria(id) {
  // Diferente de uma exclusão permanente: é só "desmarcar" no catálogo.
  // Os itens que já estavam nessa categoria vão para "Outros", e o
  // usuário pode reativar a categoria no catálogo quando quiser.
  categoriasAtivas = categoriasAtivas.filter((c) => c.id !== id);
  itens.forEach((item) => {
    if (item.categoria === id) item.categoria = "outros";
  });
  salvarCategorias();
  salvarItens();
  if (filtroAtivo === id) filtroAtivo = "todos";
}

// --- Filtros (chips), renderizados dinamicamente ---

function renderizarFiltros() {
  filtrosContainer.innerHTML = "";
  filtrosContainer.appendChild(criarChipFiltro("todos", "Todos"));

  categoriasAtivas.forEach((cat) => {
    filtrosContainer.appendChild(criarChipFiltro(cat.id, `${cat.emoji} ${cat.nome}`));
  });

  const botaoAdicionar = document.createElement("button");
  botaoAdicionar.type = "button";
  botaoAdicionar.className = "filtro filtro-adicionar";
  botaoAdicionar.textContent = "+ Categoria";
  botaoAdicionar.addEventListener("click", abrirModalCategorias);
  filtrosContainer.appendChild(botaoAdicionar);
}

function criarChipFiltro(id, rotulo) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "filtro" + (filtroAtivo === id ? " filtro-ativo" : "");
  btn.dataset.categoria = id;
  btn.textContent = rotulo;
  btn.addEventListener("click", () => selecionarFiltro(id));
  return btn;
}

function selecionarFiltro(id) {
  filtroAtivo = id;
  renderizarFiltros();
  atualizarPlaceholder();
  renderizar();
  if (id !== "todos") inputItem.focus();
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

// --- Renderização da lista ---

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
  ordemCategorias().forEach((categoria) => {
    const doGrupo = itensFiltrados.filter((item) => item.categoria === categoria);
    if (doGrupo.length === 0) return;

    const cabecalho = document.createElement("li");
    cabecalho.className = "grupo-cabecalho";
    cabecalho.textContent = `${emojiCategoria(categoria)} ${nomeCategoria(categoria)}`;
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

  const opcoesCategoria = ordemCategorias()
    .map(
      (cat) =>
        `<option value="${cat}" ${cat === item.categoria ? "selected" : ""}>${emojiCategoria(cat)} ${nomeCategoria(cat)}</option>`
    )
    .join("");

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
  return filtroAtivo === "todos" ? "outros" : filtroAtivo;
}

function atualizarPlaceholder() {
  inputItem.placeholder = `Adicionar em ${nomeCategoria(categoriaParaAdicionar())}...`;
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

  ordemCategorias().forEach((categoria) => {
    const doGrupo = itens.filter((item) => item.categoria === categoria);
    if (doGrupo.length === 0) return;

    linhas.push(`${emojiCategoria(categoria)} ${nomeCategoria(categoria)}`);
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
      if (erro.name === "AbortError") return;
    }
  }

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

// Fecha o modal de categorias no X ou tocando fora da caixa (no fundo escurecido).
botaoFecharCategorias.addEventListener("click", fecharModalCategorias);
modalCategorias.addEventListener("click", (e) => {
  if (e.target === modalCategorias) fecharModalCategorias();
});

// --- Inicialização ---
aplicarTema(temaInicial());
renderizarFiltros();
atualizarPlaceholder();
renderizar();
