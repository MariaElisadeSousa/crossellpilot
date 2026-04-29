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

function getCSNome() { return localStorage.getItem("cs_nome") || ""; }
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

// === Carregamento ===
async function init() {
  const cnpj = getParam("cnpj");
  if (!cnpj) { alert("CNPJ não fornecido."); window.location.href = "index.html"; return; }

  const cs = getCSNome();
  if (!cs) { alert("Nome do CS não preenchido. Volte à listagem."); window.location.href = "index.html"; return; }
  document.getElementById("cs-nome-display").textContent = `CS: ${cs}`;
  respostas.meta.cs = cs;
  respostas.meta.cnpj = cnpj;
  respostas.meta.iniciado_em = new Date().toISOString();

  const [dadosResp, questoesResp] = await Promise.all([
    fetch("clientes.json").then(r => r.json()),
    fetch("questoes.json").then(r => r.json())
  ]);
  questoes = questoesResp;
  cliente = dadosResp.clientes.find(c => c.cnpj === cnpj);
  if (!cliente) { alert("Cliente não encontrado."); window.location.href = "index.html"; return; }
  respostas.meta.cliente_nome = cliente.nome;

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
  // Justificativa simples baseada no que sabemos do cliente
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
  // Salva confirmador
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
  const tipoOriginal = p.tipo || "single";
  const wrap = document.createElement("div");
  wrap.className = "pergunta";
  wrap.dataset.id = p.id;

  const titulo = document.createElement("div");
  titulo.className = "pergunta-texto";
  titulo.innerHTML = `<span class="id">${p.id}</span> ${escape(p.pergunta || p.fala || "")}`;
  wrap.appendChild(titulo);

  if (p.fala) {
    const fala = document.createElement("div");
    fala.className = "fala-cs";
    fala.innerHTML = `Fala pro cliente: "${escape(p.fala)}"`;
    titulo.replaceWith(fala);
    wrap.appendChild(titulo);
    titulo.style.display = "none";
  }

  if (p.instrucao) {
    const inst = document.createElement("div");
    inst.style.cssText = "color:#777; font-size:12px; font-style:italic; margin-bottom:6px;";
    inst.textContent = p.instrucao;
    wrap.appendChild(inst);
  }

  if (tipoOriginal === "free_text") {
    const ta = document.createElement("textarea");
    ta.dataset.id = p.id;
    wrap.appendChild(ta);
    container.appendChild(wrap);
    return;
  }

  const opcoes = p.opcoes || [];
  const inputType = (tipoOriginal === "multi" || (p.id && p.id.startsWith("T") && (p.id.endsWith("b") || p.id === "T4"))) ? "checkbox" : "radio";

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
      const tag = document.createElement("span");
      tag.className = "tag-interest";
      tag.textContent = "interesse";
      lbl.appendChild(tag);
    } else if (opcaoTipo === "discard") {
      const tag = document.createElement("span");
      tag.className = "tag-discard";
      tag.textContent = "não é prioridade";
      lbl.appendChild(tag);
    }

    // Campo livre vinculado: "Outro" ou opção marcada como tipo "free"
    if (opcaoTexto.startsWith("Outro") || opcaoTipo === "free") {
      const livre = document.createElement("input");
      livre.type = "text";
      livre.className = "free-input";
      livre.placeholder = "detalhe…";
      livre.dataset.id = `${p.id}__livre_${i}`;
      input.addEventListener("change", () => {
        livre.classList.toggle("visible", input.checked);
      });
      lbl.appendChild(livre);
    }
    wrap.appendChild(lbl);
  });

  container.appendChild(wrap);
}

// === BLOCO TRONCO ===
function renderTronco() {
  const c = document.getElementById("tronco-perguntas");
  questoes.tronco.forEach(p => renderPergunta(p, c, "TR"));
}

