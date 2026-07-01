<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ligne_commandes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pre_commande_id')->constrained('pre_commandes')->cascadeOnDelete();
            $table->foreignId('medicament_id')->constrained('medicaments')->restrictOnDelete();
            $table->unsignedInteger('quantite_demandee')->default(1);
            $table->string('posologie_extraite')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ligne_commandes');
    }
};
