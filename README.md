# 🧺 Lista de Compras

Versão mobile-first de uma lista de compras para itens de casa — organizada por categoria, com quantidade por item e progresso visual. Sem backend: tudo roda no navegador, com persistência via `localStorage`.

Projeto irmão do [Fichário](https://github.com/DionDefalt) original (mesma stack, HTML/CSS/JS puro), reconstruído do zero com um domínio e uma identidade visual diferentes.

## ✨ Funcionalidades

- Adicionar item com categoria (Hortifruti, Laticínios, Limpeza, Higiene, Outros) e quantidade
- Marcar item como comprado (com indicador visual e progresso geral)
- Filtrar a lista por categoria
- Limpar todos os itens já comprados de uma vez
- Excluir item individualmente
- Dados persistem entre sessões (localStorage) — a lista continua lá mesmo se você fechar o navegador
- Layout pensado para celular: barra de adicionar fixa na parte inferior (alcance de polegar), botões grandes o suficiente pra toque
- **📍 Perto de mim**: detecta supermercados, padarias, farmácias e oficinas próximos usando dados abertos do OpenStreetMap, com aviso por voz quando você entra no raio configurado
- **🎤 Adicionar por voz**: fale "adicionar leite" e o item entra na lista já na categoria certa (Laticínios), por reconhecimento de palavra-chave

## 📍 Como funciona o "Perto de mim"

1. Ative a detecção (pede permissão de localização do navegador)
2. Escolha quais tipos de lugar te interessam (mercado, padaria, farmácia, oficina) e o raio de aviso
3. O app busca, via [Overpass API](https://overpass-api.de/) (OpenStreetMap, gratuita e sem chave), os lugares desses tipos num raio de 2km da sua posição
4. Conforme você se movimenta, quando entra no raio de aviso configurado para um lugar, o app **fala em voz alta** um aviso
5. Toque no **card do lugar** para ver a ficha dele no Google Maps (foto, nota, horário — o que o Google tiver sobre aquele lugar específico, mostrado pelo próprio app gratuitamente). Toque no ícone 🧭 para pular direto para a **navegação de verdade**.

**Sobre as fotos**: o OpenStreetMap não guarda fotos de fachada dos estabelecimentos — por isso, ao tocar no card, o app não mostra a foto diretamente; ele abre o Google Maps em modo busca, e é o **Google Maps quem busca e mostra a própria ficha dele** (com foto, se tiver), gratuitamente, no aparelho do usuário. Nunca chamamos uma API paga do Google — é o mesmo mecanismo gratuito de qualquer link "Ver no Google Maps" que existe pela internet.

**Limitação real, não um bug**: isso só funciona com a aba aberta e em primeiro plano. Navegadores não permitem que um site monitore localização com a aba fechada ou minimizada — é uma restrição de privacidade do próprio sistema operacional. Um alerta "em segundo plano de verdade", com o app fechado, exigiria um aplicativo nativo (Android/iOS), fora do escopo deste projeto.

## 🎤 Como funciona o comando de voz

Toque no ícone de microfone, fale algo como *"adicionar leite"* ou *"colocar detergente na lista"*, e o app:
1. Transcreve sua fala (via [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) do navegador, gratuita, sem servidor)
2. Remove palavras de comando ("adicionar", "à lista", etc.), extraindo só o nome do item
3. Categoriza o item por um dicionário de palavras-chave (o mesmo padrão do [Organizador de Arquivos](https://github.com/DionDefalt/organizador-arquivos): fácil de estender, edite o dicionário `PALAVRAS_POR_CATEGORIA` em `voz.js`)
4. Adiciona o item e confirma por voz

**Compatibilidade**: reconhecimento de voz funciona bem no Chrome (desktop e Android); no Safari/iPhone o suporte é limitado ou inexistente — nesse caso, o botão de microfone fica automaticamente escondido, em vez de aparecer e falhar sem explicação.

## 🖥️ Como usar

Não precisa de instalação nem servidor — é só abrir o `index.html` no navegador (de preferência num celular, ou reduzindo a janela do navegador no computador, já que o layout é mobile-first).

Para rodar localmente com um servidor simples (opcional, mas evita alguns bloqueios de navegador com `localStorage` em arquivos abertos direto):

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

## 🎨 Identidade visual

Paleta e tipografia pensadas para o domínio (organização doméstica): fundo claro e neutro, cor de categoria como sinalização (borda lateral colorida em cada item), e uma fonte de título mais descontraída (Baloo 2) combinada com uma fonte de corpo limpa e legível (Work Sans) para os itens da lista.

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

- [ ] Editar um item já adicionado (hoje só dá para excluir e recriar)
- [ ] Adicionar campo de busca para listas grandes
- [ ] Modo escuro
- [ ] Exportar/compartilhar a lista (ex: gerar link ou texto para enviar por WhatsApp)
- [ ] Ordenação automática por categoria dentro da lista
- [ ] Reconhecer quantidades faladas ("adicionar duas maçãs")
- [ ] Expandir o dicionário de categorização automática por voz

---

Feito como parte do meu aprendizado em desenvolvimento front-end.
