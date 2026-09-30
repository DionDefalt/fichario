# 🧺 Lista de Compras

Versão mobile-first de uma lista de compras para itens de casa — organizada por categoria, com quantidade por item e progresso visual. Sem backend: tudo roda no navegador, com persistência via `localStorage`.

Projeto irmão do [Fichário](https://github.com/DionDefalt) original (mesma stack, HTML/CSS/JS puro), reconstruído do zero com um domínio e uma identidade visual diferentes.

## ✨ Funcionalidades

- Adicionar item com categoria e quantidade — **categorias dinâmicas**: escolha entre 25 sugestões (Mercado, Farmácia, Vestuário, Eletrônicos, Pet, e outras) no catálogo "+ Categoria", ativando só as que você usa
- Marcar item como comprado (com indicador visual e progresso geral)
- **Editar um item já adicionado** (nome, categoria e quantidade), sem precisar excluir e recriar
- Filtrar a lista por categoria — na visão "Todos", os itens aparecem **agrupados por categoria** com cabeçalhos, mais fácil de escanear
- **Buscar item por nome** em tempo real
- Limpar todos os itens já comprados de uma vez
- Excluir item individualmente
- **Modo escuro**, com preferência lembrada entre sessões (e detecção automática da preferência do sistema na primeira visita)
- **Exportar/compartilhar a lista** — usa o compartilhamento nativo do celular quando disponível, ou abre o WhatsApp com a lista pronta como alternativa
- Dados persistem entre sessões (localStorage) — a lista continua lá mesmo se você fechar o navegador
- Layout pensado para celular: barra de adicionar fixa na parte inferior (alcance de polegar), botões grandes o suficiente pra toque
- **📍 Perto de mim**: ativa sozinho ao abrir o app e detecta, entre 19 tipos de loja no OpenStreetMap, só os que correspondem às categorias com itens pendentes na sua lista (um item de Farmácia nunca te manda pra uma oficina)
- **🎤 Adicionar por voz**: fale "adicionar duas maçãs" e o item entra na lista já com a quantidade certa, na categoria certa, por reconhecimento de palavra-chave e de número por extenso
- **🗣️ Assistente de voz conversacional**: pergunte "quais listas tem itens", o app fala as categorias pendentes, você escolhe uma para ouvir os itens, e confirma a compra com "comprei tudo" (ou "comprei tudo, menos X" para deixar uma exceção) — o app avança sozinho para a próxima categoria pendente

## 📍 Como funciona o "Perto de mim"

1. Liga sozinho ao abrir o app (só pede a permissão de localização do navegador, controlada pelo próprio sistema)
2. O app olha os itens **ainda não comprados** da sua lista e decide sozinho quais tipos de loja faz sentido buscar — um item de categoria "Higiene" busca Farmácia e Mercado; um item de "Farmácia" busca só Farmácia, nunca Mercado ou Oficina
3. Busca, via [Overpass API](https://overpass-api.de/) (OpenStreetMap, gratuita e sem chave), os lugares desses tipos num raio de 2km da sua posição
4. Conforme você se movimenta, quando uma categoria nova entra no raio de aviso configurado, o app **fala em voz alta** um aviso único e consolidado (não um por loja) — e sugere tocar no microfone para continuar a conversa direto, sem precisar dizer nenhum comando
5. Toque no **card do lugar** para ver a ficha dele no Google Maps (foto, nota, horário — o que o Google tiver sobre aquele lugar específico, mostrado pelo próprio app gratuitamente). Toque no ícone 🧭 para pular direto para a **navegação de verdade**.

**Sobre as fotos**: o OpenStreetMap não guarda fotos de fachada dos estabelecimentos — por isso, ao tocar no card, o app não mostra a foto diretamente; ele abre o Google Maps em modo busca, e é o **Google Maps quem busca e mostra a própria ficha dele** (com foto, se tiver), gratuitamente, no aparelho do usuário. Nunca chamamos uma API paga do Google — é o mesmo mecanismo gratuito de qualquer link "Ver no Google Maps" que existe pela internet.

**Limitação real, não um bug**: isso só funciona com a aba aberta e em primeiro plano. Navegadores não permitem que um site monitore localização com a aba fechada ou minimizada — é uma restrição de privacidade do próprio sistema operacional. Um alerta "em segundo plano de verdade", com o app fechado, exigiria um aplicativo nativo (Android/iOS), fora do escopo deste projeto.

## 🎤 Como funciona o comando de voz

Toque no ícone de microfone. Dois modos, no mesmo botão:

**Comando único** — fale algo como *"adicionar leite"* ou *"adicionar duas maçãs"*, e o app:
1. Transcreve sua fala (via [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) do navegador, gratuita, sem servidor)
2. Remove palavras de comando ("adicionar", "à lista", etc.) e extrai a quantidade falada (por extenso ou dígito)
3. Categoriza o item por um dicionário de palavras-chave (fácil de estender, edite `PALAVRAS_POR_CATEGORIA` em `voz.js`) — se a categoria ainda não estiver ativa, o app a cria sozinho
4. Adiciona o item e confirma por voz

**Modo conversa** — diga *"quais listas tem itens"*, e o app entra num vaivém de pergunta/resposta: fala as categorias pendentes, espera você escolher uma, lê os itens dela, e espera você confirmar com *"comprei tudo"* (ou *"comprei tudo, menos creme dental"*, pra deixar uma exceção pendente). Depois de cada categoria resolvida, o app já pergunta se você quer ouvir a próxima — sem precisar tocar no microfone de novo a cada resposta. Para sair a qualquer momento, diga "cancelar".

**Compatibilidade**: reconhecimento de voz funciona bem no Chrome (desktop e Android); no Safari/iPhone o suporte é limitado ou inexistente — nesse caso, o botão de microfone fica automaticamente escondido, em vez de aparecer e falhar sem explicação.

## 🖥️ Como usar

Não precisa de instalação nem servidor — é só abrir o `index.html` no navegador (de preferência num celular, ou reduzindo a janela do navegador no computador, já que o layout é mobile-first).

Para rodar localmente com um servidor simples (opcional, mas evita alguns bloqueios de navegador com `localStorage` em arquivos abertos direto):

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

## 🎨 Identidade visual

Paleta quente (creme, dourado, verde) pensada para o domínio (organização doméstica), com sublinhado decorativo nos títulos e selos coloridos por categoria no catálogo. Fonte de título mais descontraída (Baloo 2) combinada com uma fonte de corpo limpa e legível (Work Sans). Modo escuro com a mesma identidade, mantendo o dourado como cor de destaque.

## 🧠 O que este projeto demonstra

- Manipulação de DOM sem framework (criação, atualização e remoção de elementos)
- Persistência de dados no navegador com `localStorage`
- Design mobile-first: hierarquia de toque, barra de ação fixa, chips de filtro roláveis
- Prevenção de XSS ao renderizar conteúdo digitado pelo usuário (escape de HTML)
- Organização de estado em JavaScript puro, sem biblioteca de gerenciamento de estado
- **Geolocalização** (`navigator.geolocation.watchPosition`) com throttle de requisições (evita sobrecarregar a API pública ao rebuscar a cada pequeno movimento)
- **Consumo de API externa** (Overpass/OpenStreetMap) com query espacial (`around:raio,lat,lon`)
- **Cálculo de distância geográfica** (fórmula de Haversine)
- **Web Speech API**: síntese de voz (`SpeechSynthesis`) e reconhecimento de fala (`SpeechRecognition`)
- **Deep linking** entre aplicativos (abrir o Google Maps a partir do navegador)
- Feature detection e degradação graciosa (recursos que somem quando o navegador não suporta, em vez de quebrar)

## 🚀 Próximos passos (ideias de evolução)

- [ ] Sincronizar a lista entre dispositivos (hoje é só local, por navegador)
- [ ] Sugestão de itens recorrentes com base no histórico de compras
- [ ] Reconhecer mais variações de fala no modo conversa (hoje cobre os comandos principais, mas não é um diálogo totalmente aberto)

---

Feito como parte do meu aprendizado em desenvolvimento front-end.
