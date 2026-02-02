// Main script

document.addEventListener('DOMContentLoaded', () => {
    initPagination();
    initRelativeDates();
    initTabs();
    initKonamiCode();
    initBSOD();
});

function initPagination() {
    const posts = document.querySelectorAll('.blog-post');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const postsPerPage = 5;
    let visibleCount = 0;

    if (!posts.length) return;

    posts.forEach((post, index) => {
        if (index >= postsPerPage) {
            post.classList.add('hidden');
        } else {
            visibleCount++;
        }
    });

    if (visibleCount === posts.length && loadMoreBtn) {
        loadMoreBtn.classList.add('hidden');
    } else if (loadMoreBtn) {
        loadMoreBtn.classList.remove('hidden');
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
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
                loadMoreBtn.classList.add('hidden');
            }
        });
    }
}

function initRelativeDates() {
    const dateElements = document.querySelectorAll('.post-date');
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
    const code = [
        "ArrowUp", "ArrowUp",
        "ArrowDown", "ArrowDown",
        "ArrowLeft", "ArrowRight",
        "ArrowLeft", "ArrowRight",
        "b", "a"
    ];
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

    setTimeout(() => {
        location.reload();
    }, 9000);
}

window.bsod = function () {
    console.log("A system integrity violation has occurred.");

    const existing = document.getElementById('bsod-screen');
    if (existing) existing.remove();

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

    return "System Halted";
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

