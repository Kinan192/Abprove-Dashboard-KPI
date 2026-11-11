<?php

namespace App\Policies;

use App\Models\Assessment;
use App\Models\User;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\ScopeResolver;

class AssessmentPolicy
{
    public function view(User $user, Assessment $assessment): bool
    {
        $ctx = app(ScopeResolver::class)->resolve($user);

        return app(ScopedRecords::class)->assessments($ctx)->whereKey($assessment->id)->exists();
    }

    public function score(User $user, Assessment $assessment): bool
    {
        $role = app(ScopeResolver::class)->resolve($user)->role;

        return (($role === 'kepala_unit' && $assessment->assessment_kind === 'member') ||
            ($role === 'kepala_divisi' && $assessment->assessment_kind === 'unit_head')) && $this->view($user, $assessment);
    }
}
