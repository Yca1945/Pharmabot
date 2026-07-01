# Conformité RGPD & sécurité des données de santé

Ce document décrit les mesures de protection des données personnelles mises en
œuvre dans Pharmabot, et celles qui relèveraient d'une mise en production réelle.
Il alimente la section « Sécurité et confidentialité » du cahier des charges et
la discussion du mémoire.

## 1. Nature des données traitées

Pharmabot manipule des **données de santé** (catégorie particulière, art. 9
RGPD) : allergies, antécédents, traitements demandés, échanges avec l'agent.
Elles imposent un niveau de protection renforcé.

## 2. Chiffrement au repos (implémenté)

Les champs sensibles sont **chiffrés en base** via le cast `encrypted` de Laravel
(AES-256, clé `APP_KEY`) :

| Modèle          | Champs chiffrés                          |
|-----------------|------------------------------------------|
| `ProfilMedical` | `allergies`, `antecedents`               |
| `DiscussionLog` | `message_utilisateur`, `reponse_ia`      |

Le chiffrement est **transparent** : déchiffrement automatique à la lecture côté
application, stockage chiffré en base. Une fuite de la base seule ne révèle donc
pas ces données.

> Choix de conception important : on **chiffre** (réversible), on ne **hache**
> pas. Le hachage (irréversible) rendrait les données inexploitables — l'erreur
> que pointait la première version du cahier des charges.

## 3. Droits des personnes (implémentés)

| Droit                        | Mise en œuvre                                   |
|------------------------------|-------------------------------------------------|
| Accès / portabilité (art. 20)| `GET /api/compte/export` → export JSON complet  |
| Effacement (art. 17)         | `DELETE /api/compte` → suppression en cascade   |

La suppression efface l'utilisateur et, en cascade, ses pré-commandes, lignes,
rappels, logs de conversation, notifications et jetons, ainsi que son profil
médical.

## 4. Minimisation & contrôle d'accès

- **Minimisation** : seules les données utiles sont collectées (profil de base).
- **ACL par rôle** (`EnsureRole`) : un patient n'accède qu'à ses propres données.
- **Masquage** : les `API Resources` empêchent toute fuite de champ sensible
  (mots de passe hachés, jetons) dans les réponses.
- **Chiffrement en transit** : HTTPS en production (hors périmètre du prototype).

## 5. Perspectives pour une mise en production réelle

- **Hébergement HDS** : en France, l'hébergement de données de santé impose un
  hébergeur certifié *Hébergeur de Données de Santé*.
- **Journal d'accès** (traçabilité des consultations de données de santé).
- **Durée de conservation** et purge automatique des logs anciens.
- **Consentement explicite** à la création du compte.
- **Rotation des clés** de chiffrement et gestion via un coffre (KMS/Vault).

Ces points dépassent le périmètre d'un prototype académique mais doivent figurer
comme limites et perspectives du mémoire.
