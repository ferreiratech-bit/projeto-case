import {
  DEFAULT_SCHEDULE,
  DEFAULT_PROGRAMS,
  addMinutes,
  buildVisitTimeline,
  dateKey,
  directionsUrl,
  estimateVisitCosts,
  formatCsv,
  formatCurrency,
  formatDate,
  monthKey,
  parseDate,
  todayKey,
  validateSchedule,
} from "./core.mjs";

const STORAGE_KEY = "case-vivo.admin.v1";
const COMPLEX_SCOPE = "Complexo (geral)";
const CASE_UNITS = [
  { name: "Case Viver", code: "01", icon: "⌂", description: "Educação ambiental, trilhas, viveiro e atividades pedagógicas.", tone: "viver" },
  { name: "Case Ilha Verde", code: "02", icon: "◌", description: "Visitação ambiental, lazer e roteiros da proposta pedagógica.", tone: "ilha" },
  { name: "Case Agro", code: "03", icon: "❋", description: "Eixo agroambiental do complexo.", tone: "agro" },
  { name: "Case Água", code: "04", icon: "≈", description: "Eixo relacionado à água dentro do complexo.", tone: "agua" },
  { name: "EMPORIO", code: "05", icon: "◇", description: "Ponto comercial conectado às atividades do complexo.", tone: "emporio" },
];
const UNIT_OPTIONS = [...CASE_UNITS.map((unit) => [unit.name, unit.name]), [COMPLEX_SCOPE, "Uso compartilhado pelo complexo"]];
const PAGE_TITLES = {
  dashboard: "Complexo ambiental",
  programs: "Projeto pedagógico",
  agenda: "Agenda",
  visits: "Agenda e visitações",
  maintenance: "Manutenção",
  library: "Cadastros",
  finance: "Cardápio e custos",
  reports: "Relatórios",
  settings: "Configurações",
  "case-space": "Unidade",
};
const LIBRARY_TABS = {
  schools: { title: "Escolas", action: "school", add: "Cadastrar escola", columns: ["Escola / origem", "Distância", "Deslocamento", "Contato", "Ações"] },
  spaces: { title: "Espaços", action: "space", add: "Cadastrar espaço", columns: ["Espaço", "Unidade", "Descrição", "Ações"] },
  equipment: { title: "Equipamentos", action: "equipment", add: "Cadastrar equipamento", columns: ["Equipamento", "Unidade", "Quantidade", "Condição", "Ações"] },
  vehicles: { title: "Veículos", action: "vehicle", add: "Cadastrar veículo", columns: ["Veículo", "Unidade", "Assentos por veículo", "Unidades", "Ações"] },
  staff: { title: "Colaboradores", action: "staff", add: "Cadastrar colaborador", columns: ["Colaborador", "Atuação", "Contato", "Horas programadas", "Ações"] },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => globalThis.crypto?.randomUUID?.() ?? `case-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const escapeAttribute = escapeHtml;
const escapeCsv = formatCsv;
const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
};
const startOfMonth = (date = new Date()) => `${dateKey(new Date(date.getFullYear(), date.getMonth(), 1))}`;
const endOfMonth = (date = new Date()) => `${dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))}`;

function isExampleMenuItem(item) {
  const examples = {
    lanche: ["Alimentação", "porção"],
    suco: ["Alimentação", "copo"],
    fruta: ["Alimentação", "unidade"],
    copo: ["Utensílios", "unidade"],
    prato: ["Utensílios", "unidade"],
    guardanapo: ["Utensílios", "unidade"],
  };
  const match = examples[String(item.name || "").toLocaleLowerCase("pt-BR")];
  return Boolean(match)
    && item.category === match[0]
    && item.unit === match[1]
    && Number(item.perStudent) === 1
    && Number(item.unitCost) === 0;
}

function makeDefaultState() {
  const routeMaterials = DEFAULT_PROGRAMS.find((program) => program.id === "fundamental-ii-viver").materials;
  return {
    version: 2,
    seedRevision: 1,
    visits: [],
    programs: DEFAULT_PROGRAMS.map((program) => structuredClone(program)),
    maintenance: [
      { id: uid(), title: "Aparar a grama", site: "Case Viver", space: "Espaço e prazo a confirmar", dueDate: "", status: "pendente", assignee: "", notes: "Exemplo inicial solicitado pelo administrador. Confirmar o local, o responsável e a data antes de tratar como ordem de serviço." },
      { id: uid(), title: "Limpeza geral dos ambientes", site: "Case Viver", space: "Ambientes a confirmar", dueDate: "", status: "pendente", assignee: "", notes: "Exemplo inicial solicitado pelo administrador. Definir os ambientes, a equipe responsável e o prazo." },
      { id: uid(), title: "Aparar a grama", site: "Case Ilha Verde", space: "Espaço e prazo a confirmar", dueDate: "", status: "pendente", assignee: "", notes: "Exemplo inicial solicitado pelo administrador. Confirmar o local, o responsável e a data antes de tratar como ordem de serviço." },
      { id: uid(), title: "Limpeza geral dos ambientes", site: "Case Ilha Verde", space: "Ambientes a confirmar", dueDate: "", status: "pendente", assignee: "", notes: "Exemplo inicial solicitado pelo administrador. Definir os ambientes, a equipe responsável e o prazo." },
    ],
    schools: [],
    spaces: [
      { id: uid(), name: "Trilhas e figueira", site: "Case Viver", notes: "Trilha e área de observação descritas na proposta pedagógica." },
      { id: uid(), name: "Lago", site: "Case Viver", notes: "Percurso com parada para observação da natureza." },
      { id: uid(), name: "Mirante da sanga", site: "Case Viver", notes: "Percurso descrito para a trilha média e longa." },
      { id: uid(), name: "Ponte de madeira e campo", site: "Case Viver", notes: "Percurso descrito para a trilha longa." },
      { id: uid(), name: "Viveiro", site: "Case Viver", notes: "Localização indicada pelo administrador." },
      { id: uid(), name: "Quadra de areia e brinquedos", site: "Case Viver", notes: "Espaços recreativos citados na proposta." },
      { id: uid(), name: "Horta de orgânicos", site: "Case Viver", notes: "Acesso e atividades conforme confirmação da equipe." },
      { id: uid(), name: "Trilhas e lago", site: "Case Ilha Verde", notes: "Espaço de visitação a conferir." },
      { id: uid(), name: "Case Agro", site: "Case Ilha Verde", notes: "Animais, biodigestor e leiras de adubo conforme a proposta." },
      { id: uid(), name: "Usina fotovoltaica e fábrica de água", site: "Case Ilha Verde", notes: "Visitação conforme roteiro, capacidade e liberação da equipe." },
      { id: uid(), name: "Quadra e espaços de lazer", site: "Case Ilha Verde", notes: "Quadra, balanços e mesa de sinuca citados na proposta." },
    ],
    equipment: [
      { id: uid(), name: "Tirolesa", site: "Case Ilha Verde", quantity: null, condition: "A confirmar com a equipe", notes: "Unidade informada pelo administrador. Conferir funcionamento, requisitos de segurança e supervisão antes da visita." },
      { id: uid(), name: "Viveiro", site: "Case Viver", quantity: null, condition: "A confirmar com a equipe", notes: "Local indicado pelo administrador." },
      { id: uid(), name: "Pedalinhos", site: "Case Ilha Verde", quantity: null, condition: "Conferir antes de cada visita", notes: "Atividade citada na proposta. Quantidade e disponibilidade a informar." },
      { id: uid(), name: "Petecas", site: "Case Viver", quantity: null, condition: "Conferir antes de cada visita", notes: "Atividade recreativa citada na proposta. Quantidade a informar." },
      { id: uid(), name: "Brinquedos", site: "Case Viver", quantity: null, condition: "Conferir antes de cada visita", notes: "Recursos recreativos citados na proposta." },
      { id: uid(), name: "Perna de pau", site: "Case Viver", quantity: null, condition: "Conferir antes de cada visita", notes: "Atividade recreativa citada na proposta." },
      { id: uid(), name: "Bolas de futebol e vôlei", site: "Case Viver", quantity: null, condition: "Conferir antes de cada visita", notes: "Atividades e quadra citadas na proposta." },
      { id: uid(), name: "Balanços", site: "Case Ilha Verde", quantity: null, condition: "Conferir antes de cada visita", notes: "Espaço de lazer citado na proposta." },
      { id: uid(), name: "Mesa de sinuca", site: "Case Ilha Verde", quantity: null, condition: "Conferir antes de cada visita", notes: "Espaço de lazer citado na proposta." },
      { id: uid(), name: "Lupas de mão", site: "Case Viver", quantity: null, condition: "Conferir antes de cada visita", notes: "Auxílio para observação de insetos nas trilhas." },
      { id: uid(), name: "Puçás para observação", site: "Case Viver", quantity: null, condition: "A confirmar com a equipe", notes: "A proposta menciona puçás. Confirmar protocolo e autorizações; preferir observação sem captura." },
      ...routeMaterials.map((name) => ({ id: uid(), name, site: "Case Viver", quantity: null, condition: "Quantidade a confirmar", notes: "Material pedagógico citado na proposta para o Ensino Fundamental II." })),
    ],
    vehicles: [],
    staff: [],
    financeItems: [],
    documents: [],
    settings: {
      name: "CASE VIVER",
      caseViverAddress: "",
      ilhaVerdeAddress: "",
      schedule: DEFAULT_SCHEDULE.map((block) => ({ ...block })),
      interleavedSchedule: DEFAULT_SCHEDULE.map((block) => ({ ...block })),
      calendarMonth: monthKey(new Date()),
      libraryTab: "schools",
    },
  };
}

function readState(raw = localStorage.getItem(STORAGE_KEY)) {
  if (!raw) return makeDefaultState();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Não foi possível ler os dados salvos. Exporte o arquivo de dados antes de limpar o armazenamento. ${error.message}`);
  }
  if (!parsed || ![1, 2].includes(parsed.version)) {
    throw new Error("Os dados salvos pertencem a outra versão do sistema. Exporte-os antes de continuar.");
  }
  const defaults = makeDefaultState();
  const mergeLibrary = (current, seeded) => {
    const present = new Set(current.map((record) => `${record.name.toLocaleLowerCase("pt-BR")}|${record.site}`));
    return [...current, ...seeded.filter((record) => !present.has(`${record.name.toLocaleLowerCase("pt-BR")}|${record.site}`))];
  };
  for (const key of ["visits", "maintenance", "schools", "spaces", "equipment", "vehicles", "staff", "financeItems"]) {
    if (!Array.isArray(parsed[key])) throw new Error(`Os dados salvos para “${key}” estão incompletos. Faça uma cópia antes de restaurar um backup válido.`);
  }
  validateSchedule(parsed.settings?.schedule ?? defaults.settings.schedule);
  validateSchedule(parsed.settings?.interleavedSchedule ?? parsed.settings?.schedule ?? defaults.settings.interleavedSchedule);
  const programs = parsed.programs ?? defaults.programs;
  for (const program of programs) validateSchedule(program.schedule);
  return {
    ...defaults,
    ...parsed,
    version: 2,
    programs: structuredClone(programs),
    maintenance: parsed.version === 1 && parsed.maintenance.length === 0 ? defaults.maintenance : parsed.maintenance,
    spaces: parsed.version === 1 ? mergeLibrary(parsed.spaces, defaults.spaces) : parsed.spaces,
    equipment: parsed.version === 1 ? mergeLibrary(parsed.equipment, defaults.equipment) : parsed.equipment,
    staff: parsed.staff
      .filter((person) => person.notes !== "Nome na equipe responsável indicada pela proposta; a função individual não está especificada.")
      .map((person) => ({
        ...person,
        role: person.role === "Equipe indicada na proposta" ? "Função a confirmar" : person.role,
      })),
    financeItems: parsed.financeItems
      .filter((item) => !isExampleMenuItem(item))
      .map((item) => ({ ...item, site: item.site || COMPLEX_SCOPE })),
    documents: Array.isArray(parsed.documents) ? parsed.documents : defaults.documents,
    settings: {
      ...defaults.settings,
      ...(parsed.settings ?? {}),
      interleavedSchedule: parsed.settings?.interleavedSchedule
        ?? parsed.settings?.schedule
        ?? defaults.settings.interleavedSchedule,
    },
  };
}

let state;
let restoredFormDrafts = [];
let activePage = "dashboard";
let activeUnit = CASE_UNITS[0].name;
let calendarMonth = parseDate(`${monthKey(new Date())}-01`);
let reportArea = "visits";
let reportFrom = startOfMonth();
let reportTo = endOfMonth();
let reportData = { columns: [], rows: [], stats: [] };
let libraryQuery = "";
let toastTimer;

const storageAvailable = (() => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
})();

function persist() {
  const serialized = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error("o navegador não confirmou a gravação local dos dados");
  } catch (error) {
    throw new Error(`Não foi possível salvar neste navegador: ${error.message}`);
  }

  fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: serialized,
  }).then(async (response) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.saved) throw new Error(result.error || "o servidor não confirmou o salvamento centralizado");
    updateStorageStatus(true);
  }).catch((error) => {
    updateStorageStatus(false);
    console.error("Não foi possível atualizar os dados centralizados:", error);
  });
  return true;
}

function updateStorageStatus(online) {
  const card = document.querySelector(".offline-card");
  const indicator = card?.querySelector(".online-indicator");
  const copy = card?.querySelector("span:last-child small");
  if (!card || !indicator || !copy) return;
  indicator.classList.toggle("offline", !online);
  copy.textContent = online ? "Dados compartilhados em todos os computadores" : "Apenas cópia local; verifique o servidor";
}

let formImportTimer;
function collectAndImportForms() {
  const forms = [...document.querySelectorAll("form")].map((form) => {
    const fields = {};
    for (const element of form.elements) {
      if (!element.name) continue;
      if (element instanceof HTMLInputElement && element.type === "checkbox") {
        (fields[element.name] ||= []).push(element.checked ? element.value : "");
      } else if (element instanceof HTMLInputElement && element.type === "file") {
        fields[element.name] = element.files?.[0]?.name || "";
      } else {
        fields[element.name] = element.value;
      }
    }
    return { id: form.id || "", fields };
  });
  fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ fields: Object.assign({}, ...forms.map((form) => form.fields)) }),
  }).catch((error) => console.warn("Não foi possível importar os campos do formulário:", error));
}

function scheduleFormImport() {
  window.clearTimeout(formImportTimer);
  formImportTimer = window.setTimeout(collectAndImportForms, 500);
}

function notify(message, error = false) {
  const region = $("#toast-region");
  if (!region) return;
  window.clearTimeout(toastTimer);
  region.innerHTML = `<div class="toast${error ? " error" : ""}">${escapeHtml(message)}</div>`;
  toastTimer = window.setTimeout(() => { region.innerHTML = ""; }, 4200);
}

function getSchoolName(visit) {
  const school = state.schools.find((entry) => entry.id === visit.schoolId);
  return school?.name || visit.schoolName || "Escola não informada";
}

function getStaffName(id) {
  return state.staff.find((entry) => entry.id === id)?.name || "Colaborador removido";
}

function getProgram(visit) {
  return state.programs.find((program) => program.id === visit.programId) ?? null;
}

function getVisitSchedule(visit) {
  return visit.mode === "interleaved"
    ? state.settings.interleavedSchedule
    : getProgram(visit)?.schedule ?? state.settings.schedule;
}

function buildVisitAgenda(visit) {
  const program = visit.mode === "interleaved" ? null : getProgram(visit);
  return buildVisitTimeline(visit, getVisitSchedule(visit), program);
}

function getVisitStaffHours(visit) {
  return (visit.staffAssignments ?? []).reduce((total, entry) => total + Number(entry.hours || 0), 0);
}

function isUpcoming(visit) {
  return visit.status !== "cancelada" && visit.date >= todayKey();
}

