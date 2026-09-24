// Comandos de voz — dois modos, no mesmo botão 🎤:
//
// 1) Comando único ("adicionar duas maçãs") — reconhece, adiciona o
//    item, e para de ouvir. É o comportamento de sempre.
//
// 2) Modo conversa ("quais listas tem itens", ou o nome de uma
//    categoria direto) — entra num vaivém de pergunta/resposta: o app
//    fala, e volta a ouvir sozinho assim que termina de falar, sem
//    precisar tocar no microfone de novo a cada frase. Pensado para
//    uso dirigindo: um toque inicial liga a conversa, o resto é só
//    voz. Para sair a qualquer momento, basta dizer "cancelar".
//
// LIMITAÇÃO REAL (não um bug): o microfone NUNCA liga sozinho, nem no
// modo conversa — todo navegador exige um toque humano pra começar a
// ouvir, por segurança/privacidade. Isso quer dizer que o aviso
// automático de proximidade (em proximidade.js) pode FALAR sozinho,
// mas não pode começar a OUVIR sozinho — ele só sugere tocar no
// microfone. Depois desse primeiro toque, sim, a conversa flui sem
// precisar tocar de novo.
//
// Também funciona bem no Chrome (desktop e Android); no Safari/iPhone
// o suporte a reconhecimento de fala é limitado ou inexistente — nesse
// caso, o botão de microfone fica escondido, em vez de aparecer e
// falhar sem explicação.

const botaoVoz = document.getElementById("botao-voz");

// Dicionário de categorização (usado no comando "adicionar") — mesma
// filosofia do CATEGORIAS do Organizador de Arquivos: fácil de
// estender, só adicionar palavras novas na lista certa.
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
  bebidas: [
    "refrigerante", "suco", "água", "agua", "cerveja", "vinho",
    "energético", "energetico", "refresco", "chá pronto", "cha pronto", "cachaça",
  ],
  farmacia: [
    "dipirona", "paracetamol", "antialérgico", "antialergico",
    "remédio", "remedio", "medicamento", "pomada", "xarope",
    "vitamina", "colírio", "colirio", "anti-inflamatório", "anti-inflamatorio",
  ],
};

// Números por extenso reconhecidos ao falar quantidade — a Web Speech
// API às vezes já transcreve como dígito ("2"), então o regex de
// extração aceita os dois formatos.
const NUMERO_POR_EXTENSO = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4,
  cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
};

// Frases que iniciam o modo conversa (pergunta "quais listas tenho pendentes")
const GATILHOS_LISTAR = [
  "quais listas", "quais categorias", "o que eu tenho pra comprar",
  "o que eu preciso comprar", "listar categorias", "listar listas",
  "o que falta comprar", "quais listas tem itens", "quais listas têm itens",
];

const PALAVRAS_SAIR = ["cancelar", "sair", "parar", "encerrar"];

// --- Estado da conversa ---
// 'ocioso' = comportamento padrão (um comando, para de ouvir depois)
// 'aguardando-lista' = acabou de perguntar "qual lista deseja ouvir?"
// 'aguardando-confirmacao' = acabou de ler os itens de uma categoria
// 'aguardando-proxima-lista' = perguntou se quer ouvir a próxima categoria pendente
let estadoConversa = "ocioso";
let categoriaEmFoco = null;

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
  texto = texto.replace(/^(adicionar|coloca|colocar|por|põe|poe|inclui|incluir)\s+/i, "");
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

// --- Fala (saída de voz) ---

