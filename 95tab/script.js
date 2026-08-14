document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initTabs();
    initSearch();
    initMemoPad();
    initBookmarks();
    initTerminal();
});

const $ = id => document.getElementById(id);


// clock

function initClock() {
    const clock = $('system-clock');

    function updateClock() {
        clock.textContent = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    updateClock();
    setInterval(updateClock, 1000);
}


// tabs

function initTabs() {
    const tabs = document.querySelectorAll('.w95-tab');
    const panes = document.querySelectorAll('.w95-tab-pane');

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');

            const pane = $(`pane-${tab.dataset.target}`);
            pane.classList.add('active');

            if (tab.dataset.target === 'terminal') {
                $('terminal-input').focus();
            }
        };
    });
}


// search

function initSearch() {
    const form = $('search-form');
    const input = $('search-input');

    form.onsubmit = event => {
        event.preventDefault();

        const query = input.value.trim();

        if (query) {
            location.href =
                `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    };

    $('clear-search').onclick = () => {
        input.value = '';
        input.focus();
    };
}


// memo pad

function initMemoPad() {
    const textarea = $('memo-textarea');

    if (!textarea) return;

    const status = $('memo-status');
    const clear = $('memo-clear-btn');

    let saveTimer;

    const saved = localStorage.getItem('navi_memo_pad');

    if (saved) {
        textarea.value = saved;
        status.textContent = 'Notes: Loaded';
    }

    textarea.oninput = () => {
        status.textContent = 'Notes: Saving...';

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            localStorage.setItem('navi_memo_pad', textarea.value);

            const time = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            status.textContent = `Notes: Saved (${time})`;
        }, 500);
    };

    clear.onclick = () => {
        if (!confirm('Clear all memo contents?')) return;

        textarea.value = '';
        localStorage.removeItem('navi_memo_pad');
        status.textContent = 'Notes: Cleared';

        textarea.focus();
    };
}


// bookmarks

let bookmarks = JSON.parse(
    localStorage.getItem('navi_bookmarks')
) || [
    {
        name: 'GitHub',
        url: 'https://github.com',
        icon: '[G]'
    },
    {
        name: 'YouTube',
        url: 'https://youtube.com',
        icon: '[Y]'
    },
    {
        name: 'Reddit',
        url: 'https://reddit.com',
        icon: '[R]'
    },
    {
        name: 'Wiki',
        url: 'https://wikipedia.org',
        icon: '[W]'
    }
];


function initBookmarks() {
    renderBookmarks();
}


function renderBookmarks() {
    const container = $('bookmark-container');

    container.innerHTML = '';

    bookmarks.forEach(bookmark => {
        const link = document.createElement('a');

        link.href = bookmark.url;
        link.className = 'w95-icon-item';

        link.innerHTML = `
            <span class="w95-icon-img">${bookmark.icon}</span>
            <span class="icon-label">${bookmark.name}</span>
        `;

        container.appendChild(link);
    });

    // add link button
    const add = document.createElement('div');

    add.className = 'w95-icon-item';

    add.innerHTML = `
        <span class="w95-icon-img">[+]</span>
        <span class="icon-label">Add Link</span>
    `;

    add.onclick = addBookmark;

    container.appendChild(add);
}


function addBookmark() {
    const name = prompt('Enter bookmark name:');

    if (!name) return;

    let url = prompt('Enter URL:');

    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    bookmarks.push({
        name: name,
        url: url,
        icon: `[${name[0].toUpperCase()}]`
    });

    localStorage.setItem(
        'navi_bookmarks',
        JSON.stringify(bookmarks)
    );

    renderBookmarks();
}


// terminal

function initTerminal() {
    const input = $('terminal-input');
    const terminal = $('term-container');

    terminal.onclick = () => {
        input.focus();
    };

    input.onkeydown = event => {
        if (event.key !== 'Enter') return;

        const command = input.value.trim();

        if (command) {
            log(`navi@system:~$ ${command}`);
            processCommand(command);
        }

        input.value = '';
    };
}


function processCommand(input) {
    const [command, ...args] = input.toLowerCase().split(' ');

    switch (command) {

        case 'help':
            log('> Available commands: help, clear, echo, date, whoami, reset-bookmarks');
            break;

        case 'clear':
            $('terminal-output').innerHTML = '';
            break;

        case 'echo':
            log(`> ${args.join(' ')}`);
            break;

        case 'date':
            log(`> ${new Date()}`);
            break;

        case 'whoami':
            log('> navi_user (Admin)');
            break;

        case 'reset-bookmarks':
            localStorage.removeItem('navi_bookmarks');

            log('> Bookmarks reset to default. Refresh the page to apply.');
            break;

        case 'sudo':
            log('> You are not in the sudoers file. This incident will be reported.');
            break;

        default:
            log(`> Command not found: ${command}`);
    }
}


function log(message) {
    const output = $('terminal-output');
    const terminal = $('term-container');

    if (!output) return;

    output.innerHTML += `${message}<br>`;
    terminal.scrollTop = terminal.scrollHeight;
}