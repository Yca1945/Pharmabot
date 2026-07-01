<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discussion_logs', function (Blueprint $table) {
            // Feedback patient : 1 = positif, -1 = négatif, null = pas encore donné
            $table->tinyInteger('feedback')->nullable()->after('abstention');
            $table->text('feedback_commentaire')->nullable()->after('feedback');
        });
    }

    public function down(): void
    {
        Schema::table('discussion_logs', function (Blueprint $table) {
            $table->dropColumn(['feedback', 'feedback_commentaire']);
        });
    }
};
