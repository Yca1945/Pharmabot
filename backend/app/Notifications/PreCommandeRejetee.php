<?php

namespace App\Notifications;

use App\Models\PreCommande;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée au patient quand le pharmacien REJETTE sa pré-commande
 * (RF-06). Mise en file d'attente.
 */
class PreCommandeRejetee extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public PreCommande $preCommande) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Votre pré-commande n\'a pas été validée')
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Votre pré-commande n°{$this->preCommande->id} n'a pas pu être validée.");

        if ($this->preCommande->motif_rejet) {
            $mail->line("Motif : {$this->preCommande->motif_rejet}");
        }

        return $mail->line('Rapprochez-vous de votre pharmacien pour plus d\'informations.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'pre_commande_rejetee',
            'pre_commande_id' => $this->preCommande->id,
            'motif' => $this->preCommande->motif_rejet,
            'message' => "Commande n°{$this->preCommande->id} rejetée.",
        ];
    }
}
