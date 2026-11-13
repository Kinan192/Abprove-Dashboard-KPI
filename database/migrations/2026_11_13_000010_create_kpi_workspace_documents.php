<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpi_workspace_documents', function (Blueprint $table) {
            $table->id();
            $table->string('scope_key', 40)->unique();
            $table->unsignedInteger('revision')->default(0);
            $table->longText('data');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_workspace_documents');
    }
};
