<?php

namespace App\Notifications;

use App\Models\Rappel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Rappel de prise de médicament (RF-07). Envoyé par la commande planifiée
 * lorsque l'heure courante correspond à un horaire du rappel.
 */
class RappelPriseMedicament extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Rappel $rappel) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Rappel de prise — '.$this->rappel->libelle)
            ->greeting("Bonjour {$notifiable->name},")
            ->line("C'est l'heure de prendre : {$this->rappel->libelle}")
            ->lineIf((bool) $this->rappel->posologie, "Posologie : {$this->rappel->posologie}")
            ->line('Prenez soin de vous.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'rappel_prise',
            'rappel_id' => $this->rappel->id,
            'libelle' => $this->rappel->libelle,
            'posologie' => $this->rappel->posologie,
            'message' => "Rappel : prendre {$this->rappel->libelle}.",
        ];
    }
}
