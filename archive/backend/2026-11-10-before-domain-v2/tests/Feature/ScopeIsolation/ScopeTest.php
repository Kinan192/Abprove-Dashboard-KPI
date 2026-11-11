<?php

namespace Tests\Feature\ScopeIsolation;

use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class ScopeTest extends BackendTestCase
{
    public function test_member_lists_counts_and_details_are_scoped_before_queries(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $this->asRole('ku1')->getJson('/unit/members')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.full_name', 'member1');
        $this->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
        $this->getJson('/unit/assessments/'.$a['id'].'/timeline')->assertNotFound();
        $this->asRole('kd1')->getJson('/division/assessments')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/division/dashboard?cycle_id='.$this->ids['cycle'])->assertOk()->assertJsonPath('data.members', 1)->assertJsonPath('data.unit_heads', 1);
        $this->getJson('/division/team')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.head_name', 'ku1');
        $this->getJson('/division/members?unit_id='.$this->ids['u2'])->assertOk()->assertJsonPath('total', 0);
        $this->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertNotFound();
    }

    public function test_hc_has_no_scoring_or_approval_endpoint_and_unit_cannot_score_its_head(): void
    {
        $this->asRole('ku1')->postJson('/unit/assessments', $this->key(['employee_id' => $this->ids['head1'], 'cycle_id' => $this->ids['cycle']]))->assertNotFound();
        $this->asRole('kd1')->postJson('/division/assessments', $this->key(['employee_id' => $this->ids['head2'], 'cycle_id' => $this->ids['cycle']]))->assertNotFound();
        $a = $this->submitted();
        $this->asRole('hc')->patchJson('/hc/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => 0]))->assertNotFound();
        $this->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertForbidden();
        $this->asRole('ku1')->getJson('/hc/organization/users')->assertForbidden();
    }

    public function test_old_head_history_is_not_automatically_exposed_to_new_head(): void
    {
        $a = $this->submitted();
        DB::table('scope_assignments')->where('user_id', $this->users['kd1']->id)->update(['assigned_at' => now()->addSecond()]);
        $this->travel(2)->seconds();
        $this->asRole('kd1')->getJson('/division/assessments/'.$a['id'])->assertNotFound();
        $this->asRole('hc')->getJson('/hc/assessments/'.$a['id'])->assertOk();
    }

    public function test_foreign_item_rejected_and_request_cannot_assign_server_fields(): void
    {
        $a = $this->startAssessment();
        $b = $this->startAssessment('ku2', 'member2');
        $this->asRole('ku1')->patchJson('/unit/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => 0, 'scores' => [['id' => $b['items'][0]['id'], 'score' => 100]]]))->assertUnprocessable();
        $this->patchJson('/unit/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => 0, 'status' => 'final', 'total_score_raw' => 100, 'division_id' => $this->ids['d2']]))->assertOk()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.total_score_raw', null);
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'division_id' => $this->ids['d1']]);
    }
}
