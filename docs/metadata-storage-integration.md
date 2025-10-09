# Metadata Storage Integration Guide

**Purpose**: Integrate `metadata-storage.ts` with the timeline component to replace mock metadata with production-ready storage-backed metadata retrieval.

**Status**: Implementation guide for completing TASK-037 production integration

**Related Files**:

- `src/modules/metadata-storage.ts` - Storage adapter
- `src/modules/timeline.ts` - Timeline renderer
- `src/components/metadata-source-attribution.ts` - Attribution component
- `src/main.ts` - Application initialization

---

## Current State

### Timeline Component (Placeholder)

```typescript
// Current mock metadata generation in createEpisodeDetailsContent()
const mockMetadata: EpisodeMetadata | undefined = episode.tmdbId
  ? {
      episodeId: episode.id,
      dataSource: 'tmdb',
      lastUpdated: new Date().toISOString(),
      isValidated: true,
      confidenceScore: 0.85,
      version: '1.0',
      enrichmentStatus: 'complete',
    }
  : undefined
```

**Issues:**

- ❌ No actual storage retrieval
- ❌ Hardcoded mock data
- ❌ No async handling
- ❌ No error handling
- ❌ No loading states
- ❌ No background enrichment trigger

### Metadata Storage Module (Complete)

```typescript
// Full-featured storage adapter with IndexedDB backend
const metadataStorage = createMetadataStorageAdapter(config)
await metadataStorage.storeMetadata(episodeId, metadata)
const metadata = await metadataStorage.getMetadata(episodeId)
```

**Features:**

- ✅ IndexedDB persistence
- ✅ Expiration/TTL management
- ✅ Automatic cleanup
- ✅ Quota management
- ✅ EventEmitter integration
- ✅ Validation

---

## Integration Architecture

### Recommended Approach: **Progressive Enhancement with Lazy Loading**

**Flow:**

1. Render episode details **immediately** without metadata (fast initial render)
2. Show "Loading metadata..." placeholder in attribution section
3. **On episode details panel open**, trigger async metadata fetch
4. Update attribution component when metadata arrives
5. If no metadata exists, trigger background enrichment via Service Worker

**Benefits:**

- ⚡ Fast initial page load (no blocking)
- 📦 Minimal unnecessary data fetching
- 🎨 Progressive enhancement (works without metadata)
- 🔄 Background enrichment for missing data
- ♿ Better accessibility (immediate content)

---

## Implementation Steps

### Step 1: Initialize Metadata Storage in Main Application

**File:** `src/main.ts`

```typescript
import {
  createDefaultMetadataStorageConfig,
  createMetadataStorageAdapter,
  type MetadataStorageAdapterInstance,
} from './modules/metadata-storage.js'

export const createStarTrekViewingGuide = (): StarTrekViewingGuideInstance => {
  // ... existing code ...

  // Initialize metadata storage adapter
  const metadataStorageConfig = createDefaultMetadataStorageConfig()
  const metadataStorage = createMetadataStorageAdapter(metadataStorageConfig)

  // Listen to storage events for debugging/logging
  metadataStorage.on('metadata-stored', ({episodeId, storageSize}) => {
    console.log(`[VBS] Metadata stored for ${episodeId} (${storageSize} bytes)`)
  })

  metadataStorage.on('storage-error', ({operation, episodeId, error}) => {
    console.error(`[VBS] Metadata storage error: ${operation} failed for ${episodeId}`, error)
  })

  metadataStorage.on('quota-warning', ({currentUsage, maxQuota, usagePercentage}) => {
    console.warn(
      `[VBS] Metadata storage quota warning: ${currentUsage}/${maxQuota} bytes (${Math.round(usagePercentage * 100)}%)`
    )
  })

  // Pass metadata storage to timeline renderer
  const timelineRenderer = createTimelineRenderer(
    timelineContainer,
    progressTracker,
    streamingApi,
    metadataStorage // <-- NEW PARAMETER
  )

  // ... rest of initialization ...
}
```

