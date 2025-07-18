// Star Trek Chronological Viewing Guide Data
const starTrekData = [
    {
        id: 'enterprise',
        title: '22nd Century – Enterprise Era',
        years: '2151–2161',
        stardates: 'Earth years & simple logs',
        description: 'The beginning of human space exploration and first contact protocols',
        items: [
            {
                id: 'ent_s1',
                title: 'Star Trek: Enterprise Season 1',
                type: 'series',
                year: '2151',
                stardate: '~1.1-1.26',
                episodes: 26,
                notes: 'First warp flight era, Enterprise NX-01 launch'
            },
            {
                id: 'ent_s2',
                title: 'Star Trek: Enterprise Season 2',
                type: 'series',
                year: '2152',
                stardate: '~2.1-2.26',
                episodes: 26,
                notes: 'Temporal Cold War intensifies'
            },
            {
                id: 'ent_s3',
                title: 'Star Trek: Enterprise Season 3',
                type: 'series',
                year: '2153',
                stardate: '~3.1-3.24',
                episodes: 24,
                notes: 'Xindi War arc in the Delphic Expanse'
            },
            {
                id: 'ent_s4',
                title: 'Star Trek: Enterprise Season 4',
                type: 'series',
                year: '2154-2161',
                stardate: '~4.1-4.22',
                episodes: 22,
                notes: 'Formation of Coalition of Planets, leads to Federation'
            }
        ]
    },
    {
        id: 'discovery_snw',
        title: 'Mid-23rd Century – Discovery & Strange New Worlds Era',
        years: '2256–2261',
        stardates: '1207-2259+',
        description: 'The Klingon War era and Pike\'s Enterprise',
        items: [
            {
                id: 'disc_s1',
                title: 'Star Trek: Discovery Season 1',
                type: 'series',
                year: '2256',
                stardate: '1207.3+',
                episodes: 15,
                notes: 'Klingon War begins, USS Discovery & Michael Burnham'
            },
            {
                id: 'disc_s2',
                title: 'Star Trek: Discovery Season 2',
                type: 'series',
                year: '2257',
                stardate: '1208+',
                episodes: 14,
                notes: 'Red Angel mystery, Pike commands Discovery'
            },
            {
                id: 'snw_s1',
                title: 'Star Trek: Strange New Worlds Season 1',
                type: 'series',
                year: '2259',
                stardate: '2259.0+',
                episodes: 10,
                notes: 'Pike\'s Enterprise crew adventures'
            },
            {
                id: 'snw_s2',
                title: 'Star Trek: Strange New Worlds Season 2',
                type: 'series',
                year: '2260',
                stardate: '2260+',
                episodes: 10,
                notes: 'Continues Pike era, leads into TOS'
            },
            {
                id: 'snw_s3',
                title: 'Star Trek: Strange New Worlds Season 3',
                type: 'series',
                year: '2261',
                stardate: '2261+',
                episodes: 10,
                notes: 'Final Pike era before Kirk takes command'
            }
        ]
    },
    {
        id: 'tos_era',
        title: '23rd Century – Original Series Era',
        years: '2265–2293',
        stardates: '1312-9999',
        description: 'Kirk\'s five-year mission and the classic movies',
        items: [
            {
                id: 'tos_s1',
                title: 'Star Trek: The Original Series Season 1',
                type: 'series',
                year: '2265-2266',
                stardate: '1312.4-3198.4',
                episodes: 29,
                notes: 'Kirk takes command, classic five-year mission begins'
            },
            {
                id: 'tos_s2',
                title: 'Star Trek: The Original Series Season 2',
                type: 'series',
                year: '2267',
                stardate: '3018.2-4729.4',
                episodes: 26,
                notes: 'Continuing adventures, introduction of key concepts'
            },
            {
                id: 'tos_s3',
                title: 'Star Trek: The Original Series Season 3',
                type: 'series',
                year: '2268-2269',
                stardate: '4385.3-5928.5',
                episodes: 24,
                notes: 'Final season of five-year mission'
            },
            {
                id: 'tas_s1',
                title: 'Star Trek: The Animated Series Season 1',
                type: 'animated',
                year: '2270',
                stardate: '5221.3-5683.1',
                episodes: 16,
                notes: 'Animated continuation of TOS'
            },
            {
                id: 'tas_s2',
                title: 'Star Trek: The Animated Series Season 2',
                type: 'animated',
                year: '2270-2274',
                stardate: '6000.0-6146.0',
                episodes: 6,
                notes: 'Final animated episodes'
            },
            {
                id: 'tmp',
                title: 'Star Trek: The Motion Picture',
                type: 'movie',
                year: '2273',
                stardate: '7410.0-7599.0',
                episodes: 1,
                notes: 'V\'Ger crisis, Enterprise refit'
            },
            {
                id: 'twok',
                title: 'Star Trek II: The Wrath of Khan',
                type: 'movie',
                year: '2285',
                stardate: '8130.3',
                episodes: 1,
                notes: 'Khan returns, Spock\'s sacrifice'
            },
            {
                id: 'tsfs',
                title: 'Star Trek III: The Search for Spock',
                type: 'movie',
                year: '2285',
                stardate: '8210.3',
                episodes: 1,
                notes: 'Spock\'s resurrection, Enterprise destroyed'
            },
            {
                id: 'tvh',
                title: 'Star Trek IV: The Voyage Home',
                type: 'movie',
                year: '2286',
                stardate: '8390.0',
                episodes: 1,
                notes: 'Time travel to save whales'
            },
            {
                id: 'tff',
                title: 'Star Trek V: The Final Frontier',
                type: 'movie',
                year: '2287',
                stardate: '8454.1',
                episodes: 1,
                notes: 'Search for God, Enterprise-A'
            },
            {
                id: 'tuc',
                title: 'Star Trek VI: The Undiscovered Country',
                type: 'movie',
                year: '2293',
                stardate: '9521.6',
                episodes: 1,
                notes: 'Klingon peace, end of TOS era'
            }
        ]
    },
    {
        id: 'tng_era',
        title: '24th Century – Next Generation Era',
        years: '2364–2379',
        stardates: '41000-56999',
        description: 'Picard\'s Enterprise and the golden age of Star Trek',
        items: [
            {
                id: 'tng_s1',
                title: 'Star Trek: The Next Generation Season 1',
                type: 'series',
                year: '2364',
                stardate: '41000-41999',
                episodes: 26,
                notes: 'Enterprise-D launched, Q introduced'
            },
            {
                id: 'tng_s2',
                title: 'Star Trek: The Next Generation Season 2',
                type: 'series',
                year: '2365',
                stardate: '42000-42999',
                episodes: 22,
                notes: 'Borg first mentioned, Pulaski replaces Crusher'
            },
            {
                id: 'tng_s3',
                title: 'Star Trek: The Next Generation Season 3',
                type: 'series',
                year: '2366',
                stardate: '43000-43999',
                episodes: 26,
                notes: 'Crusher returns, Borg encounter'
            },
            {
                id: 'tng_s4',
                title: 'Star Trek: The Next Generation Season 4',
                type: 'series',
                year: '2367',
                stardate: '44000-44999',
                episodes: 26,
                notes: 'Best of Both Worlds conclusion, Worf\'s family'
            },
            {
                id: 'tng_s5',
                title: 'Star Trek: The Next Generation Season 5',
                type: 'series',
                year: '2368',
                stardate: '45000-45999',
                episodes: 26,
                notes: 'Unification with Spock, time travel'
            },
            {
                id: 'tng_s6',
                title: 'Star Trek: The Next Generation Season 6',
                type: 'series',
                year: '2369',
                stardate: '46000-46999',
                episodes: 26,
                notes: 'Chain of Command, overlaps with DS9 S1'
            },
            {
                id: 'ds9_s1',
                title: 'Star Trek: Deep Space Nine Season 1',
                type: 'series',
                year: '2369',
                stardate: '46000-46999',
                episodes: 20,
                notes: 'Sisko arrives at DS9, wormhole discovered'
            },
            {
                id: 'tng_s7',
                title: 'Star Trek: The Next Generation Season 7',
                type: 'series',
                year: '2370',
                stardate: '47000-47999',
                episodes: 26,
                notes: 'Final TNG season, All Good Things finale'
            },
            {
                id: 'ds9_s2',
                title: 'Star Trek: Deep Space Nine Season 2',
                type: 'series',
                year: '2370',
                stardate: '47000-47999',
                episodes: 26,
                notes: 'Dominion introduced, Maquis conflict'
            },
            {
                id: 'generations',
                title: 'Star Trek Generations',
                type: 'movie',
                year: '2371',
                stardate: '48650.1',
                episodes: 1,
                notes: 'Kirk dies, Enterprise-D destroyed'
            },
            {
                id: 'ds9_s3',
                title: 'Star Trek: Deep Space Nine Season 3',
                type: 'series',
                year: '2371',
                stardate: '48000-48999',
                episodes: 26,
                notes: 'Defiant arrives, Dominion threat grows'
            },
            {
                id: 'voy_s1',
                title: 'Star Trek: Voyager Season 1',
                type: 'series',
                year: '2371',
                stardate: '48000-48999',
                episodes: 16,
                notes: 'Voyager stranded in Delta Quadrant'
            },
            {
                id: 'ds9_s4',
                title: 'Star Trek: Deep Space Nine Season 4',
                type: 'series',
                year: '2372',
                stardate: '49000-49999',
                episodes: 26,
                notes: 'Klingon War, Worf joins DS9'
            },
            {
                id: 'voy_s2',
                title: 'Star Trek: Voyager Season 2',
                type: 'series',
                year: '2372',
                stardate: '49000-49999',
                episodes: 26,
                notes: 'Kazon conflicts, Seska betrayal'
            },
            {
                id: 'ds9_s5',
                title: 'Star Trek: Deep Space Nine Season 5',
                type: 'series',
                year: '2373',
                stardate: '50000-50999',
                episodes: 26,
                notes: 'Dominion War begins'
            },
            {
                id: 'voy_s3',
                title: 'Star Trek: Voyager Season 3',
                type: 'series',
                year: '2373',
                stardate: '50000-50999',
                episodes: 26,
                notes: 'Borg encounters, Seven of Nine introduced'
            },
            {
                id: 'first_contact',
                title: 'Star Trek: First Contact',
                type: 'movie',
                year: '2373',
                stardate: '50893.5',
                episodes: 1,
                notes: 'Borg time travel, Zefram Cochrane'
            },
            {
                id: 'ds9_s6',
                title: 'Star Trek: Deep Space Nine Season 6',
                type: 'series',
                year: '2374',
                stardate: '51000-51999',
                episodes: 26,
                notes: 'Dominion occupation of DS9'
            },
            {
                id: 'voy_s4',
                title: 'Star Trek: Voyager Season 4',
                type: 'series',
                year: '2374',
                stardate: '51000-51999',
                episodes: 26,
                notes: 'Seven of Nine joins crew, Species 8472'
            },
            {
                id: 'ds9_s7',
                title: 'Star Trek: Deep Space Nine Season 7',
                type: 'series',
                year: '2375',
                stardate: '52000-52999',
                episodes: 26,
                notes: 'Dominion War ends, series finale'
            },
            {
                id: 'voy_s5',
                title: 'Star Trek: Voyager Season 5',
                type: 'series',
                year: '2375',
                stardate: '52000-52999',
                episodes: 26,
                notes: 'Malon, Think Tank, Equinox'
            },
            {
                id: 'insurrection',
                title: 'Star Trek: Insurrection',
                type: 'movie',
                year: '2375',
                stardate: '52500',
                episodes: 1,
                notes: 'Ba\'ku planet, fountain of youth'
            },
            {
                id: 'voy_s6',
                title: 'Star Trek: Voyager Season 6',
                type: 'series',
                year: '2376',
                stardate: '53000-53999',
                episodes: 26,
                notes: 'Pathfinder, Borg children'
            },
            {
                id: 'voy_s7',
                title: 'Star Trek: Voyager Season 7',
                type: 'series',
                year: '2377-2378',
                stardate: '54000-56999',
                episodes: 26,
                notes: 'Return to Alpha Quadrant'
            },
            {
                id: 'nemesis',
                title: 'Star Trek: Nemesis',
                type: 'movie',
                year: '2379',
                stardate: '56844.9',
                episodes: 1,
                notes: 'Shinzon, Data\'s sacrifice'
            }
        ]
    },
    {
        id: 'late_24th',
        title: 'Late 24th Century – Lower Decks & Prodigy Era',
        years: '2380–2383',
        stardates: '57000-60000+',
        description: 'Post-Dominion War recovery and new adventures',
        items: [
            {
                id: 'ld_s1',
                title: 'Star Trek: Lower Decks Season 1',
                type: 'animated',
                year: '2380',
                stardate: '57601.3+',
                episodes: 10,
                notes: 'USS Cerritos, junior officers perspective'
            },
            {
                id: 'ld_s2',
                title: 'Star Trek: Lower Decks Season 2',
                type: 'animated',
                year: '2381',
                stardate: '58000+',
                episodes: 10,
                notes: 'Continued Lower Decks adventures'
            },
            {
                id: 'ld_s3',
                title: 'Star Trek: Lower Decks Season 3',
                type: 'animated',
                year: '2382',
                stardate: '58500+',
                episodes: 10,
                notes: 'Cerritos crew development'
            },
            {
                id: 'prodigy_s1',
                title: 'Star Trek: Prodigy Season 1',
                type: 'animated',
                year: '2383',
                stardate: '60712.56',
                episodes: 20,
                notes: 'USS Protostar, young crew in Delta Quadrant'
            },
            {
                id: 'ld_s4',
                title: 'Star Trek: Lower Decks Season 4',
                type: 'animated',
                year: '2383',
                stardate: '58900+',
                episodes: 10,
                notes: 'Final season of Lower Decks'
            }
        ]
    },
    {
        id: 'picard_era',
        title: '25th Century – Picard Era',
        years: '2399–2401',
        stardates: '76000-78999',
        description: 'Picard\'s final adventures and legacy',
        items: [
            {
                id: 'pic_s1',
                title: 'Star Trek: Picard Season 1',
                type: 'series',
                year: '2399',
                stardate: '76000+',
                episodes: 10,
                notes: 'Picard comes out of retirement, synthetic ban'
            },
            {
                id: 'pic_s2',
                title: 'Star Trek: Picard Season 2',
                type: 'series',
                year: '2401',
                stardate: '78000+',
                episodes: 10,
                notes: 'Q returns, alternate timeline'
            },
            {
                id: 'pic_s3',
                title: 'Star Trek: Picard Season 3',
                type: 'series',
                year: '2401',
                stardate: '78183+',
                episodes: 10,
                notes: 'TNG crew reunion, Enterprise-G'
            }
        ]
    },
    {
        id: 'far_future',
        title: '32nd Century – Far Future',
        years: '3188–3191',
        stardates: '865000+',
        description: 'The distant future and Discovery\'s final journey',
        items: [
            {
                id: 'disc_s3',
                title: 'Star Trek: Discovery Season 3',
                type: 'series',
                year: '3188',
                stardate: '865211.3',
                episodes: 13,
                notes: 'Discovery jumps to 32nd century, "The Burn"'
            },
            {
                id: 'disc_s4',
                title: 'Star Trek: Discovery Season 4',
                type: 'series',
                year: '3190',
                stardate: '865600+',
                episodes: 13,
                notes: 'Dark Matter Anomaly, galactic threat'
            },
            {
                id: 'disc_s5',
                title: 'Star Trek: Discovery Season 5',
                type: 'series',
                year: '3191',
                stardate: '865800+',
                episodes: 10,
                notes: 'Final season, ancient mysteries'
            }
        ]
    }
];

