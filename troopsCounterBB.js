/**
 * Tribal Wars Troops Counter & BB Code Exporter
 * Author: Leandro Correa (Leandruz)
 * Repository: https://github.com/Leandruz/TroopsCounterHub
 * Version: 2.1.0
 * 
 * Instructions:
 * Create a bookmarklet in your browser with the following URL:
 * javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js?v='+Date.now();document.body.appendChild(s);})();
 */

(function () {
    'use strict';

    // 1. Environment Check & Auto-Redirect
    function isUnitsOverview() {
        const urlParams = new URLSearchParams(window.location.search);
        const screenParam = urlParams.get('screen');
        const modeParam = urlParams.get('mode');
        const gdScreen = (typeof game_data !== 'undefined' && game_data.screen) ? game_data.screen : null;
        const gdMode = (typeof game_data !== 'undefined' && game_data.mode) ? game_data.mode : null;

        const isOverview = (screenParam === 'overview_villages' || gdScreen === 'overview_villages');
        const isUnitsTable = ($('#units_table').length > 0 || $('table.vis').has('img[src*="unit_"]').length > 0);

        return isOverview && (modeParam === 'units' || gdMode === 'units' || isUnitsTable);
    }

    if (!isUnitsOverview()) {
        const msg = 'Redirecionando para a Visualização Geral de Tropas...';
        if (typeof UI !== 'undefined' && typeof UI.InfoMessage === 'function') {
            UI.InfoMessage(msg, 3000);
        } else if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
            UI.ErrorMessage(msg, 3000);
        }
        
        const targetUrl = (typeof game_data !== 'undefined' && game_data.link_base_pure)
            ? game_data.link_base_pure.replace(/screen=\w+/, 'screen=overview_villages&mode=units')
            : '/game.php?screen=overview_villages&mode=units';

        setTimeout(function() {
            window.location.href = targetUrl;
        }, 300);
        return;
    }

    // 2. Load Google Fonts for premium design
    if (!document.getElementById('tw-fonts-outfit')) {
        const fontLink = document.createElement('link');
        fontLink.id = 'tw-fonts-outfit';
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }

    // 3. Fallback and Unit Configuration
    const FALLBACK_POP = {
        spear: 1,
        sword: 1,
        axe: 1,
        archer: 1,
        spy: 2,
        light: 4,
        marcher: 5,
        heavy: 6,
        ram: 5,
        catapult: 8,
        knight: 10,
        snob: 100,
        militia: 1
    };

    const UNIT_NAMES_PT = {
        spear: 'Lanceiro',
        sword: 'Espadachim',
        axe: 'Bárbaro',
        archer: 'Arqueiro',
        spy: 'Explorador',
        light: 'Cavalaria Leve',
        marcher: 'Arqueiro a Cavalo',
        heavy: 'Cavalaria Pesada',
        ram: 'Aríete',
        catapult: 'Catapulta',
        knight: 'Paladino',
        snob: 'Nobre',
        militia: 'Milícia'
    };

    const UNIT_NAMES_EN = {
        spear: 'Spear Fighter',
        sword: 'Swordsman',
        axe: 'Axeman',
        archer: 'Archer',
        spy: 'Scout',
        light: 'Light Cavalry',
        marcher: 'Mounted Archer',
        heavy: 'Heavy Cavalry',
        ram: 'Ram',
        catapult: 'Catapult',
        knight: 'Paladin',
        snob: 'Nobleman',
        militia: 'Militia'
    };

    const market = (typeof game_data !== 'undefined' && game_data.market) ? game_data.market : 'en';
    const isPT = ['br', 'pt'].includes(market.toLowerCase()) || (typeof game_data !== 'undefined' && game_data.locale === 'pt_BR');
    const unitNames = isPT ? UNIT_NAMES_PT : UNIT_NAMES_EN;

    const DEFENSE_UNITS = ['spear', 'sword', 'archer', 'heavy', 'catapult', 'militia'];
    const OFFENSE_UNITS = ['axe', 'light', 'marcher', 'ram', 'catapult'];

    let config = {
        fullThreshold: 19000,
        threeQuartersThreshold: 14000,
        halfThreshold: 9000,
        quarterThreshold: 4000,
        catapultNukeMin: 100,
        exportBlocks: {
            nukesNobles: true,
            defenseNobles: true,
            noblesOnly: true,
            catNukes: true,
            offenseFull: true,
            offense34: true,
            offense12: true,
            offense14: true,
            defenseFull: true,
            defense34: true,
            defense12: true,
            defense14: true,
            scoutFull: true,
            scout34: true,
            scout12: true,
            scout14: true,
            other: true
        },
        bbCodeFormat: 'icons',
        hideZeroUnits: true
    };

    try {
        const savedConfig = localStorage.getItem('tw_troops_counter_bb_config');
        if (savedConfig) {
            config = { ...config, ...JSON.parse(savedConfig) };
        }
    } catch (e) {
        console.error('Failed to load settings from localStorage', e);
    }

    // 4. Fetch unit populations safely
    let unitPopulations = { ...FALLBACK_POP };
    function fetchUnitPopulations() {
        try {
            if (typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: '/interface.php?func=get_unit_info',
                    dataType: 'xml',
                    success: function (xml) {
                        $(xml).find('config > *').each(function () {
                            const unitName = this.nodeName;
                            const pop = parseInt($(this).find('pop').text(), 10);
                            if (!isNaN(pop)) {
                                unitPopulations[unitName] = pop;
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Could not fetch dynamic unit info, using fallbacks.', e);
        }
    }
    fetchUnitPopulations();

    // 5. Parse Troops Table (Multi-format & Multi-view)
    function parseTroops() {
        let $table = $('#units_table');
        if ($table.length === 0) {
            $table = $('table.vis').has('img[src*="unit_"]').first();
        }
        if ($table.length === 0) {
            $table = $('table.vis_item').has('img[src*="unit_"]').first();
        }

        if ($table.length === 0) {
            const msg = 'Tabela de tropas (#units_table) não foi encontrada nesta página.';
            if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
                UI.ErrorMessage(msg, 6000);
            } else {
                alert(msg);
            }
            return null;
        }

        const unitsOrder = [];
        let ths = $table.find('thead th');
        if (ths.length === 0) {
            ths = $table.find('tbody:eq(0) th');
        }
        if (ths.length === 0) {
            ths = $table.find('tr:first th, tr:first td');
        }
        
        ths.each(function () {
            const img = $(this).find('img');
            if (img.length) {
                const src = img.attr('src') || '';
                const dataUnit = img.data('unit') || img.attr('data-unit');
                let unitName = dataUnit;
                if (!unitName && src) {
                    const match = src.match(/unit_([a-z0-9_]+)/i);
                    if (match) {
                        unitName = match[1];
                    }
                }
                if (unitName) {
                    unitName = unitName.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    unitsOrder.push(unitName);
                }
            }
        });

        const N = unitsOrder.length;
        if (N === 0) {
            const msg = 'Nenhuma coluna de unidade reconhecida nos cabeçalhos da tabela.';
            if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
                UI.ErrorMessage(msg, 6000);
            } else {
                alert(msg);
            }
            return null;
        }

        const villages = [];
        let tbodies = $table.find('tbody');
        if (tbodies.length === 0) {
            tbodies = $table;
        }

        tbodies.each(function () {
            const tbody = $(this);
            if (tbody.attr('id') === 'units_table_header') return;

            const rows = tbody.find('tr').filter(function() {
                return $(this).find('th').length === 0;
            });

            if (rows.length === 0) return;

            const actualRows = [];
            rows.each(function() {
                const txt = $(this).text().toLowerCase();
                if (!txt.includes('total') && !txt.includes('soma')) {
                    actualRows.push($(this));
                }
            });

            if (actualRows.length === 0) return;

            const row0 = actualRows[0];
            const cells0 = row0.find('td');
            if (cells0.length === 0) return;

            const villageLink = row0.find('a[href*="screen=overview"]').first();
            let fullName = '';
            let villageId = '';

            if (villageLink.length) {
                fullName = villageLink.text().trim();
                const href = villageLink.attr('href') || '';
                const idMatch = href.match(/village=(\d+)/);
                if (idMatch) villageId = idMatch[1];
            }
            if (!fullName) {
                fullName = cells0.eq(0).text().trim();
            }

            if (!fullName) return;

            const coordMatch = fullName.match(/(\d+)\|(\d+)/);
            if (!coordMatch) return;
            const coords = coordMatch[0];

            const cleanName = fullName
                .replace(/\(\d+\|\d+\)/g, '')
                .replace(/K\d+/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            const villageData = {
                id: villageId,
                name: cleanName || 'Aldeia',
                coords: coords,
                fullName: fullName,
                own: {},
                in_village: {},
                outer: {},
                transit: {}
            };

            unitsOrder.forEach(u => {
                villageData.own[u] = 0;
                villageData.in_village[u] = 0;
                villageData.outer[u] = 0;
                villageData.transit[u] = 0;
            });

            let unitStartCol0 = 2;
            if (cells0.length <= N + 1) {
                unitStartCol0 = 1;
            } else {
                const cell1Text = cells0.eq(1).text().trim().replace(/\./g, '');
                if (/^\d+$/.test(cell1Text)) {
                    unitStartCol0 = 1;
                }
            }

            for (let i = 0; i < N; i++) {
                const colIdx = unitStartCol0 + i;
                if (colIdx < cells0.length) {
                    const count = parseInt(cells0.eq(colIdx).text().replace(/\./g, '').trim(), 10) || 0;
                    villageData.own[unitsOrder[i]] = count;
                }
            }

            for (let r = 1; r < actualRows.length; r++) {
                const row = actualRows[r];
                const cells = row.find('td');
                if (cells.length === 0) continue;

                const label = cells.eq(0).text().trim().toLowerCase();

                let rowType = '';
                if (label.includes('na aldeia') || label.includes('in village') || label.includes('in the village')) {
                    rowType = 'in_village';
                } else if (label.includes('em apoio') || label.includes('fora') || label.includes('outer') || label.includes('away') || label.includes('outwards')) {
                    rowType = 'outer';
                } else if (label.includes('a caminho') || label.includes('transit')) {
                    rowType = 'transit';
                } else {
                    if (r === 1) rowType = 'in_village';
                    else if (r === 2) rowType = 'outer';
                    else if (r === 3) rowType = 'transit';
                }

                let unitStartCol = 1;
                if (cells.length > N + 1 && !/^\d+$/.test(cells.eq(0).text().trim().replace(/\./g, ''))) {
                    unitStartCol = 1;
                }

                if (rowType) {
                    for (let i = 0; i < N; i++) {
                        const colIdx = unitStartCol + i;
                        if (colIdx < cells.length) {
                            const count = parseInt(cells.eq(colIdx).text().replace(/\./g, '').trim(), 10) || 0;
                            villageData[rowType][unitsOrder[i]] = count;
                        }
                    }
                }
            }

            villages.push(villageData);
        });

        if (villages.length === 0) {
            const msg = `Nenhuma aldeia pôde ser lida da tabela de tropas (${N} unidades detectadas: ${unitsOrder.join(', ')}).`;
            if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
                UI.ErrorMessage(msg, 6000);
            } else {
                alert(msg);
            }
            return null;
        }

        return { villages, unitsOrder };
    }

    // 6. Classification Engine
    const GROUP_DETAILS = {
        nukesNobles: { label: 'Ataques Full c/ Nobres', isOff: true, color: '#e74c3c' },
        defenseNobles: { label: 'Defesas Full c/ Nobres', isOff: false, color: '#3498db' },
        noblesOnly: { label: 'Aldeias c/ Nobres', isOff: false, color: '#9b59b6' },
        catNukes: { label: 'Ataques c/ Catapultas (Cat Nuke)', isOff: true, color: '#e67e22' },
        offenseFull: { label: 'Ataques Full (1/1)', isOff: true, color: '#ff4757' },
        offense34: { label: 'Ataques Semi (3/4)', isOff: true, color: '#ff6348' },
        offense12: { label: 'Ataques Meio (1/2)', isOff: true, color: '#ffa502' },
        offense14: { label: 'Ataques Quarto (1/4)', isOff: true, color: '#ffbe76' },
        defenseFull: { label: 'Defesas Full (1/1)', isOff: false, color: '#1e90ff' },
        defense34: { label: 'Defesas Semi (3/4)', isOff: false, color: '#2ed573' },
        defense12: { label: 'Defesas Meia (1/2)', isOff: false, color: '#7bed9f' },
        defense14: { label: 'Defesas Quarta (1/4)', isOff: false, color: '#a4b0be' },
        scoutFull: { label: 'Espiões Full (1/1)', isOff: false, color: '#10ac84' },
        scout34: { label: 'Espiões Semi (3/4)', isOff: false, color: '#1dd1a1' },
        scout12: { label: 'Espiões Meio (1/2)', isOff: false, color: '#54a0ff' },
        scout14: { label: 'Espiões Quarto (1/4)', isOff: false, color: '#5f27cd' },
        other: { label: 'Outros / Em Desenvolvimento', isOff: false, color: '#747d8c' }
    };

    function classifyVillage(village) {
        let offensePop = 0;
        let defensePop = 0;
        let scoutPop = 0;
        const snobCount = village.own['snob'] || 0;
        const catapultCount = village.own['catapult'] || 0;

        Object.keys(village.own).forEach(unit => {
            const count = village.own[unit];
            const pop = unitPopulations[unit] || 1;
            
            if (OFFENSE_UNITS.includes(unit)) offensePop += count * pop;
            if (DEFENSE_UNITS.includes(unit)) defensePop += count * pop;
            if (unit === 'spy') scoutPop += count * pop;
        });

        if (snobCount >= 4 && offensePop >= config.fullThreshold) return 'nukesNobles';
        if (snobCount >= 4 && defensePop >= config.fullThreshold) return 'defenseNobles';
        if (snobCount >= 1) return 'noblesOnly';
        if (catapultCount >= config.catapultNukeMin && offensePop >= config.fullThreshold) return 'catNukes';

        let dominantPop = Math.max(offensePop, defensePop, scoutPop);
        if (scoutPop === dominantPop && scoutPop >= config.quarterThreshold) {
            if (scoutPop >= config.fullThreshold) return 'scoutFull';
            if (scoutPop >= config.threeQuartersThreshold) return 'scout34';
            if (scoutPop >= config.halfThreshold) return 'scout12';
            return 'scout14';
        }
        if (offensePop === dominantPop && offensePop >= config.quarterThreshold) {
            if (offensePop >= config.fullThreshold) return 'offenseFull';
            if (offensePop >= config.threeQuartersThreshold) return 'offense34';
            if (offensePop >= config.halfThreshold) return 'offense12';
            return 'offense14';
        }
        if (defensePop >= config.quarterThreshold) {
            if (defensePop >= config.fullThreshold) return 'defenseFull';
            if (defensePop >= config.threeQuartersThreshold) return 'defense34';
            if (defensePop >= config.halfThreshold) return 'defense12';
            return 'defense14';
        }

        return 'other';
    }

    // 7. BB Code Generators
    function buildGlobalBBCode(villages, unitsOrder) {
        const groups = {};
        Object.keys(GROUP_DETAILS).forEach(k => groups[k] = []);
        villages.forEach(v => groups[classifyVillage(v)].push(v));

        let bbCode = '';
        Object.keys(GROUP_DETAILS).forEach(key => {
            if (!config.exportBlocks[key] || groups[key].length === 0) return;

            const group = GROUP_DETAILS[key];
            bbCode += `[b][size=12]${group.label} (${groups[key].length} aldeias)[/size][/b]\n`;
            bbCode += `[spoiler=Ver lista]\n`;

            if (config.bbCodeFormat === 'coords') {
                bbCode += groups[key].map(v => v.coords).join(' ') + `\n`;
            } else {
                groups[key].forEach(v => {
                    bbCode += buildVillageBBLine(v, unitsOrder, config.bbCodeFormat) + `\n`;
                });
            }

            bbCode += `[/spoiler]\n\n`;
        });

        return bbCode.trim();
    }

    function buildVillageBBLine(v, unitsOrder, format) {
        let line = `[coord]${v.coords}[/coord] - `;
        const parts = [];
        unitsOrder.forEach(unit => {
            const count = v.own[unit] || 0;
            if (config.hideZeroUnits && count === 0) return;
            
            if (format === 'icons') {
                parts.push(`[unit]${unit}[/unit] ${count.toLocaleString()}`);
            } else {
                parts.push(`${unitNames[unit] || unit}: ${count.toLocaleString()}`);
            }
        });
        return line + (parts.length ? parts.join(' | ') : 'Sem tropas');
    }

    // 8. Main Application Controller
    function startApp() {
        const parsed = parseTroops();
        if (!parsed || !parsed.villages || parsed.villages.length === 0) return;

        const { villages, unitsOrder } = parsed;

        let container = document.getElementById('tw-counter-modal');
        if (container) container.remove();

        container = document.createElement('div');
        container.id = 'tw-counter-modal';
        document.body.appendChild(container);

        let style = document.getElementById('tw-counter-styles');
        if (style) style.remove();
        
        style = document.createElement('style');
        style.id = 'tw-counter-styles';
        style.innerHTML = `
            #tw-counter-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 820px;
                max-height: 88vh;
                background: rgba(18, 20, 24, 0.98);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                z-index: 999999;
                color: #f1f2f6;
                font-family: 'Outfit', sans-serif;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-sizing: border-box;
                animation: twFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes twFadeIn {
                from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            .tw-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 22px;
                background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .tw-header-title h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #ff9f43;
                letter-spacing: 0.5px;
            }
            .tw-header-title p {
                margin: 3px 0 0 0;
                font-size: 11px;
                color: #a4b0be;
            }
            .tw-close-btn {
                background: transparent;
                border: none;
                color: #a4b0be;
                font-size: 24px;
                cursor: pointer;
                line-height: 1;
                transition: color 0.2s;
                padding: 4px 8px;
            }
            .tw-close-btn:hover {
                color: #ff4757;
            }
            .tw-nav {
                display: flex;
                background: rgba(0, 0, 0, 0.3);
                padding: 6px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .tw-nav-tab {
                background: transparent;
                border: none;
                color: #a4b0be;
                padding: 10px 16px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: 6px;
                margin-right: 4px;
            }
            .tw-nav-tab:hover {
                color: #f1f2f6;
                background: rgba(255,255,255,0.04);
            }
            .tw-nav-tab.active {
                color: #ff9f43;
                background: rgba(255, 159, 67, 0.12);
                box-shadow: inset 0 0 0 1px rgba(255, 159, 67, 0.2);
            }
            .tw-content {
                flex: 1;
                padding: 20px 24px;
                overflow-y: auto;
                box-sizing: border-box;
                min-height: 380px;
                max-height: 65vh;
            }
            .tw-tab-panel {
                display: none;
            }
            .tw-tab-panel.active {
                display: block;
                animation: twTabSlide 0.2s ease-out;
            }
            @keyframes twTabSlide {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Stats Cards */
            .tw-stats-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 22px;
            }
            .tw-stat-card {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 12px 16px;
                text-align: center;
            }
            .tw-stat-card h4 {
                margin: 0;
                font-size: 11px;
                text-transform: uppercase;
                color: #a4b0be;
                letter-spacing: 0.5px;
            }
            .tw-stat-card p {
                margin: 6px 0 0 0;
                font-size: 22px;
                font-weight: 700;
                color: #ff9f43;
            }
            
            .tw-section-title {
                font-size: 14px;
                font-weight: 600;
                color: #dfe4ea;
                margin: 18px 0 12px 0;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .tw-group-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            .tw-group-item {
                display: flex;
                align-items: center;
                background: rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.04);
                border-radius: 6px;
                padding: 10px 14px;
            }
            .tw-group-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 12px;
                flex-shrink: 0;
            }
            .tw-group-info {
                flex: 1;
                font-size: 13px;
                color: #ced6e0;
            }
            .tw-group-item-count {
                font-weight: 600;
                color: #fff;
                font-size: 14px;
            }

            .tw-unit-summary-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 10px;
            }
            .tw-unit-summary-card {
                background: rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.04);
                border-radius: 6px;
                padding: 10px;
                text-align: center;
            }
            .tw-unit-summary-card img {
                width: 20px;
                height: 20px;
            }
            .tw-unit-summary-card p {
                margin: 4px 0 0 0;
                font-size: 13px;
                font-weight: 600;
                color: #f1f2f6;
            }

            /* Villages Tab Table */
            .tw-toolbar {
                display: flex;
                gap: 12px;
                margin-bottom: 14px;
                align-items: center;
            }
            .tw-input-search, .tw-select-filter {
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                color: #fff;
                padding: 8px 12px;
                font-size: 13px;
                font-family: 'Outfit', sans-serif;
            }
            .tw-input-search {
                flex: 1;
            }
            .tw-input-search:focus, .tw-select-filter:focus {
                border-color: #ff9f43;
                outline: none;
            }
            .tw-table-wrapper {
                max-height: 420px;
                overflow-y: auto;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 8px;
                background: rgba(0,0,0,0.15);
            }
            .tw-v-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                text-align: left;
            }
            .tw-v-table th {
                background: rgba(0,0,0,0.4);
                color: #ff9f43;
                padding: 10px 12px;
                font-weight: 600;
                position: sticky;
                top: 0;
                z-index: 2;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .tw-v-table td {
                padding: 8px 12px;
                border-bottom: 1px solid rgba(255,255,255,0.03);
                color: #ced6e0;
                vertical-align: middle;
            }
            .tw-v-table tr:hover td {
                background: rgba(255,255,255,0.02);
            }
            .tw-badge {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            .tw-unit-icons-cell {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
            }
            .tw-unit-tag {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
            }
            .tw-unit-tag img {
                width: 14px;
                height: 14px;
            }
            .tw-btn-action {
                background: rgba(255, 159, 67, 0.15);
                border: 1px solid rgba(255, 159, 67, 0.3);
                color: #ff9f43;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .tw-btn-action:hover {
                background: #ff9f43;
                color: #121418;
            }

            /* BB Code Output */
            .tw-bb-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .tw-bb-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .tw-bb-textarea {
                width: 100%;
                height: 280px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                color: #70a1ff;
                font-family: monospace;
                font-size: 12px;
                padding: 14px;
                box-sizing: border-box;
                resize: vertical;
            }
            .tw-copy-btn {
                background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
                border: none;
                color: white;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .tw-copy-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(255, 82, 82, 0.4);
            }
            .tw-copy-btn.success {
                background: linear-gradient(135deg, #10ac84 0%, #00d2d3 100%);
                box-shadow: 0 4px 15px rgba(16, 172, 132, 0.3);
            }
            
            /* Settings Grid */
            .tw-config-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 20px;
            }
            .tw-config-group {
                display: flex;
                flex-direction: column;
            }
            .tw-config-group label {
                font-size: 11px;
                color: #a4b0be;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .tw-config-group input[type="number"] {
                background: rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                color: #fff;
                padding: 8px 12px;
                font-size: 13px;
            }
            .tw-checkbox-container {
                display: flex;
                align-items: center;
                margin-bottom: 6px;
                cursor: pointer;
                font-size: 12px;
                color: #ced6e0;
            }
            .tw-checkbox-container input {
                margin-right: 8px;
                accent-color: #ff9f43;
            }
            .tw-export-toggles {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                margin-top: 10px;
            }
        `;
        document.head.appendChild(style);

        // Stats calculation
        const groupCounts = {};
        Object.keys(GROUP_DETAILS).forEach(k => groupCounts[k] = 0);
        
        const globalUnitCounts = {};
        unitsOrder.forEach(u => globalUnitCounts[u] = 0);
        
        let totalVillages = villages.length;
        let totalPopulation = 0;

        villages.forEach(v => {
            const cat = classifyVillage(v);
            v.category = cat;
            groupCounts[cat]++;
            
            let vPop = 0;
            Object.keys(v.own).forEach(u => {
                const cnt = v.own[u];
                const pop = unitPopulations[u] || 1;
                globalUnitCounts[u] += cnt;
                vPop += cnt * pop;
            });
            v.totalPop = vPop;
            totalPopulation += vPop;
        });

        // Render HTML
        container.innerHTML = `
            <div class="tw-header">
                <div class="tw-header-title">
                    <h2>Contador de Tropas & Exportador BB</h2>
                    <p>Tribal Wars Premium Script - Versão 2.1.0</p>
                </div>
                <button class="tw-close-btn" id="tw-close-modal">&times;</button>
            </div>
            
            <div class="tw-nav">
                <button class="tw-nav-tab active" data-tab="dashboard">Painel Geral</button>
                <button class="tw-nav-tab" data-tab="villages">Tropas por Aldeia</button>
                <button class="tw-nav-tab" data-tab="bbcode">Exportar Código BB</button>
                <button class="tw-nav-tab" data-tab="settings">Configurações</button>
            </div>
            
            <div class="tw-content">
                <!-- Dashboard Tab -->
                <div class="tw-tab-panel active" id="tw-tab-dashboard">
                    <div class="tw-stats-row">
                        <div class="tw-stat-card">
                            <h4>Total de Aldeias</h4>
                            <p>${totalVillages}</p>
                        </div>
                        <div class="tw-stat-card">
                            <h4>População Militar</h4>
                            <p>${totalPopulation.toLocaleString()}</p>
                        </div>
                        <div class="tw-stat-card">
                            <h4>Média por Aldeia</h4>
                            <p>${totalVillages ? Math.round(totalPopulation / totalVillages).toLocaleString() : 0}</p>
                        </div>
                    </div>
                    
                    <h3 class="tw-section-title">Classificação de Aldeias</h3>
                    <div class="tw-group-grid">
                        ${Object.keys(GROUP_DETAILS).map(key => {
                            const count = groupCounts[key];
                            if (count === 0) return '';
                            const pct = totalVillages ? Math.round((count / totalVillages) * 100) : 0;
                            return `
                                <div class="tw-group-item">
                                    <div class="tw-group-indicator" style="background-color: ${GROUP_DETAILS[key].color}"></div>
                                    <div class="tw-group-info">${GROUP_DETAILS[key].label}</div>
                                    <div class="tw-group-item-count">${count} <span style="font-size: 10px; color: #a4b0be;">(${pct}%)</span></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <h3 class="tw-section-title">Resumo Global de Tropas Próprias</h3>
                    <div class="tw-unit-summary-grid">
                        ${unitsOrder.map(u => {
                            const count = globalUnitCounts[u];
                            if (count === 0) return '';
                            return `
                                <div class="tw-unit-summary-card">
                                    <img src="https://${window.location.hostname}/graphic/unit/unit_${u}.png" alt="${unitNames[u]}">
                                    <p>${count.toLocaleString()}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Per-Village Tab -->
                <div class="tw-tab-panel" id="tw-tab-villages">
                    <div class="tw-toolbar">
                        <input type="text" id="tw-search-villages" placeholder="Filtrar por nome ou coordenadas (ex: 555|444)..." class="tw-input-search">
                        <select id="tw-filter-group" class="tw-select-filter">
                            <option value="all">Todos os Grupos</option>
                            ${Object.keys(GROUP_DETAILS).map(k => `<option value="${k}">${GROUP_DETAILS[k].label}</option>`).join('')}
                        </select>
                        <button class="tw-btn-action" id="tw-btn-copy-filtered-bb" style="padding: 8px 12px; font-weight: 600;">
                            Copiar BB das Listadas
                        </button>
                    </div>

                    <div class="tw-table-wrapper">
                        <table class="tw-v-table" id="tw-table-villages">
                            <thead>
                                <tr>
                                    <th>Aldeia</th>
                                    <th>Categoria</th>
                                    <th>Tropas Próprias</th>
                                    <th>Pop.</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody id="tw-villages-tbody">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- BB Code Tab -->
                <div class="tw-tab-panel" id="tw-tab-bbcode">
                    <div class="tw-bb-container">
                        <div class="tw-bb-controls">
                            <label class="tw-checkbox-container">
                                <input type="checkbox" id="tw-hide-zeros" ${config.hideZeroUnits ? 'checked' : ''}>
                                Ocultar tropas zeradas
                            </label>
                            
                            <select class="tw-select-filter" id="tw-bb-format">
                                <option value="icons" ${config.bbCodeFormat === 'icons' ? 'selected' : ''}>Ícones [unit]</option>
                                <option value="text" ${config.bbCodeFormat === 'text' ? 'selected' : ''}>Apenas Texto</option>
                                <option value="coords" ${config.bbCodeFormat === 'coords' ? 'selected' : ''}>Apenas Coordenadas</option>
                            </select>
                        </div>
                        
                        <textarea class="tw-bb-textarea" id="tw-bb-output" readonly></textarea>
                        
                        <button class="tw-copy-btn" id="tw-btn-copy">
                            Copiar Código BB Global
                        </button>
                    </div>
                </div>
                
                <!-- Settings Tab -->
                <div class="tw-tab-panel" id="tw-tab-settings">
                    <h3 class="tw-section-title">Limites de População (Farm Space)</h3>
                    <div class="tw-config-grid">
                        <div class="tw-config-group">
                            <label>População para Full (1/1)</label>
                            <input type="number" id="tw-cfg-full" value="${config.fullThreshold}">
                        </div>
                        <div class="tw-config-group">
                            <label>População para Semi (3/4)</label>
                            <input type="number" id="tw-cfg-34" value="${config.threeQuartersThreshold}">
                        </div>
                        <div class="tw-config-group">
                            <label>População para Meio (1/2)</label>
                            <input type="number" id="tw-cfg-12" value="${config.halfThreshold}">
                        </div>
                        <div class="tw-config-group">
                            <label>População para Quarto (1/4)</label>
                            <input type="number" id="tw-cfg-14" value="${config.quarterThreshold}">
                        </div>
                        <div class="tw-config-group">
                            <label>Mínimo de Catapultas (Cat Nuke)</label>
                            <input type="number" id="tw-cfg-cat" value="${config.catapultNukeMin}">
                        </div>
                    </div>
                    
                    <h3 class="tw-section-title">Grupos a Exportar no BB Code Global</h3>
                    <div class="tw-export-toggles">
                        ${Object.keys(GROUP_DETAILS).map(key => `
                            <label class="tw-checkbox-container">
                                <input type="checkbox" class="tw-toggle-export" data-group="${key}" ${config.exportBlocks[key] ? 'checked' : ''}>
                                ${GROUP_DETAILS[key].label}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const $modal = $('#tw-counter-modal');

        // Render Villages Table
        function renderVillagesTable() {
            const searchTerm = $modal.find('#tw-search-villages').val().toLowerCase().trim();
            const groupFilter = $modal.find('#tw-filter-group').val();
            const $tbody = $modal.find('#tw-villages-tbody');

            const filtered = villages.filter(v => {
                const matchesSearch = !searchTerm || v.fullName.toLowerCase().includes(searchTerm) || v.coords.includes(searchTerm);
                const matchesGroup = groupFilter === 'all' || v.category === groupFilter;
                return matchesSearch && matchesGroup;
            });

            if (filtered.length === 0) {
                $tbody.html(`<tr><td colspan="5" style="text-align: center; color: #a4b0be; padding: 20px;">Nenhuma aldeia encontrada para estes filtros.</td></tr>`);
                return;
            }

            const rowsHtml = filtered.map((v, idx) => {
                const groupInfo = GROUP_DETAILS[v.category];
                const unitBadges = unitsOrder.map(u => {
                    const cnt = v.own[u] || 0;
                    if (cnt === 0) return '';
                    return `
                        <span class="tw-unit-tag">
                            <img src="https://${window.location.hostname}/graphic/unit/unit_${u}.png" title="${unitNames[u]}">
                            ${cnt.toLocaleString()}
                        </span>
                    `;
                }).join('');

                return `
                    <tr>
                        <td>
                            <strong>${v.name}</strong><br>
                            <span style="font-family: monospace; color: #70a1ff;">[coord]${v.coords}[/coord]</span>
                        </td>
                        <td>
                            <span class="tw-badge" style="background-color: ${groupInfo.color}">
                                ${groupInfo.label}
                            </span>
                        </td>
                        <td>
                            <div class="tw-unit-icons-cell">
                                ${unitBadges || '<span style="color:#747d8c;">Sem tropas</span>'}
                            </div>
                        </td>
                        <td style="font-weight: 600; color: #ff9f43;">${v.totalPop.toLocaleString()}</td>
                        <td>
                            <button class="tw-btn-action tw-btn-copy-single" data-idx="${villages.indexOf(v)}">
                                Copiar BB
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            $tbody.html(rowsHtml);
        }

        renderVillagesTable();

        // Event Bindings
        $modal.find('#tw-close-modal').on('click', function() {
            $modal.remove();
        });

        $modal.find('.tw-nav-tab').on('click', function() {
            const tab = $(this).data('tab');
            $modal.find('.tw-nav-tab').removeClass('active');
            $(this).addClass('active');
            
            $modal.find('.tw-tab-panel').removeClass('active');
            $modal.find(`#tw-tab-${tab}`).addClass('active');

            if (tab === 'bbcode') {
                updateBBCodeOutput();
            }
        });

        $modal.find('#tw-search-villages, #tw-filter-group').on('input change', function() {
            renderVillagesTable();
        });

        // Copy single village BB
        $modal.on('click', '.tw-btn-copy-single', function() {
            const idx = $(this).data('idx');
            const v = villages[idx];
            const bbLine = buildVillageBBLine(v, unitsOrder, config.bbCodeFormat);
            
            navigator.clipboard.writeText(bbLine).then(() => {
                const $btn = $(this);
                $btn.text('Copiado! ✓').css('background', '#10ac84').css('color', '#fff');
                setTimeout(() => {
                    $btn.text('Copiar BB').css('background', '').css('color', '');
                }, 1500);
            }).catch(() => {
                alert('Copie manualmente:\n\n' + bbLine);
            });
        });

        // Copy all filtered villages BB
        $modal.find('#tw-btn-copy-filtered-bb').on('click', function() {
            const searchTerm = $modal.find('#tw-search-villages').val().toLowerCase().trim();
            const groupFilter = $modal.find('#tw-filter-group').val();

            const filtered = villages.filter(v => {
                const matchesSearch = !searchTerm || v.fullName.toLowerCase().includes(searchTerm) || v.coords.includes(searchTerm);
                const matchesGroup = groupFilter === 'all' || v.category === groupFilter;
                return matchesSearch && matchesGroup;
            });

            if (filtered.length === 0) {
                alert('Nenhuma aldeia selecionada no filtro.');
                return;
            }

            const bbText = filtered.map(v => buildVillageBBLine(v, unitsOrder, config.bbCodeFormat)).join('\n');
            
            navigator.clipboard.writeText(bbText).then(() => {
                const $btn = $(this);
                $btn.text('Copiado (' + filtered.length + ')! ✓').css('background', '#10ac84');
                setTimeout(() => {
                    $btn.text('Copiar BB das Listadas').css('background', '');
                }, 2000);
            }).catch(() => {
                alert('Código BB:\n\n' + bbText);
            });
        });

        function updateBBCodeOutput() {
            const code = buildGlobalBBCode(villages, unitsOrder);
            $modal.find('#tw-bb-output').val(code);
        }

        $modal.find('#tw-hide-zeros, #tw-bb-format').on('change', function() {
            config.hideZeroUnits = $modal.find('#tw-hide-zeros').is(':checked');
            config.bbCodeFormat = $modal.find('#tw-bb-format').val();
            saveSettings();
            updateBBCodeOutput();
            renderVillagesTable();
        });

        $modal.find('#tw-btn-copy').on('click', function() {
            const textarea = $modal.find('#tw-bb-output')[0];
            textarea.select();
            textarea.setSelectionRange(0, 99999);
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    const btn = $(this);
                    btn.addClass('success').text('Copiado com Sucesso! ✓');
                    setTimeout(() => {
                        btn.removeClass('success').text('Copiar Código BB Global');
                    }, 2000);
                } else {
                    alert('Falha ao copiar. Selecione o texto e copie manualmente.');
                }
            } catch (err) {
                alert('Erro ao copiar: ' + err);
            }
        });

        $modal.find('#tw-cfg-full, #tw-cfg-34, #tw-cfg-12, #tw-cfg-14, #tw-cfg-cat').on('input change', function() {
            config.fullThreshold = parseInt($modal.find('#tw-cfg-full').val(), 10) || 0;
            config.threeQuartersThreshold = parseInt($modal.find('#tw-cfg-34').val(), 10) || 0;
            config.halfThreshold = parseInt($modal.find('#tw-cfg-12').val(), 10) || 0;
            config.quarterThreshold = parseInt($modal.find('#tw-cfg-14').val(), 10) || 0;
            config.catapultNukeMin = parseInt($modal.find('#tw-cfg-cat').val(), 10) || 0;
            saveSettings();
        });

        $modal.find('.tw-toggle-export').on('change', function() {
            const group = $(this).data('group');
            config.exportBlocks[group] = this.checked;
            saveSettings();
        });

        function saveSettings() {
            try {
                localStorage.setItem('tw_troops_counter_bb_config', JSON.stringify(config));
            } catch (e) {
                console.error('Could not save settings', e);
            }
        }
    }

    startApp();
})();
