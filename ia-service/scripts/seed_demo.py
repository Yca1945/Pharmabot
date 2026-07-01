"""Jeu de données de démonstration : indexe quelques fiches médicaments.

Usage (depuis le conteneur ia-service) :
    python -m scripts.seed_demo
"""
from app.vector_store import store

FICHES = [
    {
        "id": "doliprane_1000",
        "medicament": "Doliprane 1000 mg",
        "contenu": (
            "Doliprane 1000 mg (paracétamol). Antalgique et antipyrétique. "
            "Posologie adulte : 1 comprimé par prise, à renouveler si besoin "
            "toutes les 6 heures, sans dépasser 3 g par jour (3 comprimés). "
            "Contre-indications : insuffisance hépatique grave, allergie au "
            "paracétamol. Ne pas associer à d'autres médicaments contenant du "
            "paracétamol."
        ),
        "metadata": {"id": "doliprane_1000", "classe": "antalgique"},
    },
    {
        "id": "amoxicilline_500",
        "medicament": "Amoxicilline 500 mg",
        "contenu": (
            "Amoxicilline 500 mg. Antibiotique de la famille des pénicillines. "
            "Posologie usuelle adulte : 1 g 2 à 3 fois par jour selon "
            "prescription. Contre-indication : allergie aux pénicillines "
            "(bêta-lactamines). Délivrance sur ordonnance uniquement."
        ),
        "metadata": {"id": "amoxicilline_500", "classe": "antibiotique"},
    },
    {
        "id": "ibuprofene_400",
        "medicament": "Ibuprofène 400 mg",
        "contenu": (
            "Ibuprofène 400 mg. Anti-inflammatoire non stéroïdien (AINS). "
            "Posologie adulte : 1 comprimé toutes les 6 heures, maximum "
            "1200 mg/jour en automédication. Contre-indications : ulcère "
            "gastrique, grossesse à partir du 6e mois, insuffisance rénale. "
            "À prendre au cours d'un repas."
        ),
        "metadata": {"id": "ibuprofene_400", "classe": "AINS"},
    },
]


def run() -> None:
    for f in FICHES:
        store.add(f["id"], f["medicament"], f["contenu"], f["metadata"])
    print(f"{len(FICHES)} fiches indexées. Total collection : {store.count()}")


if __name__ == "__main__":
    run()
