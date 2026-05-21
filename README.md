<div align="center">

# 💰 Prospera Finanças

**SaaS de controle financeiro pessoal — do orçamento ao recebimento automático.**

[![Acessar aplicação](https://img.shields.io/badge/🔗_Acessar_aplicação-06B6D4?style=for-the-badge&logoColor=white)](https://financas-pessoais-teal.vercel.app)

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>

---

## 📖 Sobre

Prospera é um SaaS autoral de finanças pessoais que ajuda o usuário a controlar receitas e
despesas, acompanhar metas e visualizar para onde o dinheiro está indo. O projeto inclui
integração com o **Mercado Pago via webhooks**, permitindo o processamento automático de
pagamentos sem intervenção manual.

> Projeto desenvolvido de ponta a ponta — front-end, API e infraestrutura de deploy.

<!--
📸 DICA: cole aqui um screenshot ou GIF do dashboard. É o item que mais prende a atenção
de quem abre o repositório. Ex:

![Dashboard](./docs/dashboard.png)
-->

---

## ✨ Funcionalidades

- 📊 **Dashboards** com visão geral das finanças
- 🎯 **Metas** financeiras acompanháveis
- 💳 **Integração com Mercado Pago** via webhooks para processamento automático de pagamentos
- 📈 Registro e categorização de receitas e despesas

<!-- Ajuste a lista acima conforme o que o app realmente faz hoje. -->

---

## 🛠 Stack

| Camada | Tecnologias |
|--------|-------------|
| **Front-end** (`client`) | React, TypeScript |
| **Landing page** (`landing`) | Página de apresentação/vendas |
| **Back-end** (`server`) | Node.js, Express |
| **Banco de dados** | SQLite (persistent disk no Render) |
| **Deploy** | Front-end na Vercel · API no Render |
| **Integrações** | Mercado Pago (webhooks) · Cloudflare |

---

## 📂 Estrutura do projeto

```
financas-pessoais/
├── client/    # Aplicação React (TypeScript)
├── landing/   # Landing page
└── server/    # API Node.js + Express + SQLite
```

---

## 🚀 Rodando localmente

> **Pré-requisitos:** Node.js instalado.

```bash
# Clone o repositório
git clone https://github.com/gedalyas/financas-pessoais.git
cd financas-pessoais
```

**1. Back-end (`server`)**

```bash
cd server
npm install
npm run dev     # ajuste para o script real do seu package.json
```

**2. Front-end (`client`)**

```bash
cd client
npm install
npm run dev
```

### Variáveis de ambiente

Crie um arquivo `.env` na pasta `server` com as chaves necessárias:

```env
# Exemplo — ajuste conforme o seu projeto
PORT=3000
MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui
```

<!--
⚠️ Liste aqui APENAS as variáveis que o projeto realmente usa, sem nunca commitar
os valores reais. Confira seu .env atual e ajuste esta seção.
-->

---

## 📬 Contato

Desenvolvido por **Davi Almeida Souto**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/davi-alsouto)
[![Portfólio](https://img.shields.io/badge/Portfólio-111827?style=for-the-badge&logo=vercel&logoColor=white)](https://www.davisouto.dev/)
