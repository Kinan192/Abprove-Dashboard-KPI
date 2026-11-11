<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->boolean('email_verified')->default(false);
            $t->string('auth_image', 500)->nullable();
        });
        Schema::create('auth_accounts', function (Blueprint $t) {
            $t->id();
            $t->string('accountId', 190);
            $t->string('providerId', 32);
            $t->foreignId('userId')->constrained('users')->cascadeOnDelete();
            $t->text('accessToken')->nullable();
            $t->text('refreshToken')->nullable();
            $t->text('idToken')->nullable();
            $t->dateTime('accessTokenExpiresAt', 6)->nullable();
            $t->dateTime('refreshTokenExpiresAt', 6)->nullable();
            $t->string('scope')->nullable();
            $t->string('password', 255)->nullable();
            $t->dateTime('createdAt', 6)->useCurrent();
            $t->dateTime('updatedAt', 6)->useCurrent();
            $t->unique(['providerId', 'accountId']);
            $t->unique(['userId', 'providerId']);
        });
        Schema::create('auth_sessions', function (Blueprint $t) {
            $t->id();
            $t->string('token', 255)->unique();
            $t->foreignId('userId')->constrained('users')->cascadeOnDelete();
            $t->dateTime('expiresAt', 6)->index();
            $t->dateTime('createdAt', 6)->useCurrent();
            $t->dateTime('updatedAt', 6)->useCurrent();
            $t->string('ipAddress', 64)->nullable();
            $t->text('userAgent')->nullable();
            $t->string('context_key', 100)->nullable();
        });
        Schema::create('auth_verifications', function (Blueprint $t) {
            $t->id();
            $t->string('identifier', 255)->index();
            $t->text('value');
            $t->dateTime('expiresAt', 6)->index();
            $t->dateTime('createdAt', 6)->useCurrent();
            $t->dateTime('updatedAt', 6)->useCurrent();
        });
        DB::statement("INSERT INTO auth_accounts(accountId,providerId,userId,password) SELECT CAST(id AS CHAR),'credential',id,password FROM users");
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('password'));
    }

    public function down(): void
    {
        throw new RuntimeException('Rollback kredensial harus melalui backup terverifikasi.');
    }
};
