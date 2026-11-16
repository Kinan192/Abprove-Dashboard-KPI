<?php

namespace App\Services\IdentityAccess;

final readonly class AccessContext
{
    public function __construct(
        public int $userId,
        public string $role,
        public int $assignmentId,
        public ?int $divisionId,
        public ?int $unitId,
        public string $assignedAt,
    ) {}

    public function identity(): string
    {
        return implode(':', [$this->userId, $this->role, $this->assignmentId, $this->divisionId, $this->unitId]);
    }

    public function home(): string
    {
        return match ($this->role) {
            'admin' => '/admin/accounts',
            'super_hc' => '/hc/dashboard',
            'kepala_divisi' => '/division/dashboard',
            'kepala_unit' => '/unit/dashboard',
        };
    }
}
