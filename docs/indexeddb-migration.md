# IndexedDB Migration Guide

This document outlines the migration path from LocalStorage to IndexedDB for the VBS application, leveraging the generic storage utilities introduced in the Phase 4 refactoring.

## Overview

The VBS application currently uses LocalStorage for persistence but is designed to migrate to IndexedDB for enhanced capabilities including:

- Larger storage capacity (not limited by 5-10MB localStorage limit)
- Structured data storage with object stores and indexes
- Asynchronous operations for better performance
- Support for complex hierarchical data (episode-level tracking)
- Better offline capabilities and data integrity

## Generic Storage Architecture

The refactored codebase uses a generic `StorageAdapter<T>` interface that allows seamless switching between storage backends:

```typescript
export interface StorageAdapter<T> {
  save: (key: string, data: T) => Promise<void> | void
  load: (key: string) => Promise<T | null> | T | null
  remove: (key: string) => Promise<void> | void
  clear: () => Promise<void> | void
  exists: (key: string) => Promise<boolean> | boolean
}
```

This design enables:

- **Type Safety**: Full TypeScript support with generic constraints
- **Validation**: Built-in data validation and sanitization
- **Fallbacks**: Graceful degradation with fallback values
- **Events**: Integrated EventEmitter for storage lifecycle events

## Migration Implementation

### Phase 1: IndexedDB Adapter Available

The `IndexedDBAdapter<T>` class has been implemented with:

```typescript
// Create IndexedDB storage for progress data
const indexedDbStorage = createStorage(
  new IndexedDBAdapter<string[]>({
    validate: isStringArray,
    fallback: [],
  }),
  'starTrekProgress',
)

// Usage identical to LocalStorage version
await indexedDbStorage.save(['tos_s1', 'ent_s1'])
const progress = await indexedDbStorage.load()
```

### Phase 2: Progressive Migration Strategy

1. **Detection**: Check IndexedDB availability and browser support
2. **Migration**: Transfer existing LocalStorage data to IndexedDB
3. **Fallback**: Maintain LocalStorage as backup for unsupported browsers
4. **Cleanup**: Remove LocalStorage data after successful migration

```typescript
// Migration utility function (to be implemented)
const migrateToIndexedDB = async (): Promise<boolean> => {
  try {
    // Check IndexedDB support
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, staying with LocalStorage')
      return false
    }

    // Load existing LocalStorage data
    const localData = loadProgress() // Current LocalStorage function

    // Create IndexedDB adapter
    const indexedDbAdapter = new IndexedDBAdapter<string[]>({
      validate: isStringArray,
      fallback: [],
    })

    // Save to IndexedDB
    await indexedDbAdapter.save('starTrekProgress', localData)

    // Verify migration
    const migratedData = await indexedDbAdapter.load('starTrekProgress')
    if (JSON.stringify(localData) === JSON.stringify(migratedData)) {
      // Migration successful, update application to use IndexedDB
      return true
    }

    return false
  } catch (error) {
    console.error('Migration to IndexedDB failed:', error)
    return false
  }
}
```

### Phase 3: Enhanced Data Structures

IndexedDB enables more sophisticated data structures for future features:

```typescript
// Episode-level tracking data structure
interface EpisodeProgress {
  episodeId: string
  watched: boolean
  rating?: number
  notes?: string
  watchedAt?: Date
}

interface SeriesProgress {
  seriesId: string
  episodes: Map<string, EpisodeProgress>
  lastWatched?: Date
  totalEpisodes: number
  watchedEpisodes: number
}

// IndexedDB adapter with complex data
const episodeStorage = createStorage(
  new IndexedDBAdapter<SeriesProgress>({
    validate: isSeriesProgress,
    fallback: createEmptySeriesProgress(),
  }),
  'episodeProgress',
)
```

## Browser Support and Fallbacks

### IndexedDB Availability

- **Modern Browsers**: Full support (Chrome 24+, Firefox 16+, Safari 8+, Edge 12+)
- **Legacy Support**: Automatic fallback to LocalStorage
- **Feature Detection**: Runtime detection with graceful degradation

### Implementation Pattern

```typescript
// Storage factory with automatic fallback
const createAdaptiveStorage = <T>(options: StorageValidationOptions<T>) => {
  if ('indexedDB' in window) {
    return createStorage(new IndexedDBAdapter<T>(options))
  } else {
    console.warn('Using LocalStorage fallback - limited storage capacity')
    return createStorage(new LocalStorageAdapter<T>(options))
  }
}
```

## Migration Timeline

### Immediate (Phase 4 Complete)

- ✅ IndexedDB adapter implementation ready
- ✅ Generic storage utilities support async operations
- ✅ Migration path documented and validated

### Next Phase (Episode-Level Features)

- Implement progressive migration utility
- Add feature detection and fallback logic
- Migrate existing progress data to IndexedDB
- Enable complex hierarchical progress tracking

### Future Enhancements

- Multiple object stores for different data types
- Indexes for efficient querying (by date, rating, series)
- Batch operations for performance optimization
- Background sync capabilities for PWA features

## Testing and Validation

### Unit Tests Required

- IndexedDB adapter functionality across all CRUD operations
- Migration utility with various data scenarios
- Fallback behavior when IndexedDB unavailable
- Data integrity validation during migration

### Integration Tests

- End-to-end storage operations in browser environment
- Performance comparison between LocalStorage and IndexedDB
- Cross-browser compatibility testing
- Error handling and recovery scenarios

## Benefits of Migration

1. **Storage Capacity**: No practical limit vs 5-10MB LocalStorage limit
2. **Performance**: Asynchronous operations don't block UI thread
3. **Data Structure**: Support for complex nested data and relationships
4. **Query Capabilities**: Indexes and range queries for efficient data access
5. **Future-Proof**: Foundation for advanced features like offline sync

## Risks and Considerations

1. **Complexity**: Asynchronous operations require careful error handling
2. **Browser Support**: Need fallback strategy for older browsers
3. **Migration Safety**: Data loss risk during migration process
4. **Performance**: Initial IndexedDB setup overhead vs immediate LocalStorage access
5. **Debugging**: More complex debugging compared to simple LocalStorage

## Conclusion

The generic storage architecture provides a solid foundation for migrating to IndexedDB while maintaining backward compatibility and type safety. The migration can be implemented progressively with minimal risk to existing functionality.