// Application state
let watchedItems = JSON.parse(localStorage.getItem('starTrekProgress')) || [];
let currentFilter = '';
let currentSearch = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    renderTimeline();
    updateOverallProgress();
}

function setupEventListeners() {
    // Search and filter
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('filterSelect').addEventListener('change', handleFilter);

    // Control buttons
    document.getElementById('expandAll').addEventListener('click', () => toggleAllEras(true));
    document.getElementById('collapseAll').addEventListener('click', () => toggleAllEras(false));
    document.getElementById('resetProgress').addEventListener('click', resetProgress);
    document.getElementById('exportProgress').addEventListener('click', exportProgress);
    document.getElementById('importButton').addEventListener('click', () => document.getElementById('importProgress').click());
    document.getElementById('importProgress').addEventListener('change', importProgress);
}

function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    const filteredData = filterData();

    filteredData.forEach(era => {
        const eraElement = createEraElement(era);
        container.appendChild(eraElement);
    });
}

function createEraElement(era) {
    const eraDiv = document.createElement('div');
    eraDiv.className = 'era';
    eraDiv.dataset.eraId = era.id;

    const completedItems = era.items.filter(item => watchedItems.includes(item.id)).length;
    const totalItems = era.items.length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    eraDiv.innerHTML = `
        <div class="era-header" onclick="toggleEra('${era.id}')">
            <div class="era-title">
                <h2>${era.title}</h2>
                <span class="era-details">${era.years} • Stardates: ${era.stardates}</span>
            </div>
            <div class="era-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                <span class="progress-text">${completedItems}/${totalItems}</span>
                <span class="expand-icon">▼</span>
            </div>
        </div>
        <div class="era-description">${era.description}</div>
        <div class="era-content">
            ${era.items.map(item => createItemElement(item)).join('')}
        </div>
    `;

    return eraDiv;
}

