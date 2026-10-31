// Lista de Compras — login com Supabase Auth (e-mail e senha).
//
// A chave abaixo é a "publishable key": foi feita para ficar no front-end.
// Quem protege os dados é o RLS do banco, não o sigilo desta chave.
// NUNCA coloque aqui a "secret key" / "service_role" do Supabase.

const SUPABASE_URL = "https://ndkewsordplnwufxacfq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zsbcfrXLdnOpKBN0hcf6OA_YNq6ZUnp";

const TAMANHO_MINIMO_SENHA = 8;

const telaLogin = document.getElementById("tela-login");
const formLogin = document.getElementById("form-login");
const inputEmail = document.getElementById("login-email");
const inputSenha = document.getElementById("login-senha");
const mensagemLogin = document.getElementById("login-mensagem");
const botaoEntrar = document.getElementById("login-entrar");
const botaoCriarConta = document.getElementById("login-criar");
const botaoSair = document.getElementById("botao-sair");

// Estado exposto para os outros scripts (script.js, proximidade.js...):
//   window.supabaseClient  -> cliente do Supabase (usado na etapa dos dados)
//   window.usuarioAtual    -> usuário logado, ou null
//   evento "usuario-logado" no document, disparado quando o login é confirmado
let supabaseClient = null;
window.usuarioAtual = null;

const MENSAGENS_ERRO = {
  invalid_credentials: "E-mail ou senha incorretos.",
  user_already_exists: "Já existe uma conta com esse e-mail. Toque em Entrar.",
  email_exists: "Já existe uma conta com esse e-mail. Toque em Entrar.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).",
  weak_password: `Senha fraca. Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  signup_disabled: "O cadastro de novas contas está desativado neste projeto.",
  validation_failed: "Confira o e-mail e a senha digitados.",
};

function traduzirErro(erro) {
  if (erro && MENSAGENS_ERRO[erro.code]) return MENSAGENS_ERRO[erro.code];
  if (erro && /fetch|network/i.test(erro.message || "")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }
  return "Não foi possível concluir. Tente de novo em instantes.";
}

function definirEstado(estado) {
  // "verificando" | "deslogado" | "logado" — o CSS usa isso para mostrar
  // a tela de login ou o app (ver style.css, bloco "Tela de login").
  document.body.dataset.auth = estado;
}

function mostrarMensagem(texto, tipo = "erro") {
  mensagemLogin.textContent = texto;
  mensagemLogin.dataset.tipo = tipo;
  mensagemLogin.hidden = !texto;
}

function marcarOcupado(ocupado) {
  botaoEntrar.disabled = ocupado;
  botaoCriarConta.disabled = ocupado;
}

function lerCampos() {
  return { email: inputEmail.value.trim(), senha: inputSenha.value };
}

async function entrar() {
  const { email, senha } = lerCampos();
  if (!email || !senha) {
    mostrarMensagem("Preencha o e-mail e a senha.");
    return;
  }

  mostrarMensagem("");
  marcarOcupado(true);
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  marcarOcupado(false);

  // Em caso de sucesso, quem troca a tela é o onAuthStateChange (abaixo).
  if (error) mostrarMensagem(traduzirErro(error));
}

async function criarConta() {
  const { email, senha } = lerCampos();
  if (!email.includes("@")) {
    mostrarMensagem("Digite um e-mail válido.");
    return;
  }
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    mostrarMensagem(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    return;
  }

  mostrarMensagem("");
  marcarOcupado(true);

  const opcoes = {};
  // Para onde o link do e-mail de confirmação (se estiver ligado) leva de
  // volta. Só faz sentido em http(s): em file:// não há endereço para voltar.
  if (location.protocol === "http:" || location.protocol === "https:") {
    opcoes.emailRedirectTo = location.origin + location.pathname;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password: senha,
    options: opcoes,
  });
  marcarOcupado(false);

  if (error) {
    mostrarMensagem(traduzirErro(error));
    return;
  }

  // Com a confirmação de e-mail ligada, e-mail já cadastrado volta "sem erro",
  // mas com a lista de identidades vazia (o Supabase evita revelar quem existe).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    mostrarMensagem("Já existe uma conta com esse e-mail. Toque em Entrar.");
    return;
  }

  // Confirmação desligada: o cadastro já devolve a sessão e o
  // onAuthStateChange abre o app. Confirmação ligada: não há sessão ainda.
  if (!data.session) {
    mostrarMensagem(
      `Conta criada! Enviamos um e-mail de confirmação para ${email}. Confirme e depois toque em Entrar.`,
      "info"
    );
  }
}

async function sair() {
  // Salva o que ainda estiver pendente antes de encerrar a sessão — depois
  // de sair o banco não aceita mais gravações deste usuário.
  if (typeof Dados !== "undefined") {
    try {
      await Dados.sincronizarAgora();
    } catch (erro) {
      const sairMesmoAssim = window.confirm(
        "Não foi possível salvar as últimas alterações (sem conexão?). Sair mesmo assim e perdê-las?"
      );
      if (!sairMesmoAssim) return;
    }
  }
  await supabaseClient.auth.signOut();
  // Recarrega a página para zerar todo o estado em memória (lista, localização,
  // conversa por voz) e não deixar nada da sessão anterior para trás.
  location.reload();
}

function iniciar() {
  if (!window.supabase || !window.supabase.createClient) {
    definirEstado("deslogado");
    mostrarMensagem("Não foi possível carregar o serviço de login. Verifique sua internet e recarregue a página.");
    marcarOcupado(true);
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.supabaseClient = supabaseClient;

  // Dispara na abertura da página (com a sessão guardada, se houver), no login,
  // na saída e na renovação automática do token. Não chamar o Supabase de
  // dentro deste callback — só atualizar estado e tela.
  supabaseClient.auth.onAuthStateChange((evento, sessao) => {
    if (sessao && sessao.user) {
      const mudouUsuario = !window.usuarioAtual || window.usuarioAtual.id !== sessao.user.id;
      window.usuarioAtual = sessao.user;
      definirEstado("logado");
      mostrarMensagem("");
      formLogin.reset();
      if (mudouUsuario) {
        document.dispatchEvent(new CustomEvent("usuario-logado", { detail: sessao.user }));
      }
    } else {
      window.usuarioAtual = null;
      definirEstado("deslogado");
    }
  });

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    entrar();
  });
  botaoCriarConta.addEventListener("click", criarConta);
  botaoSair.addEventListener("click", sair);
}

iniciar();
