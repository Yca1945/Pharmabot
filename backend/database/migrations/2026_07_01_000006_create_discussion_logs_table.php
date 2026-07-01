<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discussion_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->text('message_utilisateur');
            $table->text('reponse_ia');
            $table->string('contexte_recupere_id')->nullable();
            $table->decimal('fidelite_estimee', 5, 3)->nullable();
            $table->boolean('abstention')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discussion_logs');
    }
};
