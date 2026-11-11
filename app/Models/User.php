<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasFactory;

    protected $fillable = ['name', 'email', 'login_nip', 'password', 'is_active', 'role_key', 'phone', 'photo_path', 'email_notifications'];

    protected $hidden = ['password', 'photo_path'];

    protected $attributes = ['is_active' => true];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    private ?string $pendingPassword = null;

    protected static function booted(): void
    {
        static::saved(function (self $user) {
            if ($user->pendingPassword !== null) {
                DB::table('auth_accounts')->updateOrInsert(
                    ['userId' => $user->id, 'providerId' => 'credential'],
                    ['accountId' => (string) $user->id, 'password' => $user->pendingPassword, 'updatedAt' => now()]
                );
                $user->pendingPassword = null;
                DB::table('auth_sessions')->where('userId', $user->id)->delete();
            }
            if ($user->wasChanged(['is_active', 'role_key', 'email'])) {
                DB::table('auth_sessions')->where('userId', $user->id)->delete();
            }
        });
    }

    public function setPasswordAttribute(string $password): void
    {
        $this->pendingPassword = password_get_info($password)['algo'] ? $password : Hash::make($password);
    }

    public function getPasswordAttribute(): ?string
    {
        return $this->pendingPassword ?? ($this->exists ? DB::table('auth_accounts')->where('userId', $this->id)->where('providerId', 'credential')->value('password') : null);
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'email_notifications' => 'boolean', 'password' => 'hashed', 'last_login_at' => 'datetime'];
    }

    public function getRememberTokenName()
    {
        return '';
    }
}
