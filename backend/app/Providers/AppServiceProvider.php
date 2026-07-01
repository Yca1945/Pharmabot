<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Sérialisation homogène : pas d'enveloppe "data" pour les ressources
        // simples et collections non paginées (le front lit des objets/tableaux
        // bruts). La pagination conserve data/meta/links.
        JsonResource::withoutWrapping();
        Schema::defaultStringLength(191);
    }
}
