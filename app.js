// === Cross-sell Empresas — Listagem ===

// Cole aqui a MESMA URL do Apps Script que está no formulario.js (sem essa URL,
// a sinalização "já entrevistado" não funciona — o resto da página funciona normalmente).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd98iOapWRyGcXmig7eLcG0kxP5SQtPSM1GVrvSbbcwDmXJM0TIdtdutVE34nLbuoEVQ/exec";

const PRODUTOS = ["Acordos", "Sienge", "Checklist", "Oystr", "Presto", "Legal Intelligence", "Deep Legal"];

let dados = null;
// Mapa de "CNPJ + produto" → {data, cs} pra marcar quem já foi entrevistado
let entrevistasMap = {};

// === Histórico de entrevistas (lê do Apps Script, com cache de 10min) ===
async function carregarEntrevistas() {
  if (!APPS_SCRIPT_URL) return;
  const cacheKey = "entrevistas_cache";
  const cacheTimeKey = "entrevistas_cache_time";
  const TEN_MIN = 10 * 60 * 1000;
  const cachedTime = parseInt(localStorage.getItem(cacheTimeKey) || "0");
  const cached = localStorage.getItem(cacheKey);
  if (cached && Date.now() - cachedTime < TEN_MIN) {
    aplicarEntrevistas(JSON.parse(cached));
    return;
  }
  try {
    const r = await fetch(APPS_SCRIPT_URL);
    const data = await r.json();
    if (data.entrevistas) {
      localStorage.setItem(cacheKey, JSON.stringify(data.entrevistas));
      localStorage.setItem(cacheTimeKey, String(Date.now()));
      aplicarEntrevistas(data.entrevistas);
    }
  } catch (e) {
    console.warn("Não consegui carregar histórico de entrevistas:", e);
  }
}

function aplicarEntrevistas(lista) {
  entrevistasMap = {};
  lista.forEach(ent => {
    const key = `${ent.cnpj}__${ent.produto}`;
    // Mantém só a entrevista mais recente por (cnpj, produto)
    if (!entrevistasMap[key] || ent.data > entrevistasMap[key].data) {
      entrevistasMap[key] = {data: ent.data, cs: ent.cs};
    }
  });
  // Re-renderiza a tabela se já carregou
  if (dados) renderTabela();
}

function entrevistadoEm(cnpj, produto) {
  return entrevistasMap[`${cnpj}__${produto}`] || null;
}
function formatDataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
}

