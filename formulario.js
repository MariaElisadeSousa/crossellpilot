// === Cross-sell Empresas — Formulário Adaptativo (modo wizard) ===

// COLE AQUI A URL DO APPS SCRIPT QUANDO PUBLICAR (instruções no README.md)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwL0OV0KWnDB-qr8K9HtwvJDZ0-QCJs8O0kttOTshPuLLjvn_Iukibu5NlFIJsSqMK5/exec"; 

let cliente = null;
let questoes = null;
let dadosGlobal = null; // payload do clientes.json (pra lista_cs no modal)
let respostas = {
  meta: {},
  confirmador: {},
  tronco: {},
  produtos: {},
  encerramento: {},
  final: {}
};

// Estado do wizard
let state = { steps: [], idx: 0 };

const PRODUTOS = ["Acordos", "Sienge", "Checklist", "Oystr", "Presto", "Legal Intelligence", "Deep Legal"];

// === Identificação do CS (dropdown da lista oficial) ===
function getCSNome() { return localStorage.getItem("cs_nome") || ""; }
function setCSNome(v) {
  if (v) localStorage.setItem("cs_nome", v);
  atualizarHeaderCS();
  return v;
}
function atualizarHeaderCS() {
  const display = document.getElementById("cs-nome-display");
  const btnTrocar = document.getElementById("btn-trocar-cs");
  const nome = getCSNome();
  display.textContent = nome ? `CS: ${nome}` : "";
  if (btnTrocar) btnTrocar.style.display = nome ? "inline-block" : "none";
}
function popularDropdownCSModal() {
  const sel = document.getElementById("modal-cs-select");
  if (!sel || !dadosGlobal || !dadosGlobal.lista_cs) return;
  sel.innerHTML = '<option value="">— selecione seu nome —</option>';
  dadosGlobal.lista_cs.forEach(cs => {
    const opt = document.createElement("option");
    opt.value = cs;
    opt.textContent = cs;
    sel.appendChild(opt);
  });
}
function abrirModalCS(forcar) {
  const modal = document.getElementById("modal-cs");
  const sel = document.getElementById("modal-cs-select");
  const erro = document.getElementById("modal-cs-erro");
  modal.style.display = "flex";
  sel.value = forcar ? getCSNome() : "";
  erro.textContent = "";
  sel.focus();
}
function fecharModalCS() { document.getElementById("modal-cs").style.display = "none"; }
function confirmarCS() {
  const sel = document.getElementById("modal-cs-select");
  const erro = document.getElementById("modal-cs-erro");
  const nome = sel.value;
  if (!nome) { erro.textContent = "Selecione seu nome na lista."; return; }
  setCSNome(nome);
  respostas.meta.cs = getCSNome();
  renderClienteInfo();
  fecharModalCS();
}

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}
function escape(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function formatCnpj(c) {
  if (!c || c.length !== 14) return c || "";
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`;
}
function formatDataHora() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// === Histórico de entrevistas ===
let entrevistasMap = {};
function carregarEntrevistasCache() {
  const cached = localStorage.getItem("entrevistas_cache");
  if (!cached) return;
  try {
    const lista = JSON.parse(cached);
    lista.forEach(ent => {
      const key = `${ent.cnpj}__${ent.produto}`;
      if (!entrevistasMap[key] || ent.data > entrevistasMap[key].data) {
        entrevistasMap[key] = {data: ent.data, cs: ent.cs};
      }
    });
  } catch (e) {}
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

// === Carregamento ===
async function init() {
  const cnpj = getParam("cnpj");
  if (!cnpj) { alert("CNPJ não fornecido."); window.location.href = "index.html"; return; }

  atualizarHeaderCS();

  const [dadosResp, questoesResp] = await Promise.all([
    fetch("clientes.json").then(r => r.json()),
    fetch("questoes.json").then(r => r.json())
  ]);
  dadosGlobal = dadosResp;
  questoes = questoesResp;
  cliente = dadosResp.clientes.find(c => c.cnpj === cnpj);
  if (!cliente) { alert("Cliente não encontrado."); window.location.href = "index.html"; return; }

  popularDropdownCSModal();
  if (!getCSNome()) abrirModalCS();

  respostas.meta.cs = getCSNome();
  respostas.meta.cnpj = cnpj;
  respostas.meta.cliente_nome = cliente.nome;
  respostas.meta.cs_responsavel_carteira = cliente.cs || null;
  respostas.meta.canal_projuris = cliente.canal_projuris || null;
  respostas.meta.iniciado_em = new Date().toISOString();

  carregarEntrevistasCache();

  renderClienteInfo();
  renderConfirmador();
}

function renderClienteInfo() {
  const div = document.getElementById("cliente-info");
  if (!cliente) return;
  const fits = Object.entries(cliente.fits)
    .filter(([_, v]) => v && v !== "—")
    .map(([k, v]) => `<span class="badge">${k}: ${v}</span>`)
    .join("");
  div.innerHTML = `
    <h2>${escape(cliente.nome)}</h2>
    <div class="meta">
      <strong>CNPJ:</strong> ${formatCnpj(cliente.cnpj)} ·
      <strong>Carteira:</strong> ${cliente.carteira || "—"} ·
      <strong>Porte:</strong> ${cliente.porte || "—"} ·
      <strong>HS:</strong> ${cliente.hs ?? "—"} ·
      <strong>MRR:</strong> ${cliente.mrr ?? "—"}
    </div>
    <div class="meta" style="margin-top:6px;">
      <strong>CNAE:</strong> ${escape(cliente.cnae_desc || cliente.divisao || "—")} ·
      <strong>Produto atual:</strong> ${escape(cliente.produto_atual || "—")}
    </div>
    <div class="meta" style="margin-top:6px;">
      <strong>Processos:</strong> carteira ${cliente.qtd_proc_carteira ?? "?"} / empresa ${cliente.qtd_proc_empresa ?? "?"}
    </div>
    <div class="responsavel">
      CS responsável: ${escape(cliente.cs || "—")} · Canal Projuris: ${escape(cliente.canal_projuris || "—")}
    </div>
    <div class="badges">${fits}</div>
  `;
}

// =================== BLOCO 0 — CONFIRMADOR ===================
function produtosComFit() {
  return PRODUTOS.filter(p => {
    const f = cliente.fits[p];
    return f === "Alta" || f === "Média";
  });
}
function justificativaModelo(produto) {
  const hs = cliente.hs;
  const porte = cliente.porte;
  const mods = (cliente.modulos || "").split("; ").filter(Boolean);
  const proc = Math.max(cliente.qtd_proc_carteira || 0, cliente.qtd_proc_empresa || 0);
  const div = cliente.divisao || "";
  const partes = [];
  if (cliente.fits[produto] === "Alta") partes.push("Fit Alta");
  if (porte) partes.push(`Porte ${porte}`);
  if (hs) partes.push(`HS ${hs}`);
  if (mods.length) partes.push(`${mods.length} módulos`);
  if (produto === "Deep Legal" && proc) partes.push(`${proc} processos`);
  if ((produto === "Acordos" || produto === "Checklist") && div) partes.push(`Setor ${div}`.slice(0, 30));
  return partes.join(" · ");
}

function renderConfirmador() {
  const tbody = document.getElementById("confirmador-body");
  const fits = produtosComFit();
  if (fits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Esse cliente não tem fit Alta/Média em nenhum produto.</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  fits.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.produto = p;
    const fit = cliente.fits[p];
    const ent = entrevistadoEm(cliente.cnpj, p);
    const aviso = ent ? `<div class="ja-entrevistado">⚠ Já entrevistado em ${formatDataCurta(ent.data)} por ${escape(ent.cs || "?")}</div>` : "";
    if (ent) tr.classList.add("ja-entrevistado-row");
    tr.innerHTML = `
      <td><strong>${p}</strong><div style="font-size:11px; color:#777;">${justificativaModelo(p)}</div>${aviso}</td>
      <td><span class="fit-cell fit-${fit}">${fit}</span></td>
      <td>
        <select class="decisao" data-produto="${p}">
          <option value="">— escolher —</option>
          <option value="entrevistar">Vou entrevistar</option>
          <option value="descartar"${ent ? " selected" : ""}>Não vou entrevistar</option>
        </select>
      </td>
      <td class="motivo-cell">
        <select class="motivo" data-produto="${p}">
          <option value="">— motivo —</option>
          ${questoes.motivos_descarte_confirmador.map(m => `<option value="${escape(m)}"${ent && m.startsWith("Já abordei") ? " selected" : ""}>${escape(m)}</option>`).join("")}
        </select>
        <input type="text" class="motivo-livre" data-produto="${p}" placeholder="(detalhe se Outro)" style="margin-top:4px; display:none;">
      </td>
    `;
    if (ent) tr.classList.add("descartar");
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("select.decisao").forEach(sel => {
    sel.addEventListener("change", () => {
      const tr = sel.closest("tr");
      tr.classList.toggle("descartar", sel.value === "descartar");
      atualizarBotaoIniciar();
    });
  });
  tbody.querySelectorAll("select.motivo").forEach(sel => {
    sel.addEventListener("change", () => {
      const livre = sel.parentElement.querySelector(".motivo-livre");
      livre.style.display = sel.value === "Outro" ? "block" : "none";
      atualizarBotaoIniciar();
    });
  });
  tbody.querySelectorAll(".motivo-livre").forEach(inp => {
    inp.addEventListener("input", atualizarBotaoIniciar);
  });

  document.getElementById("btn-iniciar").addEventListener("click", iniciarReuniao);
  atualizarBotaoIniciar();
}

function atualizarBotaoIniciar() {
  const btn = document.getElementById("btn-iniciar");
  const linhas = document.querySelectorAll("#confirmador-body tr[data-produto]");
  let temEntrevistar = false;
  let valido = true;
  linhas.forEach(tr => {
    const decisao = tr.querySelector("select.decisao").value;
    if (!decisao) { valido = false; return; }
    if (decisao === "entrevistar") temEntrevistar = true;
    if (decisao === "descartar") {
      const motivo = tr.querySelector("select.motivo").value;
      if (!motivo) valido = false;
      if (motivo === "Outro") {
        const livre = tr.querySelector(".motivo-livre").value.trim();
        if (!livre) valido = false;
      }
    }
  });
  btn.disabled = !(valido && temEntrevistar);
  btn.textContent = !valido ? "Preencha decisão e motivo de todos →" :
                    !temEntrevistar ? "Marque pelo menos 1 \"Vou entrevistar\" →" :
                    "Iniciar reunião →";
}

function iniciarReuniao() {
  const linhas = document.querySelectorAll("#confirmador-body tr[data-produto]");
  const produtosEntrevistar = [];
  linhas.forEach(tr => {
    const p = tr.dataset.produto;
    const decisao = tr.querySelector("select.decisao").value;
    const motivo = tr.querySelector("select.motivo").value;
    const motivoLivre = tr.querySelector(".motivo-livre").value.trim();
    respostas.confirmador[p] = {
      decisao,
      motivo: decisao === "descartar" ? (motivo === "Outro" ? motivoLivre : motivo) : null
    };
    if (decisao === "entrevistar") produtosEntrevistar.push(p);
  });
  produtosEntrevistar.sort((a, b) => PRODUTOS.indexOf(a) - PRODUTOS.indexOf(b));
  respostas.meta.produtos_entrevistar = produtosEntrevistar;

  document.getElementById("bloco-confirmador").classList.add("hidden");
  document.getElementById("wizard").classList.remove("hidden");

  produtosEntrevistar.forEach(p => { if (!respostas.produtos[p]) respostas.produtos[p] = {}; });

  buildSteps();
  state.idx = 0;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =================== WIZARD — STEPS ===================
function inferirRamoAcordos() {
  const ac4 = respostas.produtos.Acordos?.AC_4;
  if (!ac4) return null;
  const cfg = questoes.produtos.Acordos.perguntas_iniciais.find(p => p.id === "AC_4");
  if (!cfg) return null;
  const valor = Array.isArray(ac4) ? ac4[0] : ac4;
  const base = String(valor).split(":")[0].trim();
  const op = cfg.opcoes.find(o => {
    const texto = typeof o === "object" ? o.texto : o;
    return texto === valor || texto === base || String(valor).startsWith(texto);
  });
  return op?.ramo || null;
}

function inferirModuloPassivo() {
  const r = respostas.produtos.Acordos?.AC_PA1;
  if (!r) return null;
  const cfg = (questoes.produtos.Acordos.ramos.passivo || []).find(p => p.id === "AC_PA1");
  if (!cfg) return null;
  const valor = Array.isArray(r) ? r[0] : r;
  const base = String(valor).split(":")[0].trim();
  const op = cfg.opcoes.find(o => {
    const texto = typeof o === "object" ? o.texto : o;
    return texto === valor || texto === base || String(valor).startsWith(texto);
  });
  return op?.modulo || null;
}

function buildSteps() {
  const steps = [];
  questoes.tronco.forEach(p => steps.push({ tipo: "tronco_q", pergunta: p }));
  (respostas.meta.produtos_entrevistar || []).forEach(produto => {
    const cfg = questoes.produtos[produto];
    if (!cfg) return;
    if (produto === "Acordos") {
      steps.push({ tipo: "acordos_iniciais", produto });
      const ramo = inferirRamoAcordos();
      const subs = [];
      if (ramo === "passivo") subs.push(...(cfg.ramos.passivo || []));
      else if (ramo === "ativo") subs.push(...(cfg.ramos.ativo || []));
      else if (ramo === "misto") { subs.push(...(cfg.ramos.passivo || [])); subs.push(...(cfg.ramos.ativo || [])); }
      subs.forEach(p => steps.push({ tipo: "acordos_ramo_q", produto, pergunta: p, ramo }));
      steps.push({ tipo: "acordos_final_q", produto, pergunta: cfg.pergunta_final_comum });
    } else if (cfg.tipo === "ponte") {
      steps.push({ tipo: "ponte_unica", produto });
    } else {
      steps.push({ tipo: "produto_q", produto, pergunta: cfg.pergunta_chave });
      (cfg.essenciais || []).forEach(p => steps.push({ tipo: "produto_q", produto, pergunta: p }));
    }
  });
  steps.push({ tipo: "encerramento", pergunta: questoes.encerramento_cliente });
  questoes.final.forEach(p => steps.push({ tipo: "final_q", pergunta: p }));
  state.steps = steps;
}

function stepIgual(a, b) {
  if (!a || !b) return false;
  if (a.tipo !== b.tipo) return false;
  if (a.produto !== b.produto) return false;
  if (a.tipo === "acordos_iniciais" || a.tipo === "ponte_unica") return true;
  return (a.pergunta?.id) === (b.pergunta?.id);
}

function recompilarSteps() {
  const stepAtual = state.steps[state.idx];
  buildSteps();
  const novoIdx = state.steps.findIndex(s => stepIgual(s, stepAtual));
  state.idx = novoIdx >= 0 ? novoIdx : Math.min(state.idx, state.steps.length - 1);
}

// =================== RENDER PERGUNTA (genérico, com restore) ===================
function renderPergunta(p, container, pre, opts) {
  opts = opts || {};
  const wrap = document.createElement("div");
  wrap.className = "pergunta";
  wrap.dataset.id = p.id;

  if (p.fala) {
    const fala = document.createElement("div");
    fala.className = "fala-cs";
    fala.innerHTML = `Fala pro cliente: "${escape(p.fala)}"`;
    wrap.appendChild(fala);
  }
  if (p.pergunta) {
    const titulo = document.createElement("div");
    titulo.className = "pergunta-texto";
    titulo.innerHTML = `<span class="id">${p.id}</span> ${escape(p.pergunta)}`;
    wrap.appendChild(titulo);
  }
  if (p.instrucao) {
    const inst = document.createElement("div");
    inst.className = "instrucao";
    inst.textContent = p.instrucao;
    wrap.appendChild(inst);
  }
  if (p.condicional) {
    const cond = document.createElement("div");
    cond.style.cssText = "color:#7f5e00; font-size:11.5px; font-style:italic; margin-bottom:6px;";
    cond.textContent = `(Pergunta condicional — ${p.condicional}. Pule se não se aplicar.)`;
    wrap.appendChild(cond);
  }

  const tipo = p.tipo || "single";
  const name = `Q_${p.id}`;

  if (tipo === "free_text") {
    const ta = document.createElement("textarea");
    ta.dataset.id = p.id;
    if (pre !== undefined && pre !== null) ta.value = pre;
    wrap.appendChild(ta);
    container.appendChild(wrap);
    return wrap;
  }

  const opcoes = p.opcoes || [];
  const inputType = tipo === "multi" ? "checkbox" : "radio";
  const preSet = new Set(Array.isArray(pre) ? pre : (pre !== undefined && pre !== null ? [pre] : []));

  opcoes.forEach((op, i) => {
    const opcaoTexto = typeof op === "string" ? op : op.texto;
    const opcaoTipo = typeof op === "object" ? op.tipo : null;
    const isFreeOption = opcaoTipo === "free" || opcaoTexto.startsWith("Outro");

    const lbl = document.createElement("label");
    lbl.className = "opcao";
    if (opcaoTipo === "interest") lbl.classList.add("interest");
    if (opcaoTipo === "discard") lbl.classList.add("discard");

    const input = document.createElement("input");
    input.type = inputType;
    input.name = name;
    input.value = opcaoTexto;
    input.dataset.tipo = opcaoTipo || "";

    let marcado = false;
    let detalheLivre = "";
    preSet.forEach(v => {
      const sv = String(v);
      if (sv === opcaoTexto) marcado = true;
      else if (sv.startsWith(opcaoTexto + ":")) { marcado = true; detalheLivre = sv.slice(opcaoTexto.length + 1).trim(); }
    });
    input.checked = marcado;

    lbl.appendChild(input);
    lbl.appendChild(document.createTextNode(opcaoTexto));

    if (opcaoTipo === "interest") {
      const tag = document.createElement("span"); tag.className = "tag-interest"; tag.textContent = "interesse";
      lbl.appendChild(tag);
    } else if (opcaoTipo === "discard") {
      const tag = document.createElement("span"); tag.className = "tag-discard"; tag.textContent = "não é prioridade";
      lbl.appendChild(tag);
    }

    if (isFreeOption) {
      const livre = document.createElement("input");
      livre.type = "text";
      livre.className = "free-input" + (marcado ? " visible" : "");
      livre.placeholder = "detalhe…";
      livre.dataset.livreFor = name;
      if (detalheLivre) livre.value = detalheLivre;
      input.addEventListener("change", () => livre.classList.toggle("visible", input.checked));
      lbl.appendChild(livre);
    }
    wrap.appendChild(lbl);
  });

  if (p.extra_texto) {
    const ta = document.createElement("textarea");
    ta.className = "extra-textarea";
    ta.dataset.extraId = p.id;
    ta.placeholder = p.extra_texto;
    if (opts.preExtra !== undefined && opts.preExtra !== null) ta.value = opts.preExtra;
    wrap.appendChild(ta);
  }

  container.appendChild(wrap);
  return wrap;
}

// =================== COLETAR PERGUNTA ===================
function coletarPergunta(p) {
  if (p.tipo === "free_text") {
    const ta = document.querySelector(`textarea[data-id="${p.id}"]`);
    return ta && ta.value.trim() ? ta.value.trim() : undefined;
  }
  const name = `Q_${p.id}`;
  const inputs = document.querySelectorAll(`input[name="${name}"]:checked`);
  if (inputs.length === 0) return undefined;
  const valores = [];
  inputs.forEach(i => {
    let v = i.value;
    const livre = i.parentElement.querySelector(".free-input");
    if (livre && livre.classList.contains("visible") && livre.value.trim()) {
      v += `: ${livre.value.trim()}`;
    }
    valores.push(v);
  });
  return inputs[0].type === "radio" ? valores[0] : valores;
}

// =================== RENDER STEP ===================
function renderStep() {
  const step = state.steps[state.idx];
  const conteudo = document.getElementById("wizard-step-conteudo");
  conteudo.innerHTML = "";

  const tipoTag = document.getElementById("wizard-step-tipo");
  const titulo = document.getElementById("wizard-step-titulo");
  const subtitulo = document.getElementById("wizard-step-subtitulo");
  const alerta = document.getElementById("wizard-step-descarte-alerta");
  alerta.classList.remove("visible");
  subtitulo.textContent = "";

  switch (step.tipo) {
    case "tronco_q": {
      tipoTag.textContent = "TRONCO";
      titulo.textContent = `Contexto geral · ${step.pergunta.id}`;
      subtitulo.textContent = "Perguntas comuns a todos os atendimentos.";
      renderPergunta(step.pergunta, conteudo, respostas.tronco[step.pergunta.id]);
      if (step.pergunta.complemento) {
        const wrap = document.createElement("div");
        wrap.className = "complemento";
        const tit = document.createElement("div");
        tit.className = "compl-titulo";
        tit.textContent = "Complemento";
        wrap.appendChild(tit);
        const compl = Object.assign({}, step.pergunta.complemento, { id: `${step.pergunta.id}_complemento` });
        renderPergunta(compl, wrap, respostas.tronco[`${step.pergunta.id}_complemento`]);
        conteudo.appendChild(wrap);
      }
      break;
    }
    case "acordos_iniciais": {
      tipoTag.textContent = "ACORDOS · INICIAIS";
      titulo.textContent = "Acordos — perguntas iniciais (1 tela)";
      subtitulo.textContent = "Responda as 4 perguntas para identificar o polo. O pitch aparece no card lateral só depois disso.";
      questoes.produtos.Acordos.perguntas_iniciais.forEach(p => {
        renderPergunta(p, conteudo, respostas.produtos.Acordos?.[p.id]);
      });
      break;
    }
    case "acordos_ramo_q": {
      const ramoLabel = step.ramo === "misto" ? "MISTO" : step.ramo.toUpperCase();
      tipoTag.textContent = `ACORDOS · ${ramoLabel}`;
      titulo.textContent = `Acordos (polo ${step.ramo}) · ${step.pergunta.id}`;
      renderPergunta(step.pergunta, conteudo, respostas.produtos.Acordos?.[step.pergunta.id]);
      break;
    }
    case "acordos_final_q": {
      tipoTag.textContent = "ACORDOS · FINAL";
      titulo.textContent = `Acordos · ${step.pergunta.id} (pergunta final)`;
      renderPergunta(step.pergunta, conteudo, respostas.produtos.Acordos?.[step.pergunta.id]);
      break;
    }
    case "produto_q": {
      tipoTag.textContent = step.produto.toUpperCase();
      titulo.textContent = `${step.produto} · ${step.pergunta.id}`;
      renderPergunta(step.pergunta, conteudo, respostas.produtos[step.produto]?.[step.pergunta.id]);
      atualizarDescarteAlerta(step.produto);
      conteudo.addEventListener("change", () => atualizarDescarteAlerta(step.produto));
      break;
    }
    case "ponte_unica": {
      tipoTag.textContent = `${step.produto.toUpperCase()} · PONTE`;
      titulo.textContent = `${step.produto} — ponte/indicação`;
      subtitulo.textContent = "Formato curto: contexto, oferta, e identificação de quem cuida pra repassar pro comercial.";
      const cfg = questoes.produtos[step.produto];
      renderPergunta(Object.assign({}, cfg.p1, { tipo: "free_text" }), conteudo, respostas.produtos[step.produto]?.[cfg.p1.id]);
      renderPergunta(cfg.p2, conteudo, respostas.produtos[step.produto]?.[cfg.p2.id]);
      renderPergunta(cfg.p3, conteudo, respostas.produtos[step.produto]?.[cfg.p3.id]);
      break;
    }
    case "encerramento": {
      tipoTag.textContent = "ENCERRAMENTO COM CLIENTE";
      titulo.textContent = "Última pergunta com o cliente";
      subtitulo.textContent = "Antes de encerrar a reunião — pra repassar pro comercial.";
      renderPergunta(step.pergunta, conteudo, respostas.encerramento[step.pergunta.id]);
      break;
    }
    case "final_q": {
      tipoTag.textContent = "PÓS-REUNIÃO · CS";
      titulo.textContent = `Comentário do CS · ${step.pergunta.id}`;
      subtitulo.textContent = "Preencha após a reunião (não é pra ler com o cliente).";
      renderPergunta(step.pergunta, conteudo, respostas.final[step.pergunta.id], { preExtra: respostas.final[`${step.pergunta.id}_extra`] });
      break;
    }
  }

  renderSidebar(step);
  renderProgress();
  ajustarBotoes();
}

function atualizarDescarteAlerta(produto) {
  const cfg = questoes.produtos[produto];
  if (!cfg || cfg.tipo === "ponte") return;
  const idsEssenciais = (cfg.essenciais || []).map(e => e.id);
  let count = 0;
  idsEssenciais.forEach(eid => {
    const saved = respostas.produtos[produto]?.[eid];
    const inputAtual = document.querySelector(`input[name="Q_${eid}"]:checked`);
    if (inputAtual) {
      if (inputAtual.dataset.tipo === "discard") count++;
    } else if (saved) {
      const ess = cfg.essenciais.find(e => e.id === eid);
      const op = (ess.opcoes || []).find(o => typeof o === "object" && (o.texto === saved || String(saved).startsWith(o.texto + ":")));
      if (op?.tipo === "discard") count++;
    }
  });
  const alerta = document.getElementById("wizard-step-descarte-alerta");
  alerta.classList.toggle("visible", count >= 2);
}

// =================== SIDEBAR — PITCH + SINAIS ===================
function renderSidebar(step) {
  const sb = document.getElementById("wizard-sidebar");
  const semPitch = ["tronco_q", "encerramento", "final_q"];
  if (semPitch.includes(step.tipo)) {
    sb.classList.add("empty");
    sb.innerHTML = `<p>Esse bloco não tem pitch — perguntas comuns ou pós-reunião.</p>`;
    return;
  }
  if (step.tipo === "acordos_iniciais") {
    sb.classList.add("empty");
    sb.innerHTML = `<p><strong>Acordos:</strong> o pitch aparece aqui assim que você identificar o polo (AC_4) e seguir para o próximo passo.</p>`;
    return;
  }

  sb.classList.remove("empty");
  const produto = step.produto;
  const cfg = questoes.produtos[produto];

  let pitchHtml = "";
  if (produto === "Acordos") {
    const ramo = step.ramo || inferirRamoAcordos();
    const pitches = cfg.pitches || {};
    const modulo = inferirModuloPassivo();
    const blocos = [];
    if (ramo === "ativo") {
      blocos.push({ titulo: "Pitch · Polo ativo", texto: pitches.ativo });
    } else if (ramo === "passivo") {
      if (modulo === "indenizatorio") blocos.push({ titulo: "Pitch · Passivo indenizatório", texto: pitches.passivo_indenizatorio });
      else if (modulo === "consumidor") blocos.push({ titulo: "Pitch · Passivo consumidor", texto: pitches.passivo_consumidor });
      else {
        blocos.push({ titulo: "Pitch · Passivo indenizatório", texto: pitches.passivo_indenizatorio });
        blocos.push({ titulo: "Pitch · Passivo consumidor", texto: pitches.passivo_consumidor });
      }
    } else if (ramo === "misto") {
      blocos.push({ titulo: "Pitch · Polo ativo", texto: pitches.ativo });
      if (modulo === "indenizatorio") blocos.push({ titulo: "Pitch · Passivo indenizatório", texto: pitches.passivo_indenizatorio });
      else if (modulo === "consumidor") blocos.push({ titulo: "Pitch · Passivo consumidor", texto: pitches.passivo_consumidor });
      else {
        blocos.push({ titulo: "Pitch · Passivo indenizatório", texto: pitches.passivo_indenizatorio });
        blocos.push({ titulo: "Pitch · Passivo consumidor", texto: pitches.passivo_consumidor });
      }
    }
    pitchHtml = blocos.map(b => `
      <div class="pitch-corpo">
        <div class="pitch-titulo">${escape(b.titulo)}</div>
        ${escape(b.texto)}
      </div>
    `).join("");
  } else if (cfg.pitch) {
    pitchHtml = `<div class="pitch-corpo">${escape(cfg.pitch)}</div>`;
  }

  let sinaisHtml = "";
  if (cfg.sinais && cfg.sinais.length) {
    const marcados = new Set(respostas.produtos[produto]?.sinais_quentes || []);
    sinaisHtml = `
      <div class="sinais-bloco">
        <h4>Sinais quentes (marque durante a call)</h4>
        ${cfg.sinais.map((s) => `
          <label>
            <input type="checkbox" data-sinal="${escape(produto)}" value="${escape(s)}"${marcados.has(s) ? " checked" : ""}>
            ${escape(s)}
          </label>
        `).join("")}
      </div>
    `;
  }

  sb.innerHTML = `
    <span class="sb-tag">${escape(produto)}</span>
    <h3>Pitch sugerido (CS → cliente / comercial)</h3>
    ${pitchHtml || "<p>Sem pitch configurado.</p>"}
    ${sinaisHtml}
  `;

  sb.querySelectorAll(`input[data-sinal]`).forEach(inp => {
    inp.addEventListener("change", () => {
      if (!respostas.produtos[produto]) respostas.produtos[produto] = {};
      const marcados = Array.from(sb.querySelectorAll(`input[data-sinal="${produto}"]:checked`)).map(i => i.value);
      respostas.produtos[produto].sinais_quentes = marcados;
    });
  });
}

// =================== PROGRESS + BOTÕES ===================
function renderProgress() {
  const total = state.steps.length;
  const atual = state.idx + 1;
  const pct = total ? Math.round((atual / total) * 100) : 0;
  document.getElementById("wizard-progress-label").textContent = `Pergunta ${atual} de ${total}`;
  document.getElementById("wizard-progress-bar").style.width = `${pct}%`;
  const step = state.steps[state.idx];
  document.getElementById("wizard-step-tag").textContent = bookmarkTag(step);
}

function bookmarkTag(step) {
  if (step.tipo === "tronco_q") return "TRONCO";
  if (step.tipo === "encerramento") return "ENCERRAMENTO";
  if (step.tipo === "final_q") return "PÓS-REUNIÃO";
  if (step.tipo === "ponte_unica") return `${step.produto} (ponte)`;
  if (step.produto === "Acordos") {
    if (step.tipo === "acordos_iniciais") return "ACORDOS · iniciais";
    if (step.tipo === "acordos_ramo_q") return `ACORDOS · ${step.ramo}`;
    if (step.tipo === "acordos_final_q") return "ACORDOS · final";
  }
  return step.produto || "—";
}

function ajustarBotoes() {
  const btnVoltar = document.getElementById("btn-voltar");
  const btnProximo = document.getElementById("btn-proximo");
  btnVoltar.style.visibility = state.idx === 0 ? "hidden" : "visible";
  btnProximo.textContent = state.idx === state.steps.length - 1 ? "Ver resumo final →" : "Próxima →";
}

// =================== NAVEGAÇÃO ===================
function coletarStepAtual() {
  const step = state.steps[state.idx];
  switch (step.tipo) {
    case "tronco_q": {
      const r = coletarPergunta(step.pergunta);
      if (r !== undefined) respostas.tronco[step.pergunta.id] = r;
      else delete respostas.tronco[step.pergunta.id];
      if (step.pergunta.complemento) {
        const compl = Object.assign({}, step.pergunta.complemento, { id: `${step.pergunta.id}_complemento` });
        const rc = coletarPergunta(compl);
        if (rc !== undefined) respostas.tronco[compl.id] = rc;
        else delete respostas.tronco[compl.id];
      }
      break;
    }
    case "acordos_iniciais": {
      if (!respostas.produtos.Acordos) respostas.produtos.Acordos = {};
      questoes.produtos.Acordos.perguntas_iniciais.forEach(p => {
        const r = coletarPergunta(p);
        if (r !== undefined) respostas.produtos.Acordos[p.id] = r;
        else delete respostas.produtos.Acordos[p.id];
      });
      break;
    }
    case "acordos_ramo_q":
    case "acordos_final_q": {
      if (!respostas.produtos.Acordos) respostas.produtos.Acordos = {};
      const r = coletarPergunta(step.pergunta);
      if (r !== undefined) respostas.produtos.Acordos[step.pergunta.id] = r;
      else delete respostas.produtos.Acordos[step.pergunta.id];
      break;
    }
    case "produto_q": {
      if (!respostas.produtos[step.produto]) respostas.produtos[step.produto] = {};
      const r = coletarPergunta(step.pergunta);
      if (r !== undefined) respostas.produtos[step.produto][step.pergunta.id] = r;
      else delete respostas.produtos[step.produto][step.pergunta.id];
      break;
    }
    case "ponte_unica": {
      const cfg = questoes.produtos[step.produto];
      if (!respostas.produtos[step.produto]) respostas.produtos[step.produto] = {};
      [Object.assign({}, cfg.p1, { tipo: "free_text" }), cfg.p2, cfg.p3].forEach(p => {
        const r = coletarPergunta(p);
        if (r !== undefined) respostas.produtos[step.produto][p.id] = r;
        else delete respostas.produtos[step.produto][p.id];
      });
      break;
    }
    case "encerramento": {
      const r = coletarPergunta(step.pergunta);
      if (r !== undefined) respostas.encerramento[step.pergunta.id] = r;
      else delete respostas.encerramento[step.pergunta.id];
      break;
    }
    case "final_q": {
      const r = coletarPergunta(step.pergunta);
      if (r !== undefined) respostas.final[step.pergunta.id] = r;
      else delete respostas.final[step.pergunta.id];
      if (step.pergunta.extra_texto) {
        const ta = document.querySelector(`textarea[data-extra-id="${step.pergunta.id}"]`);
        if (ta && ta.value.trim()) respostas.final[`${step.pergunta.id}_extra`] = ta.value.trim();
        else delete respostas.final[`${step.pergunta.id}_extra`];
      }
      break;
    }
  }
}

function proximoStep() {
  coletarStepAtual();
  recompilarSteps();
  if (state.idx >= state.steps.length - 1) {
    abrirResumo();
    return;
  }
  state.idx += 1;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarStep() {
  coletarStepAtual();
  recompilarSteps();
  if (state.idx <= 0) return;
  state.idx -= 1;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =================== RESUMO ===================
function gerarTextoResumo() {
  const linhas = [];
  linhas.push(`CROSS-SELL — RESUMO DA REUNIÃO`);
  linhas.push(`Data: ${formatDataHora()}`);
  linhas.push(`CS (usuário da ferramenta): ${respostas.meta.cs}`);
  linhas.push(`CS responsável pela carteira: ${cliente.cs || "—"}`);
  linhas.push(`Canal Projuris: ${cliente.canal_projuris || "—"}`);
  linhas.push(``);
  linhas.push(`CLIENTE`);
  linhas.push(`Nome: ${cliente.nome}`);
  linhas.push(`CNPJ: ${formatCnpj(cliente.cnpj)}`);
  linhas.push(`Carteira: ${cliente.carteira || "—"} · Porte: ${cliente.porte || "—"} · HS: ${cliente.hs ?? "—"} · MRR: ${cliente.mrr ?? "—"}`);
  linhas.push(`CNAE: ${cliente.cnae_desc || cliente.divisao || "—"}`);
  linhas.push(`Produto atual: ${cliente.produto_atual || "—"}`);
  linhas.push(`Processos: carteira ${cliente.qtd_proc_carteira ?? "?"} / empresa ${cliente.qtd_proc_empresa ?? "?"}`);
  linhas.push(``);
  linhas.push(`DECISÃO PRÉ-REUNIÃO`);
  const entrevistar = [];
  const descartar = [];
  Object.entries(respostas.confirmador).forEach(([prod, info]) => {
    if (info.decisao === "entrevistar") entrevistar.push(prod);
    else if (info.decisao === "descartar") descartar.push(`${prod} (motivo: ${info.motivo || "—"})`);
  });
  linhas.push(`Vou entrevistar: ${entrevistar.join(", ") || "—"}`);
  if (descartar.length) {
    linhas.push(`Não vou entrevistar:`);
    descartar.forEach(d => linhas.push(`  - ${d}`));
  }
  linhas.push(``);
  linhas.push(`CONTEXTO GERAL`);
  questoes.tronco.forEach(p => {
    const r = respostas.tronco[p.id];
    if (r === undefined) return;
    linhas.push(`  ${p.pergunta}`);
    linhas.push(`    → ${Array.isArray(r) ? r.join("; ") : r}`);
    if (p.complemento) {
      const rc = respostas.tronco[`${p.id}_complemento`];
      if (rc !== undefined) {
        linhas.push(`    ${p.complemento.pergunta}`);
        linhas.push(`      → ${Array.isArray(rc) ? rc.join("; ") : rc}`);
      }
    }
  });
  linhas.push(``);

  (respostas.meta.produtos_entrevistar || []).forEach(produto => {
    const cfg = questoes.produtos[produto];
    const respProd = respostas.produtos[produto] || {};
    if (Object.keys(respProd).length === 0) return;
    linhas.push(`${produto.toUpperCase()}`);
    if (produto === "Acordos") {
      cfg.perguntas_iniciais.forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        linhas.push(`  ${p.pergunta}`);
        linhas.push(`    → ${Array.isArray(r) ? r.join("; ") : r}`);
      });
      const ramosAll = [...(cfg.ramos.passivo || []), ...(cfg.ramos.ativo || [])];
      ramosAll.forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        linhas.push(`  ${p.pergunta}`);
        linhas.push(`    → ${Array.isArray(r) ? r.join("; ") : r}`);
      });
      const pf = cfg.pergunta_final_comum;
      const rf = respProd[pf.id];
      if (rf !== undefined) {
        linhas.push(`  ${pf.pergunta}`);
        linhas.push(`    → ${Array.isArray(rf) ? rf.join("; ") : rf}`);
      }
      const ramo = inferirRamoAcordos();
      const modulo = inferirModuloPassivo();
      const pitches = [];
      if (ramo === "ativo" || ramo === "misto") pitches.push(["Pitch ativo", cfg.pitches.ativo]);
      if (ramo === "passivo" || ramo === "misto") {
        if (modulo === "indenizatorio") pitches.push(["Pitch passivo indenizatório", cfg.pitches.passivo_indenizatorio]);
        else if (modulo === "consumidor") pitches.push(["Pitch passivo consumidor", cfg.pitches.passivo_consumidor]);
        else {
          pitches.push(["Pitch passivo indenizatório", cfg.pitches.passivo_indenizatorio]);
          pitches.push(["Pitch passivo consumidor", cfg.pitches.passivo_consumidor]);
        }
      }
      pitches.forEach(([t, p]) => { linhas.push(`  ${t}: ${p}`); });
    } else if (cfg.tipo === "ponte") {
      [Object.assign({}, cfg.p1, { tipo: "free_text" }), cfg.p2, cfg.p3].forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        linhas.push(`  ${p.pergunta || p.fala || ""}`);
        linhas.push(`    → ${Array.isArray(r) ? r.join("; ") : r}`);
      });
      if (cfg.pitch) linhas.push(`  Pitch sugerido: ${cfg.pitch}`);
    } else {
      const todas = [cfg.pergunta_chave, ...(cfg.essenciais || [])];
      todas.forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        linhas.push(`  ${p.pergunta}`);
        linhas.push(`    → ${Array.isArray(r) ? r.join("; ") : r}`);
      });
      if (cfg.pitch) linhas.push(`  Pitch sugerido: ${cfg.pitch}`);
    }
    if (respProd.sinais_quentes && respProd.sinais_quentes.length) {
      linhas.push(`  Sinais quentes: ${respProd.sinais_quentes.join("; ")}`);
    }
    linhas.push(``);
  });

  const ec1 = respostas.encerramento.EC_1;
  if (ec1 !== undefined) {
    linhas.push(`ENCERRAMENTO COM CLIENTE — Decisor(es) pra próxima conversa`);
    linhas.push(`  ${Array.isArray(ec1) ? ec1.join("; ") : ec1}`);
    linhas.push(``);
  }

  const f1 = respostas.final.F1;
  const f2 = respostas.final.F2;
  const f2_extra = respostas.final.F2_extra;
  if (f1) {
    linhas.push(`FRASE-GANCHO DO CLIENTE`);
    linhas.push(`  "${f1}"`);
    linhas.push(``);
  }
  if (f2 !== undefined || f2_extra !== undefined) {
    linhas.push(`COMENTÁRIOS DO CS SOBRE O CLIENTE`);
    if (f2 !== undefined) {
      linhas.push(`  Sensação do atendimento: ${Array.isArray(f2) ? f2.join("; ") : f2}`);
    }
    if (f2_extra) {
      linhas.push(`  Considerações adicionais: ${f2_extra}`);
    }
    linhas.push(``);
  }
  return linhas.join("\n");
}

function abrirResumo() {
  respostas.meta.finalizado_em = new Date().toISOString();
  document.getElementById("resumo-texto").textContent = gerarTextoResumo();
  document.getElementById("wizard").classList.add("hidden");
  document.getElementById("bloco-resumo").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarParaForm() {
  document.getElementById("bloco-resumo").classList.add("hidden");
  document.getElementById("wizard").classList.remove("hidden");
  state.idx = state.steps.length - 1;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function copiarResumo() {
  const texto = document.getElementById("resumo-texto").textContent;
  try {
    await navigator.clipboard.writeText(texto);
    const fb = document.getElementById("copy-feedback");
    fb.classList.add("visible");
    setTimeout(() => fb.classList.remove("visible"), 2500);
  } catch (e) {
    alert("Não consegui copiar automaticamente. Selecione o texto manualmente e copie (Ctrl+C).");
  }
}

async function enviar() {
  const btn = document.getElementById("btn-confirmar-envio");
  btn.disabled = true;
  btn.textContent = "Enviando…";

  if (!APPS_SCRIPT_URL) {
    document.getElementById("bloco-resumo").classList.add("hidden");
    const r = document.getElementById("resultado");
    r.classList.remove("hidden");
    document.getElementById("resultado-msg").innerHTML =
      `<strong>APPS_SCRIPT_URL ainda não configurado.</strong> ` +
      `As respostas seriam enviadas. Veja o JSON no console (F12).<br><br>` +
      `<pre style="max-height:400px;overflow:auto;background:#f6f8fa;padding:12px;border-radius:6px;font-size:11px;">${escape(JSON.stringify(respostas, null, 2))}</pre>`;
    console.log("Respostas:", respostas);
    return;
  }

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(respostas)
    });
    document.getElementById("bloco-resumo").classList.add("hidden");
    document.getElementById("resultado").classList.remove("hidden");
    document.getElementById("resultado-msg").textContent = "Respostas registradas com sucesso. Obrigada!";
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Confirmar e enviar";
    alert("Erro ao enviar: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  document.getElementById("modal-cs-confirma").addEventListener("click", confirmarCS);
  document.getElementById("modal-cs-select").addEventListener("change", () => {
    document.getElementById("modal-cs-erro").textContent = "";
  });
  document.getElementById("btn-trocar-cs").addEventListener("click", () => abrirModalCS(true));
  document.getElementById("btn-voltar").addEventListener("click", voltarStep);
  document.getElementById("btn-proximo").addEventListener("click", proximoStep);
  document.getElementById("btn-voltar-resumo").addEventListener("click", voltarParaForm);
  document.getElementById("btn-copiar-resumo").addEventListener("click", copiarResumo);
  document.getElementById("btn-confirmar-envio").addEventListener("click", enviar);
});