function createItemElement(item) {
    const isWatched = watchedItems.includes(item.id);
    const typeClass = `type-${item.type}`;

    return `
        <div class="viewing-item ${typeClass} ${isWatched ? 'watched' : ''}" data-item-id="${item.id}">
            <div class="item-checkbox">
                <input type="checkbox" id="${item.id}" ${isWatched ? 'checked' : ''}
                       onchange="toggleItem('${item.id}')" />
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
                    ${item.episodes > 1 ? `<span class="item-episodes">${item.episodes} episodes</span>` : ''}
                </div>
                <div class="item-notes">${item.notes}</div>
            </div>
        </div>
    `;
}

function toggleEra(eraId) {
    const eraElement = document.querySelector(`[data-era-id="${eraId}"]`);
    const content = eraElement.querySelector('.era-content');
    const icon = eraElement.querySelector('.expand-icon');

    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        eraElement.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        eraElement.classList.remove('expanded');
    }
}

function toggleAllEras(expand) {
    starTrekData.forEach(era => {
        const eraElement = document.querySelector(`[data-era-id="${era.id}"]`);
        if (eraElement) {
            const content = eraElement.querySelector('.era-content');
            const icon = eraElement.querySelector('.expand-icon');

            if (expand) {
                content.style.display = 'block';
                icon.textContent = '▲';
                eraElement.classList.add('expanded');
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
                eraElement.classList.remove('expanded');
            }
        }
    });
}

