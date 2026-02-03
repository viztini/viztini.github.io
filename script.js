// Core logic for viztini.github.io

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initTabs();
    initKonamiCode();
    initBSOD();
});

let allPosts = [];
let searchQuery = '';
let activeTag = '';

async function loadPosts() {
    try {
        const response = await fetch('posts.json');
        allPosts = await response.json();

        // Sort posts by date descending, but keep pinned posts at the top
        allPosts.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.date.replace(/\./g, '-')) - new Date(a.date.replace(/\./g, '-'));
        });

        const path = window.location.pathname;
        if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
            renderRecentPosts();
            initSearch();
            initTagFiltering();
        } else if (path.endsWith('archive.html')) {
            renderArchive();
        }

        initRelativeDates();
    } catch (error) {
        console.error('Error loading posts:', error);
        const container = document.getElementById('blog-container') || document.querySelector('.archive-section');
        if (container) {
            container.innerHTML = '<p class="error">> ERROR: FAILED TO LOAD SYSTEM DATA...</p>';
        }
    }
}

function renderRecentPosts() {
    const container = document.getElementById('blog-container');
    if (!container) return;

    // Filter posts
    const filteredPosts = allPosts.filter(post => {
        const matchesQuery = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = activeTag ? post.tags.includes(activeTag) : true;
        return matchesQuery && matchesTag;
    });

    // Keep the section title
    const title = container.querySelector('.section-title');
    container.innerHTML = '';
    if (title) container.appendChild(title);

    if (filteredPosts.length === 0) {
        container.innerHTML += '<p class="no-results">> NO MATCHING FILES FOUND.</p>';
        updateStatusBar(`Search complete. 0 files found.`);
    } else {
        filteredPosts.forEach((post, index) => {
            const article = document.createElement('article');
            article.className = `blog-post${post.pinned ? ' pinned' : ''}`;

            // Handle pagination (initial state) - only if no search/filter active
            if (!searchQuery && !activeTag && index >= 5) {
                article.classList.add('hidden');
            }

            const displayTitle = highlightText(post.title, searchQuery);
            const displayContent = highlightText(post.content.replace(/\n/g, '<br>'), searchQuery);

            article.innerHTML = `
                <div class="blog-post-inner">
                    <div class="post-header">
                        <h3>${displayTitle}</h3>
                        <span class="post-date">${post.date}</span>
                    </div>
                    <div class="post-content">${displayContent}</div>
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
            container.appendChild(article);
        });

        const statusMsg = (searchQuery || activeTag)
            ? `Found ${filteredPosts.length} post(s) matching your criteria.`
            : `System ready. ${allPosts.length} posts loaded.`;
        updateStatusBar(statusMsg);
    }

    initPagination();
    attachTagListeners();
}

function renderArchive() {
    const container = document.querySelector('.archive-section');
    if (!container) return;

    // Keep the header
    const header = container.querySelector('.header') || container.closest('.window-content').querySelector('.header');
    const nav = container.closest('.window-content').querySelector('.nav-bar');

    // Group marks by year
    const years = {};
    allPosts.forEach(post => {
        const year = post.date.split('.')[0];
        if (!years[year]) years[year] = [];
        years[year].push(post);
    });

    // Clear and rebuild
    const windowContent = container.closest('.window-content');
    const oldSections = windowContent.querySelectorAll('.archive-section');
    oldSections.forEach(s => s.remove());

    const sortedYears = Object.keys(years).sort((a, b) => b - a);

    sortedYears.forEach(year => {
        const section = document.createElement('div');
        section.className = 'archive-section';

        let postsHtml = years[year].map(post => `
            <div class="archive-item">
                <div class="archive-info">
                    <h3>${post.title}</h3>
                    <div class="archive-tags">
                        ${post.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('')}
                    </div>
                </div>
                <span class="archive-date">${post.date}</span>
            </div>
        `).join('');

        section.innerHTML = `
            <h2 class="year-header">${year}</h2>
            <div class="archive-list">
                ${postsHtml}
            </div>
        `;

        windowContent.insertBefore(section, windowContent.querySelector('.status-bar'));
    });
}

function initPagination() {
    const posts = document.querySelectorAll('.blog-post');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const postsPerPage = 5;
    let visibleCount = 0;

    if (!posts.length) return;

    posts.forEach((post, index) => {
        if (index < postsPerPage) {
            visibleCount++;
        }
    });

    if (visibleCount === posts.length && loadMoreBtn) {
        loadMoreBtn.classList.add('hidden');
    } else if (loadMoreBtn) {
        loadMoreBtn.classList.remove('hidden');

        // Remove old listener to prevent duplicates
        const newBtn = loadMoreBtn.cloneNode(true);
        loadMoreBtn.parentNode.replaceChild(newBtn, loadMoreBtn);

        newBtn.addEventListener('click', () => {
            let revealed = 0;
            const hiddenPosts = document.querySelectorAll('.blog-post.hidden');

            hiddenPosts.forEach((post) => {
                if (revealed < postsPerPage) {
                    post.classList.remove('hidden');
                    revealed++;
                }
            });

            const remainingHidden = document.querySelectorAll('.blog-post.hidden').length;
            if (remainingHidden === 0) {
                newBtn.classList.add('hidden');
            }
        });
    }
}

function initRelativeDates() {
    const dateElements = document.querySelectorAll('.post-date, .archive-date');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    dateElements.forEach(el => {
        const dateStr = el.textContent.trim();
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            const postDate = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2])
            );

            const diffTime = today - postDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
                if (diffDays === 0) {
                    el.textContent = "Today";
                } else if (diffDays === 1) {
                    el.textContent = "Yesterday";
                } else {
                    el.textContent = `${diffDays} days ago`;
                }
            }
        }
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.w95-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const panes = document.querySelectorAll('.w95-tab-pane');
            panes.forEach(p => p.classList.remove('active'));

            const targetId = tab.dataset.target;
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

function initKonamiCode() {
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let index = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === code[index]) {
            index++;
            if (index === code.length) {
                activatePartyMode();
                index = 0;
            }
        } else {
            index = 0;
        }
    });
}

function activatePartyMode() {
    document.body.classList.toggle('easter-egg-mode');
    alert("SYSTEM ALERT: PARTY MODE ACTIVATED");
}

function triggerBootScreen() {
    const existing = document.getElementById('boot-screen');
    if (existing) existing.remove();

    const boot = document.createElement('div');
    boot.id = 'boot-screen';
    boot.style.position = 'fixed';
    boot.style.top = '0';
    boot.style.left = '0';
    boot.style.width = '100vw';
    boot.style.height = '100vh';
    boot.style.background = 'black';
    boot.style.color = '#c0c0c0';
    boot.style.fontFamily = "'Courier New', monospace";
    boot.style.zIndex = '2147483647';
    boot.style.padding = '20px';
    boot.style.display = 'flex';
    boot.style.flexDirection = 'column';
    boot.style.boxSizing = 'border-box';

    document.body.appendChild(boot);

    const sequence = [
        { text: "Award Modular BIOS v4.51PG, An Energy Star Ally", delay: 0 },
        { text: "Copyright (C) 1984-95, Award Software, Inc.", delay: 0 },
        { text: "<br>", delay: 0 },
        { text: "PENTIUM-S CPU at 133MHz", delay: 800 },
        { text: "Memory Test :  65536K OK", delay: 1800 },
        { text: "<br>", delay: 0 },
        { text: "Award Plug and Play BIOS Extension v1.0A", delay: 2800 },
        { text: "Copyright (C) 1995, Award Software, Inc.", delay: 3000 },
        { text: "<br>", delay: 0 },
        { text: "Detecting HDD Primary Master ... WDC AC31600H", delay: 4000 },
        { text: "Detecting HDD Primary Slave  ... None", delay: 4500 },
        { text: "Detecting HDD Secondary Master ... None", delay: 4800 },
        { text: "Detecting HDD Secondary Slave  ... None", delay: 5100 },
        { text: "<br>", delay: 0 },
        { text: "<br>", delay: 0 },
        { text: "Starting Windows 95...", delay: 6500 }
    ];

    sequence.forEach(item => {
        setTimeout(() => {
            const el = document.createElement('div');
            el.innerHTML = item.text;
            boot.appendChild(el);
        }, item.delay);
    });

    document.body.classList.add('noscroll');

    setTimeout(() => {
        boot.innerHTML = '';
        boot.style.background = 'black';
        boot.style.display = 'flex';
        boot.style.alignItems = 'center';
        boot.style.justifyContent = 'center';

        const video = document.createElement('video');
        video.src = 'assets/boot.mp4';
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.style.transition = 'opacity 1.5s ease-out';

        boot.appendChild(video);

        video.onended = () => {
            boot.style.transition = 'opacity 1.5s ease-out';
            boot.style.opacity = '0';

            setTimeout(() => {
                boot.remove();
                document.body.classList.remove('noscroll');
                showWelcomePopup();
            }, 1500);
        };

        video.onerror = () => {
            location.reload();
        };

    }, 6500);
}

window.bsod = function () {
    console.log("A system integrity violation has occurred.");

    const existing = document.getElementById('bsod-screen');
    if (existing) existing.remove();

    document.body.classList.add('noscroll');

    const bsod = document.createElement('div');
    bsod.id = 'bsod-screen';
    bsod.style.position = 'fixed';
    bsod.style.top = '0';
    bsod.style.left = '0';
    bsod.style.width = '100vw';
    bsod.style.height = '100vh';
    bsod.style.background = '#0000AA';
    bsod.style.color = 'white';
    bsod.style.fontFamily = "'Courier New', monospace";
    bsod.style.fontSize = '16px';
    bsod.style.fontWeight = 'bold';
    bsod.style.zIndex = '2147483647';
    bsod.style.padding = '50px';
    bsod.style.cursor = 'none';
    bsod.style.boxSizing = 'border-box';
    bsod.style.display = 'block';

    bsod.innerHTML = `
        <p style="background: #0000AA; display: inline;">A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. The current application will be terminated.</p>
        <br><br>
        <p>* Press any key to terminate the current application.</p>
        <p>* Press CTRL+ALT+DEL again to restart your computer. You will lose any unsaved information in all applications.</p>
        <br><br>
        <p style="text-align: center; margin-top: 50px;">Press Enter to reboot your computer</p>
    `;
    document.body.appendChild(bsod);

    const handleReboot = (e) => {
        if (e.key === 'Enter') {
            console.log("SYS_Input: VK_RETURN   SYS_Reboot(1500)");
            document.removeEventListener('keydown', handleReboot);

            setTimeout(() => {
                bsod.remove();
                triggerBootScreen();
            }, 1500);
        }
    };

    setTimeout(() => {
        document.addEventListener('keydown', handleReboot);
    }, 500);

    return "Kernel panic. CPU halted.";
};

function initBSOD() {
    const trigger = document.querySelector('.status-item:last-child');
    if (trigger) {
        trigger.style.cursor = 'help';
        trigger.title = "Do not click";
        trigger.addEventListener('click', () => {
            window.bsod();
        });
    }
}

function showWelcomePopup() {
    const audio = new Audio('assets/error.mp3');
    audio.play().catch(e => console.log("Audio play failed:", e));

    const img = document.createElement('img');
    img.src = 'assets/error.png';
    img.style.position = 'fixed';
    img.style.top = '50%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = '2147483647';
    img.style.cursor = 'pointer';
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '90vh';

    img.onclick = () => {
        img.remove();
    };

    document.body.appendChild(img);
}

function initSearch() {
    const searchInput = document.getElementById('post-search');
    const clearBtn = document.getElementById('clear-search');
    const resetBtn = document.getElementById('reset-filters');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
        renderRecentPosts();
    });

    clearBtn.addEventListener('click', () => {
        searchQuery = '';
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        renderRecentPosts();
    });

    resetBtn.addEventListener('click', () => {
        searchQuery = '';
        activeTag = '';
        searchInput.value = '';
        clearBtn.classList.add('hidden');
        document.getElementById('filter-status').classList.add('hidden');
        renderRecentPosts();
    });
}

function initTagFiltering() {
    // Initial call to attach listeners to any tags already rendered
    attachTagListeners();
}

function attachTagListeners() {
    const tags = document.querySelectorAll('.tag');
    tags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            activeTag = tag.dataset.tag;

            const filterStatus = document.getElementById('filter-status');
            const activeFilterName = document.getElementById('active-filter-name');

            if (activeTag) {
                filterStatus.classList.remove('hidden');
                activeFilterName.textContent = activeTag;
                window.scrollTo({ top: document.querySelector('.search-container').offsetTop - 20, behavior: 'smooth' });
            }

            renderRecentPosts();
        });
    });
}

function updateStatusBar(message) {
    const statusItem = document.querySelector('.status-item:first-child');
    if (statusItem) {
        statusItem.textContent = message;
    }
}

function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}
