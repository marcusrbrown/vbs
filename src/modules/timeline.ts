import type {
  EraProgress,
  OverallProgress,
  ProgressTrackerInstance,
  StarTrekEra,
  StarTrekItem,
  TimelineRendererInstance,
} from './types.js'

export const createTimelineRenderer = (
  container: HTMLElement,
  progressTracker: ProgressTrackerInstance,
): TimelineRendererInstance => {
  // Closure variables for private state
  const expandedEras: Set<string> = new Set()

  const calculateEraProgress = (era: StarTrekEra): EraProgress => {
    const completedItems = era.items.filter(item => progressTracker.isWatched(item.id)).length
    const totalItems = era.items.length
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return {
      eraId: era.id,
      total: totalItems,
      completed: completedItems,
      percentage,
    }
  }

  const createItemElement = (item: StarTrekItem): string => {
    const isWatched = progressTracker.isWatched(item.id)
    const typeClass = `type-${item.type}`

    return `
      <div class="viewing-item ${typeClass} ${isWatched ? 'watched' : ''}" data-item-id="${item.id}"
           role="listitem" aria-labelledby="title-${item.id}">
        <div class="item-checkbox">
          <input type="checkbox"
                 id="${item.id}"
                 data-item-id="${item.id}"
                 aria-describedby="details-${item.id}"
                 aria-label="Mark ${item.title} as watched"
                 ${isWatched ? 'checked' : ''} />
          <label for="${item.id}" class="visually-hidden">Toggle watched status for ${item.title}</label>
        </div>
        <div class="item-content">
          <div class="item-header">
            <h3 class="item-title" id="title-${item.id}">${item.title}</h3>
            <span class="item-type ${item.type}" aria-label="Content type: ${item.type}">${item.type.toUpperCase()}</span>
          </div>
          <div class="item-details" id="details-${item.id}">
            <span class="item-year" aria-label="Release year">${item.year}</span>
            <span class="item-stardate" aria-label="Stardate information">Stardate: ${item.stardate}</span>
            ${item.episodes && item.episodes > 1 ? `<span class="item-episodes" aria-label="Episode count">${item.episodes} episodes</span>` : ''}
          </div>
          <div class="item-notes" aria-label="Additional notes">${item.notes}</div>
        </div>
      </div>
    `
  }

  const toggleEra = (eraId: string): void => {
    const eraElement = container.querySelector(`[data-era-id="${eraId}"]`) as HTMLElement
    if (!eraElement) return

    const content = eraElement.querySelector('.era-content') as HTMLElement
    const icon = eraElement.querySelector('.expand-icon')
    const header = eraElement.querySelector('.era-header') as HTMLElement

    if (expandedEras.has(eraId)) {
      expandedEras.delete(eraId)
      if (content) content.style.display = 'none'
      if (icon) icon.textContent = '▼'
      if (header) header.setAttribute('aria-expanded', 'false')
      eraElement.classList.remove('expanded')
    } else {
      expandedEras.add(eraId)
      if (content) content.style.display = 'block'
      if (icon) icon.textContent = '▲'
      if (header) header.setAttribute('aria-expanded', 'true')
      eraElement.classList.add('expanded')
    }
  }

  const createEraElement = (era: StarTrekEra): HTMLDivElement => {
    const eraDiv = document.createElement('div')
    eraDiv.className = 'era'
    eraDiv.dataset['eraId'] = era.id

    const eraProgress = calculateEraProgress(era)
    const isExpanded = expandedEras.has(era.id)

    eraDiv.innerHTML = `
      <div class="era-header" data-era-id="${era.id}" role="button"
           aria-expanded="${isExpanded}" aria-controls="content-${era.id}"
           aria-label="Toggle ${era.title} section" tabindex="0">
        <div class="era-title">
          <h2 id="era-title-${era.id}">${era.title}</h2>
          <span class="era-details" aria-label="Era time period">${era.years} • Stardates: ${era.stardates}</span>
        </div>
        <div class="era-progress" aria-labelledby="era-title-${era.id}">
          <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${eraProgress.total}"
               aria-valuenow="${eraProgress.completed}" aria-label="Era progress: ${eraProgress.completed} of ${eraProgress.total} items completed">
            <div class="progress-fill" style="width: ${eraProgress.percentage}%"></div>
          </div>
          <span class="progress-text" aria-live="polite">${eraProgress.completed}/${eraProgress.total}</span>
          <span class="expand-icon" aria-hidden="true">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      <div class="era-description" aria-describedby="era-title-${era.id}">${era.description}</div>
      <div class="era-content" id="content-${era.id}" role="list" aria-label="${era.title} viewing items"
           style="display: ${isExpanded ? 'block' : 'none'}">
        ${era.items.map(item => createItemElement(item)).join('')}
      </div>
    `

    // Add event listener for era toggle
    const header = eraDiv.querySelector('.era-header')
    if (header) {
      header.addEventListener('click', () => toggleEra(era.id))

      // Add keyboard support for era toggle
      header.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          e.preventDefault()
          toggleEra(era.id)
        }
      })
    }

    // Add event listeners for item checkboxes
    const checkboxes = eraDiv.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const target = e.target as HTMLInputElement
        if (target?.dataset['itemId']) {
          progressTracker.toggleItem(target.dataset['itemId'])
        }
      })
    })

    return eraDiv
  }

  const render = (data: StarTrekEra[]): void => {
    container.innerHTML = ''

    data.forEach(era => {
      const eraElement = createEraElement(era)
      container.append(eraElement)
    })
  }

  const expandAll = (): void => {
    const eras = container.querySelectorAll('.era')
    eras.forEach(era => {
      const eraElement = era as HTMLElement
      const eraId = eraElement.dataset['eraId']
      if (eraId) {
        expandedEras.add(eraId)

        const content = era.querySelector('.era-content') as HTMLElement
        const icon = era.querySelector('.expand-icon')

        if (content) content.style.display = 'block'
        if (icon) icon.textContent = '▲'
        era.classList.add('expanded')
      }
    })
  }

  const collapseAll = (): void => {
    const eras = container.querySelectorAll('.era')
    eras.forEach(era => {
      const eraElement = era as HTMLElement
      const eraId = eraElement.dataset['eraId']
      if (eraId) {
        expandedEras.delete(eraId)

        const content = era.querySelector('.era-content') as HTMLElement
        const icon = era.querySelector('.expand-icon')

        if (content) content.style.display = 'none'
        if (icon) icon.textContent = '▼'
        era.classList.remove('expanded')
      }
    })
  }

  const updateProgress = (progressData: OverallProgress): void => {
    // Update overall progress with ARIA attributes
    const overallProgressFill = document.querySelector('#overallProgress') as HTMLElement
    const overallProgressText = document.querySelector('#overallProgressText')
    const overallProgressBar = document.querySelector(
      '.progress-bar[role="progressbar"]',
    ) as HTMLElement

    if (overallProgressFill && overallProgressText) {
      overallProgressFill.style.width = `${progressData.overall.percentage}%`
      overallProgressText.textContent = `${progressData.overall.percentage}% Complete (${progressData.overall.completed}/${progressData.overall.total})`
    }

    if (overallProgressBar) {
      overallProgressBar.setAttribute('aria-valuenow', progressData.overall.completed.toString())
      overallProgressBar.setAttribute('aria-valuemax', progressData.overall.total.toString())
    }

    // Update era progress with ARIA attributes
    progressData.eraProgress.forEach(era => {
      const eraElement = container.querySelector(`[data-era-id="${era.eraId}"]`)
      if (eraElement) {
        const progressFill = eraElement.querySelector('.progress-fill') as HTMLElement
        const progressText = eraElement.querySelector('.progress-text')
        const progressBar = eraElement.querySelector('[role="progressbar"]') as HTMLElement

        if (progressFill && progressText) {
          progressFill.style.width = `${era.percentage}%`
          progressText.textContent = `${era.completed}/${era.total}`
        }

        if (progressBar) {
          progressBar.setAttribute('aria-valuenow', era.completed.toString())
          progressBar.setAttribute('aria-valuemax', era.total.toString())
        }
      }
    })
  }

  const updateItemStates = (): void => {
    const items = container.querySelectorAll('.viewing-item')
    items.forEach(item => {
      const itemElement = item as HTMLElement
      const itemId = itemElement.dataset['itemId']
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement

      if (itemId && checkbox) {
        const isWatched = progressTracker.isWatched(itemId)
        checkbox.checked = isWatched
        item.classList.toggle('watched', isWatched)
      }
    })
  }

  // Return public API
  return {
    render,
    createEraElement,
    createItemElement,
    toggleEra,
    expandAll,
    collapseAll,
    updateProgress,
    updateItemStates,
    calculateEraProgress,
  }
}
