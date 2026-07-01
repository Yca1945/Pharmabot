<?php

namespace App\Services;

use App\Models\ProfilMedical;
use Illuminate\Support\Collection;

/**
 * Garde-fou de sécurité (aide à la décision) : rapproche les allergies déclarées
 * du patient des contre-indications décrites dans les fiches médicaments.
 *
 * IMPORTANT : c'est une AIDE À LA DÉCISION, pas un blocage automatique. La
 * responsabilité finale reste au pharmacien (validation humaine). Une heuristique
 * lexicale ne remplace pas l'expertise pharmaceutique.
 */
class AlerteService
{
    /**
     * @param  iterable<\App\Models\Medicament>  $medicaments
     * @return array<int, array{medicament:string, allergie:string}>
     */
    public function pourMedicaments(?ProfilMedical $profil, iterable $medicaments): array
    {
        $termes = $this->termesAllergies($profil);
        if (empty($termes)) {
            return [];
        }

        $alertes = [];
        foreach ($medicaments as $m) {
            $texte = $this->normaliser(($m->designation ?? '').' '.($m->description_technique ?? ''));
            foreach ($termes as $terme) {
                if ($terme !== '' && str_contains($texte, $terme)) {
                    $alertes[] = [
                        'medicament' => $m->designation,
                        'allergie'   => $terme,
                    ];
                }
            }
        }

        return $alertes;
    }

    /** Découpe le champ allergies en termes normalisés (sans accents, minuscules). */
    private function termesAllergies(?ProfilMedical $profil): array
    {
        if (! $profil || ! $profil->allergies) {
            return [];
        }

        return collect(preg_split('/[,;\n]+/', $profil->allergies))
            ->map(fn ($t) => $this->normaliser($t))
            ->filter(fn ($t) => mb_strlen($t) >= 3)
            ->unique()
            ->values()
            ->all();
    }

    /** Minuscules + suppression des diacritiques pour comparaison robuste. */
    private function normaliser(string $texte): string
    {
        $texte = mb_strtolower(trim($texte));
        $texte = strtr($texte, [
            'à'=>'a','â'=>'a','ä'=>'a','á'=>'a','ã'=>'a',
            'è'=>'e','é'=>'e','ê'=>'e','ë'=>'e',
            'î'=>'i','ï'=>'i','í'=>'i','ì'=>'i',
            'ô'=>'o','ö'=>'o','ó'=>'o','ò'=>'o','õ'=>'o',
            'ù'=>'u','û'=>'u','ü'=>'u','ú'=>'u',
            'ç'=>'c','ñ'=>'n',
            'æ'=>'ae','œ'=>'oe',
        ]);

        return $texte;
    }
}
