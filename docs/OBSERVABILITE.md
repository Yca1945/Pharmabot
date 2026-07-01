# Observabilité

Logs structurés et traçabilité de bout en bout entre le backend Laravel et le
microservice IA.

## Identifiant de corrélation (X-Request-Id)

Chaque requête reçoit un identifiant unique, qui suit son parcours complet :

```
Client ──X-Request-Id──▶ Laravel (RequestId middleware)
                          │  ajoute l'id au contexte de logs
                          ▼
                        IaClient ──X-Request-Id (en-tête)──▶ Microservice IA
                                                              │ middleware lie l'id
                                                              ▼  aux logs RAG
```

- **Laravel** : `RequestId` lit l'en-tête (ou génère un UUID), l'ajoute au
  `Context` (inclus automatiquement dans chaque ligne de log) et le renvoie dans
  la réponse. `IaClient` le propage au microservice via l'en-tête HTTP.
- **IA** : `RequestContextMiddleware` lit l'en-tête (ou en génère un), le place
  dans un `ContextVar`, et toutes les lignes JSON du service le portent.

Résultat : on peut filtrer tous les logs (Laravel + IA) d'une même requête par
son `request_id`.

## Logs structurés (JSON) côté IA

Format d'une ligne (`ia-service/app/logging_config.py`) :

```json
{"ts":"2026-06-30T10:42:11","level":"INFO","logger":"pharmabot.rag",
 "request_id":"a1b2c3d4","message":"retrieval",
 "data":{"n_hits":4,"best_sim":0.82,"n_entites":1,"ms":12.3}}
```

Événements métier journalisés dans le pipeline RAG :

| message      | données                                              |
|--------------|------------------------------------------------------|
| `retrieval`  | n_hits, best_sim, n_entites, ms                      |
| `abstention` | best_sim, seuil (garde-fou déclenché)                |
| `generation` | best_sim, fidelite_estimee, llm_ms                   |
| `request`    | method, path, status, duration_ms (toutes requêtes) |

## Logs côté Laravel

`LogRequests` journalise chaque requête API : `api.request` avec method, path,
status, user_id, duration_ms. Le `request_id` est présent via `Context`.

## Consultation

```bash
# Logs du microservice IA (JSON, filtrables par request_id)
docker compose logs -f ia-service | grep a1b2c3d4

# Logs Laravel
docker compose exec backend tail -f storage/logs/laravel.log
```

## Perspectives

Agrégation centralisée (ELK / Loki + Grafana), métriques Prometheus
(`/metrics`), traçage distribué (OpenTelemetry). Hors périmètre du prototype,
mais l'identifiant de corrélation en pose déjà la fondation.
