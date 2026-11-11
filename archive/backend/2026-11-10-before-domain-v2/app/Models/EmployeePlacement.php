<?php

namespace App\Models;

class EmployeePlacement extends DomainModel
{
    protected $fillable = ['employee_id', 'unit_id', 'division_id', 'started_at', 'ended_at', 'reason', 'created_by', 'ended_by'];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
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
