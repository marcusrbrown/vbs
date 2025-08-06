import type {
  Episode,
  EraProgress,
  OverallProgress,
  ProgressTrackerInstance,
  StarTrekEra,
  StarTrekItem,
  TimelineRendererInstance,
} from './types.js'
import {curry, pipe, tap} from '../utils/composition.js'

export const createTimelineRenderer = (
  container: HTMLElement,
  progressTracker: ProgressTrackerInstance,
): TimelineRendererInstance => {
  // Closure variables for private state
  const expandedEras: Set<string> = new Set()
  const expandedEpisodeLists: Set<string> = new Set()

  const calculateEraProgress = (era: StarTrekEra): EraProgress => {
    return pipe(
      era,
      // Calculate completion data for the era
      era => {
        const completedItems = era.items.filter(item => progressTracker.isWatched(item.id)).length
        const totalItems = era.items.length
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          eraId: era.id,
          total: totalItems,
          completed: completedItems,
          percentage,
        }
      },
      // Debug tap for development tracking
      tap((progress: EraProgress) => {
        if (progress.percentage === 100) {
          // Era completed - could trigger completion callbacks
        }
        return undefined
      }),
    )
  }

  /**
   * Create HTML element for an individual episode within a season.
   * Supports episode-level progress tracking with spoiler-safe content display.
   */
  const createEpisodeElement = (episode: Episode, seriesId: string): string => {
    const isWatched = progressTracker.isWatched(episode.id)
    const airDate = new Date(episode.airDate).toLocaleDateString()

    return `
      <div class="episode-item ${isWatched ? 'watched' : ''}"
           data-episode-id="${episode.id}"
           data-series-id="${seriesId}"
           role="listitem"
           aria-labelledby="episode-title-${episode.id}">
        <div class="episode-checkbox">
          <input type="checkbox"
                 id="${episode.id}"
                 data-episode-id="${episode.id}"
                 aria-label="Mark ${episode.title} as watched"
                 ${isWatched ? 'checked' : ''} />
          <label for="${episode.id}" class="visually-hidden">Toggle watched status for ${episode.title}</label>
        </div>
        <div class="episode-content">
          <div class="episode-header">
            <span class="episode-number">S${episode.season}E${String(episode.episode).padStart(2, '0')}</span>
            <h4 class="episode-title" id="episode-title-${episode.id}">${episode.title}</h4>
          </div>
          <div class="episode-details">
            <span class="episode-air-date">${airDate}</span>
            ${episode.stardate === 'None' ? '' : `<span class="episode-stardate">Stardate: ${episode.stardate}</span>`}
          </div>
          <div class="episode-synopsis" aria-label="Episode synopsis">
            ${episode.synopsis}
          </div>
        </div>
      </div>
    `
  }

  const createItemElement = (item: StarTrekItem): string => {
    const isWatched = progressTracker.isWatched(item.id)
    const typeClass = `type-${item.type}`
    const hasEpisodes = item.episodeData && item.episodeData.length > 0

    // Create episode list HTML if episodes exist
    const episodeListHTML = hasEpisodes
      ? `
      <div class="episode-list-container" data-series-id="${item.id}">
        <div class="episode-list-header">
          <button class="episode-toggle-btn"
                  data-series-id="${item.id}"
                  aria-expanded="false"
                  aria-controls="episodes-${item.id}">
            <span class="episode-toggle-icon">▼</span>
            <span class="episode-count">${item.episodeData?.length || 0} episodes</span>
          </button>
        </div>
        <div class="episode-list"
             id="episodes-${item.id}"
             style="display: none;"
             role="list"
             aria-label="Episodes for ${item.title}">
          ${(item.episodeData || []).map(episode => createEpisodeElement(episode, item.id)).join('')}
        </div>
      </div>
    `
      : ''

    return `
      <div class="viewing-item ${typeClass} ${isWatched ? 'watched' : ''} ${hasEpisodes ? 'has-episodes' : ''}"
           data-item-id="${item.id}"
           role="listitem"
           aria-labelledby="title-${item.id}">
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
          ${episodeListHTML}
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

  const toggleEpisodeList = (seriesId: string): void => {
    const episodeContainer = container.querySelector(
      `[data-series-id="${seriesId}"] .episode-list`,
    ) as HTMLElement
    const toggleButton = container.querySelector(
      `[data-series-id="${seriesId}"] .episode-toggle-btn`,
    ) as HTMLElement
    const toggleIcon = toggleButton?.querySelector('.episode-toggle-icon')

    if (!episodeContainer || !toggleButton) return

    if (expandedEpisodeLists.has(seriesId)) {
      expandedEpisodeLists.delete(seriesId)
      episodeContainer.style.display = 'none'
      if (toggleIcon) toggleIcon.textContent = '▼'
      toggleButton.setAttribute('aria-expanded', 'false')
    } else {
      expandedEpisodeLists.add(seriesId)
      episodeContainer.style.display = 'block'
      if (toggleIcon) toggleIcon.textContent = '▲'
      toggleButton.setAttribute('aria-expanded', 'true')
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

    // Add event listeners for item checkboxes and episode functionality
    const checkboxes = eraDiv.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const target = e.target as HTMLInputElement
        if (target?.dataset['itemId']) {
          progressTracker.toggleItem(target.dataset['itemId'])
        } else if (target?.dataset['episodeId']) {
          progressTracker.toggleItem(target.dataset['episodeId'])
        }
      })
    })

    // Add event listeners for episode list toggle buttons
    const episodeToggleButtons = eraDiv.querySelectorAll('.episode-toggle-btn')
    episodeToggleButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.target as HTMLElement
        const seriesId =
          target.dataset['seriesId'] ||
          target.closest('[data-series-id]')?.getAttribute('data-series-id')
        if (seriesId) {
          toggleEpisodeList(seriesId)
        }
      })

      // Add keyboard support for episode toggle
      button.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          e.preventDefault()
          const target = e.target as HTMLElement
          const seriesId =
            target.dataset['seriesId'] ||
            target.closest('[data-series-id]')?.getAttribute('data-series-id')
          if (seriesId) {
            toggleEpisodeList(seriesId)
          }
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

  // Curried functions for reusable era state management
  const updateEraExpansion = curry((isExpanded: boolean, eraId: string) => {
    const eraElement = container.querySelector(`[data-era-id="${eraId}"]`) as HTMLElement
    if (!eraElement) return

    const content = eraElement.querySelector('.era-content') as HTMLElement
    const icon = eraElement.querySelector('.expand-icon')

    if (isExpanded) {
      expandedEras.add(eraId)
      if (content) content.style.display = 'block'
      if (icon) icon.textContent = '▲'
      eraElement.classList.add('expanded')
    } else {
      expandedEras.delete(eraId)
      if (content) content.style.display = 'none'
      if (icon) icon.textContent = '▼'
      eraElement.classList.remove('expanded')
    }
  })

  // Reusable curried handlers
  const expandEra = updateEraExpansion(true)
  const collapseEra = updateEraExpansion(false)

  const expandAll = (): void => {
    pipe(
      container.querySelectorAll('.era'),
      // Convert NodeList to Array and process each era
      eras => Array.from(eras),
      tap((eras: Element[]) => {
        eras.forEach(era => {
          const eraElement = era as HTMLElement
          const eraId = eraElement.dataset['eraId']
          if (eraId) {
            expandEra(eraId)
          }
        })
        return undefined
      }),
    )
  }

  const collapseAll = (): void => {
    pipe(
      container.querySelectorAll('.era'),
      // Convert NodeList to Array and process each era
      eras => Array.from(eras),
      tap((eras: Element[]) => {
        eras.forEach(era => {
          const eraElement = era as HTMLElement
          const eraId = eraElement.dataset['eraId']
          if (eraId) {
            collapseEra(eraId)
          }
        })
        return undefined
      }),
    )
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
    // Update item states
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

    // Update episode states
    const episodes = container.querySelectorAll('.episode-item')
    episodes.forEach(episode => {
      const episodeElement = episode as HTMLElement
      const episodeId = episodeElement.dataset['episodeId']
      const checkbox = episode.querySelector('input[type="checkbox"]') as HTMLInputElement

      if (episodeId && checkbox) {
        const isWatched = progressTracker.isWatched(episodeId)
        checkbox.checked = isWatched
        episode.classList.toggle('watched', isWatched)
      }
    })
  }

  // Return public API
  return {
    render,
    createEraElement,
    createItemElement,
    createEpisodeElement,
    toggleEra,
    toggleEpisodeList,
    expandAll,
    collapseAll,
    updateProgress,
    updateItemStates,
    calculateEraProgress,
  }
}
