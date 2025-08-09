import type {EventMap} from '../modules/types.js'
import {createEventEmitter, type EventEmitterInstance} from '../modules/events.js'

interface MigrationProgressEvents extends EventMap {
  'migration-started': {step: string; progress: number}
  'migration-progress': {step: string; progress: number; message?: string}
  'migration-completed': {success: boolean; message?: string}
  'migration-cancelled': Record<string, never>
}

export interface MigrationProgressInstance {
  show(): void
  hide(): void
  updateProgress(step: string, progress: number, message?: string): void
  showError(message: string): void
  showSuccess(message: string): void
  cancel(): void
  on: EventEmitterInstance<MigrationProgressEvents>['on']
  off: EventEmitterInstance<MigrationProgressEvents>['off']
  once: EventEmitterInstance<MigrationProgressEvents>['once']
}

/**
 * Factory function for creating migration progress UI component.
 * Provides user feedback during LocalStorage to IndexedDB migration.
 */
export const createMigrationProgress = (): MigrationProgressInstance => {
  const eventEmitter = createEventEmitter<MigrationProgressEvents>()

  let progressModal: HTMLElement | null = null
  let progressBar: HTMLElement | null = null
  let progressText: HTMLElement | null = null
  let cancelButton: HTMLElement | null = null
  let isVisible = false
  let isCancellable = true

  /**
   * Create the migration progress modal DOM structure.
   */
  const createProgressModal = (): HTMLElement => {
    const modal = document.createElement('div')
    modal.className = 'migration-progress-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-labelledby', 'migration-title')
    modal.setAttribute('aria-describedby', 'migration-description')

    modal.innerHTML = `
      <div class="migration-progress-overlay">
        <div class="migration-progress-card">
          <div class="migration-progress-header">
            <h2 id="migration-title">Upgrading Your Data</h2>
            <p id="migration-description">
              We're migrating your viewing progress to an improved storage system.
              This will only take a moment and will enhance your VBS experience.
            </p>
          </div>

          <div class="migration-progress-body">
            <div class="migration-progress-bar-container">
              <div class="migration-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="migration-progress-fill"></div>
              </div>
            </div>

            <p class="migration-progress-text">Preparing migration...</p>

            <div class="migration-progress-steps">
              <div class="migration-step" data-step="backup">
                <span class="migration-step-icon">⏳</span>
                <span class="migration-step-label">Creating backup</span>
              </div>
              <div class="migration-step" data-step="validate">
                <span class="migration-step-icon">⏳</span>
                <span class="migration-step-label">Validating data</span>
              </div>
              <div class="migration-step" data-step="migrate">
                <span class="migration-step-icon">⏳</span>
                <span class="migration-step-label">Migrating progress</span>
              </div>
              <div class="migration-step" data-step="verify">
                <span class="migration-step-icon">⏳</span>
                <span class="migration-step-label">Verifying migration</span>
              </div>
            </div>
          </div>

          <div class="migration-progress-footer">
            <button class="migration-cancel-button" type="button">
              Cancel Migration
            </button>
            <p class="migration-progress-note">
              Your existing data will remain safe during this process.
            </p>
          </div>
        </div>
      </div>
    `

    // Add CSS styles
    const style = document.createElement('style')
    style.textContent = `
      .migration-progress-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: none;
      }

      .migration-progress-modal.visible {
        display: flex;
      }

      .migration-progress-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .migration-progress-card {
        background: var(--color-background, #ffffff);
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 100%;
        padding: 2rem;
        color: var(--color-text, #000000);
      }

      .migration-progress-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-primary, #1e40af);
      }

      .migration-progress-header p {
        margin: 0 0 1.5rem 0;
        color: var(--color-text-secondary, #6b7280);
        line-height: 1.5;
      }

      .migration-progress-bar-container {
        margin-bottom: 1rem;
      }

      .migration-progress-bar {
        width: 100%;
        height: 8px;
        background: var(--color-surface, #f3f4f6);
        border-radius: 4px;
        overflow: hidden;
      }

      .migration-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary, #1e40af), var(--color-accent, #3b82f6));
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease;
      }

      .migration-progress-text {
        margin: 0 0 1.5rem 0;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6b7280);
        text-align: center;
      }

      .migration-progress-steps {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .migration-step {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
      }

      .migration-step-icon {
        font-size: 1rem;
        width: 1.5rem;
        text-align: center;
      }

      .migration-step-label {
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6b7280);
      }

      .migration-step.active .migration-step-icon {
        animation: spin 1s linear infinite;
      }

      .migration-step.completed .migration-step-icon {
        animation: none;
      }

      .migration-step.completed .migration-step-label {
        color: var(--color-success, #059669);
      }

      .migration-progress-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .migration-cancel-button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--color-border, #d1d5db);
        border-radius: 0.375rem;
        background: var(--color-surface, #ffffff);
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .migration-cancel-button:hover {
        background: var(--color-surface-hover, #f9fafb);
        border-color: var(--color-border-hover, #9ca3af);
      }

      .migration-cancel-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .migration-progress-note {
        margin: 0;
        font-size: 0.75rem;
        color: var(--color-text-muted, #9ca3af);
        text-align: center;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @media (max-width: 640px) {
        .migration-progress-card {
          padding: 1.5rem;
          margin: 1rem;
        }

        .migration-progress-header h2 {
          font-size: 1.25rem;
        }
      }
    `

    document.head.append(style)
    document.body.append(modal)

    return modal
  }

  /**
   * Update step visual indicators.
   */
  const updateStepIndicators = (currentStep: string): void => {
    if (!progressModal) return

    const steps = progressModal.querySelectorAll('.migration-step')
    const stepOrder = ['backup', 'validate', 'migrate', 'verify']
    const currentIndex = stepOrder.indexOf(currentStep)

    steps.forEach((step, index) => {
      const stepElement = step as HTMLElement
      const icon = step.querySelector('.migration-step-icon')

      if (index < currentIndex) {
        // Completed step
        stepElement.classList.remove('active')
        stepElement.classList.add('completed')
        if (icon) icon.textContent = '✅'
      } else if (index === currentIndex) {
        // Active step
        stepElement.classList.add('active')
        stepElement.classList.remove('completed')
        if (icon) icon.textContent = '⏳'
      } else {
        // Future step
        stepElement.classList.remove('active', 'completed')
        if (icon) icon.textContent = '⏳'
      }
    })
  }

  /**
   * Hide the migration progress modal.
   */
  const hide = (): void => {
    if (!isVisible || !progressModal) return

    progressModal.classList.remove('visible')
    isVisible = false

    // Restore focus to document body
    document.body.focus()
  }

  /**
   * Handle cancel button click.
   */
  const handleCancel = (): void => {
    if (!isCancellable) return

    eventEmitter.emit('migration-cancelled', {})
    hide()
  }

  /**
   * Initialize DOM elements and event listeners.
   */
  const initializeElements = (): void => {
    if (!progressModal) {
      progressModal = createProgressModal()
    }

    progressBar = progressModal.querySelector('.migration-progress-fill')
    progressText = progressModal.querySelector('.migration-progress-text')
    cancelButton = progressModal.querySelector('.migration-cancel-button')

    if (cancelButton) {
      cancelButton.addEventListener('click', handleCancel)
    }
  }

  /**
   * Show the migration progress modal.
   */
  const show = (): void => {
    if (isVisible) return

    initializeElements()

    if (progressModal) {
      progressModal.classList.add('visible')
      isVisible = true

      // Focus management for accessibility
      const firstFocusable = progressModal.querySelector('button') as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
  }

  /**
   * Update migration progress with step information.
   */
  const updateProgress = (step: string, progress: number, message?: string): void => {
    if (!isVisible) show()

    eventEmitter.emit('migration-progress', {
      step,
      progress,
      ...(message !== undefined && {message}),
    })

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`
      progressBar.parentElement?.setAttribute('aria-valuenow', progress.toString())
    }

    // Update progress text
    if (progressText) {
      progressText.textContent = message || `${step} (${Math.round(progress)}%)`
    }

    // Update step indicators
    updateStepIndicators(step)

    // Disable cancel during critical phases
    if (step === 'migrate' || step === 'verify') {
      isCancellable = false
      if (cancelButton) {
        ;(cancelButton as HTMLButtonElement).disabled = true
      }
    }
  }

  /**
   * Show error state with message.
   */
  const showError = (message: string): void => {
    if (progressText) {
      progressText.textContent = `❌ Error: ${message}`
      progressText.style.color = 'var(--color-error, #dc2626)'
    }

    if (cancelButton) {
      ;(cancelButton as HTMLButtonElement).textContent = 'Close'
      ;(cancelButton as HTMLButtonElement).disabled = false
    }

    isCancellable = true
  }

  /**
   * Show success state with message.
   */
  const showSuccess = (message: string): void => {
    eventEmitter.emit('migration-completed', {success: true, message})

    if (progressText) {
      progressText.textContent = `✅ ${message}`
      progressText.style.color = 'var(--color-success, #059669)'
    }

    // Update all steps to completed
    const steps = ['backup', 'validate', 'migrate', 'verify']
    steps.forEach(step => updateStepIndicators(step))

    if (progressBar) {
      progressBar.style.width = '100%'
    }

    if (cancelButton) {
      ;(cancelButton as HTMLButtonElement).textContent = 'Continue'
      ;(cancelButton as HTMLButtonElement).disabled = false
    }

    // Auto-hide after 3 seconds
    setTimeout(() => {
      hide()
    }, 3000)
  }

  /**
   * Cancel the migration process.
   */
  const cancel = (): void => {
    handleCancel()
  }

  return {
    show,
    hide,
    updateProgress,
    showError,
    showSuccess,
    cancel,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
