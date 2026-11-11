<?php

namespace App\Models;

class EmployeePlacement extends DomainModel
{
    protected $fillable = ['employee_id', 'unit_id', 'division_id', 'effective_from', 'effective_until', 'reason', 'created_by'];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['effective_from' => 'date', 'effective_until' => 'date'];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }
}
