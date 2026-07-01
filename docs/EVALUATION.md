# Évaluation du pipeline RAG (Mois 5)

Ce document décrit le protocole d'évaluation de l'agent conversationnel, en
lien direct avec la section « Approche méthodologique et métriques » de la
proposition de mémoire. Il sert de base au chapitre « Résultats ».

## 1. Objectif

Valider l'hypothèse de recherche : l'architecture RAG à récupération bornée +
garde-fou + validation humaine **neutralise le risque d'hallucination
engageante**. On mesure donc deux choses :

1. La **qualité de la récupération** (le bon contexte médical est-il retrouvé ?).
2. La **fidélité de la génération** (la réponse reste-t-elle dans le contexte ?)
   et le **bon déclenchement de l'abstention** (le garde-fou refuse-t-il de
   répondre hors périmètre ?).

## 2. Métriques

### 2.1 Similarité cosinus (mécanisme interne)

La récupération s'appuie sur la similarité cosinus entre le vecteur de la requête
Q et celui d'un document D :

```
sim(Q, D) = (Σ Qi·Di) / (√Σ Qi²  ·  √Σ Di²)
```

C'est le **mécanisme** de tri des documents (et le seuil d'abstention), pas une
mesure de performance en soi — d'où les métriques de niveau supérieur ci-dessous.

### 2.2 Métriques RAG (cadre RAGAS)

| Métrique               | Définition                                                        |
|------------------------|-------------------------------------------------------------------|
| Context Precision      | part des sources récupérées qui sont pertinentes                  |
| Context Recall         | part des sources pertinentes effectivement récupérées            |
| Faithfulness           | part des affirmations de la réponse vérifiables dans le contexte |
| Answer Relevance       | adéquation sémantique réponse / question                          |
| Abstention Accuracy    | taux de bon déclenchement du garde-fou (métrique propre au projet)|

## 3. Deux niveaux de mesure

### 3.1 Offline, déterministe (par défaut)

`eval/metrics.py` implémente des proxys **reproductibles sans LLM juge** :
recouvrement lexical pour faithfulness/answer-relevance, et comparaison
ensembliste des sources pour precision/recall. Avantage : résultats stables,
rejouables en CI, indépendants d'un service externe. C'est la **référence**
chiffrée du mémoire.

### 3.2 Rigoureux via RAGAS

Pour une mesure sémantique fine (et non lexicale), la librairie
[`ragas`](https://docs.ragas.io) calcule faithfulness et answer_relevancy à
l'aide d'un LLM juge et d'embeddings. Branchement :

```bash
pip install ragas
# configurer un LLM juge (OpenAI, ou modèle local via un wrapper LangChain)
python -m eval.evaluate_rag --ragas
```

À documenter dans le mémoire comme la mesure « gold standard », l'offline
servant de garde-fou méthodologique reproductible.

## 4. Jeu de données

`eval/dataset.json` : 10 cas, dont 7 questions médicales couvertes par le
catalogue (réponse attendue + source attendue) et 3 cas hors périmètre qui
**doivent** déclencher l'abstention (sens de la vie, géographie, médicament
fictif). Ce dernier groupe teste directement l'« étanchéité médicale ».

## 5. Procédure

```bash
# 1. Démarrer le microservice IA et indexer le catalogue
docker compose up -d ia-service
docker compose exec ia-service python -m scripts.seed_demo

# 2. Lancer l'évaluation
docker compose exec ia-service python -m eval.evaluate_rag

# -> affiche le détail par cas + les moyennes, et écrit eval/results.json
```

## 6. Lecture des résultats

- **Abstention Accuracy = 1.0** attendu : aucun des 3 cas hors-sujet ne doit
  produire de réponse médicale. C'est le résultat le plus important pour la
  soutenance.
- **Context Recall élevé** sur les 7 cas médicaux : le bon document est retrouvé.
- **Faithfulness élevée** : la réponse n'introduit pas d'éléments hors contexte.

Un tableau de ces moyennes, accompagné de la matrice par cas, constitue la
section quantitative du chapitre « Résultats » du mémoire.

## 7. Limites

Les proxys offline mesurent un recouvrement lexical, pas une équivalence
sémantique : ils peuvent sous-estimer une réponse correcte reformulée. D'où
l'intérêt de compléter par RAGAS. La taille du jeu (10 cas) est volontairement
réduite pour le prototype ; l'élargir avec un pharmacien validant les réponses
de référence est une perspective d'amélioration.
