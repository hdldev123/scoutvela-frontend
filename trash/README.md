# trash

Arquivos que só serviam aos componentes removidos de `src/components/ui`. Fora do build, do typecheck, do lint e dos testes.

**Revalide antes de excluir definitivamente.**

| Item | Origem |
|---|---|
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `src/hooks/use-mobile.tsx` | `useIsMobile()` |
| `components.json` | configuração do shadcn/ui |

Pacotes que continuam no `package.json` só por causa destes arquivos: `clsx`, `tailwind-merge` e `class-variance-authority`. Remova-os junto com a pasta.
