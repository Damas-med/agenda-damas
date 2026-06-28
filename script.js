// ============================================
//  AGENDA ACADÊMICA – DAMAS/FAMENE
//  Configuração: edite apenas as variáveis abaixo
// ============================================

const CONFIG = {
  // Cole aqui o ID da sua planilha Google (veja o README)
  SHEET_ID: "1qmKtLA-1po1xkQ3BHkcQI7EXmldg4wiopftId8Yssas",

  // Nome da aba da planilha
  SHEET_NAME: "Eventos",

  // URL do botão "Ver Agenda Completa"
  URL_AGENDA_COMPLETA: "agenda-completa.html",
};

const CAT_EMOJI = {
  congresso: "🏆",
  simposio:  "👥",
  jornada:   "🩺",
  workshop:  "🪡",
  curso:     "📖",
  palestra:  "🎤",
};

function catSlug(cat) {
  return (cat || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function parseData(str) {
  if (!str) return null;
  if (str.includes("/")) {
    const [d, m, a] = str.split("/").map(Number);
    return new Date(a, m - 1, d);
  }
  const [a, m, d] = str.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function formatarData(str) {
  const d = parseData(str);
  if (!d) return str;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

async function buscarEventos() {
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
  const res  = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  const cols = json.table.cols.map(c => c.label.toLowerCase().trim());
  return (json.table.rows || []).map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row.c[i];
      obj[col] = cell ? (cell.f || cell.v || "") : "";
    });
    return obj;
  });
}

function proximosEventos(eventos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return eventos
    .filter(e => { const d = parseData(e.data); return d && d >= hoje; })
    .sort((a, b) => parseData(a.data) - parseData(b.data));
}

function renderHero(ev) {
  const slug  = catSlug(ev.categoria || "");
  const emoji = CAT_EMOJI[slug] || "📅";
  const img   = ev.imagem
    ? `background-image: url('${ev.imagem}')`
    : `background: linear-gradient(135deg, #1A3D2B 0%, #2A5C40 100%)`;
  const link  = ev.link || "#";

  return `
  <div class="card-hero" onclick="window.open('${link}','_blank')">
    <div class="card-hero-img" style="${img}"></div>
    <div class="card-hero-overlay"></div>
    <div class="card-hero-body">
      <div>
        <span class="card-hero-label">PRÓXIMO EVENTO</span>
        <span class="card-hero-tag">${emoji} ${ev.categoria}</span>
      </div>
      <h3 class="card-hero-titulo">${ev.evento}</h3>
      <div class="card-hero-meta">
        <span>🗓️ ${formatarData(ev.data)}</span>
        ${ev.local ? `<span>📍 ${ev.local}</span>` : ""}
      </div>
      ${link !== "#" ? `<a class="btn-saiba-mais" href="${link}" target="_blank">SAIBA MAIS ›</a>` : ""}
    </div>
  </div>`;
}

function renderSecundario(ev) {
  const slug  = catSlug(ev.categoria || "");
  const emoji = CAT_EMOJI[slug] || "📅";
  const link  = ev.link || "#";

  return `
  <a class="card-secundario cat-${slug}" href="${link}" target="_blank">
    <div class="card-sec-icon">${emoji}</div>
    <div class="card-sec-body">
      <div class="card-sec-tag">${emoji} ${ev.categoria}</div>
      <div class="card-sec-titulo">${ev.evento}</div>
      <div class="card-sec-meta">
        <span>🗓️ ${formatarData(ev.data)}</span>
        ${ev.local ? `<span>📍 ${ev.local}</span>` : ""}
      </div>
    </div>
    <span class="card-sec-arrow">›</span>
  </a>`;
}

function renderizar(eventos) {
  const grid    = document.getElementById("agenda-grid");
  const futuros = proximosEventos(eventos);

  if (futuros.length === 0) {
    grid.innerHTML = `<div class="empty-state">Nenhum evento programado no momento.</div>`;
    return;
  }

  const [hero, ...rest] = futuros;
  const secundarios = rest.slice(0, 3);
  grid.innerHTML = renderHero(hero) + secundarios.map(renderSecundario).join("");
}

document.getElementById("btn-completa").href = CONFIG.URL_AGENDA_COMPLETA;

(async () => {
  try {
    const eventos = await buscarEventos();
    renderizar(eventos);
  } catch (err) {
    console.error("Erro ao buscar eventos:", err);
    document.getElementById("agenda-grid").innerHTML = `
      <div class="empty-state">
        ⚠️ Não foi possível carregar os eventos.<br>
        <small>Verifique se o SHEET_ID está correto e a planilha está publicada.</small>
      </div>`;
  }
})();
