<?php

namespace App\Services;

/**
 * Traduit une posologie textuelle (issue du NER) en horaires de rappel.
 * Gère trois formes :
 *   - moments nommés : "matin et soir"        -> ["08:00","20:00"]
 *   - intervalle     : "toutes les 8 heures"  -> 3 prises réparties
 *   - fréquence      : "3 fois par jour"       -> ["08:00","14:00","20:00"]
 */
class PosologieParser
{
    /** Horaires nommés. */
    private const MOMENTS = [
        'matin' => '08:00',
        'midi' => '12:00',
        'soir' => '20:00',
    ];

    /** Grille par nombre de prises quotidiennes. */
    private const GRILLE = [
        1 => ['08:00'],
        2 => ['08:00', '20:00'],
        3 => ['08:00', '14:00', '20:00'],
        4 => ['08:00', '12:00', '16:00', '20:00'],
        5 => ['08:00', '12:00', '15:00', '18:00', '21:00'],
        6 => ['07:00', '11:00', '14:00', '17:00', '20:00', '23:00'],
    ];

    /**
     * Déduit les horaires de prise à partir d'un texte de posologie.
     *
     * @return array<int, string> liste d'heures "HH:MM"
     */
    public function heures(?string $posologie): array
    {
        if (! $posologie) {
            return self::GRILLE[1];
        }

        $texte = mb_strtolower($posologie);

        // 1) Moments nommés explicites (matin / midi / soir)
        $moments = [];
        foreach (self::MOMENTS as $mot => $heure) {
            if (str_contains($texte, $mot)) {
                $moments[] = $heure;
            }
        }
        if ($moments) {
            sort($moments);

            return $moments;
        }

        // 2) Intervalle "toutes les N heures"
        if (preg_match('/toutes?\s+les?\s+(\d+)\s*(?:h|heures?)/i', $texte, $m)) {
            $intervalle = max(1, (int) $m[1]);
            $nb = max(1, min(6, (int) round(24 / $intervalle)));

            return self::GRILLE[$nb];
        }

        // 3) Fréquence "N fois par jour"
        return self::GRILLE[$this->nombrePrises($texte)];
    }

    /** Extrait le nombre de prises quotidiennes (1 par défaut). */
    public function nombrePrises(?string $posologie): int
    {
        if (! $posologie) {
            return 1;
        }

        if (preg_match('/(\d+)\s*(?:fois|x)/i', $posologie, $m)) {
            return max(1, min(6, (int) $m[1]));
        }

        return 1;
    }
}
