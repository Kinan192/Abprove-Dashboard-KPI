<?php

namespace Tests\Feature\Frontend;

use App\Http\Controllers\WorkspaceController;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class ApiEfficiencyTest extends BackendTestCase
{
    private function syncHeaders(string $page = 'nilai'): array
    {
        return ['X-KPI-Workspace' => $page, 'X-KPI-Cycle' => '2026-11'];
    }

    public function test_initial_workspace_can_include_the_same_scoped_report(): void
    {
        $assessment = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment['id'].'/approve', $this->key(['lock_version' => $assessment['lock_version']]))->assertOk();
        $expected = $this->asRole('hc')->getJson('/hc/data/insights?cycle_id='.$this->ids['cycle'])->assertOk()->json('data');
        $response = $this->getJson('/hc/data/workspace?compact=1&page=dashboard&include_insights=1')->assertOk();
        $this->assertSame($expected, $response->json('insights'));
        $this->asRole('ku2')->getJson('/unit/data/workspace?compact=1&page=riwayat&include_insights=1')
            ->assertOk()->assertJsonPath('insights.metrics.final', 0)->assertJsonCount(1, 'insights.unit_status');
    }

    public function test_assessment_write_returns_only_the_changed_assessment_and_notifications(): void
    {
        $key = 'EMP-'.$this->ids['member1'].'|2026-11';
        $response = $this->asRole('ku1')->withHeaders($this->syncHeaders())->postJson('/unit/assessments', $this->payload())->assertOk();
        $id = $response->json('data.id');
        $response->assertJsonCount(1, 'workspace.data.assessments')
            ->assertJsonPath('workspace.data.assessments.'.$key.'.status', 'Diajukan')
            ->assertJsonPath('workspace.assessmentIds.0', $id)
            ->assertJsonMissingPath('workspace.data.staff')
            ->assertJsonMissingPath('workspace.data.accounts')
            ->assertJsonMissingPath('workspace.data.kpis');

        $this->asRole('kd1')->withHeaders($this->syncHeaders('persetujuan'))
            ->postJson('/division/assessments/'.$id.'/return', $this->key(['lock_version' => 0, 'reason' => 'Perbaiki bukti indikator.']))
            ->assertOk()->assertJsonPath('workspace.data.assessments.'.$key.'.status', 'Dikembalikan');
    }

    public function test_replay_returns_fresh_read_data_without_repeating_the_write(): void
    {
        $payload = $this->payload();
        $first = $this->asRole('ku1')->withHeaders($this->syncHeaders())->postJson('/unit/assessments', $payload)->assertOk();
        $id = $first->json('data.id');
        $this->asRole('kd1')->postJson('/division/assessments/'.$id.'/return', $this->key(['lock_version' => 0, 'reason' => 'Lengkapi bukti.']))->assertOk();
        $auditCount = DB::table('audit_events')->count();
        $key = 'EMP-'.$this->ids['member1'].'|2026-11';
        $this->asRole('ku1')->postJson('/unit/assessments', $payload)->assertOk()
            ->assertJsonPath('replayed', true)
            ->assertJsonPath('workspace.data.assessments.'.$key.'.status', 'Dikembalikan');
        $this->assertSame($auditCount, DB::table('audit_events')->count());
        $this->assertDatabaseCount('assessments', 1);
    }

    public function test_withdrawal_marks_the_removed_assessment_in_the_workspace_update(): void
    {
        $assessment = $this->submitted();
        $this->asRole('ku1')->withHeaders($this->syncHeaders('pengajuan'))
            ->postJson('/unit/assessments/'.$assessment['id'].'/withdraw', $this->key(['lock_version' => $assessment['lock_version']]))
            ->assertOk()->assertJsonPath('data.deleted', true)
            ->assertJsonPath('workspace.assessmentIds.0', $assessment['id'])
            ->assertJsonCount(0, 'workspace.data.assessments');
    }

    public function test_profile_update_contains_fresh_profile_without_assessment_history(): void
    {
        $this->asRole('ku1')->withHeaders($this->syncHeaders('profil'))->postJson('/unit/profile', $this->key(['name' => 'Nama profil diperbarui']))->assertOk()
            ->assertJsonPath('workspace.data.profiles.'.$this->users['ku1']->id.'.name', 'Nama profil diperbarui')
            ->assertJsonMissingPath('workspace.data.assessments')
            ->assertJsonMissingPath('workspace.data.staff');
    }

    public function test_partial_reads_cannot_expand_the_assessment_scope(): void
    {
        $assessment = $this->submitted('ku2', 'member2');
        $this->asRole('ku1')->getJson('/unit/data/workspace?compact=1&only[]=assessments&only[]=assessmentTemplates&assessment_ids[]='.$assessment['id'])
            ->assertOk()->assertJsonCount(0, 'data.assessments')->assertJsonCount(0, 'data.assessmentTemplates')->assertJsonMissingPath('data.accounts');
        $this->getJson('/unit/data/workspace?only[]=password')->assertUnprocessable();
    }

    public function test_json_compression_preserves_content_and_honors_negotiation(): void
    {
        $plain = $this->asRole('hc')->getJson('/hc/data/workspace?compact=1')->assertOk()->getContent();
        $compressed = $this->withHeader('Accept-Encoding', 'gzip')->getJson('/hc/data/workspace?compact=1')->assertOk()->assertHeader('Content-Encoding', 'gzip');
        $this->assertSame($plain, gzdecode($compressed->getContent()));
        $this->assertLessThan(strlen($plain), strlen($compressed->getContent()));
        $this->withHeader('Accept-Encoding', 'gzip;q=0, identity')->getJson('/hc/data/workspace?compact=1')->assertOk()->assertHeaderMissing('Content-Encoding');
    }

    public function test_import_preview_does_not_trigger_a_workspace_update(): void
    {
        $file = UploadedFile::fake()->createWithContent('kpi.csv', "pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nMutu,Indikator uji,,,,95%,100\n");
        $this->asRole('hc')->withHeaders($this->syncHeaders('impor'))->postJson('/hc/kpi-templates/import-preview', ['file' => $file])
            ->assertOk()->assertJsonPath('data.valid', true)->assertJsonMissingPath('workspace');
        $this->assertDatabaseCount('operation_requests', 0);
    }

    public function test_failed_read_update_preserves_the_successful_mutation_for_safe_refresh(): void
    {
        $this->mock(WorkspaceController::class, function ($mock) {
            $mock->shouldReceive('show')->once()->andThrow(new \RuntimeException('Read model unavailable'));
        });
        $this->asRole('ku1')->withHeaders($this->syncHeaders())->postJson('/unit/assessments', $this->payload())->assertOk()
            ->assertJsonPath('workspace_refresh_required', true)->assertJsonMissingPath('workspace');
        $this->assertDatabaseCount('assessments', 1);
        $this->assertDatabaseCount('operation_requests', 1);
    }

    public function test_authenticated_html_is_revalidated_and_private_api_data_is_not_stored(): void
    {
        $assessment = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment['id'].'/approve', $this->key(['lock_version' => $assessment['lock_version']]))->assertOk();
        $page = $this->asRole('hc')->get('/hc/dashboard')->assertOk()->assertSee('1 penilaian sudah Final oleh Kepala Divisi.');
        $this->assertStringContainsString('private', $page->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-cache', $page->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('no-store', $page->headers->get('Cache-Control'));
        $api = $this->getJson('/hc/data/workspace?compact=1&page=beranda')->assertOk();
        $this->assertStringContainsString('no-store', $api->headers->get('Cache-Control'));
    }

    public function test_html_compression_preserves_the_rendered_dashboard(): void
    {
        $plain = $this->asRole('hc')->get('/hc/dashboard')->assertOk()->getContent();
        $encoded = $this->withHeader('Accept-Encoding', 'gzip')->get('/hc/dashboard')->assertOk()->assertHeader('Content-Encoding', 'gzip');
        $this->assertSame($plain, gzdecode($encoded->getContent()));
        $this->assertLessThan(strlen($plain), strlen($encoded->getContent()));
    }
}
