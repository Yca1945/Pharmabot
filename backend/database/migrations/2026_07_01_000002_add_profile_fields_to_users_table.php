<?php

use App\Enums\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute les champs métier à la table users par défaut de Laravel.
     * (On conserve name/email/password fournis par le scaffold standard.)
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default(Role::Patient->value)->after('email');
            $table->foreignId('profil_medical_id')->nullable()->after('role')
                  ->constrained('profil_medicals')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('profil_medical_id');
            $table->dropColumn('role');
        });
    }
};
