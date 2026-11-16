import { $ } from '../abprove/ui';
import { initProfile } from '../abprove/profile';
import { initAccounts } from './accounts';
import { initLogs } from './logs';
import { initReminders } from './reminders';

/** Admin pages read their own server-paginated endpoints; no assessment workspace is loaded. */
export function initAdmin(config) {
    if ($('[data-admin-accounts]')) initAccounts(config);
    if ($('[data-admin-logs]')) initLogs(config);
    if ($('[data-admin-reminders]')) initReminders(config);
    if ($('[data-local-form="profile"]'))
        initProfile({
            api: config.api,
            profile: {
                name: config.actor.nama,
                email: config.actor.email,
                phone: config.actor.phone,
                notification: config.actor.notification,
                hasPhoto: config.actor.hasPhoto,
            },
            actorEmail: config.actor.email,
            refresh: async () => location.reload(),
        });
}