function falar(texto, aoTerminar) {
  if (!("speechSynthesis" in window)) {
    if (aoTerminar) aoTerminar();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  if (aoTerminar) utterance.onend = aoTerminar;
  window.speechSynthesis.speak(utterance);
}

// --- Consultas sobre a lista (usam `itens`/`ordemCategorias`/`nomeCategoria`,
// que são globais compartilhados com script.js) ---

function listarCategoriasComPendentes() {
  return ordemCategorias()
    .map((id) => ({
      id,
      nome: nomeCategoria(id),
      qtd: itens.filter((i) => i.categoria === id && !i.comprado).length,
    }))
    .filter((c) => c.qtd > 0);
}

function encontrarCategoriaPorFala(texto) {
  const t = texto.toLowerCase();
  return listarCategoriasComPendentes().find(
    (c) => t.includes(c.nome.toLowerCase()) || c.nome.toLowerCase().includes(t)
  );
}

// --- Passos da conversa ---

function anunciarCategoriasPendentes() {
  const pendentes = listarCategoriasComPendentes();
  if (pendentes.length === 0) {
    falar("Você não tem itens pendentes na lista.");
    estadoConversa = "ocioso";
    return;
  }
  const nomes = pendentes.map((c) => c.nome).join(", ");
  falar(`Você tem itens de ${nomes} na sua lista de compras. Qual lista deseja ouvir?`, () => {
    estadoConversa = "aguardando-lista";
    iniciarEscuta();
  });
}

function lerItensDaCategoria(categoria) {
  const doGrupo = itens.filter((i) => i.categoria === categoria.id && !i.comprado);
  const nomes = doGrupo.map((i) => i.nome).join(", ");
  categoriaEmFoco = categoria.id;
  falar(
    `Na lista de ${categoria.nome} estão listados: ${nomes}. Quando terminar, diga "comprei tudo", ` +
      `ou "comprei tudo, menos" e o nome do que ainda falta.`,
    () => {
      estadoConversa = "aguardando-confirmacao";
      iniciarEscuta();
    }
  );
}

function processarConfirmacaoCompra(texto) {
  const combinou = texto
    .toLowerCase()
    .trim()
    .match(/^comprei (?:tudo|todos|todas)(?:,?\s*menos\s+(.+))?$/i);

  if (!combinou) {
    falar('Não entendi. Diga "comprei tudo", ou "comprei tudo, menos" e o item que faltou.', () =>
      iniciarEscuta()
    );
    return;
  }

  const excecoes = (combinou[1] || "")
    .split(/,| e /i)
    .map((s) => s.trim())
    .filter(Boolean);

  const categoriaId = categoriaEmFoco;
  let marcados = 0;

  itens.forEach((item) => {
    if (item.categoria !== categoriaId || item.comprado) return;
    const nomeItemLower = item.nome.toLowerCase();
    const ehExcecao = excecoes.some(
      (exc) => nomeItemLower.includes(exc.toLowerCase()) || exc.toLowerCase().includes(nomeItemLower)
    );
    if (!ehExcecao) {
      item.comprado = true;
      marcados++;
    }
  });

  salvarItens(); // script.js
  renderizar(); // script.js
  categoriaEmFoco = null;

  // Exclui a categoria que acabou de ser tratada agora — se sobrou
  // algo nela (por causa da exceção dita), o usuário já sabe disso e
  // decidiu deixar pra depois; não faz sentido oferecer ela nas
  // mesmas de novo em seguida.
  const restantesNaMesma = itens.filter((i) => i.categoria === categoriaId && !i.comprado).length;
  const outrasPendentes = listarCategoriasComPendentes().filter((c) => c.id !== categoriaId);

  if (outrasPendentes.length === 0) {
    const mencaoRestante = restantesNaMesma > 0 ? ` Ainda falta ${restantesNaMesma} item na lista de ${nomeCategoria(categoriaId)}.` : "";
    falar(`Prontinho, ${marcados} item ou itens marcados como comprados.${mencaoRestante}${mencaoRestante ? "" : " Você concluiu toda a sua lista!"}`);
    estadoConversa = "ocioso";
    return;
  }

  const proxima = outrasPendentes[0];
  categoriaEmFoco = proxima.id;
  falar(
    `Prontinho, ${marcados} item ou itens marcados. Você também tem itens de ${proxima.nome} pendentes. Quer ouvir agora?`,
    () => {
      estadoConversa = "aguardando-proxima-lista";
      iniciarEscuta();
    }
  );
}

function processarRespostaProximaLista(texto) {
  const t = texto.toLowerCase();
  const disseSim = /(sim|quero|pode|ouvir|vamos|claro)/i.test(t);

  if (disseSim && categoriaEmFoco) {
    const categoria = listarCategoriasComPendentes().find((c) => c.id === categoriaEmFoco);
    if (categoria) {
      lerItensDaCategoria(categoria);
      return;
    }
  }

  falar("Tudo bem, é só me chamar de novo quando quiser continuar.");
  estadoConversa = "ocioso";
  categoriaEmFoco = null;
}

function processarComandoDeAdicionar(textoLimpo) {
  const { quantidade, nome } = extrairQuantidadeENome(textoLimpo);
  if (!nome) return;

  const categoriaBruta = classificarItem(nome);
  const categoria = garantirCategoriaExiste(categoriaBruta); // script.js
  adicionarItem(nome, categoria, quantidade); // script.js

  const textoQuantidade = quantidade > 1 ? `${quantidade} ` : "";
  falar(`${textoQuantidade}${nome} adicionado em ${nomeCategoria(categoria)}.`);
}

// --- Roteador principal: decide o que fazer com o que foi ouvido,
// dependendo do estado atual da conversa ---

function processarResultadoDeVoz(transcricaoBruta) {
  const textoOriginal = transcricaoBruta.trim();
  const textoLower = textoOriginal.toLowerCase();

  // Sair da conversa funciona em qualquer estado, a qualquer momento.
  if (estadoConversa !== "ocioso" && PALAVRAS_SAIR.some((p) => textoLower === p || textoLower.includes(p))) {
    falar("Ok, encerrando o modo de voz.");
    estadoConversa = "ocioso";
    categoriaEmFoco = null;
    return;
  }

  if (estadoConversa === "aguardando-lista") {
    const categoria = encontrarCategoriaPorFala(textoLower);
    if (categoria) {
      lerItensDaCategoria(categoria);
    } else {
      falar("Não encontrei essa lista. Pode repetir o nome?", () => iniciarEscuta());
    }
    return;
  }

  if (estadoConversa === "aguardando-confirmacao") {
    processarConfirmacaoCompra(textoOriginal);
    return;
  }

  if (estadoConversa === "aguardando-proxima-lista") {
    processarRespostaProximaLista(textoLower);
    return;
  }

  // --- Estado ocioso: comando único ---

  if (GATILHOS_LISTAR.some((g) => textoLower.includes(g))) {
    anunciarCategoriasPendentes();
    return;
  }

  // Permite pular direto pro nome de uma categoria, sem precisar
  // perguntar "quais listas" antes (atalho, quando a frase for curta
  // o bastante pra não ser confundida com um comando de adicionar).
  const categoriaDireta = textoLower.split(" ").length <= 3 && encontrarCategoriaPorFala(textoLower);
  if (categoriaDireta) {
    lerItensDaCategoria(categoriaDireta);
    return;
  }

  const textoLimpo = extrairNomeDoComando(textoOriginal);
  processarComandoDeAdicionar(textoLimpo);
}

// --- Reconhecimento de fala (entrada de voz) ---

let tentativasSemFala = 0;
const MAX_TENTATIVAS_SEM_FALA = 2; // silêncio breve não deve matar a conversa inteira

function iniciarEscuta() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const reconhecimento = new SpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  botaoVoz.classList.add("botao-voz-ouvindo");
  botaoVoz.textContent = "🔴";

  reconhecimento.start();

  reconhecimento.onresult = (evento) => {
    tentativasSemFala = 0;
    const transcricao = evento.results[0][0].transcript;
    processarResultadoDeVoz(transcricao);
  };

  reconhecimento.onerror = (evento) => {
    botaoVoz.classList.remove("botao-voz-ouvindo");
    botaoVoz.textContent = "🎤";

    if (estadoConversa === "ocioso") return; // comando único: falha silenciosa, como sempre foi

    // "no-speech" (ninguém falou nada por alguns segundos) é o erro
    // mais comum de todos — não faz sentido derrubar a conversa inteira
    // por causa de uma pausa. Tenta ouvir de novo antes de desistir.
    if (evento.error === "no-speech" && tentativasSemFala < MAX_TENTATIVAS_SEM_FALA) {
      tentativasSemFala++;
      iniciarEscuta();
      return;
    }

    tentativasSemFala = 0;
    estadoConversa = "ocioso";
    categoriaEmFoco = null;

    const mensagens = {
      "no-speech": "Não te ouvi. Encerrando o modo de voz — é só tocar no microfone de novo quando quiser.",
      "audio-capture": "Não consegui acessar o microfone.",
      "not-allowed": "Permissão de microfone negada.",
      network: "Falha de conexão ao reconhecer a fala.",
    };
    falar(mensagens[evento.error] || "Encerrando o modo de voz.");
  };

  reconhecimento.onend = () => {
    botaoVoz.classList.remove("botao-voz-ouvindo");
    botaoVoz.textContent = "🎤";
  };
}

const suportaReconhecimentoDeVoz = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

if (suportaReconhecimentoDeVoz) {
  botaoVoz.addEventListener("click", iniciarEscuta); // único toque humano que a conversa toda depende
} else {
  botaoVoz.hidden = true; // esconde em vez de mostrar um botão que sempre falharia (ex: Safari/iOS)
}
