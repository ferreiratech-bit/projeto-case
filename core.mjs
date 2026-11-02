export const MAX_VISITORS = 40;
export const VISIT_DURATION_MINUTES = 240;

export const DEFAULT_SCHEDULE = [
  { id: "acolhida", label: "Acolhida e orientações", minutes: 15, kind: "shared" },
  { id: "primeiro-ciclo", label: "Primeira vivência nos dois espaços", minutes: 80, kind: "rotation" },
  { id: "lanche", label: "Lanche e hidratação", minutes: 20, kind: "shared" },
  { id: "transicao", label: "Transição e deslocamento", minutes: 20, kind: "shared" },
  { id: "segundo-ciclo", label: "Troca de espaço e segunda vivência", minutes: 80, kind: "rotation" },
  { id: "encerramento", label: "Partilha, recreação e encerramento", minutes: 25, kind: "shared" },
];

export const DEFAULT_PROGRAMS = [
  {
    id: "educacao-infantil",
    name: "Educação Infantil · trilha curta",
    stage: "Educação Infantil",
    age: "5 a 7 anos",
    site: "Case Viver",
    durationMinutes: VISIT_DURATION_MINUTES,
    objective: "Cuidar, brincar e educar.",
    introduction: "Experiências de educação infantil relacionadas aos campos de experiência da BNCC.",
    activities: [
      "Acolhida, organização de pertences, banheiro e água.",
      "Orientações para a visita e segurança da turma.",
      "Trilha curta: observação de árvores e arbustos; observação de insetos com lupas e escuta das aves.",
      "Descida em direção ao lago e observação de borboletas; volta ao lago com paradas para conversar sobre plantas e insetos.",
      "Registro das percepções em forma de desenho, na área da figueira.",
      "Lanche e brincadeiras nos espaços disponíveis: brinquedos, quadra de areia e petecas.",
    ],
    schedule: [
      { id: "infantil-chegada", label: "Chegada, pertences, banheiro e água", minutes: 10, kind: "shared" },
      { id: "infantil-orientacao", label: "Acolhida e orientações de segurança", minutes: 10, kind: "shared" },
      { id: "infantil-trilha", label: "Trilha curta: árvores, arbustos, insetos e aves", minutes: 50, kind: "program" },
      { id: "infantil-lago", label: "Lago: observação de plantas, insetos e borboletas", minutes: 50, kind: "program" },
      { id: "infantil-desenho", label: "Registro em desenho na área da figueira", minutes: 35, kind: "program" },
      { id: "infantil-lanche", label: "Lanche e hidratação", minutes: 20, kind: "shared" },
      { id: "infantil-recreacao", label: "Brincadeiras e espaços disponíveis", minutes: 55, kind: "program" },
      { id: "infantil-encerramento", label: "Organização e encerramento", minutes: 10, kind: "shared" },
    ],
  },
  {
    id: "fundamental-i",
    name: "Ensino Fundamental I · trilha média",
    stage: "Ensino Fundamental I",
    age: "8 a 10 anos",
    site: "Case Viver",
    durationMinutes: VISIT_DURATION_MINUTES,
    objective: "Cuidar, brincar e educar.",
    introduction: "Observação da natureza, registro por fotografia e desenho com tinta guache.",
    activities: [
      "Acolhida, organização de pertences, banheiro e água.",
      "Trilha média acompanhada por instrutores e professores: árvores, arbustos, insetos com lupas e sons das aves.",
      "Observação de borboletas durante o percurso; a proposta menciona coleta e posterior soltura.",
      "Volta ao lago com paradas de observação e informações sobre plantas e insetos.",
      "Passagem pelo mirante da sanga com auxílio de corda e retorno pelo meio da mata até a figueira.",
      "Relato das percepções, fotografia de insetos e desenhos com tinta guache.",
      "Lanche e atividades recreativas nos espaços indicados.",
    ],
    schedule: [
      { id: "fund1-chegada", label: "Chegada, pertences, banheiro e água", minutes: 10, kind: "shared" },
      { id: "fund1-orientacao", label: "Acolhida e orientações da trilha", minutes: 10, kind: "shared" },
      { id: "fund1-trilha", label: "Trilha média: observação de plantas, insetos e aves", minutes: 65, kind: "program" },
      { id: "fund1-lago", label: "Lago, mirante da sanga e percurso pela mata", minutes: 40, kind: "program" },
      { id: "fund1-registro", label: "Fotografia e desenho com tinta guache", minutes: 30, kind: "program" },
      { id: "fund1-lanche", label: "Lanche e hidratação", minutes: 20, kind: "shared" },
      { id: "fund1-recreacao", label: "Brincadeiras e espaços disponíveis", minutes: 55, kind: "program" },
      { id: "fund1-encerramento", label: "Organização e encerramento", minutes: 10, kind: "shared" },
    ],
  },
  {
    id: "fundamental-ii-viver",
    name: "Ensino Fundamental II · trilha longa",
    stage: "Ensino Fundamental II",
    age: "10 a 12 anos",
    site: "Case Viver",
    durationMinutes: VISIT_DURATION_MINUTES,
    objective: "Cuidar e educar; trabalhar o cuidado com o solo e a água e a necessidade da redução de lixo.",
    introduction: "Trilha longa de aproximadamente 40 minutos, conforme a proposta.",
    activities: [
      "Acolhida, organização de pertences, banheiro e água.",
      "Trilha longa (cerca de 40 minutos): observação de plantas, insetos, aves e mamíferos, quando possível.",
      "Paradas junto ao lago, mirante da sanga, passagem com auxílio de corda e ponte de madeira.",
      "Retorno pela mata, observação do campo e de figueiras estranguladoras características do Pampa.",
      "Conversa sobre ecossistema, diferenças de clima e umidade, cuidado com o solo e a água e redução de resíduos.",
      "Fotografia de insetos e aves; breve relato das percepções na área da figueira.",
      "Lanche e recreação nos espaços previstos.",
    ],
    schedule: [
      { id: "fund2-chegada", label: "Chegada, pertences, banheiro e água", minutes: 10, kind: "shared" },
      { id: "fund2-orientacao", label: "Acolhida e orientações de segurança", minutes: 10, kind: "shared" },
      { id: "fund2-trilha", label: "Trilha longa (40 min) e observação ambiental", minutes: 40, kind: "program" },
      { id: "fund2-conversa", label: "Água, solo, clima, ecossistema e resíduos", minutes: 40, kind: "program" },
      { id: "fund2-registro", label: "Fotografias e relato das percepções", minutes: 25, kind: "program" },
      { id: "fund2-lanche", label: "Lanche e hidratação", minutes: 20, kind: "shared" },
      { id: "fund2-recreacao", label: "Brincadeiras e espaços disponíveis", minutes: 75, kind: "program" },
      { id: "fund2-encerramento", label: "Organização e encerramento", minutes: 20, kind: "shared" },
    ],
    materials: ["Cola", "Folhas coletadas na trilha", "Giz de cera", "Papelão", "Pincel", "Tesoura", "Tinta guache"],
  },
  {
    id: "medio-ilha-verde",
    name: "Fundamental II / Ensino Médio · Ilha Verde",
    stage: "Ensino Fundamental II e Ensino Médio",
    age: "12 a 17 anos",
    site: "Case Ilha Verde",
    durationMinutes: VISIT_DURATION_MINUTES,
    objective: "Cuidar e educar.",
    introduction: "Visita aos espaços ambientais e produtivos descritos na proposta.",
    activities: [
      "Recepção, organização de pertences, banheiro e água.",
      "Introdução à produção de oliveiras e à ciclagem de nutrientes no solo.",
      "Deslocamento em trator até o Case Agro e visita aos animais, ao biodigestor e às leiras de adubo.",
      "Passagem pela usina fotovoltaica e visita à fábrica de água, conforme roteiro e liberação da equipe.",
      "Retorno ao Case Ilha Verde, lanche e atividades recreativas nos espaços disponíveis.",
      "Atividade sugerida na proposta: poema e discussão sobre preservação ambiental em matriz urbana; meditação coletiva.",
    ],
    schedule: [
      { id: "medio-chegada", label: "Recepção, pertences, banheiro e água", minutes: 10, kind: "shared" },
      { id: "medio-oliveiras", label: "Oliveiras e ciclagem de nutrientes", minutes: 25, kind: "program" },
      { id: "medio-agro", label: "Case Agro: animais, biodigestor e adubo", minutes: 45, kind: "program" },
      { id: "medio-energia-agua", label: "Usina fotovoltaica e fábrica de água", minutes: 45, kind: "program" },
      { id: "medio-atividade", label: "Poema e discussão sobre preservação ambiental", minutes: 30, kind: "program" },
      { id: "medio-lanche", label: "Lanche e hidratação", minutes: 20, kind: "shared" },
      { id: "medio-recreacao", label: "Atividades recreativas disponíveis", minutes: 55, kind: "program" },
      { id: "medio-encerramento", label: "Organização e encerramento", minutes: 10, kind: "shared" },
    ],
  },
];