// === BLOCOS POR PRODUTO ===
function renderProdutos(lista) {
  const c = document.getElementById("blocos-produtos");
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
      // P1
      div.innerHTML += "<h3>Contexto</h3>";
      const p1Wrap = document.createElement("div");
      renderPergunta({...cfg.p1, tipo: "free_text", pergunta: cfg.p1.pergunta, instrucao: cfg.p1.instrucao}, p1Wrap, "PROD");
      div.appendChild(p1Wrap);
      // P2
      const p2Title = document.createElement("h3");
      p2Title.textContent = "Oferta + identificação de quem cuida";
      div.appendChild(p2Title);
      const p2Wrap = document.createElement("div");
      renderPergunta({id: cfg.p2.id, fala: cfg.p2.fala, opcoes: cfg.p2.opcoes}, p2Wrap, "PROD");
      div.appendChild(p2Wrap);
      // P3 (oculto inicialmente, mostra se P2 = Sim)
      const p3Title = document.createElement("h3");
      p3Title.textContent = "Pedido de contato (se houve interesse)";
      div.appendChild(p3Title);
      const p3Wrap = document.createElement("div");
      p3Wrap.dataset.condicional = "p3";
      renderPergunta({id: cfg.p3.id, pergunta: cfg.p3.pergunta, opcoes: cfg.p3.opcoes}, p3Wrap, "PROD");
      div.appendChild(p3Wrap);

      // Pitch
      const pitch = document.createElement("div");
      pitch.className = "pitch-box";
      pitch.innerHTML = `<strong>PITCH (CS → comercial):</strong>${escape(cfg.pitch)}`;
      div.appendChild(pitch);
    } else {
      // Jurídico
      div.innerHTML = `<h2>${produto}</h2>`;
      // Pergunta-chave
      const pcTitle = document.createElement("h3"); pcTitle.textContent = "Pergunta-chave"; div.appendChild(pcTitle);
      const pcWrap = document.createElement("div");
      renderPergunta(cfg.pergunta_chave, pcWrap, "PROD");
      div.appendChild(pcWrap);
      // Essenciais
      const eTitle = document.createElement("h3"); eTitle.textContent = "Perguntas essenciais (qualificação)"; div.appendChild(eTitle);
      cfg.essenciais.forEach(e => renderPergunta(e, div, "PROD"));
      // Alerta de descarte
      const alerta = document.createElement("div");
      alerta.className = "descarte-alerta";
      alerta.dataset.produto = produto;
      alerta.textContent = "⚠ ≥2 marcações \"não é prioridade\" — modelo sugere descartar este produto. Você pode continuar mesmo assim ou marcar pra descartar no fim.";
      div.appendChild(alerta);
      // Adicionais
      const aTitle = document.createElement("h3"); aTitle.textContent = "Informação adicional (opcional)"; div.appendChild(aTitle);
      const nota = document.createElement("p"); nota.style.cssText = "color:#777; font-size:12px; margin-bottom:8px;";
      nota.textContent = "Só rodar se sobrar tempo ou se cliente trouxer naturalmente.";
      div.appendChild(nota);
      cfg.adicionais.forEach(a => renderPergunta(a, div, "PROD"));
      // Sinais
      const sTitle = document.createElement("h3"); sTitle.textContent = "Sinais de oportunidade quente (CS marca durante a call)"; div.appendChild(sTitle);
      cfg.sinais.forEach((s, i) => {
        const lbl = document.createElement("label");
        lbl.className = "opcao";
        const inp = document.createElement("input");
        inp.type = "checkbox";
        inp.name = `SINAL_${produto}_${i}`;
        inp.value = s;
        inp.dataset.sinal = produto;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(" " + s));
        div.appendChild(lbl);
      });
      // Pitch
      const pitch = document.createElement("div");
      pitch.className = "pitch-box";
      pitch.innerHTML = `<strong>PITCH (CS → comercial):</strong>${escape(cfg.pitch)}`;
      div.appendChild(pitch);
    }

    c.appendChild(div);
  });

  // Lógica adaptativa: monitorar cliques e atualizar alertas de descarte
  c.addEventListener("change", e => {
    if (e.target.matches("input[type='radio'], input[type='checkbox']")) {
      atualizarDescartes();
    }
  });
}

function atualizarDescartes() {
  // Pra cada bloco produto jurídico, conta marcações "discard" nas E1/E2/E3
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

// === BLOCO FINAL ===
function renderFinal() {
  const c = document.getElementById("final-perguntas");
  questoes.final.forEach(p => renderPergunta(p, c, "FINAL"));
}

// === Coleta + envio ===
function coletarRespostas() {
  // Tronco
  questoes.tronco.forEach(p => {
    const r = coletarPergunta(p, "TR");
    if (r !== undefined) respostas.tronco[p.id] = r;
  });
  // Produtos entrevistados
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
      cfg.essenciais.forEach(e => {
        const r = coletarPergunta(e, "PROD");
        if (r !== undefined) dados[e.id] = r;
      });
      cfg.adicionais.forEach(a => {
        const r = coletarPergunta(a, "PROD");
        if (r !== undefined) dados[a.id] = r;
      });
      // Sinais
      const sinais = [];
      document.querySelectorAll(`input[data-sinal="${produto}"]:checked`).forEach(i => sinais.push(i.value));
      if (sinais.length) dados.sinais_quentes = sinais;
    }
    respostas.produtos[produto] = dados;
  });
  // Final
  questoes.final.forEach(p => {
    const r = coletarPergunta(p, "FINAL");
    if (r !== undefined) respostas.final[p.id] = r;
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
    // Captura "outro" / livre
    const livre = i.parentElement.querySelector(".free-input");
    if (livre && livre.classList.contains("visible") && livre.value.trim()) {
      v += `: ${livre.value.trim()}`;
    }
    valores.push(v);
  });
  return inputs[0].type === "radio" ? valores[0] : valores;
}

async function enviar() {
  const btn = document.getElementById("btn-enviar");
  btn.disabled = true;
  btn.textContent = "Enviando…";

  coletarRespostas();

  if (!APPS_SCRIPT_URL) {
    // Modo local — só mostra os dados (útil pra testar antes de configurar Apps Script)
    document.getElementById("bloco-tronco").classList.add("hidden");
    document.getElementById("blocos-produtos").innerHTML = "";
    document.getElementById("bloco-final").classList.add("hidden");
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
    const r = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script não retorna CORS — usamos no-cors
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain pra evitar preflight
      body: JSON.stringify(respostas)
    });
    document.getElementById("bloco-tronco").classList.add("hidden");
    document.getElementById("blocos-produtos").innerHTML = "";
    document.getElementById("bloco-final").classList.add("hidden");
    document.getElementById("resultado").classList.remove("hidden");
    document.getElementById("resultado-msg").textContent = "Respostas registradas com sucesso. Obrigada!";
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Finalizar e enviar";
    alert("Erro ao enviar: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  document.getElementById("btn-enviar").addEventListener("click", enviar);
});
