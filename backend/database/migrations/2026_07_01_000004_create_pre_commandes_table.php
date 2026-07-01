<?php

use App\Enums\Statut;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pre_commandes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pharmacien_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->string('statut')->default(Statut::EnAttente->value)->index();
            $table->string('code_validation')->nullable();
            $table->text('motif_rejet')->nullable();
            $table->timestamp('date_creation')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pre_commandes');
    }
};
