# 🖖 VBS: View By Stardate

> An Interactive Star Trek Chronological Viewing Guide

VBS (View By Stardate) is a comprehensive, interactive web application that helps Star Trek fans watch all series and movies in chronological order by in-universe stardate, rather than production order. Track your progress through the entire Star Trek universe while exploring centuries of future history.

## ✨ Features

### 📊 **Progress Tracking**

- ✅ Mark individual seasons/movies as watched with persistent local storage
- 📈 Overall progress bar showing completion percentage across all content
- 🎯 Era-specific progress indicators for each century/time period
- 💾 Export/import functionality to backup and restore your viewing progress

### 🔍 **Search & Discovery**

- 🔎 Real-time search across series titles, episodes, and notes
- 🎭 Filter content by type (TV Series, Movies, Animated)
- 📅 Content organized by chronological eras from 22nd to 32nd century
- 🌟 Detailed stardate ranges and viewing notes for each entry

### 🎨 **Modern Interface**

- 📱 Responsive design optimized for desktop and mobile devices
- 🎛️ Collapsible era sections with expand/collapse controls
- 🚀 Star Trek-inspired color scheme and smooth animations
- ♿ Accessible design with proper focus states and keyboard navigation

### 📚 **Comprehensive Coverage**

- **7 chronological eras** spanning 1,000+ years of Star Trek history
- **All series**: Enterprise, Discovery, Strange New Worlds, TOS, TNG, DS9, Voyager, Lower Decks, Prodigy, Picard
- **All movies**: From The Motion Picture through the latest releases
- **Detailed metadata**: Episode counts, stardates, years, and contextual notes

## 🚀 Quick Start

1. **Clone or download** this repository to your local machine
2. **Open `index.html`** in any modern web browser (Chrome, Firefox, Safari, Edge)
3. **Start tracking** your Star Trek viewing journey!

```bash
git clone https://github.com/marcusrbrown/vbs.git
cd vbs
open index.html  # macOS
# or double-click index.html in your file explorer
```

## 📖 Usage Guide

### Getting Started

1. **Browse eras**: Click on any era header to expand and view the content
2. **Mark as watched**: Check the box next to any series or movie you've completed
3. **Track progress**: Watch your progress bars fill up as you advance through Star Trek history
4. **Search content**: Use the search bar to find specific series or episodes
5. **Filter by type**: Use the dropdown to show only series, movies, or animated content

### Managing Your Progress

- **Auto-save**: Your progress is automatically saved to your browser's local storage
- **Export progress**: Click "Export Progress" to download a JSON backup file
- **Import progress**: Click "Import Progress" to restore from a previously exported file
- **Reset progress**: Use "Reset Progress" to start fresh (with confirmation)

### Viewing Controls

- **Expand All**: Open all era sections at once
- **Collapse All**: Close all era sections for a cleaner view
- **Search**: Find content across all eras instantly
- **Filter**: Show only specific types of content

## 📁 Project Structure

```text
vbs/
├── index.html          # Main application interface
├── script.js           # Interactive functionality and Star Trek data
├── style.css           # Modern, responsive styling
├── viewing-guide.md    # Comprehensive markdown viewing guide
├── .vscode/            # VS Code configuration
│   └── mcp.json       # Model Context Protocol configuration
└── README.md          # This file
```

### File Descriptions

- **`index.html`**: The main web application with header, controls, and timeline container
- **`script.js`**: Contains the complete Star Trek data structure and all interactive functionality (progress tracking, search, filtering, data persistence)
- **`style.css`**: Modern CSS with CSS Grid/Flexbox layouts, Star Trek-inspired color scheme, and responsive design
- **`viewing-guide.md`**: Detailed markdown reference with comprehensive stardate information and viewing notes

## 🗓️ Chronological Order

The viewing guide follows this chronological progression by in-universe stardate:

1. **22nd Century** - Enterprise Era (2151-2161)
2. **Mid-23rd Century** - Discovery & Strange New Worlds Era (2256-2261)
3. **23rd Century** - Original Series Era (2265-2293)
4. **24th Century** - Next Generation Era (2364-2379)
5. **Late 24th Century** - Lower Decks & Prodigy Era (2380-2383)
6. **25th Century** - Picard Era (2399-2401)
7. **32nd Century** - Far Future Discovery Era (3188-3191)

## 🛠️ Technical Details

### Technologies Used

- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript (ES6+)
- **Storage**: Browser LocalStorage API for progress persistence
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties (Variables)
- **Responsive Design**: Mobile-first approach with media queries

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### Data Structure

The Star Trek data is organized as a JavaScript array of era objects, each containing:

- Era metadata (title, years, stardate ranges, description)
- Array of content items (series/movies) with detailed information
- Unique IDs for progress tracking

## 📚 Data Sources & Accuracy

This guide is based on comprehensive research from:

- **Memory Alpha** - The Star Trek Wiki (primary source for stardate information)
- **Official Star Trek** production materials and episode guides
- **Timeline analysis** from Star Trek reference works

### Known Issues

- Some citation links in `viewing-guide.md` may not be functional (legacy oai_citation references)
- Stardate systems vary between series; we follow the most consistent chronological interpretation
- New content releases may require manual updates to the data structure

## 🤝 Contributing

We welcome contributions from fellow Star Trek fans and developers!

### Ways to Contribute

- 📝 **Content updates**: Add new series, correct stardate information, improve viewing notes
- 🐛 **Bug fixes**: Report and fix issues with the interface or functionality
- ✨ **Feature enhancements**: Implement new features like episode-level tracking or timeline visualization
- 🎨 **Design improvements**: Enhance the UI/UX or add accessibility features

### How to Contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Gene Roddenberry** and all Star Trek creators for the incredible universe
- **Memory Alpha contributors** for maintaining comprehensive Star Trek databases
- **Star Trek fans worldwide** who keep the spirit of exploration alive
- **Open source community** for tools and inspiration

## 🔮 Future Roadmap

Interested in what's coming next? Here are some planned enhancements:

- Individual episode tracking with detailed synopses
- Interactive timeline visualization
- Character-focused viewing paths
- Integration with streaming services
- Mobile app version

---

**Live long and prosper!** 🖖

<!-- Last updated: July 17, 2025 -->
