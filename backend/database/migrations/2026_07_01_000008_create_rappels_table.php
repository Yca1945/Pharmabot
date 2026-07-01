<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rappels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ligne_commande_id')->nullable()
                  ->constrained('ligne_commandes')->nullOnDelete();
            $table->foreignId('medicament_id')->nullable()
                  ->constrained('medicaments')->nullOnDelete();
            $table->string('libelle');
            $table->string('posologie')->nullable();
            $table->json('heures');                 // ex: ["08:00","14:00","20:00"]
            $table->boolean('actif')->default(true);
            $table->date('date_debut');
            $table->date('date_fin')->nullable();    // null = sans fin
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rappels');
    }
};
