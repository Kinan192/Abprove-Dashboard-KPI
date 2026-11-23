<?php

namespace App\Http\Requests\Profile;

use App\Http\Requests\MutationRequest;
use Illuminate\Validation\Rules\Password;

/** Own profile: name, login email, phone, email notifications, password change and photo. Role and status stay with Admin. */
class ProfileUpdateRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:190'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'email_notifications' => ['sometimes', 'boolean'],
            'current_password' => ['required_with:password', 'string'],
            'password' => ['sometimes', 'string', 'confirmed', Password::min(12)->letters()->numbers()],
            'password_confirmation' => ['required_with:password', 'string'],
            'photo' => ['sometimes', 'file', 'image', 'mimetypes:image/png,image/jpeg,image/webp', 'max:2048'],
            'role_key' => ['prohibited'],
            'is_active' => ['prohibited'],
        ];
    }

    /** Validated fields for the mutation: the photo is represented by its content hash and extension. */
    public function payload(): array
    {
        $data = $this->validated();
        unset($data['photo']);
        if ($file = $this->file('photo')) {
            $data['photo_hash'] = hash_file('sha256', $file->getRealPath());
            $data['photo_extension'] = $file->extension();
        }

        return $data;
    }
}
