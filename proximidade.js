// Perto de mim — detecta estabelecimentos próximos via OpenStreetMap
// (Overpass API, gratuita, sem chave), avisa por voz quando o usuário
// entra no raio configurado, e oferece um botão que abre a navegação
// de verdade no Google Maps do celular.
//
// IMPORTANTE (limitação real, não um bug): isso só funciona enquanto
// esta aba está aberta e em primeiro plano. Navegadores não permitem
// que um site monitore sua localização com a aba fechada/minimizada —
// isso é uma restrição de privacidade do próprio sistema operacional,
// não uma limitação deste código. Para um alerta "em segundo plano de
// verdade" seria necessário um aplicativo nativo (Android/iOS).

// Tipos de estabelecimento pesquisáveis no OpenStreetMap. Cada um tem
// as tags OSM que o identificam, usadas na consulta à Overpass API.
const TIPOS = {
  mercado: { emoji: "🛒", rotulo: "Supermercado", tags: [["shop", "supermarket"]] },
  farmacia: { emoji: "💊", rotulo: "Farmácia", tags: [["amenity", "pharmacy"]] },
  oficina: { emoji: "🔧", rotulo: "Oficina", tags: [["shop", "car_repair"]] },
  padaria: { emoji: "🥖", rotulo: "Padaria", tags: [["shop", "bakery"]] },
  fastfood: { emoji: "🍔", rotulo: "Fastfood", tags: [["amenity", "fast_food"]] },
  doceria: { emoji: "🍬", rotulo: "Doceria", tags: [["shop", "confectionery"]] },
  vestuario: { emoji: "👕", rotulo: "Loja de Roupas", tags: [["shop", "clothes"]] },
  calcados: { emoji: "👟", rotulo: "Loja de Calçados", tags: [["shop", "shoes"]] },
  papelaria: { emoji: "📚", rotulo: "Papelaria", tags: [["shop", "stationery"]] },
  eletronicos: { emoji: "💻", rotulo: "Loja de Eletrônicos", tags: [["shop", "electronics"]] },
  petshop: { emoji: "🐾", rotulo: "Pet Shop", tags: [["shop", "pet"]] },
  brinquedos: { emoji: "🧸", rotulo: "Loja de Brinquedos", tags: [["shop", "toys"]] },
  ferramentas: { emoji: "🔨", rotulo: "Loja de Ferramentas", tags: [["shop", "hardware"]] },
  presentes: { emoji: "🎁", rotulo: "Loja de Presentes", tags: [["shop", "gift"]] },
  moveis: { emoji: "🛋️", rotulo: "Loja de Móveis", tags: [["shop", "furniture"]] },
  livraria: { emoji: "📖", rotulo: "Livraria", tags: [["shop", "books"]] },
  autopecas: { emoji: "🚗", rotulo: "Loja de Autopeças", tags: [["shop", "car_parts"]] },
  jardinagem: { emoji: "🌱", rotulo: "Loja de Jardinagem", tags: [["shop", "garden_centre"]] },
  bebidas: { emoji: "🥤", rotulo: "Deposito de Bebidas", tags: [["shop", "beverages"], ["shop", "convenience"]] },
};

// Mapeia cada CATEGORIA DE ITEM (as mesmas de SUGESTOES_CATEGORIA, em
// script.js) para o(s) TIPO(S) DE LOJA onde ela costuma ser encontrada
// — é isso que corrige o bug de "refrigerante mandando pra oficina":
// a busca de lugares agora é guiada pelo que está na lista, não por
// uma seleção manual desconectada. Alguns itens podem ser comprados em
// mais de um lugar (ex: higiene em farmácia OU mercado); outros são
// exclusivos de um só tipo (ex: farmácia, nunca mercado).
const CATEGORIA_PARA_TIPOS = {
  mercado: ["mercado"],
  farmacia: ["farmacia"],
  oficina: ["oficina"],
  padaria: ["padaria", "mercado"],
  fastfood: ["fastfood"],
  guloseimas: ["doceria", "mercado"],
  sobremesas: ["doceria", "mercado"],
  vestuario: ["vestuario"],
  calcados: ["calcados"],
  papelaria: ["papelaria"],
  eletronicos: ["eletronicos"],
  hortifruti: ["mercado"],
  laticinios: ["mercado"],
  limpeza: ["mercado"],
  higiene: ["farmacia", "mercado"],
  bebidas: ["mercado", "bebidas"],
  pet: ["petshop"],
  brinquedos: ["brinquedos"],
  ferramentas: ["ferramentas"],
  presentes: ["presentes"],
  moveis: ["moveis"],
  livros: ["livraria"],
  automotivo: ["autopecas", "oficina"],
  jardinagem: ["jardinagem"],
  congelados: ["mercado"],
  outros: ["mercado"], // fallback razoável — a maioria das coisas "genéricas" se acha num mercado
};