function getNextVisits() {
  return state.visits
    .filter(isUpcoming)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function getSiteAddress(site) {
  if (site === "Case Viver") return state.settings.caseViverAddress;
  if (site === "Case Ilha Verde") return state.settings.ilhaVerdeAddress;
  return "";
}

function go(page) {
  const pageTitle = page === "case-space" ? activeUnit : PAGE_TITLES[page];
  if (!pageTitle) return;
  activePage = page;
  $$(".page-view").forEach((view) => {
    const active = view.dataset.view === page;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });
  $$(".nav-link").forEach((link) => link.classList.toggle(
    "active",
    link.dataset.nav === page || (page === "case-space" && link.dataset.unit === activeUnit),
  ));
  $("#breadcrumb-current").textContent = pageTitle;
  $("#sidebar").classList.remove("open");
  updateMenuToggle();
  renderPage(page);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPage(page) {
  $("#visit-count").textContent = String(getNextVisits().length);
  $("#maintenance-dot").hidden = !state.maintenance.some((task) => task.status !== "concluída");
  const renderers = {
    dashboard: renderDashboard,
    "case-space": renderCaseSpace,
    programs: renderPrograms,
    agenda: renderAgenda,
    visits: renderVisits,
    maintenance: renderMaintenance,
    library: renderLibrary,
    finance: renderFinance,
    reports: renderReports,
    settings: renderSettings,
  };
  renderers[page]?.();
}

function heading(kicker, title, description, actions = "") {
  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">${escapeHtml(kicker)}</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="page-subtitle">${escapeHtml(description)}</p>
      </div>
      ${actions ? `<div class="heading-actions">${actions}</div>` : ""}
    </div>`;
}

function pageActions({ add = "", report = false } = {}) {
  const items = [];
  if (report) items.push(`<button class="button button-outline" data-action="print"><span>▤</span> Imprimir</button>`);
  if (add) items.push(`<button class="button button-primary" data-action="${escapeAttribute(add)}"><span>＋</span> Adicionar</button>`);
  return items.join("");
}

function statusPill(status) {
  const label = {
    planejada: "Planejada",
    confirmada: "Confirmada",
    concluída: "Concluída",
    cancelada: "Cancelada",
    pendente: "Pendente",
    "em andamento": "Em andamento",
  }[status] ?? status ?? "Sem situação";
  return `<span class="status-pill status-${escapeAttribute(status || "")}">${escapeHtml(label)}</span>`;
}

function sitePill(site) {
  return `<span class="site-pill${site === "Case Ilha Verde" ? " ilha" : ""}">${escapeHtml(site)}</span>`;
}

function metricCard(label, value, note, icon) {
  return `<div class="metric-card"><div class="metric-top"><span class="metric-label">${escapeHtml(label)}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${escapeHtml(value)}</div><div class="metric-caption">${escapeHtml(note)}</div></div>`;
}

function emptyState(icon, title, message, action = "") {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>${action ? `<button class="text-button" data-action="${escapeAttribute(action)}">Adicionar agora →</button>` : ""}</div>`;
}

function dateTile(date) {
  const parsed = parseDate(date);
  if (!parsed) return "";
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(parsed).replace(".", "");
  return `<span class="date-tile"><strong>${parsed.getDate()}</strong><small>${escapeHtml(month)}</small></span>`;
}

function renderDashboard() {
  const nextVisits = getNextVisits();
  const nextStudents = nextVisits.reduce((sum, visit) => sum + Number(visit.students || 0), 0);
  const openTasks = state.maintenance.filter((task) => task.status !== "concluída").length;
  const forecast = estimateVisitCosts(nextVisits, state.financeItems).total;
  const unitCards = CASE_UNITS.map((unit) => `
    <button class="unit-orbit-card ${unit.tone}" data-unit="${escapeAttribute(unit.name)}" aria-label="Abrir ${escapeAttribute(unit.name)}">
      <span class="unit-orbit-icon" aria-hidden="true">${unit.icon}</span>
      <span class="unit-orbit-code">${unit.code}</span>
      <strong>${escapeHtml(unit.name)}</strong>
      <small>${escapeHtml(unit.description)}</small>
      <span class="unit-orbit-arrow">Abrir unidade <b>↗</b></span>
    </button>`).join("");
  const modules = [
    { title: "Equipamentos", description: "Inventário por CASE", icon: "▤", action: "open-module", module: "equipment" },
    { title: "Cardápio", description: "Quantidades e custo por aluno", icon: "◉", action: "open-module", module: "menu" },
    { title: "Colaboradores", description: "Cadastro manual por unidade", icon: "◎", action: "open-module", module: "staff" },
    { title: "Agenda", description: "Visitas, datas e grupos", icon: "▦", nav: "agenda" },
    { title: "Manutenção", description: "Demandas e prazos", icon: "⌁", nav: "maintenance" },
    { title: "Relatórios", description: "Resumo por área", icon: "▥", nav: "reports" },
  ].map((module) => `
    <button class="module-orbit-card" ${module.nav ? `data-nav="${module.nav}"` : `data-action="${module.action}" data-module="${module.module}"`}>
      <span class="module-orbit-icon" aria-hidden="true">${module.icon}</span>
      <span><strong>${module.title}</strong><small>${module.description}</small></span>
      <b class="module-arrow">↗</b>
    </button>`).join("");
  const programCards = state.programs.map((program, index) => `
    <button class="project-route-card" data-nav="programs">
      <span class="project-route-index">0${index + 1}</span>
      <span><strong>${escapeHtml(program.stage)}</strong><small>${escapeHtml(program.age)} · ${escapeHtml(program.site)}</small><small class="project-route-objective">${escapeHtml(program.objective)}</small></span>
      <span class="module-arrow">↗</span>
    </button>`).join("");
  $("#page-dashboard").innerHTML = `
    <section class="complex-cover" aria-label="Complexo Ambiental Sustentável e Educacional">
      <div class="cover-copy">
        <div class="cover-eyebrow"><span></span> PROJETO PEDAGÓGICO · PAINEL ADMINISTRATIVO</div>
        <h1>COMPLEXO AMBIENTAL <em>SUSTENTÁVEL E EDUCACIONAL</em></h1>
        <p>Uma proposta integrada de educação, natureza e sustentabilidade. Acesse cada eixo do complexo e organize os dados pedagógicos, operacionais e econômicos.</p>
        <div class="cover-signature"><span>4 EIXOS</span><i></i><span>1 PONTO COMERCIAL</span><i></i><span>UM COMPLEXO</span></div>
      </div>
      <div class="cover-graphic" aria-hidden="true"><div class="cover-ring ring-one"></div><div class="cover-ring ring-two"></div><div class="cover-emblem"><span>CASE</span><strong>+</strong><span>EMPORIO</span></div><div class="cover-node node-viver">VIVER</div><div class="cover-node node-ilha">ILHA VERDE</div><div class="cover-node node-agro">AGRO</div><div class="cover-node node-agua">ÁGUA</div></div>
    </section>
    <section class="home-section document-manager">
      <div class="document-manager-heading">
        <div><div class="eyebrow">PROPOSTA PEDAGÓGICA ENCAMINHADA</div><h2>Gerenciamento de documentos</h2><p>Organize arquivos PDF ou Word relacionados ao projeto pedagógico.</p></div>
        <label class="button document-upload-button" for="document-upload"><span aria-hidden="true">＋</span> Inserir Documento (PDF / Word)</label>
        <input class="document-upload-input" id="document-upload" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
      </div>
      <div class="document-list" id="document-list">
        ${state.documents.map((document) => {
          const extension = document.name.split(".").pop()?.toUpperCase() || "ARQUIVO";
          const size = document.size ? `${Math.max(1, Math.round(document.size / 1024))} KB` : "Tamanho não informado";
          const isPdf = document.type === "pdf";
          const action = isPdf ? "open-document" : "download-document";
          const actionLabel = isPdf ? "Abrir PDF" : "Baixar Word";
          return `<article class="document-item"><div class="document-file-icon">${escapeHtml(extension)}</div><div class="document-file-info"><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(size)}${document.addedAt ? ` · Adicionado em ${escapeHtml(document.addedAt)}` : ""}</small></div><button class="document-open" type="button" data-action="${action}" data-id="${escapeAttribute(document.id)}" ${document.dataUrl ? "" : "disabled"}>${actionLabel}</button><button class="document-delete" type="button" data-action="delete-document" data-id="${escapeAttribute(document.id)}" title="Excluir ${escapeAttribute(document.name)}" aria-label="Excluir ${escapeAttribute(document.name)}">🗑<span>Excluir</span></button></article>`;
        }).join("") || `<div class="document-empty"><span>▤</span><strong>Nenhum documento anexado</strong><small>Use o botão acima para inserir um PDF ou arquivo Word.</small></div>`}
      </div>
    </section>
    <section class="overview-strip" aria-label="Resumo quantitativo e econômico">
      <div class="overview-item"><span class="overview-label">VISITAÇÕES PREVISTAS</span><strong>${nextVisits.length}</strong><small>${nextStudents} alunos cadastrados</small></div>
      <div class="overview-item"><span class="overview-label">DEMANDAS EM ABERTO</span><strong>${openTasks}</strong><small>manutenções a acompanhar</small></div>
      <div class="overview-item"><span class="overview-label">EQUIPE CADASTRADA</span><strong>${state.staff.length}</strong><small>${state.staff.length ? "nomes inseridos manualmente" : "aguardando cadastro manual"}</small></div>
      <div class="overview-item overview-finance"><span class="overview-label">CUSTO PROJETADO</span><strong>${escapeHtml(formatCurrency(forecast))}</strong><small>estimativa com os valores cadastrados</small></div>
    </section>
    <section class="home-section">
      <div class="home-section-heading"><div><div class="eyebrow">NAVEGAÇÃO DO COMPLEXO</div><h2>Escolha um eixo para acessar</h2></div><span class="home-section-note">Cada janela organiza os dados da sua unidade</span></div>
      <div class="unit-orbit-grid">${unitCards}</div>
    </section>
    <section class="home-section modules-section">
      <div class="home-section-heading"><div><div class="eyebrow">ROTINA ADMINISTRATIVA</div><h2>Controles do dia a dia</h2></div><span class="home-section-note">Cadastros e cálculos atualizados manualmente</span></div>
      <div class="module-orbit-grid">${modules}</div>
    </section>`;
}

function renderCaseSpace() {
  const unit = CASE_UNITS.find((entry) => entry.name === activeUnit);
  if (!unit) throw new Error("Unidade do complexo não encontrada.");
  const equipment = state.equipment.filter((item) => item.site === unit.name);
  const menu = state.financeItems.filter((item) => item.site === unit.name || item.site === COMPLEX_SCOPE);
  const staff = state.staff.filter((person) => person.site === unit.name || person.site === COMPLEX_SCOPE || !person.site);
  const visits = getNextVisits().filter((visit) => visit.site === unit.name);
  const pupils = visits.reduce((sum, visit) => sum + Number(visit.students || 0), 0);
  const menuProjection = estimateVisitCosts(visits, menu).total;
  const itemRows = equipment.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.condition || "Condição a confirmar")}</small></td><td>${item.quantity === null || item.quantity === "" || item.quantity === undefined ? "A informar" : Number(item.quantity)}</td><td><div class="table-actions"><button class="table-action" data-action="edit-equipment" data-id="${escapeAttribute(item.id)}">Editar</button><button class="table-action delete" data-action="delete-library" data-tab="equipment" data-id="${escapeAttribute(item.id)}">Excluir</button></div></td></tr>`).join("");
  const menuRows = menu.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${Number(item.perStudent)} ${escapeHtml(item.unit || "unid.")} por aluno</small></td><td>${escapeHtml(formatCurrency(item.unitCost))}</td><td><strong>${escapeHtml(formatCurrency(Number(item.unitCost || 0) * Number(item.perStudent || 0) * pupils))}</strong><small>projeção para ${pupils} aluno(s)</small></td><td><div class="table-actions"><button class="table-action" data-action="edit-finance-item" data-id="${escapeAttribute(item.id)}">Editar</button><button class="table-action delete" data-action="delete-library" data-tab="financeItems" data-id="${escapeAttribute(item.id)}">Excluir</button></div></td></tr>`).join("");
  const staffRows = staff.map((person) => {
    const assignedHours = visits.reduce((sum, visit) => sum + (visit.staffAssignments ?? []).filter((assignment) => assignment.staffId === person.id).reduce((hours, assignment) => hours + Number(assignment.hours || 0), 0), 0);
    return `<tr><td><strong>${escapeHtml(person.name)}</strong></td><td>${escapeHtml(person.role || "Atuação a definir")}</td><td>${assignedHours || "—"}${assignedHours ? " h" : ""}</td><td><div class="table-actions"><button class="table-action" data-action="edit-staff" data-id="${escapeAttribute(person.id)}">Editar</button><button class="table-action delete" data-action="delete-library" data-tab="staff" data-id="${escapeAttribute(person.id)}">Excluir</button></div></td></tr>`;
  }).join("");
  $("#page-case-space").innerHTML = `
    <section class="unit-page-hero ${unit.tone}">
      <button class="unit-back-link" data-nav="dashboard">← Voltar ao complexo</button>
      <div class="unit-page-hero-content"><span class="unit-page-emblem">${unit.icon}</span><div><div class="eyebrow">${unit.code} · EIXO DO COMPLEXO</div><h1>${escapeHtml(unit.name)}</h1><p>${escapeHtml(unit.description)}</p></div></div>
      <div class="unit-hero-metrics"><span><strong>${visits.length}</strong> visitações previstas</span><span><strong>${pupils}</strong> alunos</span><span><strong>${escapeHtml(formatCurrency(menuProjection))}</strong> cardápio estimado</span></div>
    </section>
    <div class="unit-module-grid">
      <section class="unit-module-panel">
        <div class="unit-module-heading"><div><span class="unit-module-icon">▤</span><div><h2>Equipamentos</h2><p>${equipment.length} registro(s) nesta unidade</p></div></div><button class="button button-primary button-small" data-action="add-unit-equipment">＋ Incluir</button></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Equipamento</th><th>Quantidade</th><th>Ações</th></tr></thead><tbody>${itemRows || `<tr><td colspan="3" class="table-empty">Nenhum equipamento cadastrado para ${escapeHtml(unit.name)}. Use “Incluir” para começar.</td></tr>`}</tbody></table></div>
      </section>
      <section class="unit-module-panel">
        <div class="unit-module-heading"><div><span class="unit-module-icon meal-icon">◉</span><div><h2>Cardápio e custos</h2><p>Alimentos e utensílios · ${escapeHtml(formatCurrency(menuProjection))} projetados</p></div></div><button class="button button-primary button-small" data-action="add-unit-menu">＋ Incluir item</button></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Item / quantidade por aluno</th><th>Preço unitário</th><th>Total previsto</th><th>Ações</th></tr></thead><tbody>${menuRows || `<tr><td colspan="4" class="table-empty">Nenhum item de cardápio cadastrado para esta unidade.</td></tr>`}</tbody></table></div>
        <p class="unit-module-note">A projeção usa somente visitas futuras e os preços e quantidades que você cadastrar. Itens do complexo geral são considerados nesta unidade.</p>
      </section>
      <section class="unit-module-panel unit-staff-panel">
        <div class="unit-module-heading"><div><span class="unit-module-icon staff-icon">◎</span><div><h2>Colaboradores</h2><p>${staff.length} nome(s) cadastrado(s) manualmente</p></div></div><button class="button button-primary button-small" data-action="add-unit-staff">＋ Incluir nome</button></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Nome</th><th>Atividade</th><th>Horas programadas</th><th>Ações</th></tr></thead><tbody>${staffRows || `<tr><td colspan="4" class="table-empty">Nenhum colaborador cadastrado. A lista permanece em branco até você incluir os nomes.</td></tr>`}</tbody></table></div>
      </section>
    </div>
    <div class="unit-shared-links"><button class="button button-outline" data-nav="agenda">Abrir agenda de visitas</button><button class="button button-outline" data-nav="maintenance">Abrir manutenção</button><button class="button button-outline" data-nav="reports">Ver relatórios</button></div>`;
}

