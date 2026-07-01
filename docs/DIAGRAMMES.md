# Diagrammes UML — Pharmabot (livrable Mois 1)

Modélisation UML du système, conforme au cahier des charges. Les sources
Mermaid sont dans `docs/uml/` (rendu direct sur GitHub/VS Code, ou via
[mermaid.live](https://mermaid.live) pour exporter en PNG/SVG vers le mémoire).

---

## 1. Diagramme de cas d'utilisation

Trois acteurs : **Patient**, **Pharmacien**, **Administrateur**. Le patient
dialogue et initie des pré-commandes ; le pharmacien garde le contrôle final
(validation) ; l'admin gère comptes et catalogue.

```mermaid
flowchart LR
    patient([Patient]):::actor
    pharma([Pharmacien]):::actor
    admin([Administrateur]):::actor

    subgraph Pharmabot[" Système Pharmabot "]
        uc1(S'authentifier)
        uc2(Dialoguer avec le chatbot)
        uc3(Consulter une information médicament)
        uc4(Initier une pré-commande)
        uc5(Recevoir des notifications)
        uc6(Recevoir des rappels de prise)
        uc7(Consulter les pré-commandes)
        uc8(Valider / Rejeter / Modifier une commande)
        uc9(Gérer le catalogue médicaments)
        uc10(Gérer les comptes utilisateurs)
    end

    patient --- uc1
    patient --- uc2
    patient --- uc3
    patient --- uc4
    patient --- uc5
    patient --- uc6
    pharma --- uc1
    pharma --- uc7
    pharma --- uc8
    pharma --- uc9
    admin --- uc1
    admin --- uc9
    admin --- uc10
    uc2 -. include .-> uc3
    uc4 -. include .-> uc8

    classDef actor fill:#2563eb,stroke:#1e3a8a,color:#fff;
```

---

## 2. Diagramme de séquence — Conversation RAG

Chemin synchrone du chat. Met en évidence le **garde-fou anti-hallucination** :
si la similarité du meilleur document récupéré est sous le seuil, le système
s'abstient au lieu de laisser le LLM inventer.

```mermaid
sequenceDiagram
    autonumber
    actor P as Patient
    participant F as Front Web/Mobile
    participant L as API Laravel
    participant IA as Microservice IA (FastAPI)
    participant V as ChromaDB (vectoriel)
    participant M as LLM
    participant DB as MySQL

    P->>F: Saisit une question
    F->>L: POST /api/chat (Bearer token)
    L->>L: Vérifie token + rôle (Sanctum)
    L->>IA: POST /chat { message }
    IA->>V: Recherche vectorielle (top_k)
    V-->>IA: Fiches médicaments + similarité
    alt Meilleure similarité < seuil
        Note over IA: Garde-fou anti-hallucination
        IA-->>L: { abstention: true, message prudent }
    else Contexte fiable récupéré
        IA->>M: Prompt contraint + contexte
        M-->>IA: Réponse (température 0)
        IA-->>L: { réponse, sources, fidélité }
    end
    L->>DB: Enregistre DiscussionLog
    L-->>F: Réponse JSON
    F-->>P: Affiche réponse + sources
```

---

## 3. Diagramme de séquence — Pré-commande & validation pharmacien

Illustre la **validation humaine obligatoire** (RF-04, RF-05, RF-06) et
l'asynchronisme des notifications via les queues Laravel.

```mermaid
sequenceDiagram
    autonumber
    actor P as Patient
    participant L as API Laravel
    participant IA as Microservice IA
    participant DB as MySQL
    participant Q as Queue (Jobs)
    actor Ph as Pharmacien

    P->>L: Transmet ses besoins en médicaments
    L->>IA: Extraction d'entités (NER)
    IA-->>L: Médicaments + posologies extraites
    L->>DB: Crée PreCommande (statut = en_attente)
    L->>DB: Crée LigneCommande(s)
    L-->>P: Récapitulatif "En attente de validation"
    Ph->>L: Consulte le tableau de bord
    L->>DB: Liste des pré-commandes en attente
    DB-->>L: Pré-commandes
    L-->>Ph: Affichage des demandes
    Note over Ph: Contrôle de l'ordonnance (physique/numérique)
    alt Validation
        Ph->>L: Valide la commande
        L->>DB: statut = valide + code_validation
        L->>Q: Dispatch job notification
        Q-->>P: Notification "Commande prête (Click & Collect)"
    else Rejet
        Ph->>L: Rejette la commande
        L->>DB: statut = rejete
        L->>Q: Dispatch job notification
        Q-->>P: Notification de rejet + motif
    end
```

---

## 4. Diagramme de classes

Vue objet des 6 entités pivots et de leurs relations. Deux énumérations
(`Role`, `Statut`) bornent les valeurs autorisées.

```mermaid
classDiagram
    class User {
        +int id
        +string nom
        +string email
        +string password
        +Role role
        +s_authentifier()
    }
    class ProfilMedical {
        +int id
        +string allergies
        +int age
        +string antecedents
    }
    class Medicament {
        +int id
        +string code_barre
        +string designation
        +int quantite_stock
        +string description_technique
        +float prix
    }
    class PreCommande {
        +int id
        +Statut statut
        +datetime date_creation
        +string code_validation
        +valider()
        +rejeter()
        +modifier()
    }
    class LigneCommande {
        +int id
        +int quantite_demandee
        +string posologie_extraite
    }
    class DiscussionLog {
        +int id
        +string message_utilisateur
        +string reponse_ia
        +float fidelite_estimee
        +bool abstention
        +datetime date
    }
    class Role {
        <<enumeration>>
        patient
        pharmacien
        admin
    }
    class Statut {
        <<enumeration>>
        en_attente
        valide
        rejete
        recupere
    }
    User "1" --> "0..1" ProfilMedical : possède
    User "1" --> "*" PreCommande : passe
    User "1" --> "*" PreCommande : valide (pharmacien)
    PreCommande "1" *-- "1..*" LigneCommande : contient
    Medicament "1" --> "*" LigneCommande : référencé par
    User "1" --> "*" DiscussionLog : génère
```

---

## 5. Modèle physique de données (entité-association)

Traduction relationnelle pour MySQL : clés primaires (PK) et étrangères (FK).

```mermaid
erDiagram
    USER ||--o| PROFIL_MEDICAL : possede
    USER ||--o{ PRE_COMMANDE : passe
    USER ||--o{ DISCUSSION_LOG : genere
    PRE_COMMANDE ||--|{ LIGNE_COMMANDE : contient
    MEDICAMENT ||--o{ LIGNE_COMMANDE : reference

    USER {
        int id PK
        string nom
        string email
        string password
        enum role "patient|pharmacien|admin"
        int profil_medical_id FK
    }
    PROFIL_MEDICAL {
        int id PK
        string allergies
        int age
        string antecedents
    }
    MEDICAMENT {
        int id PK
        string code_barre
        string designation
        int quantite_stock
        string description_technique
        float prix
    }
    PRE_COMMANDE {
        int id PK
        int patient_id FK
        int pharmacien_id FK
        enum statut "en_attente|valide|rejete|recupere"
        datetime date_creation
        string code_validation
    }
    LIGNE_COMMANDE {
        int id PK
        int pre_commande_id FK
        int medicament_id FK
        int quantite_demandee
        string posologie_extraite
    }
    DISCUSSION_LOG {
        int id PK
        int patient_id FK
        string message_utilisateur
        string reponse_ia
        int contexte_recupere_id
        float fidelite_estimee
        bool abstention
        datetime date
    }
```

---

## 6. Diagramme d'activité — Parcours patient global

Vue d'ensemble du flux, de la connexion au retrait en officine. Intègre les
deux points de contrôle clés : le **garde-fou** (contexte fiable ?) et la
**décision du pharmacien** (validation/rejet).

```mermaid
flowchart TD
    start([Début]) --> auth{Authentifié ?}
    auth -- Non --> login[S'inscrire / Se connecter]
    login --> auth
    auth -- Oui --> chat[Poser une question au chatbot]
    chat --> rag[/Pipeline RAG : recherche vectorielle/]
    rag --> guard{Contexte fiable<br/>trouvé ?}
    guard -- Non --> abstain[Message : consulter le pharmacien]
    abstain --> more{Autre demande ?}
    guard -- Oui --> answer[Réponse sourcée + info posologie]
    answer --> wantOrder{Besoin de<br/>médicaments ?}
    wantOrder -- Non --> more
    wantOrder -- Oui --> ner[/Extraction entités : médicaments + posologie/]
    ner --> precmd[Création pré-commande<br/>statut = en_attente]
    precmd --> wait[Attente de validation]
    wait --> pharma{Décision<br/>pharmacien}
    pharma -- Rejet --> rejected[Notification de rejet + motif]
    rejected --> more
    pharma -- Validation --> validated[Notification : commande prête<br/>Click & Collect]
    validated --> pickup[Retrait en officine]
    pickup --> reminders[Rappels de prise selon posologie]
    reminders --> more
    more -- Oui --> chat
    more -- Non --> stop([Fin])
```

---

## Export pour le mémoire

Pour intégrer ces diagrammes dans le document Word/LaTeX du mémoire :

1. Ouvrir [mermaid.live](https://mermaid.live)
2. Coller le contenu d'un fichier `.mermaid`
3. Exporter en **SVG** (qualité vectorielle) ou PNG haute résolution.