// Calcula, a partir dos itens AINDA NÃO COMPRADOS na lista (variável
// `itens`, compartilhada globalmente com script.js), quais tipos de
// loja realmente precisam ser buscados agora — em vez de um conjunto
// fixo escolhido manualmente.
function tiposNecessarios() {
  const categoriasComItensPendentes = new Set(
    itens.filter((item) => !item.comprado).map((item) => item.categoria)
  );

  const tipos = new Set();
  categoriasComItensPendentes.forEach((categoria) => {
    const mapeados = CATEGORIA_PARA_TIPOS[categoria] || ["mercado"];
    mapeados.forEach((tipo) => tipos.add(tipo));
  });

  return tipos;
}

const RAIO_BUSCA_METROS = 2000; // até onde buscamos lugares (maior que o raio de alerta, para já sabermos deles com antecedência)
const DISTANCIA_MINIMA_PARA_REBUSCAR = 300; // metros — evita bater na Overpass API a cada pequeno movimento
const INTERVALO_MINIMO_REBUSCA_MS = 60000; // 60s — mesmo motivo

const botaoToggle = document.getElementById("botao-perto-toggle");
const configEl = document.getElementById("perto-config");
const statusEl = document.getElementById("perto-status");
const listaEl = document.getElementById("perto-lista");
const selectRaio = document.getElementById("select-raio");
const tiposNecessariosEl = document.getElementById("perto-tipos-necessarios");

let watchId = null;
let ativo = false;
let ultimaBusca = { lat: null, lon: null, timestamp: 0 };
let lugaresEncontrados = [];
let jaAlertados = new Set(); // ids de lugares já avisados nesta sessão (evita repetir o alerta toda hora)

