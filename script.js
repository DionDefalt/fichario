// ------------------------------------------------------
// Fichário — lista de tarefas com persistência local
// ------------------------------------------------------

const STORAGE_KEY = 'fichario.tasks';

// Estado da aplicação em memória.
// Cada tarefa: { id, text, done }
let tasks = loadTasks();
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

// Referências do DOM
const composer = document.getElementById('composer');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const counter = document.getElementById('counter');
const filtersNav = document.getElementById('filters');
const clearCompletedBtn = document.getElementById('clearCompleted');

// ------------------------------------------------------
// Persistência (localStorage)
// ------------------------------------------------------

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Não foi possível ler as tarefas salvas:', err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Não foi possível salvar as tarefas:', err);
  }
}

// ------------------------------------------------------
// Ações
// ------------------------------------------------------

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    text: trimmed,
    done: false,
  });

  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

// ------------------------------------------------------
// Renderização
// ------------------------------------------------------

function getFilteredTasks() {
  if (currentFilter === 'active') return tasks.filter((t) => !t.done);
  if (currentFilter === 'completed') return tasks.filter((t) => t.done);
  return tasks;
}

function render() {
  const visible = getFilteredTasks();

  taskList.innerHTML = '';
  visible.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'stack__item' + (task.done ? ' is-done' : '');

    li.innerHTML = `
      <input
        type="checkbox"
        class="stack__checkbox"
        ${task.done ? 'checked' : ''}
        aria-label="Marcar tarefa como concluída"
      />
      <span class="stack__text"></span>
      <button class="stack__delete" aria-label="Excluir tarefa">excluir</button>
    `;

    // Usamos textContent para o texto da tarefa, evitando
    // problemas de injeção de HTML vindos do input do usuário.
    li.querySelector('.stack__text').textContent = task.text;

    li.querySelector('.stack__checkbox').addEventListener('change', () => {
      toggleTask(task.id);
    });

    li.querySelector('.stack__delete').addEventListener('click', () => {
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });

  emptyState.hidden = visible.length > 0;

  const pending = tasks.filter((t) => !t.done).length;
  counter.textContent =
    pending === 1 ? '1 tarefa pendente' : `${pending} tarefas pendentes`;
}

// ------------------------------------------------------
// Eventos
// ------------------------------------------------------

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask(taskInput.value);
  taskInput.value = '';
  taskInput.focus();
});

filtersNav.addEventListener('click', (event) => {
  const btn = event.target.closest('.filters__btn');
  if (!btn) return;

  currentFilter = btn.dataset.filter;

  filtersNav
    .querySelectorAll('.filters__btn')
    .forEach((b) => b.classList.toggle('is-active', b === btn));

  render();
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// Primeira renderização ao carregar a página
render();
