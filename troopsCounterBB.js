/**
 * Tribal Wars Troops Counter & BB Code Exporter
 * Author: Leandro Correa (Leandruz)
 * Repository: https://github.com/Leandruz/TroopsCounterHub
 * Version: 2.0.1
 * 
 * Instructions:
 * Create a bookmarklet in your browser with the following URL:
 * javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js?v='+Date.now();document.body.appendChild(s);})();
 */

(function () {
    'use strict';

    // 1. Environment & Screen Check
    function checkScreen() {
        let screen = null;
        let mode = null;

        if (typeof game_data !== 'undefined' && game_data.screen) {
            screen = game_data.screen;
            mode = game_data.mode;
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            screen = urlParams.get('screen');
            mode = urlParams.get('mode');
        }

        return (screen === 'overview_villages' && mode === 'units');
    }

    if (!checkScreen()) {
        const msg = 'Este script deve ser executado na página de <b>Visualização Geral de Tropas</b>.<br><a href="/game.php?screen=overview_villages&mode=units" class="btn">Ir para Tropas</a>';
        if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
            UI.ErrorMessage(msg, 6000);
        } else {
            alert('Este script deve ser executado na página de Visualização Geral de Tropas (overview_villages & mode=units).');
        }
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

    // Get current language from game_data
    const market = (typeof game_data !== 'undefined' && game_data.market) ? game_data.market : 'en';
    const isPT = ['br', 'pt'].includes(market.toLowerCase()) || (typeof game_data !== 'undefined' && game_data.locale === 'pt_BR');
    const unitNames = isPT ? UNIT_NAMES_PT : UNIT_NAMES_EN;

    // Unit classification definitions
    const DEFENSE_UNITS = ['spear', 'sword', 'archer', 'heavy', 'catapult', 'militia'];
    const OFFENSE_UNITS = ['axe', 'light', 'marcher', 'ram', 'catapult'];

    // Default configuration thresholds (can be updated in Settings tab)
    let config = {
        fullThreshold: 19000,
        threeQuartersThreshold: 14000,
        halfThreshold: 9000,
        quarterThreshold: 4000,
        catapultNukeMin: 100,
        // Which blocks should be exported
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
        bbCodeFormat: 'icons', // 'icons' | 'text' | 'coords'
        hideZeroUnits: true
    };

    // Load saved settings if any
    try {
        const savedConfig = localStorage.getItem('tw_troops_counter_bb_config');
        if (savedConfig) {
            config = { ...config, ...JSON.parse(savedConfig) };
        }
    } catch (e) {
        console.error('Failed to load settings from localStorage', e);
    }

    // 4. Fetch unit populations
    let unitPopulations = { ...FALLBACK_POP };
    function fetchUnitPopulations() {
        try {
            // Check if units XML is loaded or interface.php is accessible
            $.ajax({
                async: false,
                url: '/interface.php',
                data: { func: 'get_unit_info' },
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
        } catch (e) {
            console.warn('Could not fetch dynamic unit info, using fallbacks.', e);
        }
    }
    fetchUnitPopulations();

    // 5. Parse Troops Table
    function parseTroops() {
        const unitsOrder = [];
        let ths = $('#units_table thead th');
        if (ths.length === 0) {
            ths = $('#units_table tbody:eq(0) th');
        }
        
        ths.each(function () {
            const img = $(this).find('img');
            if (img.length) {
                const src = img.attr('src');
                const match = src.match(/unit_([a-z_]+)\.png/);
                if (match) {
                    // Normalize paladin or noble names if necessary
                    let unitName = match[1];
                    if (unitName === 'knight') unitName = 'knight';
                    if (unitName === 'snob') unitName = 'snob';
                    unitsOrder.push(unitName);
                }
            }
        });

        const N = unitsOrder.length;
        if (N === 0) {
            console.error('No unit columns found!');
            return null;
        }

        const villages = [];

        // In Tribal Wars, row order is fixed: Own (0), In Village (1), Support (2), Transit (3).
        // Sometimes a total summary row is at the end of each tbody, which should be skipped.
        $('#units_table tbody').each(function () {
            const tbody = $(this);
            // Skip header or table-wide sum tbodies
            if (tbody.find('th').length > 0 || tbody.attr('id') === 'units_table_header') return;
            
            const rows = tbody.find('tr');
            if (rows.length === 0) return;

            // Remove totals row inside tbody if it exists
            const lastRowText = rows.last().text().toLowerCase();
            const actualRows = [...rows];
            if (lastRowText.includes('total') || lastRowText.includes('soma')) {
                actualRows.pop();
            }

            if (actualRows.length === 0) return;

            const row0 = $(actualRows[0]);
            const td0 = row0.find('td').eq(0);
            const villageLink = td0.find('a[href*="screen=overview"]').first();
            
            let fullName = '';
            let villageId = '';
            if (villageLink.length) {
                fullName = villageLink.text().trim();
                const href = villageLink.attr('href');
                const idMatch = href.match(/village=(\d+)/);
                if (idMatch) villageId = idMatch[1];
            } else {
                fullName = td0.text().trim();
            }

            if (!fullName) return;

            // Parse coordinates (XXX|YYY)
            const coordMatch = fullName.match(/(\d+)\|(\d+)/);
            if (!coordMatch) return;
            const coords = coordMatch[0];

            // Extract clean name by stripping out coordinates and continent
            const cleanName = fullName
                .replace(/\(\d+\|\d+\)/g, '')
                .replace(/K\d+/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Initialize village data structures
            const villageData = {
                id: villageId,
                name: cleanName,
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

            // Own troops (Row 0): cells are: td0 (Village), td1 (Row label), td2..N+1 (units)
            const cells0 = row0.find('td');
            for (let i = 0; i < N; i++) {
                const count = parseInt(cells0.eq(i + 2).text().trim(), 10) || 0;
                villageData.own[unitsOrder[i]] = count;
            }

            // Parse other rows: In Village (Row 1), Outer (Row 2), Transit (Row 3)
            for (let r = 1; r < actualRows.length; r++) {
                const row = $(actualRows[r]);
                const cells = row.find('td');
                const label = cells.eq(0).text().trim().toLowerCase();

                let rowType = '';
                if (label.includes('na aldeia') || label.includes('in village') || label.includes('in the village')) {
                    rowType = 'in_village';
                } else if (label.includes('em apoio') || label.includes('fora') || label.includes('outer') || label.includes('away') || label.includes('outwards')) {
                    rowType = 'outer';
                } else if (label.includes('a caminho') || label.includes('transit')) {
                    rowType = 'transit';
                } else {
                    // Fallback to row index
                    if (r === 1) rowType = 'in_village';
                    else if (r === 2) rowType = 'outer';
                    else if (r === 3) rowType = 'transit';
                }

                if (rowType) {
                    for (let i = 0; i < N; i++) {
                        const count = parseInt(cells.eq(i + 1).text().trim(), 10) || 0;
                        villageData[rowType][unitsOrder[i]] = count;
                    }
                }
            }

            villages.push(villageData);
        });

        return { villages, unitsOrder };
    }

    // 6. Classification Engine
    function classifyVillage(village) {
        let offensePop = 0;
        let defensePop = 0;
        let scoutPop = 0;
        const snobCount = village.own['snob'] || 0;
        const catapultCount = village.own['catapult'] || 0;

        // Calculate populations
        Object.keys(village.own).forEach(unit => {
            const count = village.own[unit];
            const pop = unitPopulations[unit] || 1;
            
            if (OFFENSE_UNITS.includes(unit)) {
                offensePop += count * pop;
            }
            if (DEFENSE_UNITS.includes(unit)) {
                defensePop += count * pop;
            }
            if (unit === 'spy') {
                scoutPop += count * pop;
            }
        });

        // Determine dominant type
        let type = 'other';
        let dominantPop = Math.max(offensePop, defensePop, scoutPop);

        // Check overrides first
        if (snobCount >= 4 && offensePop >= config.fullThreshold) {
            return 'nukesNobles';
        }
        if (snobCount >= 4 && defensePop >= config.fullThreshold) {
            return 'defenseNobles';
        }
        if (snobCount >= 1) {
            return 'noblesOnly';
        }
        if (catapultCount >= config.catapultNukeMin && offensePop >= config.fullThreshold) {
            return 'catNukes';
        }

        // Dominant classification
        if (scoutPop === dominantPop && scoutPop >= config.quarterThreshold) {
            if (scoutPop >= config.fullThreshold) return 'scoutFull';
            if (scoutPop >= config.threeQuartersThreshold) return 'scout34';
            if (scoutPop >= config.halfThreshold) return 'scout12';
            return 'scout14';
        } else if (offensePop >= defensePop && offensePop >= config.quarterThreshold) {
            if (offensePop >= config.fullThreshold) return 'offenseFull';
            if (offensePop >= config.threeQuartersThreshold) return 'offense34';
            if (offensePop >= config.halfThreshold) return 'offense12';
            return 'offense14';
        } else if (defensePop >= offensePop && defensePop >= config.quarterThreshold) {
            if (defensePop >= config.fullThreshold) return 'defenseFull';
            if (defensePop >= config.threeQuartersThreshold) return 'defense34';
            if (defensePop >= config.halfThreshold) return 'defense12';
            return 'defense14';
        }

        return 'other';
    }

    const GROUP_DETAILS = {
        nukesNobles: { label: 'Ataque - Full com Nobres (Full Train)', isOff: true, color: '#ff7f50' },
        defenseNobles: { label: 'Defesa - Full com Nobres (Full Train)', isOff: false, color: '#70a1ff' },
        noblesOnly: { label: 'Aldeias de Nobres', isOff: true, color: '#eccc68' },
        catNukes: { label: 'Catapult Nukes (Ataques Cat)', isOff: true, color: '#ff6b81' },
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

    // 7. BB Code Generator
    function buildBBCode(villages, unitsOrder) {
        // Group villages
        const groups = {};
        Object.keys(GROUP_DETAILS).forEach(k => {
            groups[k] = [];
        });

        villages.forEach(v => {
            const cat = classifyVillage(v);
            groups[cat].push(v);
        });

        let bbCode = '';
        Object.keys(GROUP_DETAILS).forEach(key => {
            // Check if this block should be exported and has villages
            if (!config.exportBlocks[key] || groups[key].length === 0) return;

            const group = GROUP_DETAILS[key];
            bbCode += `[b][size=12]${group.label} (${groups[key].length} aldeias)[/size][/b]\n`;
            bbCode += `[spoiler=Ver lista]\n`;

            if (config.bbCodeFormat === 'coords') {
                const coordsList = groups[key].map(v => v.coords).join(' ');
                bbCode += `${coordsList}\n`;
            } else {
                groups[key].forEach(v => {
                    bbCode += `[coord]${v.coords}[/coord] - `;
                    
                    const unitStrings = [];
                    unitsOrder.forEach(unit => {
                        const count = v.own[unit] || 0;
                        if (config.hideZeroUnits && count === 0) return;
                        
                        if (config.bbCodeFormat === 'icons') {
                            unitStrings.push(`[unit]${unit}[/unit] ${count}`);
                        } else {
                            unitStrings.push(`${unitNames[unit]}: ${count}`);
                        }
                    });
                    
                    bbCode += unitStrings.join(' | ') + `\n`;
                });
            }

            bbCode += `[/spoiler]\n\n`;
        });

        return bbCode.trim();
    }

    // 8. Main Application Controller
    function startApp() {
        const parsed = parseTroops();
        if (!parsed || !parsed.villages || parsed.villages.length === 0) {
            const errorMsg = 'Nenhuma informação de tropas encontrada na tabela (#units_table). Certifique-se de estar na página <b>Visualização Geral -> Tropas</b>.';
            if (typeof UI !== 'undefined' && typeof UI.ErrorMessage === 'function') {
                UI.ErrorMessage(errorMsg, 6000);
            } else {
                alert('Nenhuma informação de tropas encontrada na tabela (#units_table). Certifique-se de estar na página Visualização Geral -> Tropas.');
            }
            return;
        }

        const { villages, unitsOrder } = parsed;

        // Render UI Container
        let container = document.getElementById('tw-counter-modal');
        if (container) {
            container.remove();
        }

        container = document.createElement('div');
        container.id = 'tw-counter-modal';
        document.body.appendChild(container);

        // Inject Stylesheet
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
                width: 700px;
                max-height: 85vh;
                background: rgba(20, 21, 23, 0.97);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                z-index: 99999;
                color: #f1f2f6;
                font-family: 'Outfit', sans-serif;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-sizing: border-box;
                animation: twFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes twFadeIn {
                from { opacity: 0; transform: translate(-50%, -47%) scale(0.96); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            .tw-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 18px 24px;
                background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .tw-header-title h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #ff9f43;
                letter-spacing: 0.5px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            .tw-header-title p {
                margin: 4px 0 0 0;
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
                background: rgba(0, 0, 0, 0.25);
                padding: 6px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            }
            .tw-nav-tab {
                background: transparent;
                border: none;
                color: #a4b0be;
                padding: 10px 18px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: 6px;
                margin-right: 6px;
            }
            .tw-nav-tab:hover {
                color: #f1f2f6;
                background: rgba(255,255,255,0.03);
            }
            .tw-nav-tab.active {
                color: #ff9f43;
                background: rgba(255, 159, 67, 0.1);
                box-shadow: inset 0 0 0 1px rgba(255, 159, 67, 0.15);
            }
            .tw-content {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
                box-sizing: border-box;
                min-height: 350px;
                max-height: 60vh;
            }
            .tw-tab-panel {
                display: none;
            }
            .tw-tab-panel.active {
                display: block;
                animation: twTabSlide 0.2s ease-out;
            }
            @keyframes twTabSlide {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Dashboard Styles */
            .tw-stats-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 24px;
            }
            .tw-stat-card {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255, 255, 255, 0.04);
                border-radius: 8px;
                padding: 14px 18px;
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
                margin: 8px 0 0 0;
                font-size: 24px;
                font-weight: 700;
                color: #ff9f43;
            }
            
            .tw-section-title {
                font-size: 14px;
                font-weight: 600;
                margin: 0 0 14px 0;
                color: #ff9f43;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                padding-bottom: 6px;
            }
            
            .tw-group-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 24px;
            }
            .tw-group-item {
                display: flex;
                align-items: center;
                background: rgba(0,0,0,0.15);
                border: 1px solid rgba(255,255,255,0.02);
                border-radius: 6px;
                padding: 10px 14px;
            }
            .tw-group-indicator {
                width: 12px;
                height: 12px;
                border-radius: 3px;
                margin-right: 12px;
                flex-shrink: 0;
            }
            .tw-group-info {
                flex: 1;
                font-size: 13px;
            }
            .tw-group-item-count {
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            
            .tw-unit-summary-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 10px;
            }
            .tw-unit-summary-card {
                background: rgba(255,255,255,0.01);
                border: 1px solid rgba(255,255,255,0.03);
                border-radius: 6px;
                padding: 8px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .tw-unit-summary-card img {
                width: 18px;
                height: 18px;
                margin-bottom: 6px;
            }
            .tw-unit-summary-card p {
                margin: 0;
                font-size: 11px;
                font-weight: 600;
            }
            
            /* BB Code Tab Styles */
            .tw-bb-container {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            .tw-bb-textarea {
                width: 100%;
                height: 250px;
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                color: #ced6e0;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                padding: 12px;
                resize: none;
                box-sizing: border-box;
                margin-bottom: 16px;
            }
            .tw-bb-textarea:focus {
                border-color: #ff9f43;
                outline: none;
            }
            .tw-bb-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 18px;
            }
            .tw-bb-format-select {
                background: rgba(30,31,35,0.8);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                color: #f1f2f6;
                padding: 6px 12px;
                font-size: 13px;
                cursor: pointer;
            }
            .tw-copy-btn {
                background: linear-gradient(135deg, #ff9f43 0%, #ff5252 100%);
                border: none;
                color: #fff;
                font-family: 'Outfit', sans-serif;
                font-size: 14px;
                font-weight: 600;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 10px;
            }
            .tw-copy-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(255, 82, 82, 0.4);
            }
            .tw-copy-btn:active {
                transform: translateY(0);
            }
            .tw-copy-btn.success {
                background: linear-gradient(135deg, #10ac84 0%, #00d2d3 100%);
                box-shadow: 0 4px 15px rgba(16, 172, 132, 0.3);
            }
            
            /* Settings Tab Styles */
            .tw-config-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 24px;
            }
            .tw-config-group {
                display: flex;
                flex-direction: column;
            }
            .tw-config-group label {
                font-size: 12px;
                color: #a4b0be;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .tw-config-group input[type="number"] {
                background: rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                color: #fff;
                padding: 8px 12px;
                font-size: 14px;
                font-family: 'Outfit', sans-serif;
            }
            .tw-config-group input[type="number"]:focus {
                border-color: #ff9f43;
                outline: none;
            }
            
            .tw-checkbox-container {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                cursor: pointer;
                font-size: 13px;
                color: #ced6e0;
            }
            .tw-checkbox-container input {
                margin-right: 10px;
                cursor: pointer;
                width: 16px;
                height: 16px;
                accent-color: #ff9f43;
            }
            
            .tw-export-toggles {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                margin-top: 14px;
            }
        `;
        document.head.appendChild(style);

        // Calculate statistics
        const groupCounts = {};
        Object.keys(GROUP_DETAILS).forEach(k => groupCounts[k] = 0);
        
        const globalUnitCounts = {};
        unitsOrder.forEach(u => globalUnitCounts[u] = 0);
        
        let totalVillages = villages.length;
        let totalPopulation = 0;

        villages.forEach(v => {
            const cat = classifyVillage(v);
            groupCounts[cat]++;
            
            Object.keys(v.own).forEach(u => {
                globalUnitCounts[u] += v.own[u];
                totalPopulation += v.own[u] * (unitPopulations[u] || 1);
            });
        });

        // 9. Render Dialog HTML Structure
        container.innerHTML = `
            <div class="tw-header">
                <div class="tw-header-title">
                    <h2>Contador de Tropas & BB Code Exporter</h2>
                    <p>Tribal Wars Premium Script - Versão 2.0.0</p>
                </div>
                <button class="tw-close-btn" id="tw-close-modal">&times;</button>
            </div>
            
            <div class="tw-nav">
                <button class="tw-nav-tab active" data-tab="dashboard">Painel</button>
                <button class="tw-nav-tab" data-tab="bbcode">Exportar Código BB</button>
                <button class="tw-nav-tab" data-tab="settings">Configurações</button>
            </div>
            
            <div class="tw-content">
                <!-- Dashboard Tab -->
                <div class="tw-tab-panel active" id="tw-tab-dashboard">
                    <div class="tw-stats-row">
                        <div class="tw-stat-card">
                            <h4>Total Aldeias</h4>
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
                            if (count === 0) return ''; // hide groups with 0 villages
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
                    
                    <h3 class="tw-section-title">Resumo Global de Unidades</h3>
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
                
                <!-- BB Code Tab -->
                <div class="tw-tab-panel" id="tw-tab-bbcode">
                    <div class="tw-bb-container">
                        <div class="tw-bb-controls">
                            <label class="tw-checkbox-container">
                                <input type="checkbox" id="tw-hide-zeros" ${config.hideZeroUnits ? 'checked' : ''}>
                                Ocultar tropas zeradas
                            </label>
                            
                            <select class="tw-bb-format-select" id="tw-bb-format">
                                <option value="icons" ${config.bbCodeFormat === 'icons' ? 'selected' : ''}>Ícones [unit]</option>
                                <option value="text" ${config.bbCodeFormat === 'text' ? 'selected' : ''}>Apenas Texto</option>
                                <option value="coords" ${config.bbCodeFormat === 'coords' ? 'selected' : ''}>Apenas Coordenadas</option>
                            </select>
                        </div>
                        
                        <textarea class="tw-bb-textarea" id="tw-bb-output" readonly></textarea>
                        
                        <button class="tw-copy-btn" id="tw-btn-copy">
                            Copiar Código BB
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
                    
                    <h3 class="tw-section-title">Grupos a Exportar no BB Code</h3>
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

        // 10. Wire Events
        const $modal = $('#tw-counter-modal');
        
        // Close modal
        $modal.find('#tw-close-modal').on('click', function() {
            $modal.remove();
        });

        // Tab switches
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

        // Live update of BB Code on controls change
        function updateBBCodeOutput() {
            const code = buildBBCode(villages, unitsOrder);
            $modal.find('#tw-bb-output').val(code);
        }

        $modal.find('#tw-hide-zeros').on('change', function() {
            config.hideZeroUnits = this.checked;
            saveSettings();
            updateBBCodeOutput();
        });

        $modal.find('#tw-bb-format').on('change', function() {
            config.bbCodeFormat = this.value;
            saveSettings();
            updateBBCodeOutput();
        });

        // Copy button trigger
        $modal.find('#tw-btn-copy').on('click', function() {
            const textarea = $modal.find('#tw-bb-output')[0];
            textarea.select();
            textarea.setSelectionRange(0, 99999); // for mobile devices
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    const btn = $(this);
                    btn.addClass('success').text('Copiado com Sucesso! ✓');
                    setTimeout(() => {
                        btn.removeClass('success').text('Copiar Código BB');
                    }, 2000);
                } else {
                    alert('Falha ao copiar. Selecione o texto e copie manualmente.');
                }
            } catch (err) {
                alert('Erro ao copiar: ' + err);
            }
        });

        // Settings change listeners
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