export function parseDate(date) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

export function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()) {
  return dateKey(now);
}

export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseDate(dateString);
  if (!date) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function addMinutes(timeString, minutes) {
  const [hours, mins] = String(timeString || "08:00").split(":").map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount) || 0);
}

export function studentSplit(total) {
  const count = Number(total);
  if (!Number.isInteger(count) || count < 1 || count > MAX_VISITORS) {
    throw new RangeError(`A visitação deve ter entre 1 e ${MAX_VISITORS} alunos.`);
  }
  return [Math.ceil(count / 2), Math.floor(count / 2)];
}

export function validateSchedule(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("Inclua ao menos uma etapa na agenda.");
  }
  for (const block of blocks) {
    if (!Number.isInteger(Number(block.minutes)) || Number(block.minutes) < 1 || Number(block.minutes) > VISIT_DURATION_MINUTES) {
      throw new RangeError("Cada etapa precisa ter uma duração entre 1 e 240 minutos.");
    }
    if (!String(block.label || "").trim()) {
      throw new Error("Preencha o nome de todas as etapas.");
    }
  }
  const total = blocks.reduce((sum, block) => sum + Number(block.minutes), 0);
  if (total !== VISIT_DURATION_MINUTES) {
    throw new RangeError(`A soma das etapas precisa ser exatamente 4 horas (240 minutos). Agora: ${total} min.`);
  }
  return true;
}

