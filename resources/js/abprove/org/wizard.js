import { $, $$, error } from '../flow-dom';

/**
 * Four-step dialog (Pilih → Tujuan → Dampak → Konfirmasi) around a form with [data-wizard-panel]
 * sections and footer buttons. `steps[n].enter()` runs when step n is shown; `steps[n].leave()`
 * may be async and throws to stay on the step with its message. Enter in a field moves forward
 * instead of submitting early.
 */
export function createWizard(dialog, form, steps) {
    const back = $('[data-wizard-back]', dialog),
        next = $('[data-wizard-next]', dialog),
        submit = $('[data-wizard-submit]', dialog),
        last = $$('[data-wizard-panel]', form).length;
    let step = 1,
        blocked = false;
    function show(n) {
        step = n;
        blocked = false;
        next.disabled = false;
        $$('[data-wizard-panel]', form).forEach(
            (panel) => (panel.hidden = +panel.dataset.wizardPanel !== n),
        );
        $$('[data-wizard-step]', form).forEach((item) => {
            const k = +item.dataset.wizardStep;
            item.dataset.state = k < n ? 'done' : k === n ? 'current' : 'todo';
            if (k === n) item.setAttribute('aria-current', 'step');
            else item.removeAttribute('aria-current');
        });
        back.hidden = n === 1;
        next.hidden = n === last;
        submit.hidden = n !== last;
        steps[n]?.enter?.();
    }
    function clearError() {
        const box = $('[data-form-error]', form);
        if (box) box.hidden = true;
    }
    async function forward() {
        if (next.disabled || step === last) return;
        clearError();
        next.disabled = true;
        try {
            await steps[step]?.leave?.();
            show(step + 1);
        } catch (e) {
            if (e.name !== 'AbortError') error(form, e.message);
        } finally {
            next.disabled = blocked;
        }
    }
    back.addEventListener('click', () => {
        clearError();
        show(Math.max(1, step - 1));
    });
    next.addEventListener('click', forward);
    form.addEventListener('submit', (event) => {
        if (step === last) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        forward();
    });
    return {
        start() {
            clearError();
            show(1);
        },
        show,
        get step() {
            return step;
        },
        /** Disables "Lanjut" on the current step until it is shown again. */
        block(value = true) {
            blocked = value;
            next.disabled = value;
        },
    };
}
