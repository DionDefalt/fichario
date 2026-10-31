// Lista de Compras — camada de dados (Supabase).
//
// Este arquivo só conversa com o banco; quem desenha a tela é o script.js.
//
// Como funciona: o script.js mantém a lista em memória (variável `itens`) e
// chama Dados.agendar(...) sempre que ela muda. Aqui comparamos a lista atual
// com o último estado CONFIRMADO no servidor e enviamos só a diferença
// (novos e alterados via upsert, removidos via delete). Por isso o voz.js,
// que mexe nos itens diretamente, continua funcionando sem saber do banco.
//
// Segurança: as tabelas têm RLS, então cada usuário só enxerga as próprias
// linhas. O user_id nunca é enviado daqui: o banco preenche com auth.uid().

const Dados = (() => {
  const NOME_LISTA_PADRAO = "Minha lista";
  // Em milissegundos. Ficam num objeto para poderem ser ajustados nos testes.
  const atrasos = { sincronizacao: 400, novaTentativa: 5000 };

  let listaId = null;
  let snapshot = new Map(); // id do item -> assinatura do que o servidor já tem
  let obterItens = null;
  let temporizador = null;
  let emAndamento = false;
  let precisaDeNovaRodada = false;
  let comFalha = false;
  let aoMudarStatus = () => {};

  function cliente() {
    return window.supabaseClient;
  }

  // Só os campos que vão para o banco. Se algum mudar, o item é reenviado.
  function assinatura(item) {
    return JSON.stringify([item.nome, item.categoria, item.quantidade, item.comprado]);
  }

  function linhaParaItem(linha) {
    return {
      id: linha.id,
      nome: linha.nome,
      categoria: linha.categoria,
      quantidade: Number(linha.quantidade),
      comprado: !!linha.comprado,
    };
  }

  function itemParaLinha(item) {
    return {
      id: item.id,
      lista_id: listaId,
      nome: item.nome,
      categoria: item.categoria,
      quantidade: item.quantidade,
      comprado: item.comprado,
    };
  }

  function registrarNoSnapshot(itens) {
    itens.forEach((item) => snapshot.set(item.id, assinatura(item)));
  }

  // Garante que existe uma lista para o usuário (cria "Minha lista" no primeiro
  // acesso) e devolve os itens dela, do mais novo para o mais antigo.
  async function carregar() {
    const resposta = await cliente()
      .from("listas")
      .select("id")
      .order("criada_em", { ascending: true })
      .limit(1);
    if (resposta.error) throw resposta.error;

    if (resposta.data.length > 0) {
      listaId = resposta.data[0].id;
    } else {
      const criada = await cliente()
        .from("listas")
        .insert({ nome: NOME_LISTA_PADRAO })
        .select("id")
        .single();
      if (criada.error) throw criada.error;
      listaId = criada.data.id;
    }

    const itensResp = await cliente()
      .from("itens")
      .select("id, nome, categoria, quantidade, comprado")
      .eq("lista_id", listaId)
      .order("criado_em", { ascending: false });
    if (itensResp.error) throw itensResp.error;

    const itens = itensResp.data.map(linhaParaItem);
    snapshot = new Map();
    registrarNoSnapshot(itens);
    return itens;
  }

  // Envia para a conta os itens que estavam só no localStorage deste aparelho,
  // mantendo a ordem (o primeiro da lista é o mais novo).
  async function importar(itensLocais) {
    const base = Date.now();
    const linhas = itensLocais.map((item, posicao) => ({
      lista_id: listaId,
      nome: String(item.nome).trim(),
      categoria: item.categoria || "outros",
      quantidade: Math.min(99, Math.max(1, parseInt(item.quantidade, 10) || 1)),
      comprado: !!item.comprado,
      criado_em: new Date(base - posicao * 1000).toISOString(),
    }));

    const resposta = await cliente()
      .from("itens")
      .insert(linhas)
      .select("id, nome, categoria, quantidade, comprado, criado_em");
    if (resposta.error) throw resposta.error;

    const itens = resposta.data
      .slice()
      .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
      .map(linhaParaItem);
    registrarNoSnapshot(itens);
    return itens;
  }

  async function sincronizarUmaVez() {
    const atuais = obterItens();
    const idsAtuais = new Set();
    const paraGravar = [];

    atuais.forEach((item) => {
      idsAtuais.add(item.id);
      const sig = assinatura(item);
      if (snapshot.get(item.id) !== sig) paraGravar.push({ item, sig });
    });
    const paraRemover = [...snapshot.keys()].filter((id) => !idsAtuais.has(id));

    if (paraGravar.length > 0) {
      const { error } = await cliente()
        .from("itens")
        .upsert(paraGravar.map((g) => itemParaLinha(g.item)), { onConflict: "id" });
      if (error) throw error;
      // Guarda a assinatura do que FOI enviado: se o item mudou de novo
      // enquanto enviávamos, a próxima rodada percebe e reenvia.
      paraGravar.forEach((g) => snapshot.set(g.item.id, g.sig));
    }

    if (paraRemover.length > 0) {
      const { error } = await cliente().from("itens").delete().in("id", paraRemover);
      if (error) throw error;
      paraRemover.forEach((id) => snapshot.delete(id));
    }
  }

  async function rodarSincronizacao() {
    temporizador = null;
    if (emAndamento) {
      precisaDeNovaRodada = true;
      return;
    }

    emAndamento = true;
    try {
      do {
        precisaDeNovaRodada = false;
        await sincronizarUmaVez();
      } while (precisaDeNovaRodada);
      comFalha = false;
      aoMudarStatus("ok");
    } catch (erro) {
      console.error("Falha ao sincronizar com o Supabase:", erro);
      comFalha = true;
      aoMudarStatus("erro");
      temporizador = setTimeout(rodarSincronizacao, atrasos.novaTentativa);
    } finally {
      emAndamento = false;
    }
  }

  // Chamado pelo script.js a cada mudança. Espera um instante para juntar
  // várias mudanças seguidas (ex: o comando de voz marcando vários itens).
  function agendar(obterItensAtuais) {
    if (!listaId) return;
    obterItens = obterItensAtuais;
    clearTimeout(temporizador);
    temporizador = setTimeout(rodarSincronizacao, atrasos.sincronizacao);
  }

  // Envia agora o que estiver pendente (usado antes de sair da conta).
  // Lança erro se não conseguir.
  async function sincronizarAgora() {
    clearTimeout(temporizador);
    temporizador = null;
    if (!listaId || !obterItens) return;
    while (emAndamento) {
      await new Promise((resolver) => setTimeout(resolver, 50));
    }
    await sincronizarUmaVez();
    comFalha = false;
  }

  function temPendencias() {
    return comFalha || emAndamento || temporizador !== null;
  }

  return {
    atrasos,
    carregar,
    importar,
    agendar,
    sincronizarAgora,
    temPendencias,
    set aoMudarStatus(funcao) {
      aoMudarStatus = funcao;
    },
  };
})();
