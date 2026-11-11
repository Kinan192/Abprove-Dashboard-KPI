<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestIdRequest;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function show(Request $r)
    {
        return response()->json(['data' => $r->user()]);
    }

    public function photo(Request $r)
    {
        $path = $r->user()->photo_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['X-Content-Type-Options' => 'nosniff']);
    }

    public function update(RequestIdRequest $r, MutationRunner $mutations, AuditWriter $audit)
    {
        $d = $r->validate(['request_id' => ['required', 'uuid'], 'name' => ['sometimes', 'string', 'max:160'], 'email' => ['sometimes', 'email', 'max:190'], 'phone' => ['sometimes', 'nullable', 'string', 'max:32'], 'email_notifications' => ['sometimes', 'boolean'],
            'current_password' => ['required_with:password', 'string'], 'password' => ['sometimes', 'string', 'confirmed', Password::min(12)->letters()->numbers()], 'password_confirmation' => ['required_with:password', 'string'],
            'photo' => ['sometimes', 'file', 'image', 'mimetypes:image/png,image/jpeg,image/webp', 'max:2048'], 'role_key' => ['prohibited'], 'is_active' => ['prohibited']]);
        $file = $r->file('photo');
        unset($d['photo']);
        if ($file) {
            $d['photo_hash'] = hash_file('sha256', $file->getRealPath());
            $d['photo_extension'] = $file->extension();
        }
        $written = null;
        try {
            return response()->json($mutations->run($r, $d, 'profile.update', fn ($c) => null, function ($ctx) use ($d, $file, $audit, &$written) {
                $u = User::whereKey($ctx->userId)->lockForUpdate()->firstOrFail();
                $before = $u->toArray();
                if (isset($d['email'])) {
                    Validator::make($d, ['email' => [Rule::unique('users', 'email')->ignore($u->id), Rule::unique('users', 'login_nip')->ignore($u->id)]])->validate();
                    if (DB::table('users')->where('email', $d['email'])->orWhere('login_nip', $d['email'])->lockForUpdate()->get()->contains(fn ($x) => $x->id != $u->id)) {
                        abort(422, 'Identitas login sudah dipakai.');
                    }
                }
                if (isset($d['password']) && ! Hash::check($d['current_password'], $u->password)) {
                    abort(422, 'Kata sandi saat ini tidak sesuai.');
                }
                foreach (['name', 'email', 'phone', 'email_notifications', 'password'] as $key) {
                    if (array_key_exists($key, $d)) {
                        $u->$key = $d[$key];
                    }
                }
                if ($file) {
                    $old = $u->photo_path;
                    $written = $file->storeAs('avatars/'.$u->id, $d['request_id'].'.'.$file->extension(), 'local');
                    $u->photo_path = $written;
                    if ($old && $old !== $written) {
                        DB::afterCommit(fn () => Storage::disk('local')->delete($old));
                    }
                }
                $u->save();
                $after = $u->fresh()->toArray();
                $audit->record($ctx, 'user', $u->id, 'profile.updated', $before, $after);

                return $after;
            }));
        } catch (\Throwable $e) {
            if ($written) {
                Storage::disk('local')->delete($written);
            }throw $e;
        }
    }
}
