<?php

namespace App\Models;

class Unit extends DomainModel
{
    protected $fillable = ['division_id', 'code', 'name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function division()
    {
        return $this->belongsTo(Division::class);
    }
}
