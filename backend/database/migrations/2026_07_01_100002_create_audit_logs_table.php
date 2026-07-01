<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');           // ex: pre_commande.valider
            $table->string('entite_type')->nullable();  // ex: PreCommande
            $table->unsignedBigInteger('entite_id')->nullable();
            $table->json('meta')->nullable();   // contexte additionnel (motif rejet, etc.)
            $table->string('ip')->nullable();
            $table->timestamps();

            $table->index(['entite_type', 'entite_id']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