function distanciaMetros(lat1, lon1, lat2, lon2) {
  // Fórmula de Haversine — distância em linha reta entre duas coordenadas.
  const R = 6371000;
  const toRad = (graus) => (graus * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatarDistancia(metros) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}

function renderizarTiposNecessarios(tipos) {
  if (!tiposNecessariosEl) return;
  if (tipos.size === 0) {
    tiposNecessariosEl.textContent = "Nenhum item pendente na lista — nada para buscar ainda.";
    return;
  }
  const rotulos = [...tipos].map((t) => `${TIPOS[t].emoji} ${TIPOS[t].rotulo}`);
  tiposNecessariosEl.textContent = `Buscando: ${rotulos.join(", ")}`;
}

async function buscarLugaresProximos(lat, lon) {
  const tiposAtivos = tiposNecessarios();
  renderizarTiposNecessarios(tiposAtivos);

  if (tiposAtivos.size === 0) {
    return [];
  }

  const tagsSelecionadas = [...tiposAtivos].flatMap((tipo) => TIPOS[tipo].tags);
  const clausulas = tagsSelecionadas
    .map(
      ([chave, valor]) =>
        `node["${chave}"="${valor}"](around:${RAIO_BUSCA_METROS},${lat},${lon});` +
        `way["${chave}"="${valor}"](around:${RAIO_BUSCA_METROS},${lat},${lon});`
    )
    .join("\n");

  const query = `[out:json][timeout:25];(${clausulas});out center;`;

  const resposta = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  if (!resposta.ok) {
    throw new Error("A busca de lugares próximos falhou. Tente novamente em instantes.");
  }

  const dados = await resposta.json();

  return dados.elements
    .map((el) => {
      const latEl = el.lat ?? el.center?.lat;
      const lonEl = el.lon ?? el.center?.lon;
      if (latEl == null || lonEl == null) return null;

      const tipo = identificarTipo(el.tags || {});
      if (!tipo) return null;

      return {
        id: `${el.type}/${el.id}`,
        nome: el.tags?.name || `${TIPOS[tipo].rotulo} sem nome`,
        tipo,
        lat: latEl,
        lon: lonEl,
      };
    })
    .filter(Boolean);
}

function identificarTipo(tags) {
  for (const [tipo, info] of Object.entries(TIPOS)) {
    for (const [chave, valor] of info.tags) {
      if (tags[chave] === valor) return tipo;
    }
  }
  return null;
}

function abrirNavegacaoGoogleMaps(lat, lon) {
  // Deep link universal do Google Maps — sempre gratuito, sem chave de
  // API, e abre o app instalado no celular (ou o site, no desktop).
  //
  // "dir_action=navigate" é um parâmetro oficial documentado pelo
  // Google: como não especificamos uma origem, ele assume a
  // localização atual do usuário e já entra direto no modo de
  // navegação por voz — sem precisar tocar em "Iniciar" depois.
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&dir_action=navigate`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function abrirFichaGoogleMaps(nome, lat, lon) {
  // Abre o Google Maps em modo BUSCA (não navegação direta) — o próprio
  // app do Google Maps, gratuitamente, mostra a ficha do lugar com o
  // que ELE tiver sobre ele: foto, nota, horário. Não é o OpenStreetMap
  // "passando" a foto — é o Google Maps buscando na própria base dele,
  // como faria se você digitasse o nome na busca. Nunca chamamos uma
  // API paga; quem busca é o app já instalado no celular do usuário.
  const temNomeReal = nome && !nome.includes("sem nome");
  const consulta = temNomeReal ? `${nome} perto de ${lat},${lon}` : `${lat},${lon}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function falar(texto) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  window.speechSynthesis.speak(utterance);
}

function renderizarLista(posicaoAtual) {
  const raioAlerta = Number(selectRaio.value);

  const comDistancia = lugaresEncontrados
    .map((lugar) => ({
      ...lugar,
      distancia: distanciaMetros(posicaoAtual.lat, posicaoAtual.lon, lugar.lat, lugar.lon),
    }))
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, 15); // não polui a tela — mostra só os 15 mais próximos

  listaEl.innerHTML = "";

  if (comDistancia.length === 0) {
    statusEl.textContent = "Nenhum lugar encontrado nas categorias selecionadas, por perto.";
    return;
  }

  statusEl.textContent = `${comDistancia.length} lugar(es) encontrado(s) num raio de ${RAIO_BUSCA_METROS / 1000} km.`;

  comDistancia.forEach((lugar) => {
    const dentroDoRaio = lugar.distancia <= raioAlerta;

    if (dentroDoRaio && !jaAlertados.has(lugar.id)) {
      jaAlertados.add(lugar.id);

      // Quais categorias da lista fazem sentido comprar nesse tipo de
      // loja (função vem de voz.js — script irmão, mesmo escopo
      // global, mesmo padrão já usado em outras partes do projeto).
      const categoriasAtendidas =
        typeof listarCategoriasComPendentes === "function"
          ? listarCategoriasComPendentes().filter((c) =>
              (CATEGORIA_PARA_TIPOS[c.id] || ["mercado"]).includes(lugar.tipo)
            )
          : [];
      const nomesCategorias = categoriasAtendidas.map((c) => c.nome).join(", ");
      const mencaoItens = nomesCategorias
        ? `Você tem itens de ${nomesCategorias} na sua lista de compras. `
        : "";

      // O microfone não pode ligar sozinho aqui (exige toque humano) —
      // por isso o convite falado, em vez de já entrar ouvindo.
      falar(
        `${mencaoItens}${TIPOS[lugar.tipo].rotulo} a ${formatarDistancia(lugar.distancia)}: ${lugar.nome}. ` +
          `Toque no microfone para ouvir sua lista.`
      );
    }

    const li = document.createElement("li");
    li.className = "perto-item" + (dentroDoRaio ? " perto-item-proximo" : "");
    li.innerHTML = `
      <span class="perto-item-icone">${TIPOS[lugar.tipo].emoji}</span>
      <div class="perto-item-info">
        <div class="perto-item-nome">${lugar.nome}</div>
        <div class="perto-item-meta">${TIPOS[lugar.tipo].rotulo} · ${formatarDistancia(lugar.distancia)}</div>
      </div>
      <button class="perto-item-ir" aria-label="Ir até lá agora">🧭</button>
    `;
    // Tocar no card (fora do botão) mostra a ficha do lugar no Google
    // Maps — foto, nota, horário — antes de decidir ir. É a etapa de
    // "escolher entre as opções".
    li.addEventListener("click", () => {
      abrirFichaGoogleMaps(lugar.nome, lugar.lat, lugar.lon);
    });
    // O botão 🧭 pula direto pra navegação, para quem já decidiu.
    li.querySelector(".perto-item-ir").addEventListener("click", (e) => {
      e.stopPropagation();
      abrirNavegacaoGoogleMaps(lugar.lat, lugar.lon);
    });
    listaEl.appendChild(li);
  });
}