---

### Step 2: Update Timeline Renderer Interface

**File:** `src/modules/types.ts`

```typescript
import type {MetadataStorageAdapterInstance} from './metadata-storage.js'

export interface TimelineRendererInstance {
  // ... existing methods ...

  /**
   * Load and display metadata for a specific episode.
   * Called when episode details panel is opened.
   */
  loadEpisodeMetadata: (episodeId: string) => Promise<void>

  /**
   * Clear metadata cache for a specific episode.
   * Useful for forcing refresh.
   */
  clearEpisodeMetadata: (episodeId: string) => Promise<void>
}
```

---

### Step 3: Modify Timeline Renderer Factory

**File:** `src/modules/timeline.ts`

```typescript
import type {MetadataStorageAdapterInstance} from './metadata-storage.js'
import {createMetadataSourceAttribution} from '../components/metadata-source-attribution.js'

export const createTimelineRenderer = (
  container: HTMLElement,
  progressTracker: ProgressTrackerInstance,
  streamingApi?: StreamingApiInstance,
  metadataStorage?: MetadataStorageAdapterInstance // <-- NEW PARAMETER
): TimelineRendererInstance => {
  // ... existing closure variables ...

  // Add metadata cache to avoid redundant fetches during session
  const metadataCache = new Map<string, EpisodeMetadata>()

  /**
   * Create detailed episode information content with async metadata loading.
   * Renders immediately with placeholder, loads metadata asynchronously.
   */
  const createEpisodeDetailsContent = (episode: Episode): string => {
    const hasPlotPoints = episode.plotPoints && episode.plotPoints.length > 0
    const hasGuestStars = episode.guestStars && episode.guestStars.length > 0
    const hasConnections = episode.connections && episode.connections.length > 0

    // Render attribution component WITHOUT metadata initially
    // Metadata will be loaded asynchronously when details panel opens
    const attribution = createMetadataSourceAttribution({
      episodeId: episode.id,
      // No metadata initially - will be updated async
      displayMode: 'detailed',
      showFieldAttribution: false,
      showConflicts: false,
      interactive: false,
    })
    const attributionHTML = attribution.renderHTML()

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

          ${hasPlotPoints ? `<!-- plot points HTML -->` : ''}
          ${hasGuestStars ? `<!-- guest stars HTML -->` : ''}
          ${hasConnections ? `<!-- connections HTML -->` : ''}

          ${
            !hasPlotPoints && !hasGuestStars && !hasConnections
              ? `<div class="no-additional-details">
                   <p class="no-details-message">No additional details available for this episode.</p>
                 </div>`
              : ''
          }

          <!-- Attribution section with async loading -->
          <div class="metadata-attribution-container"
               data-episode-id="${episode.id}"
               data-metadata-loading="true">
            ${attributionHTML}
            <div class="metadata-loading-indicator" style="display: none;">
              <span class="loading-spinner" aria-label="Loading metadata"></span>
              <span class="loading-text">Loading source attribution...</span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Load and display metadata for a specific episode.
   * Fetches from storage and updates the attribution component.
   */
  const loadEpisodeMetadata = async (episodeId: string): Promise<void> => {
    if (!metadataStorage) {
      console.warn('[VBS] Metadata storage not available, skipping metadata load')
      return
    }

    // Check session cache first
    const cachedMetadata = metadataCache.get(episodeId)
    if (cachedMetadata) {
      updateAttributionDisplay(episodeId, cachedMetadata)
      return
    }

    // Show loading indicator
    const attributionContainer = container.querySelector(
      `[data-episode-id="${episodeId}"] .metadata-attribution-container`
    ) as HTMLElement | null

    if (attributionContainer) {
      const loadingIndicator = attributionContainer.querySelector('.metadata-loading-indicator') as HTMLElement
      if (loadingIndicator) {
        loadingIndicator.style.display = 'flex'
      }
      attributionContainer.dataset.metadataLoading = 'true'
    }

    try {
      // Fetch metadata from storage
      const metadata = await metadataStorage.getMetadata(episodeId)

      if (metadata) {
        // Cache for session
        metadataCache.set(episodeId, metadata)

        // Update display
        updateAttributionDisplay(episodeId, metadata)
      } else {
        // No metadata found - trigger background enrichment
        console.log(`[VBS] No metadata for ${episodeId}, triggering background enrichment`)
        triggerBackgroundEnrichment(episodeId)

        // Show "no metadata" state
        updateAttributionDisplay(episodeId, null)
      }
    } catch (error) {
      console.error(`[VBS] Failed to load metadata for ${episodeId}:`, error)
      updateAttributionDisplay(episodeId, null)
    } finally {
      // Hide loading indicator
      if (attributionContainer) {
        const loadingIndicator = attributionContainer.querySelector('.metadata-loading-indicator') as HTMLElement
        if (loadingIndicator) {
          loadingIndicator.style.display = 'none'
        }
        attributionContainer.dataset.metadataLoading = 'false'
      }
    }
  }

  /**
   * Update attribution display with fetched metadata.
   */
  const updateAttributionDisplay = (
    episodeId: string,
    metadata: EpisodeMetadata | null
  ): void => {
    const attributionContainer = container.querySelector(
      `[data-episode-id="${episodeId}"] .metadata-attribution-container`
    ) as HTMLElement | null

    if (!attributionContainer) return

    // Create updated attribution component
    const attribution = createMetadataSourceAttribution({
      episodeId,
      ...(metadata ? {metadata} : {}),
      displayMode: 'detailed',
      showFieldAttribution: !!metadata?.fieldAttribution,
      showConflicts: !!metadata?.conflicts && metadata.conflicts.length > 0,
      interactive: false,
    })

    // Replace existing content
    const existingAttribution = attributionContainer.querySelector('.metadata-source-attribution')
    if (existingAttribution) {
      existingAttribution.outerHTML = attribution.renderHTML()
    }
  }

  /**
   * Trigger background metadata enrichment via Service Worker.
   * This is called when no metadata exists for an episode.
   */
  const triggerBackgroundEnrichment = (episodeId: string): void => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[VBS] Service Worker not available, cannot trigger background enrichment')
      return
    }

    // Send message to Service Worker to enqueue metadata fetch
    navigator.serviceWorker.ready
      .then(registration => {
        registration.active?.postMessage({
          type: 'ENQUEUE_METADATA_ENRICHMENT',
          payload: {episodeId, priority: 'normal'},
        })
      })
      .catch(error => {
        console.error('[VBS] Failed to trigger background enrichment:', error)
      })
  }

  /**
   * Clear metadata cache for a specific episode.
   * Forces fresh fetch on next load.
   */
  const clearEpisodeMetadata = async (episodeId: string): Promise<void> => {
    metadataCache.delete(episodeId)

    if (metadataStorage) {
      await metadataStorage.removeMetadata(episodeId)
    }
  }

  /**
   * Modified toggleEpisodeDetails to trigger metadata loading.
   */
  const toggleEpisodeDetails = (episodeId: string): void => {
    const detailsPanel = container.querySelector(`#details-panel-${episodeId}`) as HTMLElement
    const detailsButton = container.querySelector(
      `.episode-details-btn[data-episode-id="${episodeId}"]`
    ) as HTMLButtonElement

    if (!detailsPanel || !detailsButton) return

    const isExpanded = detailsPanel.style.display !== 'none'

    if (isExpanded) {
      // Close panel
      detailsPanel.style.display = 'none'
      detailsPanel.setAttribute('aria-hidden', 'true')
      detailsButton.setAttribute('aria-expanded', 'false')
    } else {
      // Open panel
      detailsPanel.style.display = 'block'
      detailsPanel.setAttribute('aria-hidden', 'false')
      detailsButton.setAttribute('aria-expanded', 'true')

      // TRIGGER METADATA LOADING when panel opens
      loadEpisodeMetadata(episodeId).catch(error => {
        console.error(`[VBS] Failed to load metadata for ${episodeId}:`, error)
      })
    }
  }

  // ... rest of timeline renderer implementation ...

  return {
    // ... existing methods ...
    loadEpisodeMetadata,
    clearEpisodeMetadata,
  }
}
```

---

### Step 4: Add Loading State Styles

**File:** `src/components/metadata-source-attribution.css` (append)

```css
/* Metadata loading indicator */
.metadata-attribution-container {
  position: relative;
}

