// Adicionar itens por comando de voz — usa a Web Speech API do
// navegador (gratuita, sem chave), reconhece frases como "adicionar
// duas maçãs à lista" e categoriza o item automaticamente por
// palavra-chave, já extraindo a quantidade falada.
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
    "berinjela", "beterraba", "chuchu", "espinafre", "rúcula", "rucula",
    "repolho", "vagem", "quiabo", "milho", "abacaxi", "melão", "melao",
    "pera", "pêssego", "pessego", "kiwi", "coco", "gengibre", "alho",
    "salsa", "cebolinha", "coentro", "hortelã", "hortela",
  ],
  laticinios: [
    "leite", "queijo", "iogurte", "manteiga", "requeijão", "requeijao",
    "nata", "creme de leite", "margarina", "coalhada", "mussarela",
    "muçarela", "queijo minas", "queijo prato", "ricota", "parmesão",
    "parmesao", "leite condensado", "leite em pó", "leite em po",
    "danone", "petit suisse", "bebida láctea", "bebida lactea",
    "ovo", "ovos",
  ],
  limpeza: [
    "detergente", "sabão em pó", "sabao em po", "desinfetante",
    "água sanitária", "agua sanitaria", "amaciante", "esponja",
    "saco de lixo", "papel toalha", "veja", "multiuso", "vassoura",
    "rodo", "pano de chão", "pano de chao", "álcool", "alcool",
    "sabão em barra", "sabao em barra", "cera", "limpa vidro",
    "inseticida", "sapólio", "sapolio", "fósforo", "fosforo", "vela",
    "pilha", "prendedor de roupa", "sabonete líquido para mãos",
  ],
  higiene: [
    "sabonete", "shampoo", "condicionador", "pasta de dente",
    "creme dental", "escova de dente", "papel higiênico",
    "papel higienico", "absorvente", "desodorante", "fio dental",
    "cotonete", "algodão", "algodao", "lâmina de barbear",
    "lamina de barbear", "creme de barbear", "hidratante", "protetor solar",
    "fralda", "lenço umedecido", "lenco umedecido", "enxaguante bucal",
  ],
};

// Números por extenso reconhecidos ao falar quantidade — a Web Speech
// API às vezes já transcreve como dígito ("2"), então o regex de
// extração aceita os dois formatos.
const NUMERO_POR_EXTENSO = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4,
  cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
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

function extrairQuantidadeENome(textoLimpo) {
  const padraoNumero = Object.keys(NUMERO_POR_EXTENSO).join("|");
  const regex = new RegExp(`^(\\d+|${padraoNumero})\\s+(.+)$`, "i");
  const encontrado = textoLimpo.match(regex);

  if (!encontrado) {
    return { quantidade: 1, nome: textoLimpo };
  }

  const [, palavraQuantidade, resto] = encontrado;
  const quantidade = /^\d+$/.test(palavraQuantidade)
    ? parseInt(palavraQuantidade, 10)
    : NUMERO_POR_EXTENSO[palavraQuantidade.toLowerCase()];

  return { quantidade: Math.min(quantidade, 99), nome: resto.trim() };
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
    const textoLimpo = extrairNomeDoComando(transcricao);

    if (!textoLimpo) return;

    const { quantidade, nome } = extrairQuantidadeENome(textoLimpo);
    if (!nome) return;

    const categoria = classificarItem(nome);
    adicionarItem(nome, categoria, quantidade); // adicionarItem() vem de script.js

    if ("speechSynthesis" in window) {
      const textoQuantidade = quantidade > 1 ? `${quantidade} ` : "";
      const utterance = new SpeechSynthesisUtterance(
        `${textoQuantidade}${nome} adicionado em ${NOMES_CATEGORIA[categoria]}.`
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
