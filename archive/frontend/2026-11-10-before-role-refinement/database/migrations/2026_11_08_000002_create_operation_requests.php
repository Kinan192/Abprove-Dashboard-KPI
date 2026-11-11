<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operation_requests', function (Blueprint $table) {
            $table->uuid('request_id')->primary();
            $table->foreignId('actor_user_id')->constrained('users');
            $table->string('action', 120);
            $table->char('payload_hash', 64);
            $table->string('context_key', 160);
            $table->json('response_data');
            $table->dateTime('created_at', 6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operation_requests');
    }
};
