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

const TIPOS = {
  mercado: { emoji: "🛒", rotulo: "Supermercado", tags: [['shop', 'supermarket']] },
  padaria: { emoji: "🥖", rotulo: "Padaria", tags: [['shop', 'bakery']] },
  farmacia: { emoji: "💊", rotulo: "Farmácia", tags: [['amenity', 'pharmacy']] },
  oficina: { emoji: "🔧", rotulo: "Oficina", tags: [['shop', 'car_repair']] },
};

const RAIO_BUSCA_METROS = 2000; // até onde buscamos lugares (maior que o raio de alerta, para já sabermos deles com antecedência)
const DISTANCIA_MINIMA_PARA_REBUSCAR = 300; // metros — evita bater na Overpass API a cada pequeno movimento
const INTERVALO_MINIMO_REBUSCA_MS = 60000; // 60s — mesmo motivo

const botaoToggle = document.getElementById("botao-perto-toggle");
const configEl = document.getElementById("perto-config");
const statusEl = document.getElementById("perto-status");
const listaEl = document.getElementById("perto-lista");
const selectRaio = document.getElementById("select-raio");
const tiposContainer = document.getElementById("perto-tipos");

let watchId = null;
let ativo = false;
let tiposAtivos = new Set(Object.keys(TIPOS));
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

async function buscarLugaresProximos(lat, lon) {
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
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
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
      falar(`Há um${lugar.tipo === "farmacia" || lugar.tipo === "oficina" ? "a" : ""} ${TIPOS[lugar.tipo].rotulo.toLowerCase()} a ${formatarDistancia(lugar.distancia)}: ${lugar.nome}.`);
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

tiposContainer.addEventListener("click", (e) => {
  const chip = e.target.closest(".tipo-chip");
  if (!chip) return;
  const tipo = chip.dataset.tipo;

  if (tiposAtivos.has(tipo)) {
    tiposAtivos.delete(tipo);
    chip.classList.remove("tipo-ativo");
  } else {
    tiposAtivos.add(tipo);
    chip.classList.add("tipo-ativo");
  }

  // Muda a seleção de tipos = precisa buscar de novo na próxima atualização de posição
  ultimaBusca = { lat: null, lon: null, timestamp: 0 };
});