export function buildVisitTimeline(visit, blocks = DEFAULT_SCHEDULE, program = null) {
  validateSchedule(blocks);
  const [firstGroup, secondGroup] = studentSplit(Number(visit.students));
  const isInterleaved = visit.mode !== "program";
  let elapsed = 0;
  return blocks.map((block, index) => {
    const startsAt = addMinutes(visit.startTime, elapsed);
    elapsed += Number(block.minutes);
    const endsAt = addMinutes(visit.startTime, elapsed);
    const rotation = isInterleaved && block.kind === "rotation"
      ? index === blocks.findIndex((entry) => entry.kind === "rotation") ? 1 : 2
      : 0;
    return {
      ...block,
      minutes: Number(block.minutes),
      startsAt,
      endsAt,
      rotation,
      location: program?.site ?? visit.site,
      programName: program?.name ?? "",
      groupA: rotation ? rotation === 2 ? "Case Ilha Verde" : "Case Viver" : program?.site ?? visit.site,
      groupB: rotation ? rotation === 2 ? "Case Viver" : "Case Ilha Verde" : program?.site ?? visit.site,
      groupASize: isInterleaved ? rotation ? firstGroup : 0 : Number(visit.students),
      groupBSize: isInterleaved && rotation ? secondGroup : 0,
    };
  });
}

export function directionsUrl(origin, destination) {
  const from = String(origin || "").trim();
  const to = String(destination || "").trim();
  if (!from || !to) throw new Error("Informe a origem e o destino do trajeto.");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", from);
  url.searchParams.set("destination", to);
  url.searchParams.set("travelmode", "driving");
  return url.href;
}

export function estimateVisitCosts(visits, items, fromDate = todayKey()) {
  const upcoming = visits
    .filter((visit) => visit.status !== "cancelada" && visit.date >= fromDate);
  const children = upcoming
    .reduce((sum, visit) => sum + Number(visit.students || 0), 0);
  const lines = items.map((item) => {
    const applicableVisits = !item.site || item.site === "Complexo (geral)"
      ? upcoming
      : upcoming.filter((visit) => visit.site === item.site);
    const applicableChildren = applicableVisits.reduce((sum, visit) => sum + Number(visit.students || 0), 0);
    const quantity = Number(item.perStudent || 0) * applicableChildren;
    const subtotal = quantity * Number(item.unitCost || 0);
    return { ...item, quantity, subtotal };
  });
  return {
    children,
    visits: upcoming.length,
    lines,
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
    filledLines: lines.filter((line) => Number(line.unitCost) > 0).length,
  };
}

export function formatCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }).join(";")).join("\r\n");
}
