<?php

namespace App\Console\Commands;

use App\Models\Rappel;
use App\Notifications\RappelPriseMedicament;
use Illuminate\Console\Command;

/**
 * Parcourt les rappels actifs et notifie les patients dont un horaire de prise
 * correspond à la minute courante. Exécutée chaque minute par le scheduler.
 */
class EnvoyerRappels extends Command
{
    protected $signature = 'rappels:envoyer';

    protected $description = 'Envoie les rappels de prise dont l\'heure correspond à maintenant';

    public function handle(): int
    {
        $maintenant = now()->format('H:i');
        $aujourdhui = now()->toDateString();
        $envoyes = 0;

        Rappel::with('patient')
            ->where('actif', true)
            ->whereDate('date_debut', '<=', $aujourdhui)
            ->where(function ($q) use ($aujourdhui) {
                $q->whereNull('date_fin')->orWhereDate('date_fin', '>=', $aujourdhui);
            })
            ->get()
            ->filter(fn (Rappel $r) => in_array($maintenant, $r->heures ?? [], true))
            ->each(function (Rappel $r) use (&$envoyes) {
                $r->patient?->notify(new RappelPriseMedicament($r));
                $envoyes++;
            });

        $this->info("Rappels envoyés : {$envoyes}");

        return self::SUCCESS;
    }
}