.metadata-loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  justify-content: center;
  color: var(--vbs-text-secondary, #a0a0a0);
  font-size: 0.85rem;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--vbs-color-accent, #ffa500);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinner-rotate 0.8s linear infinite;
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
    border-top-color: var(--vbs-color-accent, #ffa500);
  }
}

/* Loading state for attribution container */
.metadata-attribution-container[data-metadata-loading="true"] .metadata-source-attribution {
  opacity: 0.5;
  pointer-events: none;
}
```

---

### Step 5: Service Worker Integration (Future Enhancement)

**File:** `public/sw.js` (extension)

```javascript
// Handle metadata enrichment requests from timeline
globalThis.addEventListener('message', event => {
  if (event.data.type === 'ENQUEUE_METADATA_ENRICHMENT') {
    const {episodeId, priority} = event.data.payload

    // Add to metadata enrichment queue
    enqueueMetadataEnrichment(episodeId, priority)
      .then(() => {
        console.log(`[SW] Enqueued metadata enrichment for ${episodeId}`)
      })
      .catch(error => {
        console.error(`[SW] Failed to enqueue metadata enrichment:`, error)
      })
  }
})

async function enqueueMetadataEnrichment(episodeId, priority) {
  // Register background sync for metadata fetching
  const registration = await globalThis.registration
  await registration.sync.register(`metadata-enrichment:${episodeId}`)

  // Store enrichment request details
  const db = await openMetadataQueue()
  await db.add('enrichmentQueue', {
    episodeId,
    priority,
    enqueuedAt: Date.now(),
    status: 'pending',
  })
}
```

---

## Testing Strategy

### Unit Tests

**File:** `test/metadata-storage-integration.test.ts`

```typescript
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createMetadataStorageAdapter} from '../src/modules/metadata-storage.js'
import {createTimelineRenderer} from '../src/modules/timeline.js'

