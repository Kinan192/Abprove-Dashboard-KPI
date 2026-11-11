<?php

namespace App\Models;

class Employee extends DomainModel
{
    protected $fillable = ['nip', 'full_name', 'position_id', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function placements()
    {
        return $this->hasMany(EmployeePlacement::class);
    }

    public function assessments()
    {
        return $this->hasMany(Assessment::class);
    }
}
