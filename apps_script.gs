/**
 * Cross-sell Empresas — Apps Script Web App
 *
 * Recebe POST do formulário no GitHub Pages e adiciona uma linha na planilha.
 *
 * Como configurar:
 * 1. Crie uma planilha nova no Google Sheets (ou use uma existente).
 * 2. Em Extensões → Apps Script.
 * 3. Cole este código.
 * 4. Implantar → Nova implantação → Tipo: Web App.
 *    - Executar como: Eu (sua conta).
 *    - Quem tem acesso: Qualquer pessoa.
 * 5. Copie a URL gerada e cole em formulario.js (constante APPS_SCRIPT_URL).
 * 6. Toda vez que mudar este código, é preciso clicar Implantar → Gerenciar implantações
 *    → editar a implantação atual → Nova versão → Implantar (a URL não muda).
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

// Endpoint GET pra teste rápido — abrir a URL no navegador deve mostrar "ok"
function doGet() {
  return ContentService.createTextOutput("Cross-sell Apps Script ativo. Endpoint POST funcionando.")
    .setMimeType(ContentService.MimeType.TEXT);
}
