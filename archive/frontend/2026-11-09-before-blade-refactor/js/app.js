import Alpine from 'alpinejs';
import { uiStore, shell, loginPage } from './lib/ui';
import {
    dashboardPage,
    submissionsPage,
    analyticsPage,
    teamPage,
    notificationsPage,
    chartData,
    drawTrend,
    number,
    shortMonth,
} from './pages/reporting';
import { assessmentPage } from './pages/assessment';
import { recordsPage, organizationPage } from './pages/organization';
import { templatesPage, settingsPage } from './pages/master';

const config = JSON.parse(
    document.getElementById('kpi-config')?.textContent || 'null',
);
if (config) Alpine.store('ui', uiStore(config));
Object.entries({
    shell,
    loginPage,
    dashboardPage,
    submissionsPage,
    assessmentPage,
    analyticsPage,
    teamPage,
    recordsPage,
    organizationPage,
    templatesPage,
    settingsPage,
    notificationsPage,
}).forEach(([name, component]) => Alpine.data(name, component));
Alpine.magic('number', () => number);
Alpine.magic('shortMonth', () => shortMonth);
Alpine.magic('chart', () => chartData);
Alpine.magic('drawTrend', () => drawTrend);
window.Alpine = Alpine;
Alpine.start();
