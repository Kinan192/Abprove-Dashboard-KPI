<?php

namespace App\Models;

class ScopeAssignment extends DomainModel
{
    protected $fillable = ['user_id', 'role_key', 'division_id', 'unit_id', 'assigned_at', 'revoked_at', 'assigned_by', 'revoked_by', 'note'];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['assigned_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
