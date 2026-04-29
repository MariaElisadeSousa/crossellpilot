// === Cross-sell Empresas — Listagem ===

const PRODUTOS = ["Acordos", "Sienge", "Checklist", "Oystr", "Presto", "Legal Intelligence", "Deep Legal"];

let dados = null;

// Persiste nome do CS em localStorage
function getCSNome() { return localStorage.getItem("cs_nome") || ""; }
function setCSNome(v) { localStorage.setItem("cs_nome", v); document.getElementById("cs-nome-display").textContent = v ? `CS: ${v}` : ""; }

// Carrega dados
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

  // Limita render inicial pra não travar (paginação simples)
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
      html += `<td><span class="fit-cell ${fitClass(v)}">${v}</span></td>`;
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
      const cs = document.getElementById("cs-input").value.trim();
      if (!cs) {
        alert("Preencha seu nome de CS antes de analisar um cliente.");
        document.getElementById("cs-input").focus();
        return;
      }
      setCSNome(cs);
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

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const csInput = document.getElementById("cs-input");
  csInput.value = getCSNome();
  setCSNome(getCSNome());
  csInput.addEventListener("input", () => setCSNome(csInput.value.trim()));
  document.getElementById("carteira-select").addEventListener("change", renderTabela);
  document.getElementById("busca").addEventListener("input", renderTabela);
  document.getElementById("fit-filter").addEventListener("change", renderTabela);
  carregar();
});
