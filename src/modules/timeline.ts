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
      <div class="viewing-item ${typeClass} ${isWatched ? 'watched' : ''}" data-item-id="${item.id}">
        <div class="item-checkbox">
          <input type="checkbox"
                 id="${item.id}"
                 data-item-id="${item.id}"
                 ${isWatched ? 'checked' : ''} />
          <label for="${item.id}"></label>
        </div>
        <div class="item-content">
          <div class="item-header">
            <h3 class="item-title">${item.title}</h3>
            <span class="item-type ${item.type}">${item.type.toUpperCase()}</span>
          </div>
          <div class="item-details">
            <span class="item-year">${item.year}</span>
            <span class="item-stardate">Stardate: ${item.stardate}</span>
            ${item.episodes && item.episodes > 1 ? `<span class="item-episodes">${item.episodes} episodes</span>` : ''}
          </div>
          <div class="item-notes">${item.notes}</div>
        </div>
      </div>
    `
  }

  const toggleEra = (eraId: string): void => {
    const eraElement = container.querySelector(`[data-era-id="${eraId}"]`) as HTMLElement
    if (!eraElement) return

    const content = eraElement.querySelector('.era-content') as HTMLElement
    const icon = eraElement.querySelector('.expand-icon')

    if (expandedEras.has(eraId)) {
      expandedEras.delete(eraId)
      if (content) content.style.display = 'none'
      if (icon) icon.textContent = '▼'
      eraElement.classList.remove('expanded')
    } else {
      expandedEras.add(eraId)
      if (content) content.style.display = 'block'
      if (icon) icon.textContent = '▲'
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
      <div class="era-header" data-era-id="${era.id}">
        <div class="era-title">
          <h2>${era.title}</h2>
          <span class="era-details">${era.years} • Stardates: ${era.stardates}</span>
        </div>
        <div class="era-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${eraProgress.percentage}%"></div>
          </div>
          <span class="progress-text">${eraProgress.completed}/${eraProgress.total}</span>
          <span class="expand-icon">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      <div class="era-description">${era.description}</div>
      <div class="era-content" style="display: ${isExpanded ? 'block' : 'none'}">
        ${era.items.map(item => createItemElement(item)).join('')}
      </div>
    `

    // Add event listener for era toggle
    const header = eraDiv.querySelector('.era-header')
    if (header) {
      header.addEventListener('click', () => toggleEra(era.id))
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
    // Update overall progress
    const overallProgressFill = document.querySelector('#overallProgress') as HTMLElement
    const overallProgressText = document.querySelector('#overallProgressText')

    if (overallProgressFill && overallProgressText) {
      overallProgressFill.style.width = `${progressData.overall.percentage}%`
      overallProgressText.textContent = `${progressData.overall.percentage}% Complete (${progressData.overall.completed}/${progressData.overall.total})`
    }

    // Update era progress
    progressData.eraProgress.forEach(era => {
      const eraElement = container.querySelector(`[data-era-id="${era.eraId}"]`)
      if (eraElement) {
        const progressFill = eraElement.querySelector('.progress-fill') as HTMLElement
        const progressText = eraElement.querySelector('.progress-text')

        if (progressFill && progressText) {
          progressFill.style.width = `${era.percentage}%`
          progressText.textContent = `${era.completed}/${era.total}`
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
