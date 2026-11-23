<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\ProfileUpdateRequest;
use App\Services\IdentityAccess\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $r): JsonResponse
    {
        return response()->json(['data' => $r->user()]);
    }

    public function photo(Request $r)
    {
        $path = $r->user()->photo_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['X-Content-Type-Options' => 'nosniff']);
    }

    public function update(ProfileUpdateRequest $r, ProfileService $profile): JsonResponse
    {
        return response()->json($profile->update($r, $r->payload(), $r->file('photo')));
    }
}
