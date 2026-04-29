# `src/shared/`

Cross-cutting code that any module may import. Split by concern:

```
shared/
├── ui/         # Design-system primitives (Button, Card, Input, Label, ...)
├── utils/      # Pure helpers with zero side effects (cn, formatters, ...)
├── db/         # Prisma client + transaction helpers (added in Phase 1)
├── auth/       # currentUser(), session helpers (added in Phase 1)
├── permissions/# requirePermission(), branch-scope guards (added in Phase 1)
├── errors/     # AppError + sanitizer (added in Phase 1)
└── validation/ # Zod helpers (added in Phase 1)
```

## Rules

- `shared/*` MUST NOT import from `modules/*` or `app/*`. Dependencies flow one
  way: `app → modules → shared`.
- Keep utilities pure when possible; side effects live in `db/`, `auth/`.
- Public surface for each subfolder is the `index.ts` barrel (when present).
