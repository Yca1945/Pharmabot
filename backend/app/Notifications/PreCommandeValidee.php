<?php

namespace App\Notifications;

use App\Models\PreCommande;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée au patient quand le pharmacien VALIDE sa pré-commande
 * (RF-06 — "Click & Collect"). Mise en file d'attente pour ne pas bloquer la
 * requête HTTP du pharmacien.
 */
class PreCommandeValidee extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public PreCommande $preCommande) {}

    /** Canaux de diffusion. */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre commande est prête (Click & Collect)')
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Votre pré-commande n°{$this->preCommande->id} a été validée par votre pharmacien.")
            ->line("Code de retrait : {$this->preCommande->code_validation}")
            ->line('Vous pouvez venir la récupérer en officine.');
    }

    /** Stocké dans la table notifications (in-app). */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'pre_commande_validee',
            'pre_commande_id' => $this->preCommande->id,
            'code_validation' => $this->preCommande->code_validation,
            'message' => "Commande n°{$this->preCommande->id} validée — prête au retrait.",
        ];
    }
}
