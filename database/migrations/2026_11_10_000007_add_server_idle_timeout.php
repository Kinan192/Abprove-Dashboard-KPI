<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auth_sessions', fn (Blueprint $t) => $t->dateTime('last_activity_at', 6)->useCurrent());
    }

    public function down(): void
    {
        Schema::table('auth_sessions', fn (Blueprint $t) => $t->dropColumn('last_activity_at'));
    }
};
