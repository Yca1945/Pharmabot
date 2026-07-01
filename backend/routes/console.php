<?php

use Illuminate\Support\Facades\Schedule;

// Suivi thérapeutique (RF-07) : vérifie chaque minute les rappels de prise dus.
Schedule::command('rappels:envoyer')->everyMinute()->withoutOverlapping();