function toggleItem(itemId) {
    const checkbox = document.getElementById(itemId);
    const itemElement = checkbox.closest('.viewing-item');

    if (checkbox.checked) {
        if (!watchedItems.includes(itemId)) {
            watchedItems.push(itemId);
        }
        itemElement.classList.add('watched');
    } else {
        watchedItems = watchedItems.filter(id => id !== itemId);
        itemElement.classList.remove('watched');
    }

    saveProgress();
    updateOverallProgress();
    updateEraProgress();
}

function saveProgress() {
    localStorage.setItem('starTrekProgress', JSON.stringify(watchedItems));
}

function updateOverallProgress() {
    const totalItems = starTrekData.reduce((sum, era) => sum + era.items.length, 0);
    const completedItems = watchedItems.length;
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const progressFill = document.getElementById('overallProgress');
    const progressText = document.getElementById('overallProgressText');

    if (progressFill && progressText) {
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% Complete (${completedItems}/${totalItems})`;
    }
}

function updateEraProgress() {
    starTrekData.forEach(era => {
        const eraElement = document.querySelector(`[data-era-id="${era.id}"]`);
        if (eraElement) {
            const completedItems = era.items.filter(item => watchedItems.includes(item.id)).length;
            const totalItems = era.items.length;
            const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            const progressFill = eraElement.querySelector('.progress-fill');
            const progressText = eraElement.querySelector('.progress-text');

            if (progressFill && progressText) {
                progressFill.style.width = `${percentage}%`;
                progressText.textContent = `${completedItems}/${totalItems}`;
            }
        }
    });
}

function handleSearch(event) {
    currentSearch = event.target.value.toLowerCase();
    renderTimeline();
}

function handleFilter(event) {
    currentFilter = event.target.value;
    renderTimeline();
}

function filterData() {
    return starTrekData.map(era => ({
        ...era,
        items: era.items.filter(item => {
            const matchesSearch = !currentSearch ||
                item.title.toLowerCase().includes(currentSearch) ||
                item.notes.toLowerCase().includes(currentSearch) ||
                item.year.toLowerCase().includes(currentSearch);

            const matchesFilter = !currentFilter || item.type === currentFilter;

            return matchesSearch && matchesFilter;
        })
    })).filter(era => era.items.length > 0);
}

function resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        watchedItems = [];
        saveProgress();
        renderTimeline();
        updateOverallProgress();
    }
}

function exportProgress() {
    const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        progress: watchedItems
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `star-trek-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importProgress(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.progress && Array.isArray(data.progress)) {
                watchedItems = data.progress;
                saveProgress();
                renderTimeline();
                updateOverallProgress();
                alert('Progress imported successfully!');
            } else {
                alert('Invalid progress file format.');
            }
        } catch (error) {
            alert('Error reading progress file.');
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}
