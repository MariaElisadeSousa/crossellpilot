// === Cross-sell Empresas — Formulário Adaptativo ===
 
// COLE AQUI A URL DO APPS SCRIPT QUANDO PUBLICAR (instruções no README.md)
const APPS_SCRIPT_URL = ""; // ex: "https://script.google.com/macros/s/AKfyc.../exec"
 
let cliente = null;
let questoes = null;
let respostas = {
  meta: {},
  confirmador: {},
  tronco: {},
  produtos: {},
  final: {}
};
 
const PRODUTOS = ["Acordos", "Sienge", "Checklist", "Oystr", "Presto", "Legal Intelligence", "Deep Legal"];
 
// === Identificação do CS (mesma lógica do app.js) ===
function normalizarNome(s) {
  if (!s) return "";
  return s.trim().replace(/\s+/g, " ").toLowerCase().split(" ").filter(Boolean)
    .map(w => ["da","de","do","das","dos","e"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function getCSNome() { return localStorage.getItem("cs_nome") || ""; }
function setCSNome(v) {
  const n = normalizarNome(v);
  if (n) localStorage.setItem("cs_nome", n);
  atualizarHeaderCS();
  return n;
}
function atualizarHeaderCS() {
  const display = document.getElementById("cs-nome-display");
  const btnTrocar = document.getElementById("btn-trocar-cs");
  const nome = getCSNome();
  display.textContent = nome ? `CS: ${nome}` : "";
  if (btnTrocar) btnTrocar.style.display = nome ? "inline-block" : "none";
}
function abrirModalCS(forcar) {
  const modal = document.getElementById("modal-cs");
  const input = document.getElementById("modal-cs-input");
  const erro = document.getElementById("modal-cs-erro");
  modal.style.display = "flex";
  input.value = forcar ? getCSNome() : "";
  erro.textContent = "";
  input.focus();
}
function fecharModalCS() { document.getElementById("modal-cs").style.display = "none"; }
function confirmarCS() {
  const input = document.getElementById("modal-cs-input");
  const erro = document.getElementById("modal-cs-erro");
  const nome = input.value.trim();
  if (nome.length < 3) { erro.textContent = "Por favor, digite seu nome completo (mínimo 3 letras)."; return; }
  if (!nome.includes(" ")) { erro.textContent = "Use nome e sobrenome (pra evitar confusão entre CSs com mesmo primeiro nome)."; return; }
  setCSNome(nome);
  respostas.meta.cs = getCSNome();
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
 
// === Carregamento ===
async function init() {
  const cnpj = getParam("cnpj");
  if (!cnpj) { alert("CNPJ não fornecido."); window.location.href = "index.html"; return; }
 
  atualizarHeaderCS();
  if (!getCSNome()) abrirModalCS();
 
  const [dadosResp, questoesResp] = await Promise.all([
    fetch("clientes.json").then(r => r.json()),
    fetch("questoes.json").then(r => r.json())
  ]);
  questoes = questoesResp;
  cliente = dadosResp.clientes.find(c => c.cnpj === cnpj);
  if (!cliente) { alert("Cliente não encontrado."); window.location.href = "index.html"; return; }
 
  respostas.meta.cs = getCSNome();
  respostas.meta.cnpj = cnpj;
  respostas.meta.cliente_nome = cliente.nome;
  respostas.meta.iniciado_em = new Date().toISOString();
 
  renderClienteInfo();
  renderConfirmador();
}
 
function renderClienteInfo() {
  const div = document.getElementById("cliente-info");
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
    <div class="badges">${fits}</div>
  `;
}
 
// === BLOCO 0 — CONFIRMADOR ===
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
    tr.innerHTML = `
      <td><strong>${p}</strong><div style="font-size:11px; color:#777;">${justificativaModelo(p)}</div></td>
      <td><span class="fit-cell fit-${fit}">${fit}</span></td>
      <td>
        <select class="decisao" data-produto="${p}">
          <option value="">— escolher —</option>
          <option value="entrevistar">Vou entrevistar</option>
          <option value="descartar">Não vou entrevistar</option>
        </select>
      </td>
      <td class="motivo-cell">
        <select class="motivo" data-produto="${p}">
          <option value="">— motivo —</option>
          ${questoes.motivos_descarte_confirmador.map(m => `<option value="${escape(m)}">${escape(m)}</option>`).join("")}
        </select>
        <input type="text" class="motivo-livre" data-produto="${p}" placeholder="(detalhe se Outro)" style="margin-top:4px; display:none;">
      </td>
    `;
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
  respostas.meta.produtos_entrevistar = produtosEntrevistar;
 
  document.getElementById("bloco-confirmador").classList.add("hidden");
  renderTronco();
  renderProdutos(produtosEntrevistar);
  renderFinal();
  document.getElementById("bloco-tronco").classList.remove("hidden");
  document.getElementById("bloco-final").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
// === Renderização genérica de pergunta ===
function renderPergunta(p, container, prefixId) {
  const id = `${prefixId}_${p.id}`;
  const tipo = p.tipo || "single";
  const wrap = document.createElement("div");
  wrap.className = "pergunta";
  wrap.dataset.id = p.id;
 
  const titulo = document.createElement("div");
  titulo.className = "pergunta-texto";
  titulo.innerHTML = `<span class="id">${p.id}</span> ${escape(p.pergunta || p.fala || "")}`;
 
  if (p.fala) {
    const fala = document.createElement("div");
    fala.className = "fala-cs";
    fala.innerHTML = `Fala pro cliente: "${escape(p.fala)}"`;
    wrap.appendChild(fala);
  } else {
    wrap.appendChild(titulo);
  }
 
  if (p.instrucao) {
    const inst = document.createElement("div");
    inst.style.cssText = "color:#777; font-size:12px; font-style:italic; margin-bottom:6px;";
    inst.textContent = p.instrucao;
    wrap.appendChild(inst);
  }
 
  if (tipo === "free_text") {
    const ta = document.createElement("textarea");
    ta.dataset.id = p.id;
    wrap.appendChild(ta);
    container.appendChild(wrap);
    return;
  }
 
  const opcoes = p.opcoes || [];
  const inputType = tipo === "multi" ? "checkbox" : "radio";
 
  opcoes.forEach((op, i) => {
    const opcaoTexto = typeof op === "string" ? op : op.texto;
    const opcaoTipo = typeof op === "object" ? op.tipo : null;
    const opcaoId = `${id}_${i}`;
    const lbl = document.createElement("label");
    lbl.className = "opcao";
    if (opcaoTipo === "interest") lbl.classList.add("interest");
    if (opcaoTipo === "discard") lbl.classList.add("discard");
 
    const input = document.createElement("input");
    input.type = inputType;
    input.name = id;
    input.value = opcaoTexto;
    input.dataset.tipo = opcaoTipo || "";
    input.id = opcaoId;
    lbl.appendChild(input);
    lbl.appendChild(document.createTextNode(opcaoTexto));
 
    if (opcaoTipo === "interest") {
      const tag = document.createElement("span"); tag.className = "tag-interest"; tag.textContent = "interesse";
      lbl.appendChild(tag);
    } else if (opcaoTipo === "discard") {
      const tag = document.createElement("span"); tag.className = "tag-discard"; tag.textContent = "não é prioridade";
      lbl.appendChild(tag);
    }
 
    if (opcaoTexto.startsWith("Outro") || opcaoTipo === "free") {
      const livre = document.createElement("input");
      livre.type = "text";
      livre.className = "free-input";
      livre.placeholder = "detalhe…";
      livre.dataset.id = `${p.id}__livre_${i}`;
      input.addEventListener("change", () => livre.classList.toggle("visible", input.checked));
      lbl.appendChild(livre);
    }
    wrap.appendChild(lbl);
  });
 
  // Campo de texto extra opcional (embaixo das opções, pra "consideração adicional")
  if (p.extra_texto) {
    const ta = document.createElement("textarea");
    ta.className = "extra-textarea";
    ta.dataset.extraId = p.id;
    ta.placeholder = p.extra_texto;
    ta.style.cssText = "margin-top: 10px; min-height: 60px;";
    wrap.appendChild(ta);
  }
 
  container.appendChild(wrap);
}
 
function renderTronco() {
  const c = document.getElementById("tronco-perguntas");
  c.innerHTML = "";
  questoes.tronco.forEach(p => renderPergunta(p, c, "TR"));
}
 
function renderProdutos(lista) {
  const c = document.getElementById("blocos-produtos");
  c.innerHTML = "";
  lista.forEach(produto => {
    const cfg = questoes.produtos[produto];
    if (!cfg) return;
    const div = document.createElement("div");
    div.className = "bloco";
    div.dataset.produto = produto;
 
    if (cfg.tipo === "ponte") {
      div.classList.add("ponte");
      div.innerHTML = `<h2>${produto}</h2>
        <div class="nota">FORMATO PONTE/INDICAÇÃO — Como é fora do jurídico, o roteiro é curto. CS faz pergunta de contexto, oferece e identifica o contato certo pra repassar pro comercial.</div>`;
      div.innerHTML += "<h3>Contexto</h3>";
      const p1Wrap = document.createElement("div");
      renderPergunta({...cfg.p1, tipo: "free_text"}, p1Wrap, "PROD");
      div.appendChild(p1Wrap);
      const p2Title = document.createElement("h3"); p2Title.textContent = "Oferta + identificação de quem cuida"; div.appendChild(p2Title);
      const p2Wrap = document.createElement("div");
      renderPergunta({id: cfg.p2.id, fala: cfg.p2.fala, opcoes: cfg.p2.opcoes}, p2Wrap, "PROD");
      div.appendChild(p2Wrap);
      const p3Title = document.createElement("h3"); p3Title.textContent = "Pedido de contato (se houve interesse)"; div.appendChild(p3Title);
      const p3Wrap = document.createElement("div");
      renderPergunta({id: cfg.p3.id, pergunta: cfg.p3.pergunta, opcoes: cfg.p3.opcoes}, p3Wrap, "PROD");
      div.appendChild(p3Wrap);
      const pitch = document.createElement("div");
      pitch.className = "pitch-box";
      pitch.innerHTML = `<strong>PITCH (CS → comercial):</strong>${escape(cfg.pitch)}`;
      div.appendChild(pitch);
    } else {
      div.innerHTML = `<h2>${produto}</h2>`;
      const pcTitle = document.createElement("h3"); pcTitle.textContent = "Pergunta-chave"; div.appendChild(pcTitle);
      const pcWrap = document.createElement("div");
      renderPergunta(cfg.pergunta_chave, pcWrap, "PROD");
      div.appendChild(pcWrap);
      const eTitle = document.createElement("h3"); eTitle.textContent = "Perguntas essenciais (qualificação)"; div.appendChild(eTitle);
      cfg.essenciais.forEach(e => renderPergunta(e, div, "PROD"));
      const alerta = document.createElement("div");
      alerta.className = "descarte-alerta";
      alerta.dataset.produto = produto;
      alerta.textContent = "⚠ ≥2 marcações \"não é prioridade\" — modelo sugere descartar este produto.";
      div.appendChild(alerta);
      const aTitle = document.createElement("h3"); aTitle.textContent = "Informação adicional (opcional)"; div.appendChild(aTitle);
      const nota = document.createElement("p"); nota.style.cssText = "color:#777; font-size:12px; margin-bottom:8px;";
      nota.textContent = "Só rodar se sobrar tempo ou se cliente trouxer naturalmente.";
      div.appendChild(nota);
      cfg.adicionais.forEach(a => renderPergunta(a, div, "PROD"));
      const sTitle = document.createElement("h3"); sTitle.textContent = "Sinais de oportunidade quente (CS marca durante a call)"; div.appendChild(sTitle);
      cfg.sinais.forEach((s, i) => {
        const lbl = document.createElement("label"); lbl.className = "opcao";
        const inp = document.createElement("input"); inp.type = "checkbox";
        inp.name = `SINAL_${produto}_${i}`; inp.value = s; inp.dataset.sinal = produto;
        lbl.appendChild(inp); lbl.appendChild(document.createTextNode(" " + s));
        div.appendChild(lbl);
      });
      const pitch = document.createElement("div");
      pitch.className = "pitch-box";
      pitch.innerHTML = `<strong>PITCH (CS → comercial):</strong>${escape(cfg.pitch)}`;
      div.appendChild(pitch);
    }
 
    c.appendChild(div);
  });
 
  c.addEventListener("change", e => {
    if (e.target.matches("input[type='radio'], input[type='checkbox']")) atualizarDescartes();
  });
}
 
function atualizarDescartes() {
  document.querySelectorAll("#blocos-produtos .bloco").forEach(bloco => {
    const produto = bloco.dataset.produto;
    if (!questoes.produtos[produto] || questoes.produtos[produto].tipo === "ponte") return;
    const essenciais = questoes.produtos[produto].essenciais.map(e => e.id);
    let count = 0;
    essenciais.forEach(eid => {
      const checked = bloco.querySelector(`input[name="PROD_${eid}"]:checked`);
      if (checked && checked.dataset.tipo === "discard") count++;
    });
    const alerta = bloco.querySelector(".descarte-alerta");
    if (alerta) alerta.classList.toggle("visible", count >= 2);
  });
}
 
function renderFinal() {
  const c = document.getElementById("final-perguntas");
  c.innerHTML = "";
  questoes.final.forEach(p => renderPergunta(p, c, "FINAL"));
}
 
// === Coleta + envio ===
function coletarRespostas() {
  respostas.tronco = {};
  questoes.tronco.forEach(p => {
    const r = coletarPergunta(p, "TR");
    if (r !== undefined) respostas.tronco[p.id] = r;
  });
  respostas.produtos = {};
  respostas.meta.produtos_entrevistar.forEach(produto => {
    const cfg = questoes.produtos[produto];
    if (!cfg) return;
    const dados = {};
    if (cfg.tipo === "ponte") {
      [cfg.p1, cfg.p2, cfg.p3].forEach(p => {
        const r = coletarPergunta(p, "PROD");
        if (r !== undefined) dados[p.id] = r;
      });
    } else {
      const r0 = coletarPergunta(cfg.pergunta_chave, "PROD");
      if (r0 !== undefined) dados[cfg.pergunta_chave.id] = r0;
      cfg.essenciais.forEach(e => { const r = coletarPergunta(e, "PROD"); if (r !== undefined) dados[e.id] = r; });
      cfg.adicionais.forEach(a => { const r = coletarPergunta(a, "PROD"); if (r !== undefined) dados[a.id] = r; });
      const sinais = [];
      document.querySelectorAll(`input[data-sinal="${produto}"]:checked`).forEach(i => sinais.push(i.value));
      if (sinais.length) dados.sinais_quentes = sinais;
    }
    respostas.produtos[produto] = dados;
  });
  respostas.final = {};
  questoes.final.forEach(p => {
    const r = coletarPergunta(p, "FINAL");
    if (r !== undefined) respostas.final[p.id] = r;
    if (p.extra_texto) {
      const ta = document.querySelector(`textarea[data-extra-id="${p.id}"]`);
      if (ta && ta.value.trim()) respostas.final[`${p.id}_extra`] = ta.value.trim();
    }
  });
  respostas.meta.finalizado_em = new Date().toISOString();
}
 
function coletarPergunta(p, prefix) {
  if (p.tipo === "free_text") {
    const ta = document.querySelector(`textarea[data-id="${p.id}"]`);
    return ta && ta.value.trim() ? ta.value.trim() : undefined;
  }
  const inputs = document.querySelectorAll(`input[name="${prefix}_${p.id}"]:checked`);
  if (inputs.length === 0) return undefined;
  const valores = [];
  inputs.forEach(i => {
    let v = i.value;
    const livre = i.parentElement.querySelector(".free-input");
    if (livre && livre.classList.contains("visible") && livre.value.trim()) v += `: ${livre.value.trim()}`;
    valores.push(v);
  });
  return inputs[0].type === "radio" ? valores[0] : valores;
}
 
// === Tela de resumo ===
function gerarTextoResumo() {
  const linhas = [];
  linhas.push(`CROSS-SELL — RESUMO DA REUNIÃO`);
  linhas.push(`Data: ${formatDataHora()}`);
  linhas.push(`CS: ${respostas.meta.cs}`);
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
    const valor = Array.isArray(r) ? r.join("; ") : r;
    linhas.push(`  ${p.pergunta}`);
    linhas.push(`    → ${valor}`);
  });
  linhas.push(``);
  // Por produto — pergunta inteira + resposta
  respostas.meta.produtos_entrevistar.forEach(produto => {
    const cfg = questoes.produtos[produto];
    const respProd = respostas.produtos[produto] || {};
    if (Object.keys(respProd).length === 0) return;
    linhas.push(`${produto.toUpperCase()}`);
    if (cfg.tipo === "ponte") {
      [cfg.p1, cfg.p2, cfg.p3].forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        const valor = Array.isArray(r) ? r.join("; ") : r;
        linhas.push(`  ${p.pergunta || p.fala || ""}`);
        linhas.push(`    → ${valor}`);
      });
    } else {
      const todas = [cfg.pergunta_chave, ...cfg.essenciais, ...cfg.adicionais];
      todas.forEach(p => {
        const r = respProd[p.id];
        if (r === undefined) return;
        const valor = Array.isArray(r) ? r.join("; ") : r;
        linhas.push(`  ${p.pergunta}`);
        linhas.push(`    → ${valor}`);
      });
      if (respProd.sinais_quentes && respProd.sinais_quentes.length) {
        linhas.push(`  Sinais quentes: ${respProd.sinais_quentes.join("; ")}`);
      }
    }
    linhas.push(`  Pitch sugerido: ${cfg.pitch}`);
    linhas.push(``);
  });
  // Final — Decisor (F0), Frase-gancho (F1) e Sensação+considerações sobre o cliente (F2)
  // saem no resumo pro comercial. F3 (feedback do questionário) fica só na planilha.
  const f = respostas.final || {};
  const decisor = f.F0;
  const frase = f.F1;
 
  if (decisor) {
    linhas.push(`DECISOR(ES) PRA PRÓXIMA CONVERSA`);
    const valor = Array.isArray(decisor) ? decisor.join("; ") : decisor;
    linhas.push(`  ${valor}`);
    linhas.push(``);
  }
  if (frase) {
    linhas.push(`FRASE-GANCHO DO CLIENTE`);
    linhas.push(`  "${frase}"`);
    linhas.push(``);
  }
 
  // F2 — sensação + considerações sobre o cliente (sai no resumo pro comercial)
  const f2 = f.F2;
  const f2_extra = f.F2_extra;
  if (f2 !== undefined || f2_extra !== undefined) {
    linhas.push(`COMENTÁRIOS DO CS SOBRE O CLIENTE`);
    if (f2 !== undefined) {
      const valor = Array.isArray(f2) ? f2.join("; ") : f2;
      linhas.push(`  Sensação do atendimento: ${valor}`);
    }
    if (f2_extra) {
      linhas.push(`  Considerações adicionais: ${f2_extra}`);
    }
    linhas.push(``);
  }
 
  return linhas.join("\n");
}
 
function abrirResumo() {
  coletarRespostas();
  document.getElementById("resumo-texto").textContent = gerarTextoResumo();
  document.getElementById("bloco-tronco").classList.add("hidden");
  document.getElementById("blocos-produtos").classList.add("hidden");
  document.getElementById("bloco-final").classList.add("hidden");
  document.getElementById("bloco-resumo").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
function voltarParaForm() {
  document.getElementById("bloco-resumo").classList.add("hidden");
  document.getElementById("bloco-tronco").classList.remove("hidden");
  document.getElementById("blocos-produtos").classList.remove("hidden");
  document.getElementById("bloco-final").classList.remove("hidden");
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
  document.getElementById("modal-cs-input").addEventListener("keydown", e => { if (e.key === "Enter") confirmarCS(); });
  document.getElementById("btn-trocar-cs").addEventListener("click", () => abrirModalCS(true));
  document.getElementById("btn-revisar").addEventListener("click", abrirResumo);
  document.getElementById("btn-voltar-resumo").addEventListener("click", voltarParaForm);
  document.getElementById("btn-copiar-resumo").addEventListener("click", copiarResumo);
  document.getElementById("btn-confirmar-envio").addEventListener("click", enviar);
});
