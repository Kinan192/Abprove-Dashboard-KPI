<?php

namespace Tests\Feature\Frontend;

use Tests\Support\BackendTestCase;

class DashboardNavigationTest extends BackendTestCase
{
    public function test_authenticated_landing_is_the_role_dashboard_with_no_home_menu(): void
    {
        foreach ([['ku1', 'unit', 'kpi'], ['kd1', 'division', 'unit'], ['hc', 'hc', 'completion']] as [$account, $prefix, $chart]) {
            $response = $this->asRole($account)->get('/'.$prefix.'/dashboard')->assertOk();
            $response->assertSee('data-page="dashboard"', false)
                ->assertSee('data-chart-kind="'.$chart.'"', false)
                ->assertDontSee('>Beranda<', false)
                ->assertDontSee('data-reference-ring', false);
            preg_match('/id="kpi-config"[^>]*>(.*?)<\/script>/s', $response->getContent(), $matches);
            $config = json_decode($matches[1], true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame('dashboard', array_key_first($config['links']));
            $this->assertArrayNotHasKey('beranda', $config['links']);
            $this->assertStringContainsString('/'.$prefix.'/dashboard', $config['links']['dashboard']);
        }
    }

    public function test_old_review_bookmarks_keep_the_selected_month_when_redirected(): void
    {
        foreach (['ku', 'kd', 'hc'] as $role) {
            $this->get('/design-review/'.$role.'/beranda?cycle=2026-10')
                ->assertRedirect('/design-review/'.$role.'/dashboard?cycle=2026-10');
        }
    }

    public function test_existing_analytics_urls_keep_the_detailed_report_accessible(): void
    {
        foreach ([['kd1', 'division'], ['hc', 'hc']] as [$account, $prefix]) {
            $this->asRole($account)->get('/'.$prefix.'/analytics')->assertOk()
                ->assertSee('data-page="dashboard"', false)
                ->assertSee('data-reference-layout="report"', false)
                ->assertSee('Kembali ke Dashboard');
        }
    }

    public function test_detailed_reports_remain_available_without_crowding_the_dashboard(): void
    {
        foreach ([['kd1', 'division'], ['hc', 'hc']] as [$account, $prefix]) {
            $this->asRole($account)->get('/'.$prefix.'/dashboard?detail=laporan')->assertOk()
                ->assertSee('data-staff-scores', false)
                ->assertSee('data-staff-score-order', false)
                ->assertSee('data-ranking-v4', false)
                ->assertDontSee('data-role-dashboard', false);
        }
    }
}