function renderPrograms() {
  const cards = state.programs.map((program) => {
    const activities = program.activities.map((activity) => `<li>${escapeHtml(activity)}</li>`).join("");
    const materials = program.materials?.length
      ? `<div class="program-materials"><strong>Materiais descritos na proposta</strong><span>${program.materials.map(escapeHtml).join(" · ")}</span></div>`
      : "";
    return `
      <article class="program-card">
        <div class="program-card-top">
          <span class="program-age">${escapeHtml(program.age)}</span>
          ${sitePill(program.site)}
        </div>
        <h2>${escapeHtml(program.stage)}</h2>
        <h3>${escapeHtml(program.name)}</h3>
        <p class="program-objective">${escapeHtml(program.objective)}</p>
        <p class="program-intro">${escapeHtml(program.introduction)}</p>
        <details class="program-details">
          <summary>Ver atividades e programação de 4 horas</summary>
          <ol>${activities}</ol>
          <div class="program-schedule-list">${program.schedule.map((block) => `<div><span>${escapeHtml(block.label)}</span><strong>${Number(block.minutes)} min</strong></div>`).join("")}</div>
          <small class="program-source-note">A proposta informa a duração total; exceto a trilha longa (~40 min), a distribuição de minutos é uma sugestão editável para validação da Diretoria.</small>
          ${materials}
        </details>
        <div class="program-actions">
          <button class="button button-outline button-small" data-action="edit-program-schedule" data-id="${escapeAttribute(program.id)}">Editar agenda</button>
          <button class="button button-primary button-small" data-action="plan-program" data-id="${escapeAttribute(program.id)}">＋ Planejar visita</button>
        </div>
      </article>`;
  }).join("");
  $("#page-programs").innerHTML = `
    ${heading("PROPOSTA PEDAGÓGICA · ROTEIROS CADASTRADOS", "Roteiros por faixa etária", "Os percursos, os locais, a equipe indicada e os materiais vêm da proposta pedagógica; os horários por atividade são editáveis.", `<button class="button button-outline" data-action="print"><span>▤</span> Imprimir roteiros</button>`)}
    <div class="alert-banner"><span class="alert-symbol">◷</span><div><strong>4 horas por grupo.</strong> A proposta informa a duração total e aproximadamente 40 minutos para a trilha longa, mas não define horários para cada atividade. Os tempos detalhados abaixo são uma sugestão de planejamento. Ajuste cada agenda e confirme os turnos com a Diretoria antes de comunicar as escolas.</div></div>
    <div class="program-source"><strong>Equipe indicada na proposta:</strong> Cezar, Iasmin, Isabela, Larissa e Matheus. <strong>Endereço, escola, preços e capacidade dos veículos</strong> não estão especificados; cadastre-os quando forem confirmados.</div>
    <div class="program-grid">${cards}</div>`;
}

function formatMonth(month) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);
}

function renderAgenda() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const items = [];
  for (let index = 0; index < 42; index++) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    const dayVisits = state.visits.filter((visit) => visit.date === key && visit.status !== "cancelada");
    const classes = ["calendar-day"];
    if (day.getMonth() !== month) classes.push("outside");
    if (key === todayKey()) classes.push("today");
    items.push(`
      <div class="${classes.join(" ")}">
        <span class="calendar-day-number">${day.getDate()}</span>
        ${dayVisits.slice(0, 2).map((visit) => `<button class="calendar-event${visit.site === "Case Ilha Verde" ? " island-event" : ""}" data-action="edit-visit" data-id="${escapeAttribute(visit.id)}" title="${escapeAttribute(visit.schoolName || getSchoolName(visit))} ${escapeAttribute(visit.startTime)}">${escapeHtml(visit.startTime)} · ${escapeHtml(visit.schoolName || getSchoolName(visit))}</button>`).join("")}
        ${dayVisits.length > 2 ? `<span class="calendar-event">+${dayVisits.length - 2} visitações</span>` : ""}
      </div>`);
  }
  const monthVisits = state.visits
    .filter((visit) => monthKey(parseDate(visit.date) || new Date(0)) === monthKey(calendarMonth) && visit.status !== "cancelada")
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const list = monthVisits.length
    ? monthVisits.map((visit) => `<div class="calendar-day-list"><time>${escapeHtml(formatDate(visit.date, { day: "numeric", month: "short" }))}<br>${escapeHtml(visit.startTime)}</time><div><strong>${escapeHtml(visit.schoolName || getSchoolName(visit))} · ${Number(visit.students)} alunos</strong><small>${escapeHtml(visit.title || "Visitação pedagógica")} · ${escapeHtml(visit.site)} · ${statusLabel(visit.status)}</small></div><button class="table-action" data-action="edit-visit" data-id="${escapeAttribute(visit.id)}">Abrir</button></div>`).join("")
    : emptyState("▦", "Este mês está disponível", "Cadastre uma visitação para preencher a agenda.", "new-visit");

  $("#page-agenda").innerHTML = `
    ${heading("CALENDÁRIO DE VISITAÇÃO", "Agenda pedagógica", "Acompanhe datas, horários e grupos que visitarão o Case Viver e o Case Ilha Verde.", pageActions({ add: "new-visit", report: true }))}
    <div class="calendar-header">
      <strong>${escapeHtml(formatMonth(calendarMonth))}</strong>
      <div class="calendar-controls"><button class="icon-button" data-action="calendar-prev" aria-label="Mês anterior">‹</button><button class="button button-outline button-small" data-action="calendar-today">Hoje</button><button class="icon-button" data-action="calendar-next" aria-label="Próximo mês">›</button></div>
    </div>
    <div class="calendar-grid" aria-label="Calendário do mês">
      ${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
      ${items.join("")}
    </div>
    <section class="section-card" style="margin-top:15px"><h2>Visitas programadas no mês</h2><p>Abra uma visita para revisar seus dados ou imprimir a agenda individual.</p></section>
    <div class="calendar-list">${list}</div>`;
}

function statusLabel(status) {
  return { planejada: "Planejada", confirmada: "Confirmada", concluída: "Concluída", cancelada: "Cancelada" }[status] ?? status ?? "Sem situação";
}

