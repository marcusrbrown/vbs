# Three Future Improvement Prompts for VBS

**Generated**: October 10, 2025  
**Context**: Post-Comprehensive Audit Recommendations  
**Priority**: Future Enhancements (Non-Blocking)

---

## Prompt 1: Implement Multi-Track Timeline Visualization

**Context**: Address TODO comment in `src/modules/timeline-viz.ts:566` and enhance timeline UX.

### User Prompt

> Implement multi-track timeline visualization in the D3.js timeline component to display different Star Trek event types (wars, technology, first contact, political) on separate horizontal tracks. The current implementation uses a single track (`trackCount = 1`). Enhance this to support 4-5 parallel tracks with:
> 
> 1. **Track Assignment Logic**: Automatically assign events to tracks based on `type` field
> 2. **Visual Differentiation**: Use color coding and track labels
> 3. **Interactive Features**: Allow users to show/hide specific track types
> 4. **Collision Detection**: Prevent overlapping events on the same track
> 5. **Accessibility**: Ensure keyboard navigation works across tracks
> 
> **Success Criteria:**
> - Events properly distributed across tracks by type
> - No visual overlaps for events on same track
> - Smooth animations when tracks are toggled
> - All existing tests continue passing
> - New tests for multi-track functionality
> - WCAG 2.1 AA compliance maintained

**Expected Outcome**: Enhanced timeline visualization with parallel event tracks, improving information density and user comprehension of Star Trek chronology.

**Files to Modify**:
- `src/modules/timeline-viz.ts` (resolve TODO at line 566)
- `src/modules/types.ts` (add track configuration types)
- `test/timeline-viz.test.ts` (add multi-track tests)

**Estimated Effort**: 4-6 hours

---

## Prompt 2: Optimize Bundle Size with Code Splitting

**Context**: Current bundle is 169.07 kB (46.22 kB gzipped). Implement code splitting to improve initial load time.

### User Prompt

> Implement code splitting and lazy loading for the VBS application to reduce initial bundle size. Focus on:
>
> 1. **D3.js Lazy Loading**: D3 is a significant portion of the bundle. Load it dynamically when timeline visualization is needed.
> 2. **Metadata Features**: Split metadata enrichment components into separate chunks loaded on-demand
> 3. **Route-Based Splitting**: If implementing routing, split by routes
> 4. **Preloading Strategy**: Implement intelligent preloading for likely-needed modules
>
> **Implementation Approach:**
> ```typescript
> // Example: Lazy load D3 and timeline
> const loadTimelineVisualization = async () => {
>   const [d3, timelineModule] = await Promise.all([
>     import('d3'),
>     import('./modules/timeline-viz')
>   ])
>   return timelineModule.createTimelineVisualization(container, events)
> }
> ```
>
> **Success Criteria:**
> - Initial bundle size reduced by 20-30%
> - Lazy-loaded modules fetched only when needed
> - No degradation in user experience
> - Performance metrics improved (Core Web Vitals)
> - All tests passing
> - Vite configuration properly handles code splitting
>
> **Bonus**: Implement loading indicators for lazy-loaded modules to improve perceived performance.

**Expected Outcome**: Faster initial page load, improved Core Web Vitals scores, better performance on slower networks.

**Files to Modify**:
- `src/main.ts` (implement lazy loading orchestration)
- `src/modules/timeline-viz.ts` (refactor for code splitting)
- `vite.config.ts` (optimize chunk splitting)
- `src/components/loading-indicator.ts` (new file)

**Estimated Effort**: 3-4 hours

---

## Prompt 3: Create Comprehensive Accessibility Documentation

**Context**: VBS has excellent WCAG 2.1 AA accessibility implementation but lacks formal documentation.

### User Prompt

> Create comprehensive accessibility documentation for the VBS project to formalize WCAG 2.1 AA compliance and establish testing procedures. The documentation should:
>
> 1. **WCAG 2.1 AA Compliance Report**
>    - Document conformance to all Level A and AA success criteria
>    - Provide examples from codebase for each criterion
>    - Include testing methodology and results
>
> 2. **Keyboard Navigation Guide**
>    - Document all keyboard shortcuts
>    - Provide keyboard-only user flow examples
>    - Include focus management patterns
>
> 3. **Screen Reader Testing Guide**
>    - Document testing procedures with NVDA, JAWS, VoiceOver
>    - Provide expected screen reader announcements
>    - Include ARIA usage patterns and rationale
>
> 4. **Accessibility Testing Checklist**
>    - Pre-deployment accessibility verification checklist
>    - Automated testing recommendations (axe-core, pa11y)
>    - Manual testing procedures
>
> 5. **Future Accessibility Enhancements**
>    - Path to WCAG 2.1 AAA compliance
>    - Voice control integration possibilities
>    - Enhanced keyboard shortcuts
>
> **Success Criteria:**
> - Comprehensive markdown documentation in `docs/accessibility-compliance.md`
> - All WCAG 2.1 AA criteria documented with examples
> - Testing procedures clear and reproducible
> - Developer guidelines for maintaining accessibility
> - External accessibility audit-ready documentation

**Expected Outcome**: Formal accessibility documentation that enables external audits, helps new contributors maintain accessibility standards, and demonstrates commitment to inclusive design.

**Files to Create**:
- `docs/accessibility-compliance.md` (primary document)
- `docs/accessibility-testing.md` (testing procedures)
- `docs/keyboard-navigation.md` (keyboard guide)
- `.github/ACCESSIBILITY.md` (quick reference for contributors)

**Estimated Effort**: 2-3 hours

---

## Additional Future Considerations

### Performance Monitoring Dashboard (Future Sprint)
Implement Core Web Vitals tracking and real-user monitoring:
- Integrate web-vitals library
- Set up performance budgets
- Create performance dashboard component
- Implement continuous monitoring

### Service Worker Automated Testing (Future Sprint)
Add comprehensive Service Worker testing:
- Set up Vitest Service Worker testing environment
- Test cache strategies and invalidation
- Verify background sync behavior
- Document PWA testing procedures

### IndexedDB Migration Completion (Planned)
Already documented in project roadmap:
- Complete migration from LocalStorage to IndexedDB
- Implement advanced caching strategies
- Enhance offline capabilities
- Test across browser environments

---

## Implementation Priority

**Immediate** (Next Sprint):
1. Multi-Track Timeline (addresses TODO, enhances UX)
2. Accessibility Documentation (compliance formalization)

**Short-Term** (Next 2-3 Sprints):
3. Code Splitting (performance optimization)

**Long-Term** (Future Versions):
- Performance monitoring
- Service Worker testing
- IndexedDB migration completion

---

## Conclusion

These three prompts address the medium-priority items identified in the comprehensive audit while setting up VBS for continued improvement. Each prompt includes clear success criteria, estimated effort, and specific files to modify, making them immediately actionable for future development sprints.

**Note**: All prompts are designed to maintain the project's high quality standards, including continued TypeScript strict mode compliance, comprehensive testing, and accessibility best practices.