describe('Metadata Storage Integration', () => {
  let metadataStorage: ReturnType<typeof createMetadataStorageAdapter>
  let timeline: ReturnType<typeof createTimelineRenderer>

  beforeEach(() => {
    // Mock storage adapter
    metadataStorage = createMetadataStorageAdapter({
      storeName: 'test-metadata',
      version: 1,
      // ... config
    })

    // Create timeline with storage
    timeline = createTimelineRenderer(
      document.createElement('div'),
      progressTracker,
      streamingApi,
      metadataStorage
    )
  })

  it('should load metadata asynchronously when episode details open', async () => {
    const mockMetadata = {
      episodeId: 'tos_s1_e1',
      dataSource: 'tmdb',
      lastUpdated: new Date().toISOString(),
      confidenceScore: 0.9,
      // ... rest of metadata
    }

    // Store metadata
    await metadataStorage.storeMetadata('tos_s1_e1', mockMetadata)

    // Load metadata via timeline
    await timeline.loadEpisodeMetadata('tos_s1_e1')

    // Verify attribution was updated
    // ... assertions
  })

  it('should trigger background enrichment when no metadata exists', async () => {
    const postMessageSpy = vi.spyOn(navigator.serviceWorker, 'ready')

    await timeline.loadEpisodeMetadata('unknown_episode')

    expect(postMessageSpy).toHaveBeenCalled()
  })

  it('should handle storage errors gracefully', async () => {
    vi.spyOn(metadataStorage, 'getMetadata').mockRejectedValue(new Error('Storage error'))

    await expect(timeline.loadEpisodeMetadata('tos_s1_e1')).resolves.not.toThrow()
  })
})
```

---

## Migration Checklist

- [ ] **Step 1**: Initialize metadata storage in `main.ts`
- [ ] **Step 2**: Update timeline renderer interface in `types.ts`
- [ ] **Step 3**: Modify timeline renderer to accept storage parameter
- [ ] **Step 4**: Implement `loadEpisodeMetadata()` method
- [ ] **Step 5**: Implement `updateAttributionDisplay()` helper
- [ ] **Step 6**: Modify `toggleEpisodeDetails()` to trigger metadata loading
- [ ] **Step 7**: Add loading state styles to CSS
- [ ] **Step 8**: Implement `triggerBackgroundEnrichment()` for Service Worker
- [ ] **Step 9**: Add comprehensive unit tests
- [ ] **Step 10**: Test with real IndexedDB data
- [ ] **Step 11**: Test error scenarios (storage failure, network issues)
- [ ] **Step 12**: Performance test with 100+ episodes
- [ ] **Step 13**: Remove mock metadata generation code
- [ ] **Step 14**: Update documentation and comments

---

## Performance Considerations

### Optimization Strategies

1. **Session-Level Caching**: Use `Map<string, EpisodeMetadata>` to avoid redundant IndexedDB reads
2. **Lazy Loading**: Only fetch metadata when episode details panel opens (not during initial render)
3. **Batch Prefetching**: When series/era expands, prefetch metadata for visible episodes in background
4. **Progressive Enhancement**: Show content immediately, enhance with metadata asynchronously
5. **Debounced Enrichment**: Rate-limit background enrichment triggers to avoid API flooding

### Memory Management

- Clear `metadataCache` when era collapses (reduce memory footprint)
- Implement LRU eviction for cache (keep only 50 most recent episodes)
- Monitor IndexedDB quota and trigger cleanup proactively

---

## Error Handling

### Graceful Degradation

```typescript
// Timeline should work even if metadata storage fails
if (!metadataStorage) {
  console.warn('[VBS] Metadata storage unavailable, using fallback mode')
  return // Render without metadata
}

