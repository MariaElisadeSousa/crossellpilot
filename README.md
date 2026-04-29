# Cross-sell Empresas — Ferramenta de Teste

Página web estática (HTML/CSS/JS) que mostra os clientes da base Empresas com fit por produto e roda o formulário adaptativo de qualificação. Os dados ficam num JSON estático no repo. As respostas do CS são enviadas pra uma planilha Google via Apps Script.

## Arquivos

- `index.html` — listagem de clientes com filtro por CS/carteira e fit por produto
- `formulario.html` — formulário adaptativo (Confirmador → Tronco → Blocos por produto → Espaço aberto)
- `clientes.json` — 1026 clientes da base Empresas com fit pré-calculado (modelo v6)
- `questoes.json` — schema de todas as perguntas, alternativas, regras de descarte
- `style.css` — estilo visual
- `app.js` — lógica da listagem
- `formulario.js` — lógica do formulário adaptativo + envio
- `apps_script.gs` — código pra colar no Google Apps Script (recebe respostas e grava na planilha)

## Como subir e rodar

### 1. Criar repositório no GitHub

- No GitHub, canto superior direito → **+ → New repository**
- Nome: `crossell-pilot` (ou outro de sua escolha)
- Marca **Public** (Pages só funciona em repo público no plano free)
- Cria

### 2. Subir os arquivos

- Na tela do repositório vazio: **uploading an existing file**
- Arrasta TODOS os arquivos desta pasta (`crossell-tool/`)
- Embaixo: **Commit changes**

### 3. Ativar GitHub Pages

- Aba **Settings** (no topo do repositório)
- Menu lateral esquerdo → **Pages**
- Em **Source**: **Deploy from a branch**
- Em **Branch**: **main** + pasta **/ (root)** → **Save**
- Em 1-2 minutos a página fica em `https://SEU_USUARIO.github.io/crossell-pilot/`

### 4. Configurar a planilha de respostas

#### 4.1. Criar a planilha
- Vai em [sheets.google.com](https://sheets.google.com) → planilha em branco
- Renomeia (ex: "Cross-sell — Respostas Piloto")

#### 4.2. Configurar o Apps Script
- Na planilha: **Extensões → Apps Script**
- Apaga o código padrão e cola o conteúdo do arquivo `apps_script.gs`
- **Salva** (ícone de disquete ou Ctrl+S)
- Clica em **Implantar → Nova implantação**
- No tipo, clica na engrenagem e escolhe **App da Web**
- Configura:
  - **Descrição**: `Cross-sell piloto v1`
  - **Executar como**: **Eu (sua conta)**
  - **Quem tem acesso**: **Qualquer pessoa**
- Clica em **Implantar**
- Vai pedir autorização — dá OK e prossegue (avisa que é um script seu, não do Google)
- **Copia a URL** gerada (formato `https://script.google.com/macros/s/AKfyc.../exec`)

#### 4.3. Conectar a URL no formulario.js
- Edita o arquivo `formulario.js` no GitHub (clicando no arquivo → ícone de lápis)
- Na linha 4, troca:
  ```javascript
  const APPS_SCRIPT_URL = "";
  ```
  por:
  ```javascript
  const APPS_SCRIPT_URL = "COLE_AQUI_A_URL_DO_APPS_SCRIPT";
  ```
- **Commit changes**
- Em 1-2 minutos a página atualiza com a URL ativa

### 5. Testar

- Abre `https://SEU_USUARIO.github.io/crossell-pilot/`
- Preenche seu nome de CS no topo
- Filtra por carteira / busca por cliente
- Clica em **Analisar →** num cliente
- Roda o formulário até o final
- Clica em **Finalizar e enviar**
- Abre a planilha do Google — uma linha nova deve ter aparecido com timestamp, CS, CNPJ, cliente e os JSONs com as respostas

## Atualizar dados do modelo (próximas versões)

Quando você gerar uma v7, v8 etc. da planilha de oportunidades:

1. Roda o script Python que extrai a `Score Detalhado` da planilha em JSON.
2. Substitui o `clientes.json` no repo (faz commit).
3. Pages republica sozinho em ~1 min.

O script Python fica versionado em `build_clientes_json.py` (não está neste pacote — pedir pro Claude gerar quando precisar).

## Atualizar perguntas do formulário

Edita `questoes.json` direto no repo. Mudanças nas perguntas, alternativas, ordem dos blocos, regras de descarte etc. aparecem automaticamente no formulário sem mexer em HTML.

## Modo de teste local (sem Apps Script ainda)

Se você quiser testar a interface antes de configurar a planilha:

1. Deixa `APPS_SCRIPT_URL = ""` em `formulario.js`
2. No final do formulário, em vez de enviar, mostra o JSON na própria tela e no console do navegador (F12).
3. Útil pra validar fluxo antes de plugar a persistência.

## Fluxo de dados que vai pra planilha

Cada linha tem:

| Coluna | Conteúdo |
|---|---|
| Timestamp | Data/hora da gravação |
| CS | Nome do CS que preencheu |
| CNPJ | CNPJ do cliente |
| Cliente | Nome do cliente |
| Iniciado em | Quando o CS abriu o formulário |
| Finalizado em | Quando o CS clicou em enviar |
| Produtos a entrevistar | Lista dos produtos marcados como "Vou entrevistar" no Confirmador |
| Confirmador (JSON) | Decisões + motivos de descarte do Confirmador |
| Tronco (JSON) | Respostas do Bloco comum |
| Produtos qualificados (JSON) | Respostas dos blocos de produto + sinais de oportunidade marcados |
| Final (JSON) | Respostas do Espaço aberto (frase-gancho, sensação, feedback do questionário) |

Os JSONs são compactos. Pra análise, você pode criar abas paralelas com fórmulas/queries que extraem campos específicos.

## Limites e cuidados

- **Apps Script tem cota**: ~6 minutos por execução, ~90 min/dia. Pra volume do piloto (10-30 atendimentos/dia) está longe do teto.
- **A URL do Apps Script é "pública"**: qualquer pessoa com a URL exata consegue postar. Se precisar endurecer depois (após o piloto), dá pra adicionar um token no header.
- **GitHub Pages é público**: o `clientes.json` fica acessível pra quem souber a URL. Se for sensível, vamos precisar mudar pra hospedagem com auth depois.
- **Sem login**: o nome do CS é só um campo de texto. Confiamos no preenchimento. Pra piloto interno, OK.

## Próximos passos depois do piloto

Quando virar produto pra valer:

- Login com Google (Auth0 ou Google OAuth direto)
- Backend mais robusto (Supabase ou similar) com auditoria
- Domínio próprio (`crossell.starian.com`)
- Versionamento da v7+ automatizado (script regenera JSON a partir da planilha)
- Dashboard de análise das respostas (taxa de descarte por produto, perguntas que pegam melhor)
