// Adicionar itens por comando de voz — usa a Web Speech API do
// navegador (gratuita, sem chave), reconhece frases como "adicionar
// leite à lista" e categoriza o item automaticamente por palavra-chave.
//
// LIMITAÇÃO REAL: reconhecimento de fala funciona bem no Chrome
// (desktop e Android), mas o Safari/iPhone tem suporte muito limitado
// ou inexistente — nesse caso, o botão de voz é escondido, em vez de
// aparecer e falhar sem explicação.

const botaoVoz = document.getElementById("botao-voz");

// Dicionário de categorização — mesma filosofia do CATEGORIAS do
// Organizador de Arquivos: fácil de estender, só adicionar palavras
// novas na lista certa.
const PALAVRAS_POR_CATEGORIA = {
  hortifruti: [
    "maçã", "maca", "banana", "laranja", "alface", "tomate", "cebola",
    "batata", "cenoura", "uva", "limão", "limao", "mamão", "mamao",
    "manga", "abacate", "pepino", "pimentão", "pimentao", "brócolis",
    "brocolis", "morango", "melancia", "abóbora", "abobora", "couve",
  ],
  laticinios: [
    "leite", "queijo", "iogurte", "manteiga", "requeijão", "requeijao",
    "nata", "creme de leite", "margarina", "coalhada",
  ],
  limpeza: [
    "detergente", "sabão em pó", "sabao em po", "desinfetante",
    "água sanitária", "agua sanitaria", "amaciante", "esponja",
    "saco de lixo", "papel toalha", "veja", "multiuso", "vassoura",
  ],
  higiene: [
    "sabonete", "shampoo", "condicionador", "pasta de dente",
    "creme dental", "escova de dente", "papel higiênico",
    "papel higienico", "absorvente", "desodorante", "fio dental",
  ],
};

function classificarItem(nome) {
  const nomeLower = nome.toLowerCase();
  for (const [categoria, palavras] of Object.entries(PALAVRAS_POR_CATEGORIA)) {
    if (palavras.some((palavra) => nomeLower.includes(palavra))) {
      return categoria;
    }
  }
  return "outros";
}

function extrairNomeDoComando(transcricao) {
  let texto = transcricao.toLowerCase().trim();

  // Remove prefixos comuns de comando
  texto = texto.replace(/^(adicionar|coloca|colocar|por|põe|poe|inclui|incluir)\s+/i, "");

  // Remove sufixos comuns ("à lista", "na lista de compras", etc.)
  texto = texto.replace(/\s+(à|a|na|para a|pra)\s+lista(\s+de\s+compras)?\s*$/i, "");

  return texto.trim();
}

function iniciarReconhecimentoDeVoz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const reconhecimento = new SpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  botaoVoz.classList.add("botao-voz-ouvindo");
  botaoVoz.textContent = "🔴";

  reconhecimento.start();

  reconhecimento.onresult = (evento) => {
    const transcricao = evento.results[0][0].transcript;
    const nomeItem = extrairNomeDoComando(transcricao);

    if (!nomeItem) return;

    const categoria = classificarItem(nomeItem);
    adicionarItem(nomeItem, categoria, 1); // adicionarItem() vem de script.js

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(
        `${nomeItem} adicionado em ${NOMES_CATEGORIA[categoria]}.`
      );
      utterance.lang = "pt-BR";
      window.speechSynthesis.speak(utterance);
    }
  };

  reconhecimento.onerror = () => {
    botaoVoz.classList.remove("botao-voz-ouvindo");
    botaoVoz.textContent = "🎤";
  };

  reconhecimento.onend = () => {
    botaoVoz.classList.remove("botao-voz-ouvindo");
    botaoVoz.textContent = "🎤";
  };
}

const suportaReconhecimentoDeVoz = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

if (suportaReconhecimentoDeVoz) {
  botaoVoz.addEventListener("click", iniciarReconhecimentoDeVoz);
} else {
  botaoVoz.hidden = true; // esconde em vez de mostrar um botão que sempre falharia (ex: Safari/iOS)
}
