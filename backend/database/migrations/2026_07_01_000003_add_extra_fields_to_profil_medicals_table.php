<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profil_medicals', function (Blueprint $table) {
            $table->decimal('poids', 5, 1)->nullable()->after('age');   // kg
            $table->string('sexe', 10)->nullable()->after('poids');     // M / F / autre
            $table->string('groupe_sanguin', 5)->nullable()->after('sexe'); // A+, O-, …
        });
    }

    public function down(): void
    {
        Schema::table('profil_medicals', function (Blueprint $table) {
            $table->dropColumn(['poids', 'sexe', 'groupe_sanguin']);
        });
    }
};
