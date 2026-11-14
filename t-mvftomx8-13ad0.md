---
id: t-mvftomx8-13ad0
title: Preserve generic owner parameters in TypeScript member hints
status: canceled
labels:
- one-sdk-followup
priority: 2
parent_id: t-mvfqpuri-1hf80
backend: git
created_at: 1792448713484
updated_at: 1793089847297
field_marks:
  active_form: 1792448713484
  body: 1793089847297
  claim: 1792448713484
  evidence_summary: 1792448713484
  owner_status: 1792448713484
  parent: 1792448713484
  priority: 1792448713484
  recovery_ref: 1792448713484
  status: 1793089847297
  title: 1792448713484
---
TESTED during peer review of ABI212edf3d13b127f5: an opened member with a passive canonical witness can render that witness in its TypeScript return instead of its owner parameter. WeatherKit DailyWeatherStatistics<T> subscript is typed number while native returns real specialized T. This existed before the coverage followup; native specialization is unchanged. Fix emitter type rendering using owner generic context and exercise a generated declaration plus real differently-specialized return. Do not mask native values or change generation during current release closeout. Source owner lane p95796/p96232; reported by p96232 artifact review.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mvftomx8-13ad0 --status open`.
