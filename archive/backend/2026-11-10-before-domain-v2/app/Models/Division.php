<?php

namespace App\Models;

class Division extends DomainModel
{
    protected $fillable = ['code', 'name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function units()
    {
        return $this->hasMany(Unit::class);
    }
}
