/**
 * Cross-sell Empresas — Apps Script Web App
 *
 * Recebe POST do formulário (gravar resposta) e responde GET (listar histórico).
 *
 * Como atualizar este código:
 * 1. Cole por cima da versão antiga no editor do Apps Script (Extensões → Apps Script).
 * 2. Salva (Ctrl+S).
 * 3. Implantar → Gerenciar implantações → editar a implantação atual → "Nova versão" → Implantar.
 *    A URL NÃO MUDA, mas a nova versão fica ativa.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Cria header se a planilha está vazia
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "CS",
        "CNPJ",
        "Cliente",
        "Iniciado em",
        "Finalizado em",
        "Produtos a entrevistar",
        "Confirmador (JSON)",
        "Tronco (JSON)",
        "Produtos qualificados (JSON)",
        "Final (JSON)"
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.meta.cs || "",
      data.meta.cnpj || "",
      data.meta.cliente_nome || "",
      data.meta.iniciado_em || "",
      data.meta.finalizado_em || "",
      (data.meta.produtos_entrevistar || []).join(", "),
      JSON.stringify(data.confirmador || {}),
      JSON.stringify(data.tronco || {}),
      JSON.stringify(data.produtos || {}),
      JSON.stringify(data.final || {})
    ]);

    return ContentService.createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, error: String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET retorna lista de entrevistas: {entrevistas: [{cnpj, produto, data, cs}, ...]}
 * Usado pelo painel pra marcar produtos já entrevistados.
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({entrevistas: []}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Lê só as colunas necessárias: A=Timestamp, B=CS, C=CNPJ, G=Produtos a entrevistar
    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const entrevistas = [];
    data.forEach(row => {
      const ts = row[0];
      const cs = row[1];
      const cnpj = String(row[2]).replace(/\D/g, "").padStart(14, "0");
      const produtosStr = row[6] || "";
      if (!cnpj || cnpj === "00000000000000" || !produtosStr) return;
      const produtos = String(produtosStr).split(",").map(s => s.trim()).filter(Boolean);
      const dataIso = ts instanceof Date ? ts.toISOString() : String(ts);
      produtos.forEach(produto => {
        entrevistas.push({cnpj, produto, data: dataIso, cs: cs || ""});
      });
    });
    return ContentService.createTextOutput(JSON.stringify({entrevistas}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, error: String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