function renderVisits() {
  const query = ($("#visits-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filter = $("#visits-status")?.value || "todas";
  const visits = [...state.visits]
    .filter((visit) => (filter === "todas" || visit.status === filter))
    .filter((visit) => !query || `${visit.schoolName} ${getSchoolName(visit)} ${visit.title} ${visit.site} ${visit.date}`.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const rows = visits.map((visit) => {
    const staffNames = (visit.staffAssignments ?? []).map((assignment) => getStaffName(assignment.staffId)).join(", ");
    const school = state.schools.find((entry) => entry.id === visit.schoolId);
    const route = school?.address ? directionsUrl(school.address, getSiteAddress(visit.site) || visit.site) : "";
    return `<tr>
      <td><span class="cell-primary">${escapeHtml(formatDate(visit.date, { day: "numeric", month: "short", year: "numeric" }))}</span><span class="cell-secondary">${escapeHtml(visit.startTime)}–${escapeHtml(addMinutes(visit.startTime, 240))}</span></td>
      <td><span class="cell-primary">${escapeHtml(visit.schoolName || getSchoolName(visit))}</span><span class="cell-secondary">${escapeHtml(visit.title || "Visitação pedagógica")}</span></td>
      <td>${sitePill(visit.site)}</td>
      <td><span class="cell-primary">${Number(visit.students)} alunos</span><span class="cell-secondary">${staffNames ? escapeHtml(staffNames) : "Equipe não atribuída"}</span></td>
      <td>${statusPill(visit.status)}</td>
      <td><div class="table-actions">${route ? `<a class="table-action link-map" href="${escapeAttribute(route)}" target="_blank" rel="noopener noreferrer">Mapa</a>` : ""}<button class="table-action" data-action="visit-report" data-id="${escapeAttribute(visit.id)}">Agenda</button><button class="table-action" data-action="edit-visit" data-id="${escapeAttribute(visit.id)}">Editar</button><button class="table-action delete" data-action="delete-visit" data-id="${escapeAttribute(visit.id)}">Excluir</button></div></td>
    </tr>`;
  }).join("");
  $("#page-visits").innerHTML = `
    ${heading("PROGRAMAÇÃO ESCOLAR", "Visitações", "Cadastre, edite e acompanhe os grupos com agenda de quatro horas.", pageActions({ add: "new-visit", report: true }))}
    <div class="alert-banner"><span class="alert-symbol">◉</span><div><strong>Limite recomendado: 40 alunos por visita.</strong> A atividade simultânea divide a turma em dois grupos equilibrados e alterna a passagem pelo Case Viver e pelo Case Ilha Verde.</div></div>
    <div class="toolbar"><div class="toolbar-group"><div class="search-field"><span>⌕</span><input class="field-input" type="search" id="visits-search" placeholder="Buscar escola ou roteiro" value="${escapeAttribute($("#visits-search")?.value || "")}"></div><select class="field-select filter-select" id="visits-status" aria-label="Filtrar por situação"><option value="todas">Todas as situações</option>${["planejada", "confirmada", "concluída", "cancelada"].map((status) => `<option value="${status}" ${filter === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></div><span class="metric-caption">${visits.length} registro${visits.length === 1 ? "" : "s"}</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Data / horário</th><th>Escola / grupo</th><th>Local</th><th>Participantes / equipe</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="6">${query || filter !== "todas" ? "Não há visitações para esses filtros." : "Nenhuma visitação cadastrada. Adicione a primeira para começar."}</td></tr>`}</tbody></table></div>`;
}

function renderMaintenance() {
  const query = ($("#maintenance-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filter = $("#maintenance-status")?.value || "todas";
  const tasks = [...state.maintenance]
    .filter((task) => filter === "todas" || task.status === filter)
    .filter((task) => !query || `${task.title} ${task.site} ${task.space} ${task.assignee}`.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const rows = tasks.map((task) => `
    <tr>
      <td><span class="cell-primary">${escapeHtml(task.title)}</span><span class="cell-secondary">${escapeHtml(task.notes || "Sem detalhes complementares")}</span></td>
      <td>${sitePill(task.site)}</td>
      <td><span class="cell-primary">${escapeHtml(task.space || "Local geral")}</span></td>
      <td>${task.dueDate ? `<span class="cell-primary">${escapeHtml(formatDate(task.dueDate, { day: "numeric", month: "short", year: "numeric" }))}</span>` : `<span class="cell-secondary">Prazo a definir</span>`}</td>
      <td>${statusPill(task.status)}</td>
      <td><div class="table-actions">${task.assignee ? `<span class="cell-secondary">${escapeHtml(task.assignee)}</span>` : ""}<button class="table-action" data-action="edit-maintenance" data-id="${escapeAttribute(task.id)}">Editar</button>${task.status !== "concluída" ? `<button class="table-action" data-action="complete-maintenance" data-id="${escapeAttribute(task.id)}">Concluir</button>` : ""}<button class="table-action delete" data-action="delete-maintenance" data-id="${escapeAttribute(task.id)}">Excluir</button></div></td>
    </tr>`).join("");
  const openCount = state.maintenance.filter((task) => task.status !== "concluída").length;
  $("#page-maintenance").innerHTML = `
    ${heading("PREPARAÇÃO DOS AMBIENTES", "Manutenção e demandas", "Agende com antecedência os cuidados necessários para receber cada grupo.", pageActions({ add: "new-maintenance", report: true }))}
    <div class="metrics-grid">${metricCard("DEMANDAS EM ABERTO", openCount, "a programar, pendentes ou em andamento", "⌁")}${CASE_UNITS.slice(0, 4).map((unit) => metricCard(unit.name.toUpperCase(), state.maintenance.filter((task) => task.site === unit.name && task.status !== "concluída").length, "demandas a acompanhar", unit.icon)).join("")}</div>
    <div class="toolbar"><div class="toolbar-group"><div class="search-field"><span>⌕</span><input class="field-input" type="search" id="maintenance-search" placeholder="Buscar demanda ou espaço" value="${escapeAttribute($("#maintenance-search")?.value || "")}"></div><select class="field-select filter-select" id="maintenance-status" aria-label="Filtrar por situação"><option value="todas">Todas as situações</option>${["pendente", "em andamento", "concluída"].map((status) => `<option value="${status}" ${filter === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></div><span class="metric-caption">${tasks.length} demanda${tasks.length === 1 ? "" : "s"}</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Demanda</th><th>Local</th><th>Espaço</th><th>Prazo</th><th>Situação</th><th>Responsável / ações</th></tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="6">${query || filter !== "todas" ? "Não há demandas para esses filtros." : "Nenhuma demanda cadastrada. Use “Adicionar” para lançar manutenção antecipada."}</td></tr>`}</tbody></table></div>`;
}

function renderLibrary() {
  const tab = state.settings.libraryTab in LIBRARY_TABS ? state.settings.libraryTab : "schools";
  const config = LIBRARY_TABS[tab];
  const query = libraryQuery.trim().toLocaleLowerCase("pt-BR");
  const records = state[tab].filter((record) => `${record.name} ${record.notes || ""} ${record.site || ""} ${record.role || ""} ${record.condition || ""} ${record.address || ""}`.toLocaleLowerCase("pt-BR").includes(query));
  const rows = records.map((record) => libraryRow(tab, record)).join("");
  $("#page-library").innerHTML = `
    ${heading("CADASTROS DA OPERAÇÃO", "Bibliotecas de apoio", "Mantenha atualizadas as escolas, os espaços, os equipamentos, os veículos e os colaboradores.", `<button class="button button-outline" data-action="print"><span>▤</span> Imprimir lista</button>`)}
    <div class="alert-banner"><span class="alert-symbol">i</span><div>A biblioteca inicial traz as referências da proposta e exemplos informados pelo administrador. <strong>Confira localizações e quantidades com a equipe antes de usar no planejamento da visita.</strong> Você pode incluir, editar e excluir registros e espaços sem limite.</div></div>
    <div class="library-tabs" role="tablist" aria-label="Bibliotecas">
      ${Object.entries(LIBRARY_TABS).map(([key, item]) => `<button class="library-tab ${tab === key ? "active" : ""}" role="tab" aria-selected="${tab === key}" data-action="library-tab" data-tab="${key}">${escapeHtml(item.title)} <span>(${state[key].length})</span></button>`).join("")}
    </div>
    <div class="library-toolbar"><div><strong>${escapeHtml(config.title)}</strong><br><small>${records.length} cadastro${records.length === 1 ? "" : "s"}${query ? " encontrados" : ""}</small></div><div class="toolbar-group"><div class="search-field"><span>⌕</span><input class="field-input" type="search" id="library-search" placeholder="Buscar nesta biblioteca" value="${escapeAttribute(libraryQuery)}"></div><button class="button button-primary button-small" data-action="new-${config.action}">＋ ${escapeHtml(config.add)}</button></div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${config.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="${config.columns.length}">${query ? "Nenhum cadastro corresponde à busca." : `Nenhum registro em “${escapeHtml(config.title)}”. Use o botão acima para adicionar.`}</td></tr>`}</tbody></table></div>
    <datalist id="school-suggestions">${state.schools.map((school) => `<option value="${escapeAttribute(school.name)}">`).join("")}</datalist>`;
}

function libraryRow(tab, record) {
  const actions = (action) => `<div class="table-actions"><button class="table-action" data-action="edit-${action}" data-id="${escapeAttribute(record.id)}">Editar</button><button class="table-action delete" data-action="delete-library" data-tab="${escapeAttribute(tab)}" data-id="${escapeAttribute(record.id)}">Excluir</button></div>`;
  if (tab === "schools") {
    const maps = record.address ? `<a class="link-map" href="${escapeAttribute(directionsUrl(record.address, getSiteAddress("Case Viver") || "Case Viver, Viamão, RS"))}" target="_blank" rel="noopener noreferrer">Abrir mapa →</a>` : `<span class="cell-secondary">Adicione o endereço para abrir a rota</span>`;
    return `<tr><td><span class="cell-primary">${escapeHtml(record.name)}</span><span class="cell-secondary">${escapeHtml(record.address || "Endereço não informado")}</span></td><td>${record.distanceViver ? `${escapeHtml(record.distanceViver)} km` : "A informar"}<span class="cell-secondary">até Case Viver</span></td><td>${maps}</td><td>${record.phone ? escapeHtml(record.phone) : "—"}</td><td>${actions("school")}</td></tr>`;
  }
  if (tab === "spaces") {
    return `<tr><td><span class="cell-primary">${escapeHtml(record.name)}</span></td><td>${sitePill(record.site)}</td><td>${escapeHtml(record.notes || "—")}</td><td>${actions("space")}</td></tr>`;
  }
  if (tab === "equipment") {
    return `<tr><td><span class="cell-primary">${escapeHtml(record.name)}</span><span class="cell-secondary">${escapeHtml(record.notes || "Equipamento da biblioteca")}</span></td><td>${sitePill(record.site)}</td><td><span class="cell-primary">${record.quantity === null || record.quantity === "" || record.quantity === undefined ? "A informar" : Number(record.quantity)}</span></td><td>${escapeHtml(record.condition || "A conferir")}</td><td>${actions("equipment")}</td></tr>`;
  }
  if (tab === "vehicles") {
    return `<tr><td><span class="cell-primary">${escapeHtml(record.name)}</span><span class="cell-secondary">${escapeHtml(record.notes || "Veículo cadastrado")}</span></td><td>${sitePill(record.site || "Case Viver")}</td><td>${Number(record.capacity || 0)} assentos</td><td>${Number(record.quantity || 1)} veículo(s)</td><td>${actions("vehicle")}</td></tr>`;
  }
  const hours = state.visits.reduce((sum, visit) => sum + (visit.staffAssignments ?? []).filter((entry) => entry.staffId === record.id).reduce((total, entry) => total + Number(entry.hours || 0), 0), 0);
  const assignedCount = state.visits.filter((visit) => visit.staffAssignments?.some((entry) => entry.staffId === record.id)).length;
  return `<tr><td><span class="cell-primary">${escapeHtml(record.name)}</span><span class="cell-secondary">${assignedCount} visitação(ões) atribuída(s)</span></td><td>${escapeHtml(record.role || "Atuação a definir")}</td><td>${escapeHtml(record.phone || "—")}</td><td><span class="cell-primary">${hours} h</span><span class="cell-secondary">soma da agenda cadastrada</span></td><td>${actions("staff")}</td></tr>`;
}

function renderFinance() {
  const estimate = estimateVisitCosts(state.visits, state.financeItems);
  const average = estimate.children ? estimate.total / estimate.children : 0;
  const maxCost = Math.max(...estimate.lines.map((line) => line.subtotal), 0);
  const items = estimate.lines.map((item) => `
    <tr>
      <td><span class="cell-primary">${escapeHtml(item.name)}</span><span class="cell-secondary">${escapeHtml(item.site || COMPLEX_SCOPE)} · ${escapeHtml(item.category || "Insumo")} · ${escapeHtml(item.unit || "unidade")} por aluno</span></td>
      <td>${Number(item.perStudent)}</td>
      <td>${item.quantity}</td>
      <td>${Number(item.unitCost) > 0 ? formatCurrency(item.unitCost) : `<span class="cost-zero">Defina o preço</span>`}</td>
      <td><div class="table-actions"><span class="cell-primary">${formatCurrency(item.subtotal)}</span><button class="table-action" data-action="edit-finance-item" data-id="${escapeAttribute(item.id)}">Editar</button><button class="table-action delete" data-action="delete-library" data-tab="financeItems" data-id="${escapeAttribute(item.id)}">Excluir</button></div><div class="cost-progress" title="${maxCost ? Math.round((item.subtotal / maxCost) * 100) : 0}% do maior item"><span style="width:${maxCost ? Math.round((item.subtotal / maxCost) * 100) : 0}%"></span></div></td>
    </tr>`).join("");
  const futureNote = estimate.visits
    ? `Baseada em ${estimate.visits} visitação(ões) futura(s) e ${estimate.children} aluno(s) previsto(s).`
    : "Cadastre visitações futuras para estimar as necessidades.";
  $("#page-finance").innerHTML = `
    ${heading("CARDÁPIO E CUSTOS", "Planejamento do cardápio", "Cadastre manualmente o que será servido, a quantidade por aluno e o preço para estimar o custo das visitas.", pageActions({ add: "new-finance-item", report: true }))}
    <div class="alert-banner"><span class="alert-symbol">◉</span><div><strong>Planejamento estimado, não contábil.</strong> Informe os preços reais, a quantidade por aluno e confira os resultados com a equipe antes de fazer compras.</div></div>
    <div class="finance-grid">
      <div>
        <div class="estimate-box"><div class="estimate-field"><label>VISITAÇÕES CONSIDERADAS</label><span class="cell-primary">${estimate.visits}</span></div><div class="estimate-field"><label>ALUNOS PREVISTOS</label><span class="cell-primary">${estimate.children}</span></div><span class="metric-caption">${escapeHtml(futureNote)}</span></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Alimento / utensílio</th><th>Por aluno</th><th>Qtd. projetada</th><th>Preço unitário</th><th>Subtotal estimado</th></tr></thead><tbody>${items || `<tr><td class="table-empty" colspan="5">Nenhum item cadastrado para estimativa.</td></tr>`}</tbody></table></div>
      </div>
      <aside class="finance-summary">
        <div class="eyebrow" style="color:#c4e495">PROJEÇÃO DO CARDÁPIO</div>
        <h2>Custo estimado</h2>
        <p>Valores e quantidades projetados para todas as visitas futuras cadastradas.</p>
        <div class="finance-total">${formatCurrency(estimate.total)}</div>
        <div class="finance-stat"><span>Estimativa por aluno</span><strong>${formatCurrency(average)}</strong></div>
        <div class="finance-stat"><span>Itens com preço informado</span><strong>${estimate.filledLines} / ${estimate.lines.length}</strong></div>
        <div class="finance-stat"><span>Alunos futuros</span><strong>${estimate.children}</strong></div>
        <button class="button finance-compute" data-action="new-finance-item">＋ Incluir alimento ou utensílio</button>
      </aside>
    </div>`;
}

function setReportData() {
  let columns = [];
  let rows = [];
  let stats = [];
  const withinRange = (value) => value && value >= reportFrom && value <= reportTo;
  if (reportArea === "visits") {
    columns = ["Data", "Horário", "Escola", "Grupo", "Alunos", "Status", "Equipe", "Horas de equipe"];
    const visits = state.visits.filter((visit) => withinRange(visit.date)).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    rows = visits.map((visit) => [
      visit.date, visit.startTime, visit.schoolName || getSchoolName(visit), visit.title || "Visitação pedagógica",
      visit.students, statusLabel(visit.status),
      (visit.staffAssignments ?? []).map((entry) => `${getStaffName(entry.staffId)} (${entry.hours}h)`).join(", ") || "Não atribuída",
      getVisitStaffHours(visit),
    ]);
    stats = [
      ["Visitações", visits.length],
      ["Alunos", visits.reduce((sum, visit) => sum + Number(visit.students || 0), 0)],
      ["Horas de equipe", visits.reduce((sum, visit) => sum + getVisitStaffHours(visit), 0)],
    ];
  } else if (reportArea === "maintenance") {
    columns = ["Prazo", "Demanda", "Unidade", "Espaço", "Responsável", "Status", "Detalhes"];
    const tasks = state.maintenance.filter((task) => !task.dueDate || withinRange(task.dueDate));
    rows = tasks.map((task) => [task.dueDate || "Sem prazo", task.title, task.site, task.space, task.assignee || "Não atribuído", statusLabel(task.status), task.notes || ""]);
    stats = [["Demandas", tasks.length], ["Concluídas", tasks.filter((task) => task.status === "concluída").length], ["Pendentes", tasks.filter((task) => task.status !== "concluída").length]];
  } else if (reportArea === "equipment") {
    columns = ["Equipamento", "Unidade", "Quantidade", "Condição", "Observações"];
    rows = state.equipment.map((item) => [item.name, item.site, item.quantity, item.condition || "A conferir", item.notes || ""]);
    stats = [["Equipamentos", state.equipment.length], ["Unidades inventariadas", state.equipment.reduce((sum, item) => sum + Number(item.quantity || 0), 0)]];
  } else if (reportArea === "vehicles") {
    columns = ["Veículo", "Unidade", "Assentos por veículo", "Número de veículos", "Assentos cadastrados", "Observações"];
    rows = state.vehicles.map((item) => [item.name, item.site, item.capacity, item.quantity, Number(item.capacity || 0) * Number(item.quantity || 0), item.notes || ""]);
    stats = [["Veículos cadastrados", state.vehicles.reduce((sum, item) => sum + Number(item.quantity || 0), 0)], ["Assentos cadastrados", state.vehicles.reduce((sum, item) => sum + Number(item.capacity || 0) * Number(item.quantity || 0), 0)]];
  } else if (reportArea === "staff") {
    columns = ["Colaborador", "Atuação", "Contato", "Horas programadas no período", "Visitações atribuídas"];
    rows = state.staff.map((person) => {
      const assigned = state.visits.filter((visit) => withinRange(visit.date) && visit.staffAssignments?.some((entry) => entry.staffId === person.id));
      const hours = assigned.reduce((sum, visit) => sum + (visit.staffAssignments ?? []).filter((entry) => entry.staffId === person.id).reduce((total, entry) => total + Number(entry.hours || 0), 0), 0);
      return [person.name, person.role || "A definir", person.phone || "", hours, assigned.length];
    });
    stats = [["Colaboradores", state.staff.length], ["Horas programadas", rows.reduce((sum, row) => sum + row[3], 0)], ["Visitações no período", state.visits.filter((visit) => withinRange(visit.date)).length]];
  } else if (reportArea === "schools") {
    columns = ["Escola", "Endereço", "Contato", "Distância até Case Viver (km)", "Observações"];
    rows = state.schools.map((school) => [school.name, school.address || "", school.phone || "", school.distanceViver || "", school.notes || ""]);
    stats = [["Escolas", state.schools.length], ["Rotas com distância informada", state.schools.filter((school) => Number(school.distanceViver) > 0).length]];
  } else if (reportArea === "finance") {
    const estimate = estimateVisitCosts(state.visits, state.financeItems, reportFrom);
    columns = ["Insumo", "Categoria", "Quantidade por aluno", "Total projetado", "Preço unitário (R$)", "Subtotal estimado (R$)"];
    rows = estimate.lines.map((item) => [item.name, item.category, item.perStudent, `${item.quantity} ${item.unit || "unidades"}`, Number(item.unitCost).toFixed(2), Number(item.subtotal).toFixed(2)]);
    stats = [["Visitações futuras", estimate.visits], ["Alunos previstos", estimate.children], ["Total estimado", formatCurrency(estimate.total)]];
  } else {
    reportArea = "overview";
    const visits = state.visits.filter((visit) => withinRange(visit.date));
    const tasks = state.maintenance.filter((task) => !task.dueDate || withinRange(task.dueDate));
    columns = ["Indicador", "Total"];
    rows = [
      ["Visitações no período", visits.length],
      ["Alunos previstos", visits.reduce((sum, visit) => sum + Number(visit.students || 0), 0)],
      ["Horas de equipe programadas", visits.reduce((sum, visit) => sum + getVisitStaffHours(visit), 0)],
      ["Demandas de manutenção", tasks.length],
      ["Demandas de manutenção concluídas", tasks.filter((task) => task.status === "concluída").length],
      ["Escolas cadastradas", state.schools.length],
      ["Equipamentos cadastrados", state.equipment.length],
      ["Veículos cadastrados", state.vehicles.length],
      ["Colaboradores cadastrados", state.staff.length],
      ["Espaços cadastrados", state.spaces.length],
      ["Custo estimado de visitas futuras", formatCurrency(estimateVisitCosts(state.visits, state.financeItems, reportFrom).total)],
    ];
    stats = [["Visitações", visits.length], ["Alunos", visits.reduce((sum, visit) => sum + Number(visit.students || 0), 0)], ["Manutenções abertas", tasks.filter((task) => task.status !== "concluída").length]];
  }
  reportData = { columns, rows, stats };
}

function renderReports() {
  setReportData();
  const headingText = {
    visits: "Visitações por escola, data e equipe",
    maintenance: "Demandas e prazos por unidade",
    equipment: "Inventário de equipamentos",
    vehicles: "Capacidade de veículos cadastrados",
    staff: "Horas de trabalho programadas",
    schools: "Escolas e dados de deslocamento",
    finance: "Previsão de alimentos e utensílios",
    overview: "Resumo administrativo da operação",
  }[reportArea];
  const table = reportData.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  $("#page-reports").innerHTML = `
    ${heading("ACOMPANHAMENTO ADMINISTRATIVO", "Relatórios", "Selecione uma área para preparar, imprimir ou exportar somente os dados necessários.", pageActions({ report: true }))}
    <div class="report-header-print"><strong>Case Viver · ${escapeHtml(headingText)}</strong><p>Período: ${escapeHtml(reportFrom)} a ${escapeHtml(reportTo)} · Emitido em ${escapeHtml(formatDate(todayKey()))}</p></div>
    <div class="report-controls">
      <div class="form-group"><label for="report-area">ÁREA DO RELATÓRIO</label><select class="field-select" id="report-area">${[
        ["visits", "Visitações"], ["maintenance", "Manutenção"], ["equipment", "Equipamentos"],
        ["vehicles", "Veículos"], ["staff", "Colaboradores"], ["schools", "Escolas e trajetos"],
        ["finance", "Planejamento financeiro"], ["overview", "Resumo geral"],
      ].map(([value, name]) => `<option value="${value}" ${reportArea === value ? "selected" : ""}>${name}</option>`).join("")}</select></div>
      <div class="form-group"><label for="report-from">DE</label><input class="field-input" id="report-from" type="date" value="${escapeAttribute(reportFrom)}"></div>
      <div class="form-group"><label for="report-to">ATÉ</label><input class="field-input" id="report-to" type="date" value="${escapeAttribute(reportTo)}"></div>
      <button class="button button-primary" data-action="refresh-report">Gerar relatório</button>
    </div>
    <div class="report-summary">${reportData.stats.map(([name, value]) => `<span class="report-stat"><strong>${escapeHtml(value)}</strong>${escapeHtml(name)}</span>`).join("")}</div>
    <div class="section-card"><h2>${escapeHtml(headingText)}</h2><p>${reportData.rows.length} linha(s) no relatório · período ${escapeHtml(formatDate(reportFrom))} a ${escapeHtml(formatDate(reportTo))}.</p></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${reportData.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${table || `<tr><td class="table-empty" colspan="${reportData.columns.length}">Não há registros para a área e o período selecionados.</td></tr>`}</tbody></table></div>
    <div class="toolbar" style="margin-top:12px"><span class="metric-caption">Confirme os números e a disponibilidade dos recursos com a equipe antes de tomar decisões.</span><button class="button button-outline button-small" data-action="export-report">↓ Exportar CSV</button></div>`;
}

function renderSettings() {
  const schedule = state.settings.interleavedSchedule || DEFAULT_SCHEDULE;
  const totalMinutes = schedule.reduce((sum, block) => sum + Number(block.minutes || 0), 0);
  $("#page-settings").innerHTML = `
    ${heading("ADMINISTRAÇÃO DO PAINEL", "Configurações", "Atualize os endereços, a apresentação do sistema e os tempos propostos para organizar cada visita.", `<button class="button button-primary" data-action="save-settings">Salvar alterações</button>`)}
    <div class="settings-grid">
      <section class="settings-card">
        <div class="eyebrow">IDENTIFICAÇÃO</div><h2>Unidades e deslocamento</h2>
        <p>Os endereços alimentam os links de trajeto no Google Maps. O serviço fornece as rotas; distâncias devem ser registradas após conferência.</p>
        <div class="settings-fields"><div class="form-group"><label for="setting-name">NOME DO PAINEL</label><input class="field-input" id="setting-name" value="${escapeAttribute(state.settings.name)}" maxlength="60"></div><div></div>
          <div class="form-group"><label for="setting-viver">ENDEREÇO DO CASE VIVER</label><input class="field-input" id="setting-viver" value="${escapeAttribute(state.settings.caseViverAddress)}" placeholder="Endereço completo, Viamão — RS"></div>
          <div class="form-group"><label for="setting-ilha">ENDEREÇO DO CASE ILHA VERDE</label><input class="field-input" id="setting-ilha" value="${escapeAttribute(state.settings.ilhaVerdeAddress)}" placeholder="Endereço completo, Viamão — RS"></div>
        </div>
      </section>
      <section class="settings-card">
        <div class="eyebrow">VISITAÇÃO PEDAGÓGICA</div><h2>Roteiro integrado · dois Cases</h2>
        <p>Edite os nomes e os minutos da agenda integrada, quando dois grupos alternam entre as unidades. Os roteiros individuais são ajustados na tela Roteiros pedagógicos. Toda agenda precisa somar exatamente 240 minutos.</p>
        ${schedule.map((block) => `<div class="settings-row"><div><strong>${escapeHtml(block.label)}</strong><small>${block.kind === "rotation" ? "Vivência por grupos em locais alternados" : "Etapa comum ao roteiro"}</small></div><label class="toggle-label"><input type="text" class="field-input schedule-name" aria-label="Nome da etapa" data-block-id="${escapeAttribute(block.id)}" value="${escapeAttribute(block.label)}" maxlength="54" style="width:155px;min-height:31px;padding:5px 7px"><span><input class="number-input schedule-minutes" type="number" min="1" max="240" aria-label="Duração em minutos" data-block-id="${escapeAttribute(block.id)}" value="${Number(block.minutes)}"> min</span></label></div>`).join("")}
        <div class="form-note-box"><span>◷</span><span>Soma atual: <strong id="schedule-total">${totalMinutes} minutos</strong> de 240. ${totalMinutes === 240 ? "Pronto para usar." : "Ajuste os tempos antes de salvar."}</span></div>
        <button class="button button-primary button-small" data-action="save-schedule" style="margin-top:12px">Salvar roteiro</button>
      </section>
      <section class="settings-card">
        <div class="eyebrow">CÓPIA DE SEGURANÇA</div><h2>Proteja seus registros</h2>
        <p>Exporte uma cópia antes de trocar de computador ou navegador. Para restaurar, escolha um arquivo JSON exportado pelo sistema.</p>
        <div class="backup-actions"><button class="button button-outline button-small" data-action="export-backup">↓ Baixar arquivo JSON</button><button class="button button-outline button-small" data-action="import-backup">↑ Restaurar arquivo JSON</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div>
        <div class="privacy-notice"><strong>Atenção:</strong> este protótipo salva tudo somente neste navegador. Não há senha, banco de dados compartilhado ou proteção de acesso. Não guarde informações pessoais sensíveis em computador compartilhado; não publique o servidor na internet.</div>
      </section>
      <section class="settings-card">
        <div class="eyebrow">APROVAÇÃO E IMPLANTAÇÃO</div><h2>Próximos passos antes de usar</h2>
        <p>Confirme com a Diretoria a duração, os horários e os percursos. A proposta original descreve turnos de 3h30, enquanto informa visitas com duração de 4h.</p>
        <div class="settings-row"><div><strong>Uma conta administrativa compartilhada</strong><small>Exige autenticação e uma instalação segura com armazenamento central.</small></div></div>
        <div class="settings-row"><div><strong>Endereços, distâncias e rotas</strong><small>Devem ser verificados com cada escola e unidade.</small></div></div>
        <div class="settings-row"><div><strong>Equipe, veículos, insumos e custos</strong><small>Confira disponibilidade real e preços antes de confirmar uma visita.</small></div></div>
        <button class="text-button" data-nav="reports">Abrir relatórios administrativos →</button>
      </section>
    </div>`;
}

function statusOptions(current) {
  return ["planejada", "confirmada", "concluída", "cancelada"].map((status) => `<option value="${status}" ${status === current ? "selected" : ""}>${statusLabel(status)}</option>`).join("");
}

function openModal({ title, description = "", body, submitLabel = "Salvar", onSubmit, onDelete = null, wide = false }) {
  const modal = $("#app-modal");
  const content = $("#modal-content");
  content.innerHTML = `
    <div class="modal-head">
      <div class="modal-title"><h2 id="modal-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
      <button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar janela">×</button>
    </div>
    <form class="modal-form" id="modal-form" autocomplete="off" ${wide ? 'data-wide="true"' : ""}>
      ${body}
      <div class="modal-actions">
        ${onDelete ? `<button class="button button-danger button-small" type="button" data-action="${escapeAttribute(onDelete.action)}" data-id="${escapeAttribute(onDelete.id)}">${escapeHtml(onDelete.label)}</button>` : "<span></span>"}
        <div class="modal-actions-right"><button class="button button-outline button-small" type="button" data-action="close-modal">Cancelar</button><button class="button button-primary button-small" type="submit">${escapeHtml(submitLabel)}</button></div>
      </div>
    </form>`;
  content.dataset.submit = onSubmit;
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

function formField(label, name, value = "", options = {}) {
  const { type = "text", placeholder = "", required = false, min = null, max = null, step = null, wide = false, help = "", list = "", autocomplete = "" } = options;
  const attrs = `${required ? "required" : ""} ${min !== null ? `min="${min}"` : ""} ${max !== null ? `max="${max}"` : ""} ${step ? `step="${step}"` : ""} ${list ? `list="${list}"` : ""}`;
  let field = `<input class="field-input" id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}" type="${type}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(placeholder)}" ${autocomplete ? `autocomplete="${escapeAttribute(autocomplete)}"` : ""} ${attrs}>`;
  if (type === "textarea") field = `<textarea class="field-textarea" id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}" placeholder="${escapeAttribute(placeholder)}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>`;
  return `<div class="form-group${wide ? " span-2" : ""}"><label for="field-${escapeAttribute(name)}">${escapeHtml(label)}</label>${field}${help ? `<small class="metric-caption">${escapeHtml(help)}</small>` : ""}</div>`;
}

function selectField(label, name, options, current, { wide = false } = {}) {
  return `<div class="form-group${wide ? " span-2" : ""}"><label for="field-${escapeAttribute(name)}">${escapeHtml(label)}</label><select class="field-select" id="field-${escapeAttribute(name)}" name="${escapeAttribute(name)}">${options.map(([value, text]) => `<option value="${escapeAttribute(value)}" ${String(value) === String(current) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></div>`;
}

function checkGroup(label, name, options, selected, { wide = true, sublabel = "" } = {}) {
  const controls = options.length
    ? `<div class="checklist">${options.map((entry) => `<label class="check-option"><input type="checkbox" name="${escapeAttribute(name)}" value="${escapeAttribute(entry.id)}" ${selected.some((item) => item.id === entry.id) ? "checked" : ""}><span>${escapeHtml(entry.name)}</span>${sublabel ? `<small>${escapeHtml(sublabel(entry))}</small>` : ""}</label>`).join("")}</div>`
    : `<p class="form-note">Cadastre ${name === "staff" ? "colaboradores" : "veículos"} na biblioteca antes de atribuir ${name === "staff" ? "a equipe" : "o transporte"}.</p>`;
  return `<div class="form-group${wide ? " span-2" : ""}"><span class="field-label">${escapeHtml(label)}</span>${controls}</div>`;
}

function showVisitModal(visit = null, programId = null) {
  const defaultProgram = state.programs.find((program) => program.id === programId)
    ?? state.programs.find((program) => program.id === visit?.programId)
    ?? state.programs[0];
  const current = visit ?? {
    title: defaultProgram.name,
    programId: defaultProgram.id,
    mode: "program",
    schoolId: "",
    schoolName: "",
    site: defaultProgram.site,
    date: "",
    startTime: "08:00",
    students: 40,
    status: "planejada",
    notes: "",
    staffAssignments: [],
    vehicleIds: [],
  };
  const selectedProgram = state.programs.find((program) => program.id === current.programId) ?? defaultProgram;
  const assignments = current.staffAssignments ?? [];
  const schoolOptions = [["", "Selecione uma escola cadastrada"], ...state.schools.map((school) => [school.id, school.name])];
  const body = `
    <div class="form-grid">
      <div class="form-divider">DADOS DA VISITAÇÃO</div>
      ${selectField("Roteiro da proposta pedagógica", "programId", state.programs.map((program) => [program.id, `${program.stage} · ${program.age}`]), selectedProgram.id, { wide: true })}
      <div class="form-group span-2"><div class="program-summary" id="selected-program-summary"><strong>${escapeHtml(selectedProgram.name)} · ${escapeHtml(selectedProgram.age)}</strong><span>${escapeHtml(selectedProgram.objective)}</span><ul>${selectedProgram.activities.slice(0, 3).map((activity) => `<li>${escapeHtml(activity)}</li>`).join("")}</ul></div></div>
      ${formField("Nome do grupo / turma", "title", current.title || selectedProgram.name, { placeholder: "Informe turma ou ano escolar quando confirmado", wide: true })}
      ${selectField("Escola cadastrada", "schoolId", schoolOptions, current.schoolId || "")}
      ${formField("Nome da escola / origem", "schoolName", current.schoolName || state.schools.find((school) => school.id === current.schoolId)?.name || "", { placeholder: "Cadastre ou informe a escola", required: true, list: "school-suggestions" })}
      ${formField("Data da visita", "date", current.date, { type: "date", required: true })}
      ${formField("Horário de início", "startTime", current.startTime, { type: "time", required: true })}
      ${formField("Alunos (máximo 40)", "students", current.students, { type: "number", min: 1, max: 40, step: 1, required: true })}
      ${selectField("Situação", "status", [["planejada", "Planejada"], ["confirmada", "Confirmada"], ["concluída", "Concluída"], ["cancelada", "Cancelada"]], current.status)}
      ${selectField("Formato da visita", "mode", [["program", "Seguir o roteiro no local proposto"], ["interleaved", "Visita integrada: dois grupos, dois Cases"]], current.mode ?? "program", { wide: true })}
      <div class="form-group span-2"><span class="form-note-box">◷ Duração total de <strong>4 horas</strong>. A idade, o objetivo e as atividades vêm da proposta pedagógica. Os horários por etapa são sugestões editáveis; preencha data e escola somente quando estiverem confirmadas.</span></div>
      <div class="form-divider">PLANEJAMENTO DE RECURSOS</div>
      ${selectField("Unidade / eixo de referência", "site", UNIT_OPTIONS.slice(0, -1), current.site || "Case Viver")}
      ${formField("Observações do roteiro", "notes", current.notes, { type: "textarea", placeholder: "Informações da visita e confirmações necessárias", wide: true })}
        <div class="form-group span-2"><span class="field-label">Colaboradores e horas programadas</span>
          ${state.staff.length
            ? `<div class="checklist">${state.staff.map((person) => {
              const assigned = assignments.find((item) => item.staffId === person.id);
              return `<div class="check-option"><label style="display:flex;flex:1;align-items:center;gap:7px"><input type="checkbox" name="staff" value="${escapeAttribute(person.id)}" ${assigned ? "checked" : ""}><span>${escapeHtml(person.name)}</span></label><input class="number-input" type="number" name="staffHours-${escapeAttribute(person.id)}" min="0.5" max="24" step="0.5" value="${escapeAttribute(assigned?.hours ?? 4)}" aria-label="Horas de ${escapeAttribute(person.name)}"></div>`;
            }).join("")}</div><small class="metric-caption">Marque cada colaborador e informe suas horas individuais para esta visita.</small>`
            : `<p class="form-note">Cadastre colaboradores na biblioteca antes de atribuir a equipe.</p>`}
        </div>
      ${checkGroup("Veículos designados", "vehicleIds", state.vehicles.map((vehicle) => ({ ...vehicle, id: vehicle.id, name: `${vehicle.name} · ${Number(vehicle.capacity)} assentos × ${Number(vehicle.quantity || 1)}` })), (current.vehicleIds ?? []).map((id) => ({ id })))}
      <div class="form-group span-2"><span class="form-note-box">↗ A capacidade dos veículos será comparada ao número de alunos. A equipe deve confirmar assentos, motorista, acompanhantes e rota antes da visita.</span></div>
      ${state.schools.length ? `<datalist id="school-suggestions">${state.schools.map((school) => `<option value="${escapeAttribute(school.name)}"></option>`).join("")}</datalist>` : ""}
    </div>`;
  openModal({
    title: visit ? "Editar visitação" : "Planejar visitação",
    description: "Roteiro da proposta, turma, escola, equipe e organização da visita.",
    body,
    submitLabel: visit ? "Salvar alterações" : "Criar visitação",
    onSubmit: "save-visit",
    onDelete: visit ? { action: "delete-visit", id: visit.id, label: "Excluir visitação" } : null,
    wide: true,
  });
  $("#modal-form").dataset.recordId = visit?.id ?? "";
  const programSelect = $('[name="programId"]', $("#modal-content"));
  if (programSelect) programSelect.dataset.programId = selectedProgram.id;
}

function showProgramScheduleModal(program) {
  if (!program) throw new Error("Roteiro pedagógico não encontrado.");
  const blocks = program.schedule.map((block) => `
    <div class="program-editor-block">
      <input class="field-input program-block-name" aria-label="Nome da atividade" data-block-id="${escapeAttribute(block.id)}" value="${escapeAttribute(block.label)}" maxlength="75" required>
      <input class="field-input program-block-minutes" type="number" aria-label="Duração em minutos" data-block-id="${escapeAttribute(block.id)}" value="${Number(block.minutes)}" min="1" max="240" required>
      <button class="program-block-move" type="button" aria-label="Mover etapa para cima" data-action="move-program-block" data-direction="-1">↑</button>
      <button class="program-block-move" type="button" aria-label="Mover etapa para baixo" data-action="move-program-block" data-direction="1">↓</button>
      <button class="program-block-remove" type="button" aria-label="Excluir atividade" data-action="remove-program-block">×</button>
    </div>`).join("");
  openModal({
    title: `Agenda · ${program.name}`,
    description: "Altere a ordem, as atividades e a distribuição sugerida para completar quatro horas.",
    body: `<div class="form-grid">
      <div class="form-group span-2"><span class="form-note-box">A proposta especifica quatro horas por grupo e cerca de 40 minutos para a trilha longa; não determina os horários detalhados. Confirme e ajuste esta agenda com a Diretoria.</span></div>
      <div class="form-group span-2" id="program-blocks">${blocks}</div>
      <div class="form-group span-2"><div class="program-sum-label">Tempo planejado: <strong id="program-schedule-total">${program.schedule.reduce((sum, block) => sum + Number(block.minutes), 0)} / 240 minutos</strong></div><button class="button button-outline button-small route-editor-add" type="button" data-action="add-program-block">＋ Adicionar etapa</button></div>
    </div>`,
    submitLabel: "Salvar agenda de 4 horas",
    onSubmit: "save-program-schedule",
  });
  $("#modal-form").dataset.programId = program.id;
}

function updateProgramScheduleTotal() {
  const total = $$(".program-block-minutes", $("#modal-content")).reduce((sum, input) => sum + Number(input.value || 0), 0);
  const target = $("#program-schedule-total");
  if (target) target.textContent = `${total} / 240 minutos${total === 240 ? " · total correto" : ""}`;
}

function addProgramBlock() {
  const container = $("#program-blocks");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", `
    <div class="program-editor-block">
      <input class="field-input program-block-name" aria-label="Nome da atividade" data-block-id="" value="" maxlength="75" placeholder="Nome da etapa" required>
      <input class="field-input program-block-minutes" type="number" aria-label="Duração em minutos" data-block-id="" value="1" min="1" max="240" required>
      <button class="program-block-move" type="button" aria-label="Mover etapa para cima" data-action="move-program-block" data-direction="-1">↑</button>
      <button class="program-block-move" type="button" aria-label="Mover etapa para baixo" data-action="move-program-block" data-direction="1">↓</button>
      <button class="program-block-remove" type="button" aria-label="Excluir atividade" data-action="remove-program-block">×</button>
    </div>`);
  updateProgramScheduleTotal();
  $$(".program-block-name", container).at(-1)?.focus();
}

function moveProgramBlock(button) {
  const row = button.closest(".program-editor-block");
  const direction = Number(button.dataset.direction);
  const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling || !row.parentElement) return;
  if (direction < 0) row.parentElement.insertBefore(row, sibling);
  else row.parentElement.insertBefore(sibling, row);
  row.querySelector(".program-block-name").focus();
}

function saveProgramSchedule(form) {
  const program = state.programs.find((entry) => entry.id === form.dataset.programId);
  if (!program) throw new Error("Roteiro pedagógico não encontrado.");
  const schedule = $$(".program-editor-block", form).map((row) => ({
    id: row.querySelector(".program-block-name").dataset.blockId || uid(),
    label: row.querySelector(".program-block-name").value.trim(),
    minutes: Number(row.querySelector(".program-block-minutes").value),
    kind: "program",
  }));
  validateSchedule(schedule);
  program.schedule = schedule;
  if (!persist()) return;
  closeModal();
  renderPage(activePage);
  notify("Agenda do roteiro atualizada.");
}

function readFormValues(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const key of form.querySelectorAll('input[type="checkbox"][name]')) {
    if (!data[key.name]) data[key.name] = [];
  }
  const entries = [...form.querySelectorAll('input[type="checkbox"][name]:checked')];
  for (const entry of entries) {
    if (!Array.isArray(data[entry.name])) data[entry.name] = [];
    data[entry.name].push(entry.value);
  }
  return data;
}

function saveVisit(data) {
  const students = Number(data.students);
  if (!Number.isInteger(students) || students < 1 || students > 40) throw new RangeError("Cada visitação deve ter entre 1 e 40 alunos.");
  if (!parseDate(data.date)) throw new Error("Selecione uma data válida para a visitação.");
  const program = state.programs.find((item) => item.id === data.programId);
  if (!program) throw new Error("Selecione um roteiro da proposta pedagógica.");
  validateSchedule(data.mode === "interleaved" ? state.settings.interleavedSchedule : program.schedule);
  const school = state.schools.find((item) => item.id === data.schoolId);
  const assignedStaff = Array.isArray(data.staff) ? data.staff : [];
  const selectedVehicles = Array.isArray(data.vehicleIds) ? data.vehicleIds : [];
  const form = $("#modal-form");
  const assignmentHours = new Map(
    assignedStaff.map((staffId) => {
      const input = form.querySelector(`[name="staffHours-${CSS.escape(staffId)}"]`);
      const hours = Number(input?.value ?? 4);
      if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
        throw new RangeError(`Informe horas entre 0,5 e 24 para ${getStaffName(staffId)}.`);
      }
      return [staffId, hours];
    }),
  );
  const vehicleSeats = state.vehicles.filter((vehicle) => selectedVehicles.includes(vehicle.id))
    .reduce((sum, vehicle) => sum + Number(vehicle.capacity || 0) * Number(vehicle.quantity || 1), 0);
  if (vehicleSeats && vehicleSeats < students && !window.confirm(`A capacidade selecionada é de ${vehicleSeats} assentos para ${students} alunos. Deseja salvar mesmo assim e revisar o transporte depois?`)) {
    throw new Error("Revise os veículos antes de salvar a visitação.");
  }
  const id = $("#modal-form").dataset.recordId || uid();
  const existing = state.visits.find((item) => item.id === id);
  const record = {
    ...(existing ?? {}),
    id,
    title: String(data.title || "").trim(),
    programId: program.id,
    mode: data.mode === "interleaved" ? "interleaved" : "program",
    schoolId: school?.id || "",
    schoolName: String(data.schoolName || school?.name || "").trim(),
    site: data.site,
    date: data.date,
    startTime: data.startTime,
    students,
    status: data.status,
    notes: String(data.notes || "").trim(),
    staffAssignments: assignedStaff.map((staffId) => ({ staffId, hours: assignmentHours.get(staffId) })),
    vehicleIds: selectedVehicles,
  };
  if (existing) Object.assign(existing, record);
  else state.visits.push(record);
  state.visits.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Alterações da visitação salvas." : "Visitação adicionada à agenda.");
}

function showMaintenanceModal(task = null) {
  const current = task ?? {
    title: "",
    site: "Case Viver",
    space: "",
    dueDate: localDate(3),
    status: "pendente",
    assignee: "",
    notes: "",
  };
  const spaceDatalist = state.spaces.map((space) => `<option value="${escapeAttribute(space.name)}" data-site="${escapeAttribute(space.site)}"></option>`).join("");
  const people = [["", "A definir"], ...state.staff.map((person) => [person.name, person.name])];
  const body = `<div class="form-grid">
    ${formField("Nome da demanda", "title", current.title, { placeholder: "Ex.: aparar a grama do acesso", required: true, wide: true })}
    ${selectField("Unidade", "site", UNIT_OPTIONS, current.site)}
    ${formField("Espaço (cadastre quantos precisar)", "space", current.space, { placeholder: "Ex.: trilha, viveiro, lago ou outro", list: "spaces-suggestions" })}
    ${formField("Data pretendida", "dueDate", current.dueDate, { type: "date" })}
    ${selectField("Situação", "status", [["pendente", "Pendente"], ["em andamento", "Em andamento"], ["concluída", "Concluída"]], current.status)}
    ${selectField("Responsável", "assignee", people, current.assignee)}
    ${formField("Descrição / materiais necessários", "notes", current.notes, { type: "textarea", placeholder: "Detalhes e necessidade de manutenção", wide: true })}
    <datalist id="spaces-suggestions">${spaceDatalist}</datalist>
    <div class="form-group span-2"><span class="form-note-box">⌁ A biblioteca inclui manutenção de rotina como exemplo; cadastre somente serviços e prazos confirmados com a equipe.</span></div>
  </div>`;
  openModal({
    title: task ? "Editar demanda de manutenção" : "Programar manutenção",
    description: "Organize com antecedência os cuidados do espaço.",
    body,
    submitLabel: task ? "Salvar alterações" : "Lançar demanda",
    onSubmit: "save-maintenance",
    onDelete: task ? { action: "delete-maintenance", id: task.id, label: "Excluir demanda" } : null,
  });
}

function showSchoolModal(school = null) {
  const current = school ?? { name: "", address: "", phone: "", distanceViver: "", distanceIlha: "", notes: "" };
  const body = `<div class="form-grid">
    ${formField("Nome da escola", "name", current.name, { required: true, placeholder: "Nome para identificar a origem da visita", wide: true })}
    ${formField("Endereço de partida", "address", current.address, { placeholder: "Rua, número, município e estado", wide: true })}
    ${formField("Contato", "phone", current.phone, { placeholder: "Telefone para planejamento" })}
    ${formField("Distância até Case Viver (km)", "distanceViver", current.distanceViver, { type: "number", min: 0, step: "0.1", placeholder: "Informe após conferir no mapa" })}
    ${formField("Distância até Case Ilha Verde (km)", "distanceIlha", current.distanceIlha, { type: "number", min: 0, step: "0.1", placeholder: "Informe após conferir no mapa" })}
    ${formField("Observações do trajeto / contato", "notes", current.notes, { type: "textarea", wide: true })}
    <div class="form-group span-2"><span class="form-note-box">↗ Salve o endereço da unidade em Configurações. O link de mapa abre o Google Maps para consultar o trajeto e registrar a distância manualmente.</span></div>
  </div>`;
  openModal({
    title: school ? "Editar cadastro escolar" : "Cadastrar escola",
    description: "Mantenha a origem e o deslocamento das turmas.",
    body,
    submitLabel: school ? "Salvar alterações" : "Adicionar escola",
    onSubmit: "save-school",
    onDelete: school ? { action: "delete-library", id: school.id, label: "Excluir escola" } : null,
  });
}

function showSpaceModal(space = null) {
  const current = space ?? { name: "", site: "Case Viver", notes: "" };
  openModal({
    title: space ? "Editar espaço" : "Cadastrar espaço",
    description: "Crie quantos espaços de trabalho e visitação forem necessários.",
    body: `<div class="form-grid">
      ${formField("Nome do espaço", "name", current.name, { required: true, placeholder: "Ex.: quadra de areia, horta, acesso", wide: true })}
      ${selectField("Unidade", "site", UNIT_OPTIONS, current.site)}
      ${formField("Observações", "notes", current.notes, { type: "textarea", wide: true })}
    </div>`,
    submitLabel: space ? "Salvar alterações" : "Adicionar espaço",
    onSubmit: "save-space",
    onDelete: space ? { action: "delete-library", id: space.id, label: "Excluir espaço" } : null,
  });
}

function showEquipmentModal(equipment = null, defaultSite = COMPLEX_SCOPE) {
  const current = equipment ?? { name: "", site: defaultSite, quantity: "", condition: "", notes: "" };
  openModal({
    title: equipment ? "Editar equipamento" : "Cadastrar equipamento",
    description: "Registre materiais e brinquedos disponíveis para as atividades.",
    body: `<div class="form-grid">
      ${formField("Equipamento / recurso", "name", current.name, { required: true, placeholder: "Ex.: tirolesa, pedalinhos, lupas" })}
      ${selectField("Unidade", "site", UNIT_OPTIONS, current.site)}
      ${formField("Quantidade disponível", "quantity", current.quantity, { type: "number", min: 0, max: 9999, step: 1, required: true, placeholder: "Informe a quantidade real" })}
      ${formField("Condição / próxima conferência", "condition", current.condition, { placeholder: "Opcional", wide: true })}
      ${formField("Observações", "notes", current.notes, { type: "textarea", wide: true })}
    </div>`,
    submitLabel: equipment ? "Salvar alterações" : "Adicionar equipamento",
    onSubmit: "save-equipment",
    onDelete: equipment ? { action: "delete-library", id: equipment.id, label: "Excluir equipamento" } : null,
  });
}

function showVehicleModal(vehicle = null) {
  const current = vehicle ?? { name: "", site: COMPLEX_SCOPE, capacity: "", quantity: "", notes: "" };
  openModal({
    title: vehicle ? "Editar veículo" : "Cadastrar veículo",
    description: "Registre a capacidade para comparar assentos e tamanho da turma.",
    body: `<div class="form-grid">
      ${formField("Identificação do veículo", "name", current.name, { required: true, placeholder: "Ex.: ônibus, van 1" })}
      ${selectField("Unidade responsável", "site", UNIT_OPTIONS, current.site || COMPLEX_SCOPE)}
      ${formField("Assentos por veículo", "capacity", current.capacity, { type: "number", min: 1, max: 100, step: 1, required: true })}
      ${formField("Veículos deste tipo", "quantity", current.quantity, { type: "number", min: 1, max: 99, step: 1, required: true })}
      ${formField("Observações", "notes", current.notes, { type: "textarea", wide: true })}
    </div>`,
    submitLabel: vehicle ? "Salvar alterações" : "Adicionar veículo",
    onSubmit: "save-vehicle",
    onDelete: vehicle ? { action: "delete-library", id: vehicle.id, label: "Excluir veículo" } : null,
  });
}

function showStaffModal(person = null, defaultSite = COMPLEX_SCOPE) {
  const current = person ?? { name: "", role: "", phone: "", notes: "", site: defaultSite };
  openModal({
    title: person ? "Editar colaborador" : "Cadastrar colaborador",
    description: "Organize atividades e horas de trabalho programadas.",
    body: `<div class="form-grid">
      ${formField("Nome do colaborador", "name", current.name, { required: true, placeholder: "Nome para identificar a equipe", wide: true, autocomplete: "off" })}
      ${selectField("Unidade / eixo de atuação", "site", UNIT_OPTIONS, current.site || COMPLEX_SCOPE)}
      ${formField("Atuação / atividade", "role", current.role, { placeholder: "Ex.: apoio, recepção, trilhas", wide: true })}
      ${formField("Contato", "phone", current.phone, { placeholder: "Opcional", wide: true })}
      ${formField("Observações", "notes", current.notes, { type: "textarea", wide: true })}
    </div>`,
    submitLabel: person ? "Salvar alterações" : "Adicionar colaborador",
    onSubmit: "save-staff",
    onDelete: person ? { action: "delete-library", id: person.id, label: "Excluir colaborador" } : null,
  });
}

function showFinanceItemModal(item = null, defaultSite = COMPLEX_SCOPE) {
  const current = item ?? { name: "", category: "Alimentação", perStudent: "", unit: "", unitCost: "", site: defaultSite };
  openModal({
    title: item ? "Editar insumo" : "Adicionar alimento ou utensílio",
    description: "Defina preço e quantidade por aluno para projetar as compras.",
    body: `<div class="form-grid">
      ${formField("Alimento ou utensílio", "name", current.name, { required: true, placeholder: "Ex.: suco, fruta, copo descartável" })}
      ${selectField("Unidade / eixo", "site", UNIT_OPTIONS, current.site || COMPLEX_SCOPE)}
      ${selectField("Categoria", "category", [["Alimentação", "Alimentação"], ["Utensílios", "Utensílios"], ["Transporte", "Transporte"], ["Outro", "Outro"]], current.category || "Alimentação")}
      ${formField("Quantidade por aluno", "perStudent", current.perStudent, { type: "number", min: 0, max: 100, step: "0.1", required: true })}
      ${formField("Unidade de contagem", "unit", current.unit || "unidade", { required: true, placeholder: "Ex.: porção, garrafa, copo" })}
      ${formField("Preço unitário (R$)", "unitCost", current.unitCost, { type: "number", min: 0, step: "0.01", required: true })}
      <div class="form-group span-2"><span class="form-note-box">O valor total será calculado pelas próximas visitações, excluindo os grupos cancelados. Informe a embalagem e o custo efetivo antes de usar a estimativa.</span></div>
    </div>`,
    submitLabel: item ? "Salvar alterações" : "Adicionar insumo",
    onSubmit: "save-finance-item",
    onDelete: item ? { action: "delete-library", id: item.id, label: "Excluir insumo" } : null,
  });
}

function editIdInModal(id) {
  $("#modal-form").dataset.recordId = id;
}

function closeModal() {
  const modal = $("#app-modal");
  if (typeof modal.close === "function" && modal.open) modal.close();
  else modal.removeAttribute("open");
  $("#modal-content").replaceChildren();
}

function handleSubmit(event) {
  const form = event.target.closest("#modal-form");
  if (!form) return;
  event.preventDefault();
  const data = readFormValues(form);
  const handler = form.closest("#modal-content").dataset.submit;
  try {
    const handlers = {
      "save-visit": saveVisit,
      "save-program-schedule": saveProgramSchedule,
      "save-maintenance": saveMaintenance,
      "save-school": saveSchool,
      "save-space": saveSpace,
      "save-equipment": saveEquipment,
      "save-vehicle": saveVehicle,
      "save-staff": saveStaff,
      "save-finance-item": saveFinanceItem,
    };
    const save = handlers[handler];
    if (!save) throw new Error("Este tipo de cadastro não pode ser salvo.");
    save(data, form.dataset.recordId);
  } catch (error) {
    notify(error.message || "Não foi possível salvar o cadastro.", true);
  }
}

function saveMaintenance(data, id) {
  const record = {
    id: id || uid(),
    title: String(data.title || "").trim(),
    site: data.site,
    space: String(data.space || "").trim(),
    dueDate: data.dueDate,
    status: data.status,
    assignee: data.assignee || "",
    notes: String(data.notes || "").trim(),
  };
  if (!record.title) throw new Error("Informe o nome da demanda.");
  const existing = state.maintenance.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.maintenance.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Demanda atualizada." : "Demanda de manutenção lançada.");
}

function saveSchool(data, id) {
  const record = {
    id: id || uid(),
    name: String(data.name || "").trim(),
    address: String(data.address || "").trim(),
    phone: String(data.phone || "").trim(),
    distanceViver: Number(data.distanceViver) || "",
    distanceIlha: Number(data.distanceIlha) || "",
    notes: String(data.notes || "").trim(),
  };
  if (!record.name) throw new Error("Informe o nome da escola.");
  const existing = state.schools.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.schools.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Cadastro da escola atualizado." : "Escola adicionada à biblioteca.");
}

function saveSpace(data, id) {
  const record = { id: id || uid(), name: String(data.name || "").trim(), site: data.site, notes: String(data.notes || "").trim() };
  if (!record.name) throw new Error("Informe o nome do espaço.");
  const existing = state.spaces.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.spaces.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Espaço atualizado." : "Espaço adicionado à biblioteca.");
}

function saveEquipment(data, id) {
  const quantity = Number(data.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) throw new RangeError("Informe uma quantidade inteira igual ou maior que zero.");
  const record = { id: id || uid(), name: String(data.name || "").trim(), site: data.site, quantity, condition: String(data.condition || "").trim(), notes: String(data.notes || "").trim() };
  if (!record.name) throw new Error("Informe o nome do equipamento.");
  const existing = state.equipment.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.equipment.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Equipamento atualizado." : "Equipamento adicionado à biblioteca.");
}

function saveVehicle(data, id) {
  const capacity = Number(data.capacity);
  const quantity = Number(data.quantity);
  if (!Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError("Informe uma capacidade e uma quantidade inteira maiores que zero.");
  }
  const record = { id: id || uid(), name: String(data.name || "").trim(), site: data.site, capacity, quantity, notes: String(data.notes || "").trim() };
  if (!record.name) throw new Error("Informe o nome do veículo.");
  const existing = state.vehicles.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.vehicles.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Veículo atualizado." : "Veículo adicionado à biblioteca.");
}

function saveStaff(data, id) {
  const record = { id: id || uid(), name: String(data.name || "").trim(), site: data.site || COMPLEX_SCOPE, role: String(data.role || "").trim(), phone: String(data.phone || "").trim(), notes: String(data.notes || "").trim() };
  if (!record.name) throw new Error("Informe o nome do colaborador.");
  const existing = state.staff.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.staff.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Colaborador atualizado." : "Colaborador adicionado à biblioteca.");
}

function saveFinanceItem(data, id) {
  const unitCost = Number(data.unitCost);
  const perStudent = Number(data.perStudent);
  if (!Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(perStudent) || perStudent < 0) {
    throw new RangeError("Preço e quantidade devem ser números iguais ou maiores que zero.");
  }
  const record = { id: id || uid(), name: String(data.name || "").trim(), category: data.category, perStudent, unit: String(data.unit || "").trim(), unitCost, site: data.site || COMPLEX_SCOPE };
  if (!record.name || !record.unit) throw new Error("Informe o nome do insumo e a unidade.");
  const existing = state.financeItems.find((item) => item.id === id);
  if (existing) Object.assign(existing, record);
  else state.financeItems.push(record);
  persist();
  closeModal();
  renderPage(activePage);
  notify(existing ? "Insumo atualizado." : "Insumo adicionado ao planejamento.");
}

function confirmAction(message) {
  return window.confirm(message);
}

function deleteVisit(id) {
  const record = state.visits.find((item) => item.id === id);
  if (!record || !confirmAction(`Excluir a visitação de ${getSchoolName(record)}? Os horários da equipe voltarão a ficar livres no planejamento.`)) return;
  state.visits = state.visits.filter((item) => item.id !== id);
  persist();
  closeModal();
  renderPage(activePage);
  notify("Visitação excluída.");
}

function deleteMaintenance(id) {
  const record = state.maintenance.find((item) => item.id === id);
  if (!record || !confirmAction(`Excluir a demanda “${record.title}”?`)) return;
  state.maintenance = state.maintenance.filter((item) => item.id !== id);
  persist();
  closeModal();
  renderPage(activePage);
  notify("Demanda excluída.");
}

function completeMaintenance(id) {
  const record = state.maintenance.find((item) => item.id === id);
  if (!record) return;
  record.status = "concluída";
  persist();
  renderPage(activePage);
  notify("Demanda marcada como concluída.");
}

function deleteLibraryRecord(tab, id) {
  const record = state[tab]?.find((item) => item.id === id);
  if (!record) return;
  const label = record.name || record.title || "este registro";
  if (!confirmAction(`Excluir “${label}” da biblioteca?`)) return;
  state[tab] = state[tab].filter((item) => item.id !== id);
  if (tab === "staff") {
    state.visits.forEach((visit) => { visit.staffAssignments = (visit.staffAssignments ?? []).filter((entry) => entry.staffId !== id); });
    state.maintenance.forEach((task) => { if (task.assignee === record.name) task.assignee = ""; });
  }
  if (tab === "vehicles") state.visits.forEach((visit) => { visit.vehicleIds = (visit.vehicleIds ?? []).filter((vehicleId) => vehicleId !== id); });
  if (tab === "schools") state.visits.forEach((visit) => { if (visit.schoolId === id) visit.schoolId = ""; });
  if (tab === "financeItems") {
    state.settings.libraryTab = "schools";
    state.settings.libraryTab = state.settings.libraryTab in LIBRARY_TABS ? state.settings.libraryTab : "schools";
  }
  persist();
  closeModal();
  renderPage(activePage);
  notify(`${label} excluído.`);
}

function showIndividualVisit(visit) {
  if (!visit) throw new Error("Visitação não encontrada.");
  const timeline = buildVisitAgenda(visit);
  const program = getProgram(visit);
  const vehicles = state.vehicles.filter((vehicle) => visit.vehicleIds?.includes(vehicle.id));
  const capacity = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.capacity || 0) * Number(vehicle.quantity || 1), 0);
  const mappedSchool = state.schools.find((school) => school.id === visit.schoolId);
  const route = mappedSchool?.address
    ? directionsUrl(mappedSchool.address, getSiteAddress(visit.site) || visit.site)
    : "";
  const body = `
    <div class="form-grid">
      <div class="form-group span-2"><span class="field-label">ESCOLA / GRUPO</span><span class="cell-primary">${escapeHtml(visit.schoolName || getSchoolName(visit))} · ${escapeHtml(visit.title || "Visitação pedagógica")}</span></div>
      ${formField("Data", "reportDate", visit.date, { type: "date", wide: true })}
      <div class="form-group"><span class="field-label">TURMA</span><span class="cell-primary">${Number(visit.students)} alunos${visit.mode === "interleaved" ? ` · grupos ${Math.ceil(Number(visit.students) / 2)} + ${Math.floor(Number(visit.students) / 2)}` : ""}</span></div>
      ${program ? `<div class="form-group span-2"><span class="field-label">ROTEIRO PEDAGÓGICO</span><span class="cell-primary">${escapeHtml(program.name)} · ${escapeHtml(program.age)} · ${escapeHtml(program.objective)}</span></div>` : ""}
      <div class="form-group"><span class="field-label">HORÁRIO</span><span class="cell-primary">${escapeHtml(visit.startTime)}–${escapeHtml(addMinutes(visit.startTime, 240))} · 4 horas</span></div>
      <div class="form-group span-2"><span class="field-label">${visit.mode === "interleaved" ? "ROTEIRO E ROTAÇÃO DOS GRUPOS" : "PROGRAMAÇÃO PEDAGÓGICA"}</span><div class="table-wrap"><table class="data-table"><thead><tr><th>Horário</th><th>Atividade</th><th>${visit.mode === "interleaved" ? "Grupo A" : "Grupo"}</th>${visit.mode === "interleaved" ? "<th>Grupo B</th>" : ""}</tr></thead><tbody>${timeline.map((block) => `<tr><td>${escapeHtml(block.startsAt)}–${escapeHtml(block.endsAt)}<br>${block.minutes} min</td><td>${escapeHtml(block.label)}</td><td>${block.rotation ? `${escapeHtml(block.groupA)} · ${block.groupASize} alunos` : visit.mode === "interleaved" ? "Etapa compartilhada" : `${escapeHtml(block.groupA)} · ${block.groupASize} alunos`}</td>${visit.mode === "interleaved" ? `<td>${block.rotation ? `${escapeHtml(block.groupB)} · ${block.groupBSize} alunos` : "Etapa compartilhada"}</td>` : ""}</tr>`).join("")}</tbody></table></div></div>
      <div class="form-group span-2"><span class="field-label">EQUIPE PROGRAMADA</span><span class="cell-primary">${visit.staffAssignments?.length ? visit.staffAssignments.map((assignment) => `${getStaffName(assignment.staffId)} (${assignment.hours}h)`).map(escapeHtml).join(" · ") : "Nenhum colaborador atribuído"}</span></div>
      <div class="form-group span-2"><span class="field-label">TRANSPORTE REGISTRADO</span><span class="cell-primary">${vehicles.length ? `${vehicles.map((vehicle) => `${escapeHtml(vehicle.name)} (${vehicle.capacity} assentos × ${vehicle.quantity || 1})`).join(" · ")} · ${capacity} assentos` : "Nenhum veículo selecionado. Confirme transporte e acompanhantes com a equipe."}</span></div>
      ${visit.notes ? `<div class="form-group span-2"><span class="field-label">OBSERVAÇÕES</span><span class="cell-primary">${escapeHtml(visit.notes)}</span></div>` : ""}
      ${route ? `<div class="form-group span-2"><a class="button button-outline" href="${escapeAttribute(route)}" target="_blank" rel="noopener noreferrer">↗ Abrir rota no Google Maps</a></div>` : ""}
      <div class="form-group span-2"><span class="form-note-box">Confirme os horários de deslocamento e os endereços com a equipe. A proposta original registra turnos de 3h30, apesar de indicar visitação de 4h.</span></div>
      <div class="form-group span-2"><button type="button" class="button button-outline" data-action="print-individual" data-id="${escapeAttribute(visit.id)}">▤ Imprimir agenda individual</button></div>
    </div>`;
  openModal({
    title: "Agenda individual da visita",
    description: `${formatDate(visit.date)} · planejamento de equipe e deslocamento.`,
    body,
    submitLabel: "Concluir",
    onSubmit: "close-report",
    onDelete: { action: "edit-visit", id: visit.id, label: "Editar visitação" },
    wide: true,
  });
}

function printIndividualVisit(visit) {
  if (!visit) throw new Error("Visitação não encontrada.");
  const timeline = buildVisitAgenda(visit);
  const program = getProgram(visit);
  const assignmentRows = (visit.staffAssignments ?? []).map((assignment) =>
    `<tr><td>${escapeHtml(getStaffName(assignment.staffId))}</td><td>${escapeHtml(state.staff.find((person) => person.id === assignment.staffId)?.role || "Atuação a confirmar")}</td><td>${Number(assignment.hours)} horas</td></tr>`,
  ).join("");
  const transportRows = state.vehicles.filter((vehicle) => visit.vehicleIds?.includes(vehicle.id)).map((vehicle) =>
    `<tr><td>${escapeHtml(vehicle.name)}</td><td>${escapeHtml(vehicle.site || "Unidade a confirmar")}</td><td>${Number(vehicle.capacity) * Number(vehicle.quantity || 1)} assentos</td></tr>`,
  ).join("");
  $("#print-document").innerHTML = `
    <div class="print-cover">
      <div class="print-kicker">CASE VIVER · CASE ILHA VERDE</div>
      <h1>Agenda individual de visitação</h1>
      <h2>${escapeHtml(visit.schoolName || getSchoolName(visit))}${visit.title ? ` · ${escapeHtml(visit.title)}` : ""}</h2>
      <div class="print-facts">
        <span><strong>Data</strong>${escapeHtml(formatDate(visit.date, { day: "numeric", month: "long", year: "numeric" }))}</span>
        <span><strong>Horário</strong>${escapeHtml(visit.startTime)}–${escapeHtml(addMinutes(visit.startTime, 240))} · 4 horas</span>
        <span><strong>Participantes</strong>${Number(visit.students)} alunos${visit.mode === "interleaved" ? ` · grupos ${Math.ceil(Number(visit.students) / 2)} e ${Math.floor(Number(visit.students) / 2)}` : ""}</span>
        ${program ? `<span><strong>Roteiro pedagógico</strong>${escapeHtml(program.name)} · ${escapeHtml(program.age)}</span>` : ""}
        <span><strong>Unidade de referência</strong>${escapeHtml(visit.site)}</span>
        <span><strong>Situação</strong>${escapeHtml(statusLabel(visit.status))}</span>
      </div>
      <h3>${visit.mode === "interleaved" ? "Programação e rotação dos grupos" : "Programação pedagógica"}</h3>
      <table class="print-table"><thead><tr><th>Horário</th><th>Etapa</th><th>${visit.mode === "interleaved" ? "Grupo A" : "Grupo"}</th>${visit.mode === "interleaved" ? "<th>Grupo B</th>" : ""}</tr></thead><tbody>
      ${timeline.map((block) => `<tr><td>${escapeHtml(block.startsAt)}–${escapeHtml(block.endsAt)}<br>${block.minutes} min</td><td>${escapeHtml(block.label)}</td><td>${block.rotation ? `${escapeHtml(block.groupA)} · ${block.groupASize} alunos` : visit.mode === "interleaved" ? "Etapa compartilhada" : `${escapeHtml(block.groupA)} · ${block.groupASize} alunos`}</td>${visit.mode === "interleaved" ? `<td>${block.rotation ? `${escapeHtml(block.groupB)} · ${block.groupBSize} alunos` : "Etapa compartilhada"}</td>` : ""}</tr>`).join("")}
      </tbody></table>
      <h3>Equipe e horas programadas</h3>
      <table class="print-table"><thead><tr><th>Colaborador</th><th>Atuação</th><th>Horas previstas</th></tr></thead><tbody>
      ${assignmentRows || '<tr><td colspan="3">Equipe ainda não atribuída.</td></tr>'}
      </tbody></table>
      <h3>Transporte</h3>
      <table class="print-table"><thead><tr><th>Veículo</th><th>Unidade responsável</th><th>Capacidade cadastrada</th></tr></thead><tbody>
      ${transportRows || '<tr><td colspan="3">Veículo ainda não atribuído; confirmar o transporte e a rota.</td></tr>'}
      </tbody></table>
      ${visit.notes ? `<h3>Observações</h3><p>${escapeHtml(visit.notes)}</p>` : ""}
      <p class="print-note">Confirme a duração, os horários, as atividades, o deslocamento e as condições dos espaços com a equipe responsável antes da saída dos alunos.</p>
      <footer>Planejamento administrativo · emitido em ${escapeHtml(formatDate(todayKey(), { day: "numeric", month: "long", year: "numeric" }))}</footer>
    </div>`;
  const cleanup = () => {
    document.body.classList.remove("individual-print");
    $("#print-document").replaceChildren();
    window.removeEventListener("afterprint", cleanup);
  };
  document.body.classList.add("individual-print");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 3000);
}

function exportDownload(name, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob(["\ufeff", text], { type });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function exportReport() {
  setReportData();
  const rows = [
    [`${state.settings.name} · ${PAGE_TITLES.reports}`],
    [`Área: ${reportArea}`, `Período: ${reportFrom} a ${reportTo}`],
    reportData.columns,
    ...reportData.rows,
  ];
  exportDownload(`case-viver-${reportArea}-${reportFrom}-${reportTo}.csv`, escapeCsv(rows), "text/csv;charset=utf-8");
  notify("Relatório exportado em CSV.");
}

function exportBackup() {
  const json = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  exportDownload(`case-viver-backup-${todayKey()}.json`, json, "application/json;charset=utf-8");
  notify("Arquivo de backup baixado.");
}

async function importBackup(file) {
  const raw = await file.text();
  const incoming = JSON.parse(raw);
  const required = ["visits", "maintenance", "schools", "spaces", "equipment", "vehicles", "staff", "financeItems"];
  if (!incoming || ![1, 2].includes(incoming.version) || required.some((key) => !Array.isArray(incoming[key]))) {
    throw new Error("O arquivo não parece ser um backup válido do Case Viver.");
  }
  validateSchedule(incoming.settings?.schedule ?? DEFAULT_SCHEDULE);
  const defaults = makeDefaultState();
  const programs = incoming.programs ?? defaults.programs;
  if (!Array.isArray(programs)) throw new Error("O backup não contém uma biblioteca válida de roteiros pedagógicos.");
  for (const program of programs) validateSchedule(program.schedule);
  const interleavedSchedule = incoming.settings?.interleavedSchedule
    ?? incoming.settings?.schedule
    ?? defaults.settings.interleavedSchedule;
  validateSchedule(interleavedSchedule);
  if (!confirmAction("Restaurar este arquivo substituirá os dados salvos neste navegador. Esta ação não pode ser desfeita. Deseja continuar?")) return;
  state = {
    ...defaults,
    ...incoming,
    version: 2,
    programs: structuredClone(programs),
    staff: incoming.staff
      .filter((person) => person.notes !== "Nome na equipe responsável indicada pela proposta; a função individual não está especificada.")
      .map((person) => ({ ...person, site: person.site || COMPLEX_SCOPE })),
    financeItems: incoming.financeItems.filter((item) => !isExampleMenuItem(item)).map((item) => ({ ...item, site: item.site || COMPLEX_SCOPE })),
    settings: { ...defaults.settings, ...(incoming.settings ?? {}), interleavedSchedule },
  };
  if (!persist()) return;
  calendarMonth = parseDate(`${state.settings.calendarMonth ?? monthKey(new Date())}-01`) ?? new Date();
  renderPage(activePage);
  notify("Backup restaurado com sucesso.");
}

function saveSettings() {
  state.settings.name = String($("#setting-name").value || "CASE VIVER").trim();
  state.settings.caseViverAddress = String($("#setting-viver").value || "").trim();
  state.settings.ilhaVerdeAddress = String($("#setting-ilha").value || "").trim();
  persist();
  renderPage(activePage);
  notify("Endereços e identificação atualizados.");
}

function saveSchedule() {
  const names = new Map($$(".schedule-name", $("#page-settings")).map((input) => [input.dataset.blockId, input.value.trim()]));
  const times = new Map($$(".schedule-minutes", $("#page-settings")).map((input) => [input.dataset.blockId, Number(input.value)]));
  const schedule = state.settings.interleavedSchedule.map((block) => ({
    ...block,
    label: names.get(block.id) ?? block.label,
    minutes: times.get(block.id) ?? block.minutes,
  }));
  validateSchedule(schedule);
  state.settings.interleavedSchedule = schedule;
  state.settings.schedule = schedule;
  persist();
  renderPage(activePage);
  notify("Roteiro de 4 horas atualizado.");
}

function navigateCalendar(months) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + months, 1);
  state.settings.calendarMonth = monthKey(calendarMonth);
  persist();
  renderAgenda();
}

function saveReportFilters() {
  const from = $("#report-from").value;
  const to = $("#report-to").value;
  if (from && to && from > to) throw new Error("A data inicial do relatório deve anteceder a data final.");
  reportFrom = from;
  reportTo = to;
  renderReports();
}

async function openOrDownloadDocument(id, downloadWord = false) {
  const file = state.documents.find((item) => item.id === id);
  if (!file?.dataUrl) {
    notify("Arquivo não disponível. Anexe-o novamente.", true);
    return;
  }
  const response = await fetch(file.dataUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  if (downloadWord) {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(url, "_blank", "noopener");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action) return;
  try {
    if (action.startsWith("new-")) {
      if (action === "new-visit") showVisitModal();
      else if (action === "new-maintenance") showMaintenanceModal();
      else if (action === "new-school") showSchoolModal();
      else if (action === "new-space") showSpaceModal();
      else if (action === "new-equipment") showEquipmentModal();
      else if (action === "new-vehicle") showVehicleModal();
      else if (action === "new-staff") showStaffModal();
      else if (action === "new-finance-item") showFinanceItemModal();
    } else if (action === "open-module") {
      const module = button.dataset.module;
      if (module === "equipment") {
        state.settings.libraryTab = "equipment";
        go("library");
      } else if (module === "menu") {
        go("finance");
      } else if (module === "staff") {
        state.settings.libraryTab = "staff";
        go("library");
      }
    } else if (action === "open-document") {
      openOrDownloadDocument(id, false).catch(() => notify("Não foi possível abrir o PDF.", true));
    } else if (action === "download-document") {
      openOrDownloadDocument(id, true).catch(() => notify("Não foi possível baixar o documento Word.", true));
    } else if (action === "delete-document") {
      state.documents = state.documents.filter((document) => document.id !== id);
      persist();
      renderDashboard();
      notify("Documento excluído.");
    } else if (action === "add-unit-equipment") {
      showEquipmentModal(null, activeUnit);
    } else if (action === "add-unit-menu") {
      showFinanceItemModal(null, activeUnit);
    } else if (action === "add-unit-staff") {
      showStaffModal(null, activeUnit);
    } else if (action === "edit-visit") {
      const visit = state.visits.find((item) => item.id === id);
      if (!visit) throw new Error("Visitação não encontrada.");
      showVisitModal(visit);
      editIdInModal(id);
    } else if (action === "delete-visit") {
      deleteVisit(id);
    } else if (action === "edit-maintenance") {
      const task = state.maintenance.find((item) => item.id === id);
      if (!task) throw new Error("Demanda de manutenção não encontrada.");
      showMaintenanceModal(task);
      editIdInModal(id);
    } else if (action === "delete-maintenance") {
      deleteMaintenance(id);
    } else if (action === "complete-maintenance") {
      completeMaintenance(id);
    } else if (action === "library-tab") {
      state.settings.libraryTab = button.dataset.tab;
      libraryQuery = "";
      persist();
      renderLibrary();
    } else if (action === "edit-school") {
      showSchoolModal(state.schools.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "edit-space") {
      showSpaceModal(state.spaces.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "edit-equipment") {
      showEquipmentModal(state.equipment.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "edit-vehicle") {
      showVehicleModal(state.vehicles.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "edit-staff") {
      showStaffModal(state.staff.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "edit-finance-item") {
      showFinanceItemModal(state.financeItems.find((item) => item.id === id));
      editIdInModal(id);
    } else if (action === "delete-library") {
      deleteLibraryRecord(button.dataset.tab, id);
    } else if (action === "visit-report") {
      showIndividualVisit(state.visits.find((item) => item.id === id));
    } else if (action === "plan-program") {
      showVisitModal(null, id);
    } else if (action === "edit-program-schedule") {
      const program = state.programs.find((item) => item.id === id);
      if (!program) throw new Error("Roteiro pedagógico não encontrado.");
      showProgramScheduleModal(program);
    } else if (action === "add-program-block") {
      addProgramBlock();
    } else if (action === "remove-program-block") {
      if ($$(".program-editor-block", $("#modal-content")).length <= 1) {
        throw new Error("A agenda precisa conter ao menos uma etapa.");
      }
      button.closest(".program-editor-block").remove();
      updateProgramScheduleTotal();
    } else if (action === "move-program-block") {
      moveProgramBlock(button);
    } else if (action === "print-individual") {
      printIndividualVisit(state.visits.find((item) => item.id === id));
    } else if (action === "close-modal") {
      closeModal();
    } else if (action === "close-report") {
      closeModal();
    } else if (action === "calendar-prev") {
      navigateCalendar(-1);
    } else if (action === "calendar-next") {
      navigateCalendar(1);
    } else if (action === "calendar-today") {
      calendarMonth = new Date();
      state.settings.calendarMonth = monthKey(calendarMonth);
      persist();
      renderAgenda();
    } else if (action === "save-settings") {
      saveSettings();
    } else if (action === "save-schedule") {
      saveSchedule();
    } else if (action === "print") {
      window.print();
    } else if (action === "refresh-report") {
      saveReportFilters();
    } else if (action === "export-report") {
      exportReport();
    } else if (action === "export-backup") {
      exportBackup();
    } else if (action === "import-backup") {
      $("#backup-file")?.click();
    } else if (action === "nav") {
      go(button.dataset.page);
    }
  } catch (error) {
    notify(error.message || "Não foi possível concluir a operação.", true);
  }
}

function updateHeader() {
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
  $("#header-add").addEventListener("click", () => showVisitModal());
  $("#menu-toggle").addEventListener("click", () => {
    const sidebar = $("#sidebar");
    const shell = $(".app-shell");
    if (window.matchMedia("(max-width: 780px)").matches) {
      sidebar.classList.toggle("open");
    } else {
      shell.classList.toggle("desktop-sidebar-hidden");
    }
    updateMenuToggle();
  });
  window.addEventListener("resize", updateMenuToggle);
  $("#visit-count").textContent = String(getNextVisits().length);
  $("#maintenance-dot").hidden = !state.maintenance.some((task) => task.status !== "concluída");
  updateMenuToggle();
}

function updateMenuToggle() {
  const isMobile = window.matchMedia("(max-width: 780px)").matches;
  const expanded = isMobile
    ? $("#sidebar").classList.contains("open")
    : !$(".app-shell").classList.contains("desktop-sidebar-hidden");
  $("#menu-toggle").setAttribute("aria-expanded", String(expanded));
  $("#menu-toggle").setAttribute("aria-label", expanded ? "Recolher menu" : "Abrir menu");
}

function setupEvents() {
  document.addEventListener("click", (event) => {
    const unitButton = event.target.closest("[data-unit]");
    if (unitButton) {
      activeUnit = unitButton.dataset.unit;
      go("case-space");
      return;
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      event.preventDefault();
      go(nav.dataset.nav);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) {
      event.preventDefault();
      handleAction(button);
    }
  });
  document.addEventListener("submit", (event) => {
    handleSubmit(event);
    scheduleFormImport();
  });
  document.addEventListener("input", (event) => {
    if (event.target.closest("form")) scheduleFormImport();
    if (event.target.id === "visits-search" || event.target.id === "maintenance-search") renderPage(activePage);
    if (event.target.id === "library-search") {
      libraryQuery = event.target.value;
      renderLibrary();
    }
    if (event.target.classList.contains("schedule-minutes")) {
      const total = $$(".schedule-minutes", $("#page-settings")).reduce((sum, item) => sum + Number(item.value || 0), 0);
      const target = $("#schedule-total");
      if (target) target.textContent = `${total} minutos${total === 240 ? " · total correto" : ` · faltam/sobram ${Math.abs(240 - total)} min.`}`;
    }
    if (event.target.classList.contains("program-block-minutes")) updateProgramScheduleTotal();
  });
  document.addEventListener("change", (event) => {
    if (event.target.closest("form")) scheduleFormImport();
    if (event.target.id === "visits-status" || event.target.id === "maintenance-status") renderPage(activePage);
    if (event.target.id === "report-area") {
      reportArea = event.target.value;
      renderReports();
    }
    if (event.target.id === "backup-file" && event.target.files?.[0]) {
      importBackup(event.target.files[0]).catch((error) => notify(error.message || "Não foi possível restaurar o backup.", true));
      event.target.value = "";
    }
    if (event.target.id === "document-upload" && event.target.files?.[0]) {
      const file = event.target.files[0];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "doc", "docx"].includes(extension)) {
        notify("Selecione um arquivo PDF ou Word (.pdf, .doc ou .docx).", true);
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        state.documents.unshift({
          id: uid(),
          name: file.name,
          size: file.size,
          type: extension,
          dataUrl: String(reader.result || ""),
          addedAt: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date()),
        });
        if (!persist()) state.documents.shift();
        else {
          renderDashboard();
          notify("Documento inserido com sucesso.");
        }
      };
      reader.onerror = () => notify("Não foi possível ler o documento selecionado.", true);
      reader.readAsDataURL(file);
      event.target.value = "";
    }
    if (event.target.name === "schoolId" && event.target.value) {
      const school = state.schools.find((item) => item.id === event.target.value);
      const input = $('[name="schoolName"]', $("#modal-content"));
      if (school && input) input.value = school.name;
    }
    if (event.target.name === "programId") {
      const program = state.programs.find((item) => item.id === event.target.value);
      if (!program) return;
      const previous = state.programs.find((item) => item.id === event.target.dataset.programId);
      const title = $('[name="title"]', $("#modal-content"));
      const mode = $('[name="mode"]', $("#modal-content"));
      const site = $('[name="site"]', $("#modal-content"));
      if (title && previous && title.value === previous.name) title.value = program.name;
      if (mode?.value !== "interleaved" && site) site.value = program.site;
      const summary = $("#selected-program-summary");
      if (summary) {
        summary.innerHTML = `<strong>${escapeHtml(program.name)} · ${escapeHtml(program.age)}</strong><span>${escapeHtml(program.objective)}</span><ul>${program.activities.slice(0, 3).map((activity) => `<li>${escapeHtml(activity)}</li>`).join("")}</ul>`;
      }
      event.target.dataset.programId = program.id;
    }
  });
  $("#app-modal").addEventListener("click", (event) => {
    if (event.target === $("#app-modal")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $("#sidebar").classList.remove("open");
      updateMenuToggle();
    }
  });
}

function showFatalError(error) {
  const message = error?.message || "Erro inesperado ao iniciar o painel.";
  $("#page-dashboard").innerHTML = `
    <div class="page-heading"><div><div class="eyebrow">ARMAZENAMENTO LOCAL</div><h1>Não foi possível carregar os dados.</h1><p class="page-subtitle">${escapeHtml(message)}</p></div></div>
    <section class="settings-card"><h2>Se os seus registros já existem</h2><p>Não feche nem limpe os dados do navegador. Use a cópia de segurança anterior ou abra o painel no mesmo navegador e computador em que os dados foram registrados.</p></section>`;
}

async function loadSharedState() {
  let centralized = null;
  try {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (response.ok) centralized = await response.json();
    else if (response.status !== 404) throw new Error(`servidor retornou ${response.status}`);
  } catch (error) {
    updateStorageStatus(false);
    console.warn("Usando cópia local porque o servidor não respondeu:", error);
  }

  const localRaw = storageAvailable ? localStorage.getItem(STORAGE_KEY) : null;
  if (centralized) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(centralized));
    return readState(JSON.stringify(centralized));
  }
  const loaded = readState(localRaw);
  await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(loaded),
  }).then((response) => updateStorageStatus(response.ok)).catch(() => updateStorageStatus(false));
  return loaded;
}

async function init() {
  if (!storageAvailable) throw new Error("O armazenamento local está indisponível neste navegador. Abra o painel em um navegador padrão e confirme as configurações de privacidade.");
  state = await loadSharedState();
  setupEvents();
  updateHeader();
  renderPage(activePage);
  restoreDraftFields();
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length)) restoreDraftFields();
  }).observe(document.body, { childList: true, subtree: true });
}

function restoreDraftFields() {
  for (const draft of restoredFormDrafts) {
    const form = draft.id ? document.querySelector(`form[id="${CSS.escape(draft.id)}"]`) : null;
    const scope = form || document;
    for (const [name, value] of Object.entries(draft.fields || {})) {
      const fields = scope.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      fields.forEach((field, index) => {
        if (field instanceof HTMLInputElement && field.type === "checkbox") {
          const selected = Array.isArray(value) ? value[index] === field.value : value === field.value;
          field.checked = Boolean(selected);
        } else if (!(field instanceof HTMLInputElement && field.type === "file") && Array.isArray(value)) {
          field.value = value[index] ?? "";
        } else if (!(field instanceof HTMLInputElement && field.type === "file")) {
          field.value = value;
        }
      });
    }
  }
}

init().catch((error) => {
  showFatalError(error);
  console.error("Não foi possível iniciar o Case Viver:", error);
});
