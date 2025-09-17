import type {
  Episode,
  EraProgress,
  OverallProgress,
  ProgressTrackerInstance,
  StarTrekEra,
  StarTrekItem,
  StreamingApiInstance,
  TimelineRendererInstance,
} from './types.js'
import {createStreamingIndicators} from '../components/streaming-indicators.js'
import {curry, pipe, tap} from '../utils/composition.js'
import {calculateSeasonProgress} from './progress.js'

export const createTimelineRenderer = (
  container: HTMLElement,
  progressTracker: ProgressTrackerInstance,
  streamingApi?: StreamingApiInstance,
): TimelineRendererInstance => {
  // Closure variables for private state
  const expandedEras: Set<string> = new Set()
  const expandedEpisodeLists: Set<string> = new Set()
  const episodeLoadStates: Map<string, {loaded: number; total: number}> = new Map()

  // Constants for lazy loading
  const INITIAL_EPISODE_LOAD = 10
  const LOAD_MORE_BATCH_SIZE = 10

  /**
   * Handle keyboard navigation within episode lists.
   * Supports arrow keys, space, enter, and bulk operations.
   */
  const handleEpisodeListKeyNavigation = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement

    // Only handle keyboard navigation for episode items and controls
    if (!target.closest('.episode-item') && !target.closest('.episode-list-header')) {
      return
    }

    const episodeList = target.closest('.episode-list') as HTMLElement
    if (!episodeList) return

    const episodeItems = Array.from(episodeList.querySelectorAll('.episode-item'))
    const currentIndex = episodeItems.findIndex(
      item => item.contains(target) || item.querySelector(':focus') === target,
    )

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (currentIndex < episodeItems.length - 1) {
          const nextItem = episodeItems[currentIndex + 1] as HTMLElement
          const checkbox = nextItem.querySelector('input[type="checkbox"]') as HTMLInputElement
          checkbox?.focus()
        }
        break
      }

      case 'ArrowUp': {
        e.preventDefault()
        if (currentIndex > 0) {
          const prevItem = episodeItems[currentIndex - 1] as HTMLElement
          const checkbox = prevItem.querySelector('input[type="checkbox"]') as HTMLInputElement
          checkbox?.focus()
        } else if (currentIndex === 0) {
          // Focus on episode toggle button when going up from first item
          const toggleBtn = episodeList.parentElement?.querySelector(
            '.episode-toggle-btn',
          ) as HTMLElement
          toggleBtn?.focus()
        }
        break
      }

      case 'Home': {
        e.preventDefault()
        if (episodeItems.length > 0) {
          const firstItem = episodeItems[0] as HTMLElement
          const checkbox = firstItem.querySelector('input[type="checkbox"]') as HTMLInputElement
          checkbox?.focus()
        }
        break
      }

      case 'End': {
        e.preventDefault()
        if (episodeItems.length > 0) {
          const lastItem = episodeItems.at(-1) as HTMLElement
          const checkbox = lastItem.querySelector('input[type="checkbox"]') as HTMLInputElement
          checkbox?.focus()
        }
        break
      }

      case ' ':
      case 'Space': {
        if ((target as HTMLInputElement).type === 'checkbox') {
          // Let the default checkbox behavior happen
          return
        }
        e.preventDefault()
        // Toggle the current episode if focus is on episode item
        const currentItem = episodeItems[currentIndex] as HTMLElement
        if (currentItem) {
          const checkbox = currentItem.querySelector('input[type="checkbox"]') as HTMLInputElement
          if (checkbox) {
            checkbox.checked = !checkbox.checked
            checkbox.dispatchEvent(new Event('change', {bubbles: true}))
          }
        }
        break
      }

      case 'Enter': {
        if (target.classList.contains('episode-details-btn')) {
          // Let the default button behavior happen
          return
        }
        e.preventDefault()
        // Show episode details for current item
        const currentEpisodeItem = episodeItems[currentIndex] as HTMLElement
        if (currentEpisodeItem) {
          const detailsBtn = currentEpisodeItem.querySelector('.episode-details-btn') as HTMLElement
          detailsBtn?.click()
        }
        break
      }

      case 'a':
      case 'A': {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          // Select/Deselect all episodes in current list
          const checkboxes = episodeList.querySelectorAll('input[type="checkbox"]')
          const allChecked = Array.from(checkboxes).every(cb => (cb as HTMLInputElement).checked)

          checkboxes.forEach(checkbox => {
            const cb = checkbox as HTMLInputElement
            cb.checked = !allChecked
            cb.dispatchEvent(new Event('change', {bubbles: true}))
          })
        }
        break
      }
    }
  }

  /**
   * Setup keyboard navigation for episode lists.
   * Adds event listeners for arrow key navigation and bulk operations.
   */
  const setupEpisodeKeyboardNavigation = (eraElement: HTMLElement): void => {
    eraElement.addEventListener('keydown', (e: Event) => {
      handleEpisodeListKeyNavigation(e as KeyboardEvent)
    })

    // Make episode items focusable and add ARIA attributes for better accessibility
    const episodeItems = eraElement.querySelectorAll('.episode-item')
    episodeItems.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement

      if (checkbox) {
        // Add ARIA attributes for better screen reader support
        checkbox.setAttribute('aria-describedby', `episode-navigation-help`)

        // Add tabindex to make checkboxes part of tab order
        checkbox.setAttribute('tabindex', '0')

        // Add aria-label for context
        const episodeTitle = item.querySelector('.episode-title')?.textContent
        if (episodeTitle) {
          checkbox.setAttribute(
            'aria-label',
            `Toggle watched status for ${episodeTitle}. Use arrow keys to navigate episodes.`,
          )
        }
      }
    })

    // Add keyboard navigation help (invisible but available to screen readers)
    if (!eraElement.querySelector('#episode-navigation-help')) {
      const helpElement = document.createElement('div')
      helpElement.id = 'episode-navigation-help'
      helpElement.className = 'visually-hidden'
      helpElement.textContent =
        'Use arrow keys to navigate between episodes, Space to toggle watched status, Enter to view details, Ctrl+A to select all episodes'
      eraElement.append(helpElement)
    }
  }

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
   * Initialize lazy loading state for a series' episodes.
   * Sets the initial loaded count and total episode count.
   */
  const initializeLazyLoading = (seriesId: string, totalEpisodes: number): void => {
    if (!episodeLoadStates.has(seriesId)) {
      episodeLoadStates.set(seriesId, {
        loaded: Math.min(INITIAL_EPISODE_LOAD, totalEpisodes),
        total: totalEpisodes,
      })
    }
  }

  /**
   * Render episode list content with lazy loading support.
   */
  const renderEpisodeListContent = (seriesId: string, episodeListElement: HTMLElement): void => {
    const loadState = episodeLoadStates.get(seriesId)
    if (!loadState) return

    // For now, we'll implement a simplified version
    // In production, this would need access to the actual episode data
    const hasMore = loadState.loaded < loadState.total

    if (hasMore) {
      const loadMoreButton = episodeListElement.querySelector('.load-more-episodes-btn')
      if (loadMoreButton) {
        // Update the count
        const countElement = loadMoreButton.querySelector('.load-more-count')
        if (countElement) {
          countElement.textContent = `(${loadState.total - loadState.loaded} remaining)`
        }
      } else {
        const loadMoreHTML = `
          <div class="load-more-episodes-container">
            <button class="load-more-episodes-btn"
                    data-series-id="${seriesId}"
                    aria-label="Load more episodes for this series">
              <span class="load-more-text">Load More Episodes</span>
              <span class="load-more-count">(${loadState.total - loadState.loaded} remaining)</span>
            </button>
          </div>
        `
        episodeListElement.insertAdjacentHTML('beforeend', loadMoreHTML)
      }
    } else {
      // Remove load more button if all episodes are loaded
      const loadMoreContainer = episodeListElement.querySelector('.load-more-episodes-container')
      if (loadMoreContainer) {
        loadMoreContainer.remove()
      }
    }
  }

  /**
   * Re-render a specific episode list with current lazy loading state.
   */
  const rerenderEpisodeList = (seriesId: string): void => {
    const episodeList = container.querySelector(`#episodes-${seriesId}`)

    if (!episodeList) return

    // Re-render just the episode list content
    renderEpisodeListContent(seriesId, episodeList as HTMLElement)
  }

  /**
   * Load more episodes for a specific series.
   * Updates the load state and re-renders the episode list.
   */
  const loadMoreEpisodes = (seriesId: string): void => {
    const loadState = episodeLoadStates.get(seriesId)
    if (!loadState) return

    const newLoaded = Math.min(loadState.loaded + LOAD_MORE_BATCH_SIZE, loadState.total)
    episodeLoadStates.set(seriesId, {
      ...loadState,
      loaded: newLoaded,
    })

    // Re-render the episode list with more episodes
    rerenderEpisodeList(seriesId)
  }

  /**
   * Create detailed episode information content with progressive disclosure for spoiler-safe viewing.
   * Displays plot points, guest stars, and cross-series connections with accessibility support.
   */
  const createEpisodeDetailsContent = (episode: Episode): string => {
    const hasPlotPoints = episode.plotPoints && episode.plotPoints.length > 0
    const hasGuestStars = episode.guestStars && episode.guestStars.length > 0
    const hasConnections = episode.connections && episode.connections.length > 0

    return `
      <div class="episode-details-content">
        <div class="episode-details-header">
          <h5 class="episode-details-title">Episode Details</h5>
          <div class="spoiler-controls">
            <button class="spoiler-toggle-btn"
                    data-episode-id="${episode.id}"
                    aria-label="Toggle spoiler content visibility"
                    aria-pressed="false">
              <span class="spoiler-icon">👁️</span>
              <span class="spoiler-text">Show Details</span>
            </button>
          </div>
        </div>

        <div class="episode-spoiler-content"
             id="spoiler-content-${episode.id}"
             aria-hidden="true"
             style="display: none;">

          ${
            hasPlotPoints
              ? `
            <div class="episode-plot-points">
              <h6 class="detail-section-title">Key Plot Points</h6>
              <ul class="plot-points-list" role="list">
                ${episode.plotPoints
                  .map(
                    point => `
                  <li class="plot-point" role="listitem">${point}</li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            hasGuestStars
              ? `
            <div class="episode-guest-stars">
              <h6 class="detail-section-title">Notable Guest Stars</h6>
              <ul class="guest-stars-list" role="list">
                ${episode.guestStars
                  .map(
                    star => `
                  <li class="guest-star" role="listitem">${star}</li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            hasConnections
              ? `
            <div class="episode-connections">
              <h6 class="detail-section-title">Cross-Series Connections</h6>
              <ul class="connections-list" role="list">
                ${episode.connections
                  .map(
                    connection => `
                  <li class="connection-item" role="listitem">
                    <span class="connection-type">[${connection.connectionType.toUpperCase()}]</span>
                    <span class="connection-description">${connection.description}</span>
                  </li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            !hasPlotPoints && !hasGuestStars && !hasConnections
              ? `
            <div class="no-additional-details">
              <p class="no-details-message">No additional details available for this episode.</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  /**
   * Create HTML element for an individual episode within a season.
   * Supports episode-level progress tracking with spoiler-safe content display.
   */
  const createEpisodeElement = (episode: Episode, seriesId: string): string => {
    const isWatched = progressTracker.isWatched(episode.id)
    const airDate = new Date(episode.airDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

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
            <button class="episode-details-btn"
                    data-episode-id="${episode.id}"
                    aria-label="Show details for ${episode.title}"
                    aria-expanded="false"
                    title="View episode details">
              <span class="episode-details-icon">ⓘ</span>
            </button>
          </div>
          <div class="episode-details">
            <span class="episode-air-date">${airDate}</span>
            ${episode.stardate === 'None' ? '' : `<span class="episode-stardate">Stardate: ${episode.stardate}</span>`}
          </div>
          <div class="episode-synopsis" aria-label="Episode synopsis">
            ${episode.synopsis}
          </div>
          <div class="streaming-availability"
               data-streaming-content-id="${episode.id}">
            <!-- Streaming indicators will be loaded asynchronously -->
          </div>
          <div class="episode-details-panel"
               id="details-panel-${episode.id}"
               role="region"
               aria-labelledby="episode-title-${episode.id}"
               aria-hidden="true"
               style="display: none;">
            ${createEpisodeDetailsContent(episode)}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Create episode list content with lazy loading support.
   * Only renders the initial batch of episodes and adds a "Load More" button if needed.
   */
  const createLazyEpisodeListContent = (item: StarTrekItem): string => {
    if (!item.episodeData || item.episodeData.length === 0) return ''

    const totalEpisodes = item.episodeData.length

    // Initialize lazy loading state
    initializeLazyLoading(item.id, totalEpisodes)

    const loadState = episodeLoadStates.get(item.id)
    if (!loadState) return ''

    // Render only the initially loaded episodes
    const episodesToRender = item.episodeData.slice(0, loadState.loaded)
    const episodeElements = episodesToRender
      .map(episode => createEpisodeElement(episode, item.id))
      .join('')

    // Add load more button if there are more episodes
    const hasMore = loadState.loaded < loadState.total
    const loadMoreHTML = hasMore
      ? `
      <div class="load-more-episodes-container">
        <button class="load-more-episodes-btn"
                data-series-id="${item.id}"
                aria-label="Load more episodes for ${item.title}">
          <span class="load-more-text">Load More Episodes</span>
          <span class="load-more-count">(${loadState.total - loadState.loaded} remaining)</span>
        </button>
      </div>
    `
      : ''

    return episodeElements + loadMoreHTML
  }

  const createItemElement = (item: StarTrekItem): string => {
    const isWatched = progressTracker.isWatched(item.id)
    const typeClass = `type-${item.type}`
    const hasEpisodes = item.episodeData && item.episodeData.length > 0

    // Calculate season progress for series with episodes
    let seasonProgressHTML = ''
    if (hasEpisodes && item.episodeData) {
      // Group episodes by season for progress calculation
      const seasonNumbers = [...new Set(item.episodeData.map(ep => ep.season))].sort(
        (a, b) => a - b,
      )
      const watchedItems = progressTracker.getWatchedItems()

      seasonProgressHTML = seasonNumbers
        .map(seasonNum => {
          const seasonProgress = calculateSeasonProgress(item.id, seasonNum, watchedItems)
          if (!seasonProgress) return ''

          return `
          <div class="season-progress" aria-label="Season ${seasonNum} progress">
            <div class="season-progress-header">
              <span class="season-label">Season ${seasonNum}</span>
              <span class="season-progress-text" aria-live="polite">
                ${seasonProgress.watchedEpisodes}/${seasonProgress.totalEpisodes} episodes watched
              </span>
            </div>
            <div class="season-progress-bar" role="progressbar"
                 aria-valuemin="0"
                 aria-valuemax="${seasonProgress.totalEpisodes}"
                 aria-valuenow="${seasonProgress.watchedEpisodes}"
                 aria-label="Season ${seasonNum} progress: ${seasonProgress.watchedEpisodes} of ${seasonProgress.totalEpisodes} episodes watched">
              <div class="season-progress-fill" style="width: ${seasonProgress.percentage}%"></div>
            </div>
            <div class="season-progress-percentage">${seasonProgress.percentage}%</div>
          </div>
        `
        })
        .join('')
    }

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
        ${seasonProgressHTML ? `<div class="season-progress-container">${seasonProgressHTML}</div>` : ''}
        <div class="episode-list"
             id="episodes-${item.id}"
             style="display: none;"
             role="list"
             aria-label="Episodes for ${item.title}">
          ${createLazyEpisodeListContent(item)}
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

  /**
   * Toggle episode details panel visibility with accessibility support.
   * Shows/hides detailed episode information with progressive disclosure.
   */
  const toggleEpisodeDetails = (episodeId: string): void => {
    const detailsPanel = container.querySelector(`#details-panel-${episodeId}`) as HTMLElement
    const detailsButton = container.querySelector(
      `[data-episode-id="${episodeId}"].episode-details-btn`,
    ) as HTMLElement

    if (!detailsPanel || !detailsButton) return

    const isHidden = detailsPanel.getAttribute('aria-hidden') === 'true'

    if (isHidden) {
      detailsPanel.style.display = 'block'
      detailsPanel.setAttribute('aria-hidden', 'false')
      detailsButton.setAttribute('aria-expanded', 'true')
      detailsButton.setAttribute('aria-label', `Hide details for episode`)
    } else {
      detailsPanel.style.display = 'none'
      detailsPanel.setAttribute('aria-hidden', 'true')
      detailsButton.setAttribute('aria-expanded', 'false')
      detailsButton.setAttribute('aria-label', `Show details for episode`)
    }
  }

  /**
   * Toggle spoiler content visibility with progressive disclosure for spoiler-safe viewing.
   * Controls whether plot points, guest stars, and connections are visible.
   */
  const toggleSpoilerContent = (episodeId: string): void => {
    const spoilerContent = container.querySelector(`#spoiler-content-${episodeId}`) as HTMLElement
    const spoilerButton = container.querySelector(
      `[data-episode-id="${episodeId}"].spoiler-toggle-btn`,
    ) as HTMLElement
    const spoilerText = spoilerButton?.querySelector('.spoiler-text')

    if (!spoilerContent || !spoilerButton) return

    const isHidden = spoilerContent.getAttribute('aria-hidden') === 'true'

    if (isHidden) {
      spoilerContent.style.display = 'block'
      spoilerContent.setAttribute('aria-hidden', 'false')
      spoilerButton.setAttribute('aria-pressed', 'true')
      if (spoilerText) spoilerText.textContent = 'Hide Details'
    } else {
      spoilerContent.style.display = 'none'
      spoilerContent.setAttribute('aria-hidden', 'true')
      spoilerButton.setAttribute('aria-pressed', 'false')
      if (spoilerText) spoilerText.textContent = 'Show Details'
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
          target.dataset['seriesId'] || target.closest('[data-series-id]')?.dataset.seriesId
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
            target.dataset['seriesId'] || target.closest('[data-series-id]')?.dataset.seriesId
          if (seriesId) {
            toggleEpisodeList(seriesId)
          }
        }
      })
    })

    // Add event listeners for episode details buttons
    const episodeDetailsButtons = eraDiv.querySelectorAll('.episode-details-btn')
    episodeDetailsButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.target as HTMLElement
        const episodeId =
          target.dataset['episodeId'] || target.closest('[data-episode-id]')?.dataset.episodeId
        if (episodeId) {
          toggleEpisodeDetails(episodeId)
        }
      })

      // Add keyboard support for episode details
      button.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          e.preventDefault()
          const target = e.target as HTMLElement
          const episodeId =
            target.dataset['episodeId'] || target.closest('[data-episode-id]')?.dataset.episodeId
          if (episodeId) {
            toggleEpisodeDetails(episodeId)
          }
        }
      })
    })

    // Add event listeners for spoiler toggle buttons
    const spoilerToggleButtons = eraDiv.querySelectorAll('.spoiler-toggle-btn')
    spoilerToggleButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.target as HTMLElement
        const episodeId = target.dataset['episodeId']
        if (episodeId) {
          toggleSpoilerContent(episodeId)
        }
      })

      // Add keyboard support for spoiler toggle
      button.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          e.preventDefault()
          const target = e.target as HTMLElement
          const episodeId = target.dataset['episodeId']
          if (episodeId) {
            toggleSpoilerContent(episodeId)
          }
        }
      })
    })

    // Add event listeners for load more episodes buttons
    const loadMoreButtons = eraDiv.querySelectorAll('.load-more-episodes-btn')
    loadMoreButtons.forEach(button => {
      button.addEventListener('click', e => {
        const target = e.target as HTMLElement
        const seriesId =
          target.dataset['seriesId'] || target.closest('[data-series-id]')?.dataset.seriesId
        if (seriesId) {
          loadMoreEpisodes(seriesId)
        }
      })

      // Add keyboard support for load more episodes
      button.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          e.preventDefault()
          const target = e.target as HTMLElement
          const seriesId =
            target.dataset['seriesId'] || target.closest('[data-series-id]')?.dataset.seriesId
          if (seriesId) {
            loadMoreEpisodes(seriesId)
          }
        }
      })
    })

    // Setup keyboard navigation for episode lists
    setupEpisodeKeyboardNavigation(eraDiv)

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

  /**
   * Load streaming indicators for episodes asynchronously
   * This function is called after episode list rendering to populate streaming availability
   */
  const loadStreamingIndicators = async (): Promise<void> => {
    if (!streamingApi) return

    // Find all streaming content elements that need loading
    const streamingElements = container.querySelectorAll('[data-streaming-content-id]')

    if (streamingElements.length === 0) return

    // Extract content IDs for batch loading
    const contentIds = Array.from(streamingElements)
      .map(element => (element as HTMLElement).dataset['streamingContentId'])
      .filter((id): id is string => id !== null && id !== undefined)

    try {
      // Load streaming indicators in batches for better performance
      const batchSize = 10
      for (let i = 0; i < contentIds.length; i += batchSize) {
        const batch = contentIds.slice(i, i + batchSize)

        // Get cached availability first for immediate display
        for (const contentId of batch) {
          const cachedAvailability = await streamingApi.getCachedAvailability(contentId)
          if (cachedAvailability && cachedAvailability.length > 0) {
            const indicatorHtml = createStreamingIndicators(cachedAvailability, {
              size: 'small',
              maxPlatforms: 2,
              showPricing: false,
            })

            // Update the DOM with cached data
            const elements = container.querySelectorAll(
              `[data-streaming-content-id="${contentId}"]`,
            )
            elements.forEach(element => {
              element.innerHTML = indicatorHtml
            })
          }
        }

        // Then refresh with fresh data in the background
        const batchAvailability = await streamingApi.getBatchAvailability(batch)

        for (const [contentId, availability] of batchAvailability) {
          const indicatorHtml = createStreamingIndicators(availability, {
            size: 'small',
            maxPlatforms: 2,
            showPricing: false,
          })

          // Update the DOM with fresh data
          const elements = container.querySelectorAll(`[data-streaming-content-id="${contentId}"]`)
          elements.forEach(element => {
            element.innerHTML = indicatorHtml
          })
        }
      }
    } catch (error) {
      console.warn('Failed to load streaming indicators:', error)

      // Show error state for all elements
      streamingElements.forEach(element => {
        element.innerHTML = '<div class="streaming-indicators-error">Unable to load</div>'
      })
    }
  }

  // Return public API
  return {
    render,
    createEraElement,
    createItemElement,
    createEpisodeElement,
    createLazyEpisodeListContent,
    toggleEra,
    toggleEpisodeList,
    loadMoreEpisodes,
    loadStreamingIndicators,
    expandAll,
    collapseAll,
    updateProgress,
    updateItemStates,
    calculateEraProgress,
    setupEpisodeKeyboardNavigation,
  }
}
