// Lista de Compras — persistência local via localStorage, sem backend.

const CHAVE_STORAGE = "lista-compras-itens";
const NOMES_CATEGORIA = {
  hortifruti: "Hortifruti",
  laticinios: "Laticínios",
  limpeza: "Limpeza",
  higiene: "Higiene",
  outros: "Outros",
};

const lista = document.getElementById("lista");
const mensagemVazia = document.getElementById("mensagem-vazia");
const form = document.getElementById("form-adicionar");
const inputItem = document.getElementById("input-item");
const selectCategoria = document.getElementById("select-categoria");
const qtdValorEl = document.getElementById("qtd-valor");
const qtdMenosBtn = document.getElementById("qtd-menos");
const qtdMaisBtn = document.getElementById("qtd-mais");
const filtrosContainer = document.getElementById("filtros");
const botaoLimpar = document.getElementById("botao-limpar");
const progressoTexto = document.getElementById("progresso-texto");
const progressoPreenchido = document.getElementById("progresso-preenchido");

let itens = carregarItens();
let quantidadeAtual = 1;
let filtroAtivo = "todos";

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

function renderizar() {
  const itensFiltrados =
    filtroAtivo === "todos"
      ? itens
      : itens.filter((item) => item.categoria === filtroAtivo);

  lista.innerHTML = "";

  if (itensFiltrados.length === 0) {
    mensagemVazia.style.display = "block";
    mensagemVazia.textContent =
      itens.length === 0
        ? "Sua lista está vazia. Adicione o primeiro item abaixo! 👇"
        : "Nenhum item nessa categoria.";
  } else {
    mensagemVazia.style.display = "none";
  }

  itensFiltrados.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item" + (item.comprado ? " comprado" : "");
    li.dataset.categoria = item.categoria;

    li.innerHTML = `
      <button class="item-checkbox" aria-label="Marcar como comprado">✓</button>
      <div class="item-info">
        <div class="item-nome">${escaparHTML(item.nome)}</div>
        <span class="item-qtd">${item.quantidade}x</span>
      </div>
      <button class="item-excluir" aria-label="Excluir item">✕</button>
    `;

    li.querySelector(".item-checkbox").addEventListener("click", () => {
      alternarComprado(item.id);
    });
    li.querySelector(".item-excluir").addEventListener("click", () => {
      excluirItem(item.id);
    });

    lista.appendChild(li);
  });

  atualizarProgresso();
  atualizarBotaoLimpar();
}

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

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
  salvarItens();
  renderizar();
}

function limparComprados() {
  itens = itens.filter((i) => !i.comprado);
  salvarItens();
  renderizar();
}

// --- Eventos ---

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = inputItem.value.trim();
  if (!nome) return;

  adicionarItem(nome, selectCategoria.value, quantidadeAtual);

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
  // deixa o formulário de adicionar pronto nessa mesma categoria, e
  // coloca o foco no campo de texto — economiza o usuário ter que
  // trocar o seletor de categoria manualmente lá embaixo depois.
  if (filtroAtivo !== "todos") {
    selectCategoria.value = filtroAtivo;
    inputItem.focus();
  }
});

botaoLimpar.addEventListener("click", limparComprados);

// --- Inicialização ---
renderizar();
