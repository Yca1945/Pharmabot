<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profil_medicals', function (Blueprint $table) {
            $table->id();
            $table->text('allergies')->nullable();
            $table->unsignedTinyInteger('age')->nullable();
            $table->text('antecedents')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profil_medicals');
    }
};
