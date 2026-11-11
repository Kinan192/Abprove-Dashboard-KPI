<?php

namespace Tests\Feature\Assessment;

use App\Services\Audit\AuditWriter;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\BackendTestCase;

class IntegrityTest extends BackendTestCase
{
    public static function boundaries(): array
    {
        return [[10, 'kurang'], [70, 'cukup'], [80, 'baik'], [90, 'sangat_baik'], [100, 'sangat_baik']];
    }

    #[DataProvider('boundaries')]
    public function test_category_boundaries_use_raw_scores(int $score, string $category): void
    {
        $a = $this->startAssessment();
        $scores = array_map(fn ($item) => ['id' => $item['id'], 'score' => $score], $a['items']);
        $a = $this->asRole('ku1')->patchJson('/unit/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => 0, 'scores' => $scores]))->assertOk()->json('data');
        $a = $this->postJson('/unit/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->json('data');
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->assertJsonPath('data.category_code_snapshot', $category)->assertJsonPath('data.total_score_raw', $score.'.000000');
    }

    public function test_database_trigger_protects_final_even_from_query_builder(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        foreach (['header', 'item', 'delete'] as $operation) {
            try {
                match ($operation) {
                    'header' => DB::table('assessments')->where('id', $a['id'])->update(['positive_finding' => 'tamper']),
                    'item' => DB::table('assessment_items')->where('id', $a['items'][0]['id'])->update(['score' => 10]),
                    'delete' => DB::table('assessment_items')->where('id', $a['items'][0]['id'])->delete(),
                };
                $this->fail('Trigger must reject '.$operation);
            } catch (QueryException $e) {
                $this->assertStringContainsString('FINAL_IMMUTABLE', $e->getMessage());
            }
        }
        $this->assertDatabaseHas('assessment_items', ['id' => $a['items'][0]['id'], 'score' => 90]);
    }

    public function test_audit_failure_rolls_back_score_version_and_request_receipt(): void
    {
        $a = $this->startAssessment();
        $this->mock(AuditWriter::class)->shouldReceive('record')->once()->andThrow(new \RuntimeException('Simulated audit failure'));
        $body = $this->key(['lock_version' => 0, 'scores' => [['id' => $a['items'][0]['id'], 'score' => 100]]]);
        $this->asRole('ku1')->patchJson('/unit/assessments/'.$a['id'].'/draft', $body)->assertStatus(500);
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'lock_version' => 0]);
        $this->assertDatabaseHas('assessment_items', ['id' => $a['items'][0]['id'], 'score' => null]);
        $this->assertDatabaseCount('audit_events', 1);
        $this->assertDatabaseMissing('operation_requests', ['request_id' => $body['request_id']]);
    }

    public function test_retry_is_not_an_authorization_bypass_after_revocation(): void
    {
        $a = $this->startAssessment();
        $body = $this->key(['lock_version' => 0, 'positive_finding' => 'Catatan']);
        $url = '/unit/assessments/'.$a['id'].'/draft';
        $this->asRole('ku1')->patchJson($url, $body)->assertOk();
        DB::table('scope_assignments')->where('user_id', $this->users['ku1']->id)->update(['revoked_at' => now()]);
        $this->patchJson($url, $body)->assertForbidden();
    }

    public function test_report_tsv_is_scoped_and_neutralizes_spreadsheet_formulas(): void
    {
        DB::table('employees')->where('id', $this->ids['member1'])->update(['full_name' => '=HYPERLINK("example")']);
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $response = $this->asRole('hc')->get('/hc/recap?cycle_id='.$this->ids['cycle'].'&format=tsv')->assertOk();
        $contents = $response->streamedContent();
        $this->assertStringContainsString("'=HYPERLINK", $contents);
        $this->assertStringContainsString('82.750000', $contents);
        $this->asRole('ku2')->getJson('/unit/recap?cycle_id='.$this->ids['cycle'])->assertOk()->assertJsonPath('total', 0);
        $this->asRole('hc')->getJson('/hc/audit?subject_type=assessment&subject_id='.$a['id'])->assertOk()->assertJsonPath('total', 4)->assertJsonStructure(['data' => [['after_data' => ['status']]]]);
    }
}
