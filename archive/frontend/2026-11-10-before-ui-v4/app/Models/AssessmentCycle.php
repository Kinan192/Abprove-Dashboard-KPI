<?php

namespace App\Models;

class AssessmentCycle extends DomainModel
{
    protected $fillable = ['assessment_month', 'opens_at', 'submission_due_at', 'approval_due_at', 'closes_at', 'status', 'created_by'];

    protected function casts(): array
    {
        return ['assessment_month' => 'date:Y-m-d', 'opens_at' => 'datetime', 'submission_due_at' => 'datetime', 'approval_due_at' => 'datetime', 'closes_at' => 'datetime'];
    }
}
