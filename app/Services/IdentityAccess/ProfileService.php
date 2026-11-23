<?php

namespace App\Services\IdentityAccess;

use App\Models\User;
use App\Services\Audit\AuditWriter;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

/** Self-service profile update of the signed-in account. */
class ProfileService
{
    private const FIELDS = ['name', 'email', 'phone', 'email_notifications', 'password'];

    public function __construct(private MutationRunner $mutations, private AuditWriter $audit) {}

    /**
     * Applies the validated `$data` (see ProfileUpdateRequest::payload) in one idempotent mutation. A new photo
     * replaces the old one only after commit; when anything fails the newly stored photo is removed again.
     */
    public function update(Request $request, array $data, ?UploadedFile $photo): array
    {
        $written = null;
        try {
            return $this->mutations->run($request, $data, 'profile.update', fn () => null, function (AccessContext $ctx) use ($data, $photo, &$written) {
                $user = User::whereKey($ctx->userId)->lockForUpdate()->firstOrFail();
                $before = $user->toArray();
                if (isset($data['email'])) {
                    $this->assertLoginFree($user, $data['email']);
                }
                if (isset($data['password']) && ! Hash::check($data['current_password'], $user->password)) {
                    abort(422, 'Kata sandi saat ini tidak sesuai.');
                }
                foreach (self::FIELDS as $key) {
                    if (array_key_exists($key, $data)) {
                        $user->$key = $data[$key];
                    }
                }
                if ($photo) {
                    $old = $user->photo_path;
                    $written = $photo->storeAs('avatars/'.$user->id, $data['request_id'].'.'.$photo->extension(), 'local');
                    $user->photo_path = $written;
                    if ($old && $old !== $written) {
                        DB::afterCommit(fn () => Storage::disk('local')->delete($old));
                    }
                }
                $user->save();
                $after = $user->fresh()->toArray();
                $this->audit->record($ctx, 'user', $user->id, 'profile.updated', $before, $after);

                return $after;
            });
        } catch (Throwable $e) {
            if ($written) {
                Storage::disk('local')->delete($written);
            }
            throw $e;
        }
    }

    /** The email is the login identity: it may not match another account's email or login NIP (checked under lock). */
    private function assertLoginFree(User $user, string $email): void
    {
        Validator::make(['email' => $email], ['email' => [Rule::unique('users', 'email')->ignore($user->id), Rule::unique('users', 'login_nip')->ignore($user->id)]])->validate();
        $holders = DB::table('users')->where('email', $email)->orWhere('login_nip', $email)->lockForUpdate()->get();
        if ($holders->contains(fn ($row) => $row->id != $user->id)) {
            abort(422, 'Identitas login sudah dipakai.');
        }
    }
}
