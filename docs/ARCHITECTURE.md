# Architecture & notes de conception — Pharmabot

Document de travail reliant le **cahier des charges** au **code**. Il sert aussi
de base aux chapitres « Conception » et « Discussion » du mémoire.

## 1. Décision d'architecture centrale

Le système sépare deux mondes aux logiques opposées :

- **Logique déterministe et réglementée** (Laravel) : qui a le droit de faire
  quoi, persistance, traçabilité, validation humaine. Code testable, auditable.
- **Logique probabiliste** (FastAPI) : le LLM et la récupération sémantique, par
  nature non déterministes.

Ce découplage (« loose coupling ») n'est pas qu'un choix technique : c'est la
réponse à la problématique. On ne demande pas au LLM d'être sûr, on l'**encadre**
par une chaîne logicielle qui, elle, est sûre.

## 2. Le garde-fou anti-hallucination (cœur scientifique)

Implémenté dans `ia-service/app/rag.py`. Trois niveaux de défense :

1. **Récupération bornée** : seules les fiches du catalogue de l'officine sont
   indexées. L'IA ne peut parler que de ce qui existe en base.
2. **Seuil d'abstention** (`min_similarity`) : si la meilleure similarité
   cosinus requête/document est sous le seuil, le service **refuse de répondre**
   et renvoie `abstention: true`. C'est mesurable et reproductible.
3. **Prompt contraint + température 0** : le LLM reçoit l'ordre explicite de ne
   répondre qu'à partir du contexte et de signaler son ignorance.

4. **Validation humaine finale** : aucune commande n'est délivrée sans action du
   pharmacien (RF-05). Même une réponse IA parfaite reste une *proposition*.

## 3. Recommandations académiques (à intégrer au mémoire)

### 3.1 Reformuler l'hypothèse « 0 % d'hallucination »
Tel quel, c'est indéfendable : aucun RAG ne garantit 0 %. Formulation proposée :

> « Une architecture RAG à récupération bornée, couplée à un mécanisme
> d'abstention par seuil et à une validation humaine systématique, permet de
> ramener le **risque d'hallucination engageante** à un niveau résiduel non
> critique, toute proposition de l'agent étant contrôlée par le pharmacien
> avant délivrance. »

On déplace la garantie du modèle (impossible) vers le **système** (démontrable).

### 3.2 Métriques d'évaluation
La similarité cosinus est un mécanisme **interne** du retrieval, pas une preuve
d'efficacité. Pour l'évaluation (mois 5), utiliser le framework **RAGAS** :

- **Faithfulness** : la réponse est-elle fidèle au contexte récupéré ?
- **Answer Relevance** : la réponse répond-elle à la question ?
- **Context Precision / Recall** : le bon contexte a-t-il été récupéré ?

Construire un jeu de test de ~50 questions patient avec réponses de référence
validées par un pharmacien. Mesurer aussi le **taux d'abstention** (combien de
fois le garde-fou se déclenche) — c'est un résultat publiable.

### 3.3 Synchrone vs asynchrone
Clarifier dans le mémoire : le **chat** est synchrone (le patient attend sa
réponse, cible < 3 s) ; les **notifications** et tâches lourdes passent par les
**queues Laravel** (asynchrone). Le diagramme de flux du cahier des charges
décrit donc le seul chemin du chat.

### 3.4 Conformité données de santé
Les données médicales doivent être **chiffrées (réversible)**, pas hachées —
sinon inexploitables. Mentionner le RGPD (minimisation, droit à l'oubli) et,
pour une mise en production réelle en France, l'obligation d'**hébergement HDS**
(hors périmètre du prototype mais à citer comme limite/perspective).

## 4. Schéma de base de données (MySQL)

Conforme au cahier des charges, avec clés et relations explicitées :

```
User(id, nom, email, password, role[patient|pharmacien|admin], profil_medical_id)
ProfilMedical(id, allergies, age, antecedents)
Medicament(id, code_barre, designation, quantite_stock, description_technique, prix)
PreCommande(id, patient_id→User, statut[en_attente|valide|rejete|recupere],
            date_creation, code_validation, pharmacien_id→User)
LigneCommande(id, pre_commande_id→PreCommande, medicament_id→Medicament,
              quantite_demandee, posologie_extraite)
DiscussionLog(id, patient_id→User, message_utilisateur, reponse_ia,
              contexte_recupere_id, fidelite_estimee, abstention, date)
```

Relations : User 1—1 ProfilMedical ; User 1—N PreCommande ; PreCommande 1—N
LigneCommande ; Medicament 1—N LigneCommande ; User 1—N DiscussionLog.

## 5. Roadmap MVP (réaliste sur 5 mois)

Le périmètre complet (Web + Mobile + NER avancé) est trop large pour 5 mois en
solo. Prioriser :

**MVP (à viser absolument)**
- Web uniquement (pas de mobile natif → responsive).
- Auth Sanctum + rôles.
- Pipeline RAG sur ~30–50 fiches médicaments.
- Workflow pré-commande → validation pharmacien → notification.
- Évaluation RAGAS sur jeu de test.

**Perspectives (chapitre « ouverture » du mémoire)**
- Application mobile native.
- NER médical par modèle transformers fine-tuné (corpus annoté) branché sur
  l'interface d'extracteur déjà en place.
- Intégration ordonnance numérique (OCR).
- Hébergement HDS.

### NER : architecture pluggable (déjà implémentée)

L'extraction d'entités (`ia-service/app/ner.py`) repose sur deux backends
interchangeables via `NER_BACKEND` :

- **`rules`** : gazetteer alimenté par le catalogue de l'officine
  (`VectorStore.all_medicament_names()`) + expressions régulières pour les
  dosages (`500 mg`, `1 g`) et fréquences (`3 fois par jour`, `toutes les 6
  heures`, `matin et soir`).
- **`spacy`** (défaut) : pipeline français `fr_core_news_sm` + `EntityRuler`
  seedé par les désignations du catalogue (label `MEDICAMENT`), avec repli
  automatique sur les règles si le modèle est indisponible.

Le découplage (façade `extract_entities`) permet d'ajouter un troisième
extracteur (modèle transformers fine-tuné) sans modifier le reste du pipeline —
c'est la perspective d'amélioration côté recherche. La posologie extraite est
ensuite traduite en horaires de rappel par `PosologieParser` (côté Laravel).

### Alignement avec le chronogramme du cahier des charges
| Mois | Cahier des charges            | Livrable concret                          |
|------|-------------------------------|-------------------------------------------|
| M1   | UML, spécifications           | Diagrammes cas d'usage/séquence/classes   |
| M2   | Docker + Laravel + auth       | `docker-compose` ✅, Sanctum, migrations  |
| M3   | Microservice IA + RAG         | `ia-service/` ✅, indexation catalogue    |
| M4   | Interconnexion + UI           | `IaClient` ✅, chat, dashboard pharmacien |
| M5   | Tests + évaluation + rédaction| RAGAS, taux d'abstention, mémoire final   |

(✅ = squelette déjà en place dans ce dépôt.)
