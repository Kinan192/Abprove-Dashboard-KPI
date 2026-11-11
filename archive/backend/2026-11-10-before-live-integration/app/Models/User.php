<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasFactory;

    protected $fillable = ['name', 'email', 'login_nip', 'password', 'is_active', 'role_key', 'phone', 'photo_path', 'email_notifications'];

    protected $hidden = ['password', 'photo_path'];

    protected $attributes = ['is_active' => true];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'email_notifications' => 'boolean', 'password' => 'hashed', 'last_login_at' => 'datetime'];
    }

    public function getRememberTokenName()
    {
        return '';
    }
}
