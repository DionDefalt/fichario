// Lista de Compras — barra de navegação inferior e menu "Mais".
// Usa funções do script.js (abrirModalCategorias), que é carregado antes.

(function () {
  const navLista = document.getElementById("nav-lista");
  const navCategorias = document.getElementById("nav-categorias");
  const navMais = document.getElementById("nav-mais");
  const modalMais = document.getElementById("modal-mais");
  const botaoFecharMais = document.getElementById("botao-fechar-mais");
  const textoUsuario = document.getElementById("mais-usuario");
  const botaoCompartilharMenu = document.getElementById("botao-compartilhar");
  const botaoPrimeiro = document.getElementById("botao-primeiro-item");
  const campoItem = document.getElementById("input-item");

  function abrirMais() {
    const usuario = window.usuarioAtual;
    textoUsuario.textContent = usuario && usuario.email ? `Conectado como ${usuario.email}` : "";
    modalMais.hidden = false;
  }

  function fecharMais() {
    modalMais.hidden = true;
  }

  // "Lista" é a tela atual: o toque só volta ao topo.
  navLista.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  navCategorias.addEventListener("click", () => abrirModalCategorias());
  navMais.addEventListener("click", abrirMais);
  botaoFecharMais.addEventListener("click", fecharMais);

  // Toque fora da caixa (no fundo escurecido) fecha o menu.
  modalMais.addEventListener("click", (e) => {
    if (e.target === modalMais) fecharMais();
  });

  // O script.js já liga este botão a "compartilhar"; aqui só fechamos o menu.
  botaoCompartilharMenu.addEventListener("click", fecharMais);

  // Atalho do estado vazio: leva o cursor ao campo de adicionar.
  botaoPrimeiro.addEventListener("click", () => campoItem.focus());
})();
