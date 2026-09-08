# 📇 Fichário — Lista de Tarefas

Uma lista de tarefas simples, feita em **HTML, CSS e JavaScript puros** (sem frameworks), com persistência local via `localStorage`. Cada tarefa é tratada como uma "ficha" que você arquiva, marca como concluída ou descarta.

![status](https://img.shields.io/badge/status-em%20desenvolvimento-e8b94b)

## ✨ Funcionalidades

- Adicionar novas tarefas
- Marcar tarefas como concluídas
- Excluir tarefas individualmente
- Filtrar por: todas / pendentes / concluídas
- Limpar todas as concluídas de uma vez
- Os dados persistem no navegador (não somem ao recarregar a página)

## 🖥️ Como rodar localmente

Não é preciso instalar nada. Basta abrir o arquivo `index.html` no navegador:

```bash
git clone https://github.com/SEU-USUARIO/fichario.git
cd fichario
```

Depois, dê duplo clique em `index.html` ou abra com a extensão **Live Server** do VS Code.

## 🗂️ Estrutura do projeto

```
fichario/
├── index.html    # estrutura da página
├── style.css     # estilos e identidade visual
├── script.js     # lógica da aplicação
└── README.md
```

## 🧠 O que este projeto demonstra

- Manipulação do DOM sem bibliotecas
- Persistência de dados no navegador com `localStorage`
- Organização de código em responsabilidades separadas (HTML / CSS / JS)
- Boas práticas básicas de acessibilidade (labels, foco visível, `aria-live`)

## 🚀 Próximos passos (ideias de evolução)

- [ ] Adicionar categorias/tags nas tarefas
- [ ] Permitir editar uma tarefa já criada
- [ ] Adicionar suporte a drag-and-drop para reordenar
- [ ] Migrar o armazenamento para uma API própria (evolução para o projeto full-stack)

---

Feito como parte do meu aprendizado em desenvolvimento front-end.