// === Identificação do CS (com normalização) ===
function normalizarNome(s) {
  if (!s) return "";
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(w => {
      // Mantém preposições/artigos curtos em minúsculo no meio do nome
      if (["da", "de", "do", "das", "dos", "e"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}
function getCSNome() { return localStorage.getItem("cs_nome") || ""; }
function setCSNome(v) {
  const n = normalizarNome(v);
  if (n) localStorage.setItem("cs_nome", n);
  atualizarHeaderCS();
  return n;
}
function limparCSNome() {
  localStorage.removeItem("cs_nome");
  atualizarHeaderCS();
}
function atualizarHeaderCS() {
  const display = document.getElementById("cs-nome-display");
  const btnTrocar = document.getElementById("btn-trocar-cs");
  const nome = getCSNome();
  if (nome) {
    display.textContent = `CS: ${nome}`;
    if (btnTrocar) btnTrocar.style.display = "inline-block";
  } else {
    display.textContent = "";
    if (btnTrocar) btnTrocar.style.display = "none";
  }
}

// === Modal ===
function abrirModalCS(forcar) {
  const modal = document.getElementById("modal-cs");
  const input = document.getElementById("modal-cs-input");
  const erro = document.getElementById("modal-cs-erro");
  modal.style.display = "flex";
  input.value = forcar ? getCSNome() : "";
  erro.textContent = "";
  input.focus();
}
function fecharModalCS() {
  document.getElementById("modal-cs").style.display = "none";
}
function confirmarCS() {
  const input = document.getElementById("modal-cs-input");
  const erro = document.getElementById("modal-cs-erro");
  const nome = input.value.trim();
  if (nome.length < 3) {
    erro.textContent = "Por favor, digite seu nome completo (mínimo 3 letras).";
    return;
  }
  if (!nome.includes(" ")) {
    erro.textContent = "Use nome e sobrenome (pra evitar confusão entre CSs com mesmo primeiro nome).";
    return;
  }
  setCSNome(nome);
  fecharModalCS();
}

// === Carregar dados ===
async function carregar() {
  const r = await fetch("clientes.json");
  dados = await r.json();
  popularCarteiras();
  renderTabela();
}

function popularCarteiras() {
  const sel = document.getElementById("carteira-select");
  dados.carteiras.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `Carteira ${c}`;
    sel.appendChild(opt);
  });
}

function fitClass(v) {
  if (!v || v === "—") return "fit-empty";
  return "fit-" + v.replace(" ", "-");
}

function renderTabela() {
  const carteira = document.getElementById("carteira-select").value;
  const busca = document.getElementById("busca").value.toLowerCase().trim();
  const fitFilter = document.getElementById("fit-filter").value;

  let lista = dados.clientes;
  if (carteira) lista = lista.filter(c => c.carteira === carteira);
  if (busca) lista = lista.filter(c =>
    (c.nome || "").toLowerCase().includes(busca) ||
    (c.cnpj || "").includes(busca)
  );
  if (fitFilter === "Alta") {
    lista = lista.filter(c => Object.values(c.fits).some(v => v === "Alta"));
  } else if (fitFilter === "Média") {
    lista = lista.filter(c => Object.values(c.fits).some(v => v === "Alta" || v === "Média"));
  }

  document.getElementById("contador").textContent = `${lista.length} clientes`;

  const body = document.getElementById("tabela-body");
  if (lista.length === 0) {
    body.innerHTML = '<tr><td colspan="13" class="empty-state">Nenhum cliente bateu com os filtros.</td></tr>';
    return;
  }

  const RENDER_LIMIT = 200;
  const visible = lista.slice(0, RENDER_LIMIT);
  body.innerHTML = "";
  visible.forEach(c => {
    const tr = document.createElement("tr");
    let html = `
      <td class="cnpj">${formatCnpj(c.cnpj)}</td>
      <td class="nome" title="${escape(c.nome)}">${escape(c.nome)}</td>
      <td class="carteira-${c.carteira}">${c.carteira || "—"}</td>
      <td>${c.porte || "—"}</td>
      <td>${c.hs ?? "—"}</td>
    `;
    PRODUTOS.forEach(p => {
      const v = c.fits[p] || "—";
      const ent = entrevistadoEm(c.cnpj, p);
      if (ent) {
        const tooltip = `Entrevistado em ${formatDataCurta(ent.data)} por ${ent.cs || "?"}`;
        html += `<td><span class="fit-cell ${fitClass(v)} entrevistado" title="${escape(tooltip)}">✓ ${v}</span></td>`;
      } else {
        html += `<td><span class="fit-cell ${fitClass(v)}">${v}</span></td>`;
      }
    });
    html += `<td><button class="analisar" data-cnpj="${c.cnpj}">Analisar →</button></td>`;
    tr.innerHTML = html;
    body.appendChild(tr);
  });

  if (lista.length > RENDER_LIMIT) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="13" class="empty-state">+${lista.length - RENDER_LIMIT} clientes não exibidos. Refine os filtros pra ver os demais.</td>`;
    body.appendChild(tr);
  }

  body.querySelectorAll("button.analisar").forEach(btn => {
    btn.addEventListener("click", () => {
      const cnpj = btn.dataset.cnpj;
      if (!getCSNome()) { abrirModalCS(); return; }
      window.location.href = `formulario.html?cnpj=${cnpj}`;
    });
  });
}

function formatCnpj(c) {
  if (!c || c.length !== 14) return c || "";
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
}
function escape(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarHeaderCS();
  if (!getCSNome()) abrirModalCS();

  document.getElementById("modal-cs-confirma").addEventListener("click", confirmarCS);
  document.getElementById("modal-cs-input").addEventListener("keydown", e => {
    if (e.key === "Enter") confirmarCS();
  });
  document.getElementById("btn-trocar-cs").addEventListener("click", () => abrirModalCS(true));

  document.getElementById("carteira-select").addEventListener("change", renderTabela);
  document.getElementById("busca").addEventListener("input", renderTabela);
  document.getElementById("fit-filter").addEventListener("change", renderTabela);
  carregar();
  carregarEntrevistas();
});
