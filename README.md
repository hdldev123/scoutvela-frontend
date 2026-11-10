# vela-front

Frontend do Scout Vela, o sistema de identificação e acompanhamento de talentos da vela olímpica brasileira (CBVela). Piloto 18+. O front só mostra e coleta dados: score, faixa, gates e permissões oficiais vêm da API do `vela-back`, e o banco nunca é acessado direto.

## Stack

- TanStack Start (React 19, TanStack Router) com Vite 8 e Nitro, via `@lovable.dev/vite-tanstack-config`
- TypeScript, Tailwind 4, shadcn/ui (Radix), TanStack Query, Recharts, sonner, Phosphor Icons
- Cliente HTTP `openapi-fetch` com tipos gerados do `openapi.yaml` do back (`src/lib/api/schema.d.ts`)
- Login com Supabase Auth; o JWT da sessão vai no header `Authorization` de cada chamada
- Testes com Vitest e Testing Library; e2e com Playwright
- Gerenciador: bun (`bun.lock`). Sem bun, `npm run <script>` funciona para os scripts abaixo.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Nada de segredo aqui: o prefixo `VITE_` expõe o valor no navegador.

| Variável                 | Para quê                             |
| ------------------------ | ------------------------------------ |
| `VITE_API_URL`           | URL da API do `vela-back`            |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase (só login)   |
| `VITE_SUPABASE_ANON_KEY` | chave pública do Supabase (só login) |

## Rodar local junto com o vela-back

1. No `vela-back`: `npm run dev:local` (banco local, emulador do Auth e API em `http://127.0.0.1:3333`).
2. No `vela-front`: `cp .env.example .env.local` (os valores padrão já apontam para o modo local) e `bun install` (ou `npm install`).
3. `npm run dev` e abra o endereço que o Vite mostrar.

Contas de teste (fictícias, existem só no seed de desenvolvimento):

| Perfil        | E-mail                   | Senha     |
| ------------- | ------------------------ | --------- |
| Gestor CBVela | gestor@scoutvela.dev     | gestor123 |
| Treinadora    | treinadora@scoutvela.dev | treino123 |
| Atleta        | atleta@scoutvela.dev     | atleta123 |
| IBVAR         | ibvar@scoutvela.dev      | ibvar123  |

Confira o README do `vela-back` caso as contas mudem.

### Fundo do login

O login tenta, nesta ordem: `VITE_LOGIN_VIDEO_URL`; o arquivo `src/assets/login-bg.mp4` (coloque o vídeo exportado do Lovable aqui, de preferência comprimido, H.264, sem áudio, até uns 5 MB); e, sem vídeo, a foto com movimento lento de câmera. Com `prefers-reduced-motion`, o fundo fica parado.

## Scripts

| Script          | O que faz                                                                       |
| --------------- | ------------------------------------------------------------------------------- |
| `dev`           | servidor de desenvolvimento                                                     |
| `build`         | build de produção (saída `.vercel/output`)                                      |
| `typecheck`     | `tsc --noEmit`                                                                  |
| `lint`          | ESLint                                                                          |
| `test`          | Vitest (uma execução)                                                           |
| `e2e`           | Playwright                                                                      |
| `format`        | Prettier                                                                        |
| `api:tipos`     | regenera `src/lib/api/schema.d.ts` a partir de `../vela-back/openapi.yaml`      |
| `api:verificar` | falha se `schema.d.ts` diferir do contrato; aceita `-- caminho/do/openapi.yaml` |

O CI (`.github/workflows/ci.yml`) roda tipos, lint, testes, build e `bun audit`. Ele não roda `api:verificar`, porque o contrato está em outro repositório; rode localmente antes do PR.

## Deploy na Vercel

- O `vite.config.ts` fixa o preset do Nitro em `vercel`. O wrapper do Lovable usaria `cloudflare-module` por padrão. O build gera `.vercel/output` (Build Output API v3: `static/` e a função `__server`). A Vercel detecta isso sozinha, sem comando de build especial além de `bun run build`.
- Homologação: o preview da Vercel aponta para a API e o Supabase de homologação (variáveis `VITE_*` do ambiente Preview). Produção usa as variáveis do ambiente Production, e os dados reais só entram lá depois das condições do AGENTS.md da raiz.
- Defina as três variáveis `VITE_*` na Vercel antes do primeiro build: elas são embutidas no pacote em tempo de build.
- Plano Pro em produção (o gratuito não permite uso comercial). Conta e repositório em nome da instituição.
- O CORS da API (`vela-back`) deve liberar só os domínios do front.

## Cabeçalhos de segurança

Definidos em `vercel.json`. O mesmo arquivo é lido pelo `vite.config.ts` e vira `routeRules` do Nitro, então os cabeçalhos também ficam gravados em `.vercel/output/config.json`.

| Cabeçalho                   | Valor e motivo                                               |
| --------------------------- | ------------------------------------------------------------ |
| `Content-Security-Policy`   | ver abaixo                                                   |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (1 ano, HTTPS forçado) |
| `X-Content-Type-Options`    | `nosniff`                                                    |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                            |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`: o app não usa    |
| `X-Frame-Options`           | `DENY` (reforça `frame-ancestors 'none'`)                    |

Decisões da CSP:

- `default-src 'self'` e `object-src 'none'`: tudo que não foi liberado está bloqueado.
- `connect-src 'self' https://*.supabase.co https://*.onrender.com`: Supabase Auth (login) e a API no Render. Se a API ganhar domínio próprio, troque o `onrender.com` por ele.
- `script-src 'self' 'unsafe-inline'`: o HTML do TanStack Start traz scripts inline (restauração de scroll e o fluxo de hidratação com os dados do servidor), com conteúdo diferente a cada requisição. Hash não serve e nonce exigiria gerar a CSP por requisição no servidor. É a parte mais frouxa da política; o `connect-src` fechado e a ausência de `eval` limitam o estrago. Evolução possível: nonce por requisição.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: o CSS vem do próprio build e das fontes do Google (`__root.tsx`); `unsafe-inline` por causa dos atributos `style` do React (barras de progresso, gráficos).
- `font-src 'self' data: https://fonts.gstatic.com`: Plus Jakarta Sans e JetBrains Mono vêm do Google Fonts; a fonte dos ícones Phosphor é empacotada no build (`@phosphor-icons/web`, importada em `styles.css`), logo `'self'`.
- `img-src 'self' data: blob:` e `media-src 'self' blob:`: imagens e o vídeo da tela de login servidos pelo próprio domínio.
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.

## Pendências conhecidas

- O vídeo da tela de login aponta para `/__l5e/assets-v1/...`, um caminho hospedado pelo Lovable que não existe na Vercel. Baixar o arquivo, colocá-lo em `public/` (ou em um CDN do mesmo domínio, liberando-o em `media-src`) e atualizar `src/assets/login-bg-v2.mp4.asset.json`. O poster aparece enquanto isso.
- Domínio final do front e da API, para fechar a CSP e o CORS.
