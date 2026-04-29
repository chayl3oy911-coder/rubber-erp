# `src/modules/`

Business modules of the Rubber ERP modular monolith. Each module is the
boundary of one bounded context and owns its own domain, services, repository,
and Zod schemas.

```
modules/
└── <module-name>/
    ├── domain/      # entities, value objects, enums
    ├── service/     # business logic (functions taking `{ user, tx }` ctx)
    ├── repository/  # Prisma access, branch-scoped queries
    ├── schema.ts    # Zod input/output schemas (shared with UI forms)
    └── index.ts     # Public API. Other modules import from HERE only.
```

## Planned modules (per project roadmap)

1. `auth` — session, login/logout, currentUser
2. `rbac` — roles, permissions, requirePermission()
3. `branch` — สาขา
4. `farmer` — เกษตรกร
5. `purchase-ticket` — ใบรับซื้อ
6. `quality-check` — DRC / ความชื้น / เกรด
7. `purchase-payment` — จ่ายเงินเกษตรกร
8. `stock` — stock_lot + append-only stock_movement
9. `production` — เครป (input lots → output lot)
10. `factory-customer` — ลูกค้าโรงงาน
11. `sales-order` — ใบขายโรงงาน
12. `cash` — cash_drawer + cash_movement
13. `audit` — audit_log
14. `reports` — dashboard + analytical queries
15. `settings` — system config

## Module boundary rules

- **Public surface only:** other modules import from `<module>/index.ts`,
  never from `service/`, `repository/`, or `domain/` directly.
- **No circular deps:** if module A needs B, B must not depend on A. Use a
  third module or move the shared piece to `shared/`.
- **No raw DB writes from `app/`:** UI calls module services. Services own
  Prisma access.
- **Audit + transaction:** every mutating service writes audit_log inside the
  same transaction (added in Phase 1).
