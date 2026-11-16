import { $ } from './flow-dom';
import { initStructure } from './org/structure';
import { initActivity } from './org/activity';

/** Super HC organization pages: master data with head/staff mutation wizards, and the activity history. */
export function initOrganization(c, s) {
    if ($('[data-flow-organization]')) initStructure(c, s);
    if ($('[data-activity-root]')) initActivity(s);
}
