# Hook7 App

Painel web do Hook7: gerenciamento de sessões WhatsApp (conexão por QR code), webhooks, assinaturas por sessão, documentação da API e área de superadmin.

## Stack

- **Front-end:** React 18, Vite, TypeScript, Tailwind CSS e shadcn/ui
- **Dados e auth:** Supabase (Postgres, Auth e Edge Functions em Deno)
- **Pagamentos:** Stripe (checkout, portal do cliente e webhook)
- **E-mails:** Resend
- **Idiomas:** i18next (`pt-BR` e `en`)

## Rodando localmente

Requer Node.js 20+.

```bash
npm install
cp .env.example .env   # preencha com os dados do Supabase
npm run dev            # http://localhost:8080
```

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Serve o build localmente |
| `npm run start` | Serve o build em `0.0.0.0:3000` (usado no deploy via Nixpacks) |
| `npm run lint` | ESLint |

## Variáveis de ambiente

Front-end (lidas pelo Vite **no momento do build**):

| Variável | Descrição |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública `anon` (também aceita `VITE_SUPABASE_ANON_KEY`) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `VITE_API_URL` | URL da API do Hook7 (padrão `https://api.hook7.com.br`) |

O `.env` é local e não vai para o git. O `.env.production` é versionado porque só contém valores públicos e é usado no build de produção.

Edge Functions (configuradas como *secrets* no Supabase, nunca no front-end): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESET_SECRET` e as chaves `HOOK*` da API.

## Estrutura

```
src/
  pages/            Telas (Dashboard, Sessions, Webhooks, Checkout, ApiDocs, admin/…)
  components/       Componentes da aplicação (ui/ = shadcn)
  services/         hook7Api.ts: cliente da API do Hook7
  integrations/     Cliente e tipos do Supabase
  hooks/ lib/ i18n/
supabase/
  functions/        Edge Functions (Stripe, webhook do WhatsApp, e-mails, trial, reset mensal)
  config.toml
public/             Ícones, manifest, robots e sitemap
scripts/            generate-favicon.mjs
```

## Deploy

- **Nixpacks:** `npm ci` → `vite build` → `npm run start` (ver `nixpacks.toml`).
- **Docker:** build multi-stage servido por Nginx (`Dockerfile`, `nginx.conf`). As variáveis `VITE_*` precisam ser passadas como *build args*, por exemplo pelo `docker-compose.yml`.
- **Edge Functions:** `supabase functions deploy <nome>`.

## Documentação adicional

- [SUBSCRIPTION_SYSTEM.md](SUBSCRIPTION_SYSTEM.md): modelo de assinatura por sessão
- [STRIPE_SETUP_INSTRUCTIONS.md](STRIPE_SETUP_INSTRUCTIONS.md): configuração do Stripe
- [ANNOUNCEMENTS_SETUP_README.md](ANNOUNCEMENTS_SETUP_README.md): sistema de anúncios e e-mails
- [SECURITY_FIXES_README.md](SECURITY_FIXES_README.md): correções de segurança aplicadas
- SQL: `hook7_v2_migration.sql`, `MESSAGE_TRACKING_MIGRATION.sql`, `MONTHLY_RESET.sql`