try {
  const metadata = await metadataStorage.getMetadata(episodeId)
  // Use metadata
} catch (error) {
  console.error('[VBS] Metadata fetch failed:', error)
  // Continue without metadata - app remains functional
}
```

### User-Visible Error States

- Show "Metadata unavailable" message in attribution section
- Provide "Retry" button for failed metadata loads
- Log errors for debugging without breaking UI

---

## Security Considerations

1. **Input Validation**: Validate episode IDs before storage queries
2. **XSS Prevention**: Sanitize metadata content before rendering
3. **Quota Limits**: Enforce storage quotas to prevent abuse
4. **Rate Limiting**: Limit background enrichment frequency

---

## Future Enhancements

1. **Real-Time Sync**: Listen to storage events and update all open episode panels
2. **Conflict Resolution UI**: Show conflicts when multiple sources disagree
3. **Manual Refresh**: Add button to force metadata refresh
4. **Bulk Operations**: Prefetch metadata for entire series at once
5. **Analytics**: Track metadata quality and source reliability over time

---

## Summary

**Current State**: Mock metadata generation (placeholder) **Target State**: Full IndexedDB-backed storage with async loading and background enrichment

**Key Benefits**:

- ✅ Production-ready persistent storage
- ✅ Progressive enhancement (works without metadata)
- ✅ Async loading (no blocking)
- ✅ Background enrichment for missing data
- ✅ Graceful error handling
- ✅ Performance optimized (lazy loading + caching)

**Integration Complexity**: Moderate (requires main.ts, timeline.ts, types.ts, CSS updates)

**Estimated Effort**: 4-6 hours (implementation + testing)