async function aoAtualizarPosicao(posicao) {
  const lat = posicao.coords.latitude;
  const lon = posicao.coords.longitude;

  const agora = Date.now();
  const distanciaDesdeUltimaBusca =
    ultimaBusca.lat == null
      ? Infinity
      : distanciaMetros(lat, lon, ultimaBusca.lat, ultimaBusca.lon);

  const precisaRebuscar =
    distanciaDesdeUltimaBusca > DISTANCIA_MINIMA_PARA_REBUSCAR ||
    agora - ultimaBusca.timestamp > INTERVALO_MINIMO_REBUSCA_MS;

  if (precisaRebuscar) {
    statusEl.textContent = "Buscando lugares por perto...";
    try {
      lugaresEncontrados = await buscarLugaresProximos(lat, lon);
      ultimaBusca = { lat, lon, timestamp: agora };
    } catch (erro) {
      statusEl.textContent = erro.message;
      return;
    }
  }

  renderizarLista({ lat, lon });
}

function aoErrarGeolocalizacao(erro) {
  const mensagens = {
    1: "Permissão de localização negada. Ative nas configurações do navegador para usar esta função.",
    2: "Não foi possível obter sua localização agora.",
    3: "A busca de localização demorou demais. Tentando de novo...",
  };
  statusEl.textContent = mensagens[erro.code] || "Erro ao obter localização.";
}

function ativarDeteccao() {
  if (!("geolocation" in navigator)) {
    statusEl.textContent = "Seu navegador não suporta geolocalização.";
    return;
  }
  ativo = true;
  botaoToggle.textContent = "Desativar";
  configEl.hidden = false;
  statusEl.textContent = "Obtendo sua localização...";

  watchId = navigator.geolocation.watchPosition(aoAtualizarPosicao, aoErrarGeolocalizacao, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 20000,
  });
}

function desativarDeteccao() {
  ativo = false;
  botaoToggle.textContent = "Ativar";
  configEl.hidden = true;
  statusEl.textContent = "";
  listaEl.innerHTML = "";
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

botaoToggle.addEventListener("click", () => {
  ativo ? desativarDeteccao() : ativarDeteccao();
});

// Se a lista de compras mudar (item adicionado/comprado/removido) enquanto
// a detecção já está ativa, os tipos de loja necessários podem mudar —
// força uma nova busca na próxima atualização de posição.
document.addEventListener("lista-compras-atualizada", () => {
  ultimaBusca = { lat: null, lon: null, timestamp: 0 };
});

// --- Inicialização: liga sozinho, sem precisar tocar em "Ativar" ---
// (o navegador ainda vai pedir a permissão de localização normalmente
// na primeira vez — isso é controlado pelo próprio sistema, não por
// este botão; o botão continua servindo para desligar manualmente.)
ativarDeteccao();
