/*
    TroopsCounterHub - Contador de Tropas & Exportador BB
    Based on: Licznik wojska by To6iasz, edited by Rinne, natanprog
    Enhanced by: Leandro Correa (Leandruz)
    Repository: https://github.com/Leandruz/TroopsCounterHub
    Version: 3.1.0

    Bookmarklet:
    javascript:$.getScript('https://cdn.jsdelivr.net/gh/Leandruz/TroopsCounterHub@main/troopsCounterBB.js');void 0;
*/

if (!window.troopCounter) window.troopCounter = {};

(function () {
    var tc = window.troopCounter;
    tc.pobraneGrupy = false;

    // Language
    var lang = [];
    if (game_data.locale == "pt_BR") {
        lang = [
            "Contador de Tropas",           // 0
            "Grupo: ",                       // 1
            "Todos",                         // 2
            "Tipo: ",                        // 3
            "Disponível",                    // 4
            "Todas as Suas Próprias",        // 5
            "Nas Aldeias",                   // 6
            "Apoios",                        // 7
            "Fora",                          // 8
            "Em Trânsito",                   // 9
            "Exportar",                      // 10
            " Por Favor, Espere...",         // 11
            "Não há aldeias no grupo. <br />Escolha outro grupo.", // 12
            " Vazio",                        // 13
            "Atenção\nSomente as primeiras 1000 aldeias", // 14
            "https://help.tribalwars.com.br/wiki/", // 15
            "Total de ",                     // 16
            " aldeias",                      // 17
            "Tropas por Aldeia",             // 18
            "Voltar ao Resumo",              // 19
            "Copiar BB Code",                // 20
            "Copiado!",                      // 21
            "Exportar BB por Aldeia",        // 22
            "Filtrar Grupo: ",               // 23
            "Carregando grupos...",          // 24
            "Grupo"                          // 25
        ];
        tc.unitNamesPT = "Lanceiro,Espadachim,Bárbaro,Arqueiro,Explorador,Cavalaria_Leve,Arqueiro_a_cavalo,Cavalaria_Pesada,Aríete,Catapulta,Paladino,Nobres".split(",");
    } else {
        lang = [
            "Troop Counter",
            "Group: ",
            "All",
            "Type: ",
            "Available",
            "All Your Own",
            "In Villages",
            "Support",
            "Outwards",
            "In Transit",
            "Export",
            " Please Wait...",
            "There are no villages in the group. <br />Choose another group.",
            " Empty",
            "Attention\nOnly the first 1000 villages",
            "https://help.tribalwars.net/wiki/",
            "Total of ",
            " villages",
            "Troops per Village",
            "Back to Summary",
            "Copy BB Code",
            "Copied!",
            "Export BB per Village",
            "Filter Group: ",
            "Loading groups...",
            "Group"
        ];
        tc.unitNamesPT = "Spear_fighter,Swordsman,Axeman,Archer,Scout,Light_cavalry,Mounted_archer,Heavy_cavalry,Ram,Catapult,Paladin,Nobleman".split(",");
    }
    tc.lang = lang;

    tc.unitKeys = "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult,knight,snob".split(",");

    // Build link
    tc.link = "/game.php?&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";
    if (game_data.player.sitter != 0)
        tc.link = "/game.php?t=" + game_data.player.id + "&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";

    // State
    tc.villageData = [];
    tc.parsedTable = null;
    tc.sumaWojsk = [];
    tc.currentRow = "0";
    tc.currentView = "summary";

    // Group mapping: coordenada -> [nomes de grupo]
    tc.groupList = [];          // [{name: "Off", url: "..."}, ...]
    tc.villageGroupMap = {};    // { "123|456": ["Off", "Nobres"], ... }
    tc.groupsLoaded = false;
    tc.groupsLoadingCount = 0;
    tc.villageFilterGroup = "all"; // filtro da tabela de aldeias

    // Build dialog HTML
    var html = "<h2 align='center'>" + lang[0] + "</h2>";
    html += "<table width='100%'><tr><th>" + lang[1];
    html += "<select id='tcGroupSelect' onchange=\"troopCounter.link = this.value; troopCounter.fetchData();\">";
    html += "<option value='" + tc.link + "'>" + lang[2] + "</option></select>";
    html += "<tr><td><table width='100%'>";
    html += "<tr><th colspan='4'>" + lang[3];
    html += "<select id='tcTypeSelect' onchange=\"troopCounter.changeType(this.value);\">";
    html += "<option value='0'>" + lang[4] + "</option>";
    html += "<option value='0p2p3'>" + lang[5] + "</option>";
    html += "<option value='1'>" + lang[6] + "</option>";
    html += "<option value='1m0'>" + lang[7] + "</option>";
    html += "<option value='2'>" + lang[8] + "</option>";
    html += "<option value='3'>" + lang[9] + "</option>";
    html += "</select></th></tr>";
    html += "<tbody id='tc_troops_body'></tbody>";
    html += "</table>";
    html += "<tr><th>";
    html += "<b id='tc_village_count'></b>";
    html += "<span style='float:right;'>";
    html += "<a href='#' onclick=\"troopCounter.exportBB(); return false;\">" + lang[10] + "</a>";
    html += " | <a href='#' onclick=\"troopCounter.toggleVillageView(); return false;\" id='tc_toggle_link'>" + lang[18] + "</a>";
    html += "</span>";
    html += "</th></tr></table>";

    // Village detail section (hidden initially)
    html += "<div id='tc_village_section' style='display:none; margin-top:8px;'>";

    // Group filter for village table
    html += "<div style='margin-bottom:6px;'>";
    html += "<b>" + lang[23] + "</b>";
    html += "<select id='tc_village_group_filter' onchange=\"troopCounter.villageFilterGroup = this.value; troopCounter.renderVillageTable();\">";
    html += "<option value='all'>" + lang[2] + "</option>";
    html += "</select>";
    html += " <span id='tc_group_loading_status' style='font-size:11px; color:#888;'></span>";
    html += "</div>";

    html += "<div style='max-height:400px; overflow-y:auto;'>";
    html += "<table width='100%' class='vis' id='tc_village_table'>";
    html += "<tbody id='tc_village_tbody'></tbody>";
    html += "</table>";
    html += "</div>";
    html += "<div style='text-align:center; margin-top:6px;'>";
    html += "<a href='#' onclick=\"troopCounter.copyVillageBB(); return false;\" class='btn' id='tc_copy_bb_btn'>" + lang[20] + "</a>";
    html += "</div>";
    html += "<textarea id='tc_village_bb_output' rows='6' style='width:100%; margin-top:6px; display:none;' onclick='this.select();'></textarea>";
    html += "</div>";

    Dialog.show("tc_dialog", html);

    // Fetch data function
    tc.fetchData = function () {
        $("#tc_village_count").html(lang[11]);
        $(mobile ? "#loading" : "#loading_content").show();

        var xhr = new XMLHttpRequest();
        xhr.open("GET", tc.link, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                var tempBody = document.createElement("body");
                tempBody.innerHTML = xhr.responseText;

                tc.parsedTable = $(tempBody).find("#units_table").get()[0];
                if (!tc.parsedTable) {
                    $("#tc_troops_body").html(lang[12]);
                    $("#tc_village_count").html(lang[13]);
                    return;
                }

                // Parse groups (only first time)
                if (!tc.pobraneGrupy) {
                    var groupsContainer = $(tempBody).find(".vis_item").get()[0];
                    if (groupsContainer) {
                        var grupy = groupsContainer.getElementsByTagName(mobile ? "option" : "a");
                        for (var i = 0; i < grupy.length; i++) {
                            var nazwa = grupy[i].textContent;
                            if (mobile && nazwa == "wszystkie") continue;
                            var groupUrl = grupy[i].getAttribute(mobile ? "value" : "href") + "&page=-1";
                            var groupName = mobile ? nazwa : nazwa.slice(1, nazwa.length - 1);

                            $("#tcGroupSelect").append($("<option>", {
                                value: groupUrl,
                                text: groupName
                            }));

                            // Store group info for mapping
                            tc.groupList.push({ name: groupName, url: groupUrl });
                        }
                    }
                    tc.pobraneGrupy = true;

                    // Detect available units
                    if (!tc.parsedTable.rows[0].innerHTML.match("archer")) {
                        tc.unitKeys.splice(tc.unitKeys.indexOf("archer"), 1);
                        tc.unitKeys.splice(tc.unitKeys.indexOf("marcher"), 1);
                    }
                    if (!tc.parsedTable.rows[0].innerHTML.match("knight")) {
                        tc.unitKeys.splice(tc.unitKeys.indexOf("knight"), 1);
                    }

                    // Populate village group filter dropdown
                    tc.populateGroupFilter();

                    // Start background group mapping
                    tc.loadGroupMappings();
                }

                if (tc.parsedTable.rows.length > 4000) alert(lang[14]);

                tc.sumTroops();
                tc.parseVillages();
                tc.changeType(tc.currentRow);
                if (tc.currentView === "villages") {
                    tc.renderVillageTable();
                }
            }
        };
        xhr.send(null);
    };

    // Populate the village-level group filter dropdown
    tc.populateGroupFilter = function () {
        var $filter = $("#tc_village_group_filter");
        for (var i = 0; i < tc.groupList.length; i++) {
            $filter.append($("<option>", {
                value: tc.groupList[i].name,
                text: tc.groupList[i].name
            }));
        }
    };

    // Load group mappings in background (fetch each group to get village coords)
    tc.loadGroupMappings = function () {
        if (tc.groupList.length === 0) {
            tc.groupsLoaded = true;
            return;
        }

        tc.groupsLoadingCount = tc.groupList.length;
        $("#tc_group_loading_status").text(lang[24] + " (0/" + tc.groupList.length + ")");

        for (var g = 0; g < tc.groupList.length; g++) {
            (function (groupIndex) {
                var group = tc.groupList[groupIndex];
                var xhr = new XMLHttpRequest();
                xhr.open("GET", group.url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        var tempBody = document.createElement("body");
                        tempBody.innerHTML = xhr.responseText;
                        var table = $(tempBody).find("#units_table").get()[0];

                        if (table) {
                            // Extract village coords from this group's table
                            for (var i = 1; i < table.rows.length; i += 5) {
                                var row = table.rows[i];
                                if (!row || row.cells.length < 2) continue;
                                var cellText = row.cells[0].textContent;
                                var match = cellText.match(/(\d+)\|(\d+)/);
                                if (match) {
                                    var coords = match[0];
                                    if (!tc.villageGroupMap[coords]) {
                                        tc.villageGroupMap[coords] = [];
                                    }
                                    if (tc.villageGroupMap[coords].indexOf(group.name) === -1) {
                                        tc.villageGroupMap[coords].push(group.name);
                                    }
                                }
                            }
                        }

                        tc.groupsLoadingCount--;
                        var done = tc.groupList.length - tc.groupsLoadingCount;
                        $("#tc_group_loading_status").text(lang[24] + " (" + done + "/" + tc.groupList.length + ")");

                        if (tc.groupsLoadingCount <= 0) {
                            tc.groupsLoaded = true;
                            $("#tc_group_loading_status").text("✓");
                            setTimeout(function () {
                                $("#tc_group_loading_status").text("");
                            }, 2000);

                            // Re-render if village view is active
                            if (tc.currentView === "villages") {
                                tc.renderVillageTable();
                            }
                        }
                    }
                };
                // Stagger requests to avoid overwhelming the server (200ms apart)
                setTimeout(function () {
                    xhr.send(null);
                }, groupIndex * 200);
            })(g);
        }
    };

    // Get groups for a village by coords
    tc.getVillageGroups = function (coords) {
        if (!coords || !tc.villageGroupMap[coords]) return [];
        return tc.villageGroupMap[coords];
    };

    // Sum troops by row type
    tc.sumTroops = function () {
        var table = tc.parsedTable;
        var numUnits = tc.unitKeys.length;

        for (var i = 0; i < 5; i++) {
            tc.sumaWojsk[i] = [];
            for (var j = 0; j < numUnits; j++)
                tc.sumaWojsk[i][j] = 0;
        }

        for (var i = 1; i < table.rows.length; i++) {
            var m = (table.rows[1].cells.length == table.rows[i].cells.length) ? 2 : 1;
            for (var j = m; j < numUnits + m; j++) {
                tc.sumaWojsk[(i - 1) % 5][j - m] += parseInt(table.rows[i].cells[j].textContent);
            }
        }
    };

    // Parse individual village data
    tc.parseVillages = function () {
        var table = tc.parsedTable;
        var numUnits = tc.unitKeys.length;
        tc.villageData = [];

        for (var i = 1; i < table.rows.length; i += 5) {
            var row = table.rows[i];
            if (!row || row.cells.length < 2) continue;

            var nameCell = row.cells[0];
            var link = nameCell.querySelector("a");
            var fullName = link ? link.textContent.trim() : nameCell.textContent.trim();
            var coordMatch = fullName.match(/(\d+)\|(\d+)/);
            var coords = coordMatch ? coordMatch[0] : "";

            var village = {
                name: fullName,
                coords: coords,
                troops: []
            };

            for (var r = 0; r < 5; r++) {
                var rowIdx = i + r;
                if (rowIdx >= table.rows.length) break;
                var cells = table.rows[rowIdx].cells;
                var m = (table.rows[1].cells.length == cells.length) ? 2 : 1;
                var counts = [];
                for (var j = m; j < numUnits + m; j++) {
                    counts.push(parseInt(cells[j].textContent) || 0);
                }
                village.troops[r] = counts;
            }

            tc.villageData.push(village);
        }
    };

    // Change type
    tc.changeType = function (value) {
        tc.currentRow = value;
        var which = String(value).match(/\d+/g);
        var ops = String(value).match(/[a-z]/g);
        var numUnits = tc.unitKeys.length;

        var result = [];
        for (var j = 0; j < numUnits; j++) result[j] = 0;

        for (var i = 0; i < which.length; i++) {
            if (i == 0 || ops[i - 1] == "p") {
                for (var j = 0; j < numUnits; j++)
                    result[j] += tc.sumaWojsk[which[i]][j];
            } else {
                for (var j = 0; j < numUnits; j++)
                    result[j] -= tc.sumaWojsk[which[i]][j];
            }
        }

        tc.displaySummary(result);

        // Also refresh village table if visible
        if (tc.currentView === "villages") {
            tc.renderVillageTable();
        }
    };

    // Display summary
    tc.displaySummary = function (sums) {
        var numUnits = tc.unitKeys.length;
        var elem = "<tr>";
        tc.exportBBText = "";

        for (var i = 0; i < numUnits; i++) {
            tc.exportBBText += "[unit]" + tc.unitKeys[i] + "[/unit]" + sums[i] + (i % 2 == 0 ? tc.spaces(sums[i]) : "\n");
            elem += (i % 2 == 0 ? "<tr>" : "");
            elem += "<th width='20'><a href='" + lang[15] + tc.unitNamesPT[i] + "' target='_blank'>";
            elem += "<img src='" + image_base + "unit/unit_" + tc.unitKeys[i] + ".png'></a>";
            elem += "<td bgcolor='#fff5da'>" + sums[i];
        }

        $("#tc_troops_body").html(elem);
        $(mobile ? "#loading" : "#loading_content").hide();

        var numVillages = tc.parsedTable ? ((tc.parsedTable.rows.length - 1) / 5) : 0;
        $("#tc_village_count").html(lang[16] + numVillages + lang[17]);
    };

    // Spaces helper
    tc.spaces = function (num) {
        var s = String(num);
        var r = "";
        for (var j = 0; j < (10 - s.length); j++) r += "\u2007";
        return r;
    };

    // Export BB (global summary)
    tc.exportBB = function () {
        if (!$("#tc_troops_body").html().match("textarea")) {
            $("#tc_troops_body").html("<textarea rows='7' cols='25' onclick='this.select();'>" + tc.exportBBText + "</textarea>");
        } else {
            tc.changeType(tc.currentRow);
        }
    };

    // Toggle village detail view
    tc.toggleVillageView = function () {
        if (tc.currentView === "summary") {
            tc.currentView = "villages";
            $("#tc_village_section").show();
            $("#tc_toggle_link").text(lang[19]);
            tc.renderVillageTable();
        } else {
            tc.currentView = "summary";
            $("#tc_village_section").hide();
            $("#tc_toggle_link").text(lang[18]);
        }
    };

    // Render per-village table with group column and filter
    tc.renderVillageTable = function () {
        if (!tc.villageData || tc.villageData.length === 0) {
            $("#tc_village_tbody").html("<tr><td colspan='" + (tc.unitKeys.length + 2) + "'>Nenhuma aldeia encontrada.</td></tr>");
            return;
        }

        var numUnits = tc.unitKeys.length;
        var which = String(tc.currentRow).match(/\d+/g);
        var ops = String(tc.currentRow).match(/[a-z]/g);
        var filterGroup = tc.villageFilterGroup;

        // Header with unit icons + Group column
        var headerHtml = "<tr>";
        headerHtml += "<th style='text-align:left;'>Aldeia</th>";
        headerHtml += "<th style='text-align:center;'>" + lang[25] + "</th>";
        for (var j = 0; j < numUnits; j++) {
            headerHtml += "<th><img src='" + image_base + "unit/unit_" + tc.unitKeys[j] + ".png' title='" + tc.unitKeys[j] + "'></th>";
        }
        headerHtml += "</tr>";

        var rowsHtml = "";
        var filteredCount = 0;

        for (var v = 0; v < tc.villageData.length; v++) {
            var village = tc.villageData[v];
            var groups = tc.getVillageGroups(village.coords);
            var groupText = groups.length > 0 ? groups.join(", ") : "-";

            // Apply group filter
            if (filterGroup !== "all") {
                if (groups.indexOf(filterGroup) === -1) continue;
            }

            filteredCount++;

            // Calculate troop counts based on selected type
            var counts = [];
            for (var j = 0; j < numUnits; j++) counts[j] = 0;

            for (var i = 0; i < which.length; i++) {
                var rowIdx = parseInt(which[i]);
                if (!village.troops[rowIdx]) continue;
                if (i == 0 || ops[i - 1] == "p") {
                    for (var j = 0; j < numUnits; j++)
                        counts[j] += village.troops[rowIdx][j] || 0;
                } else {
                    for (var j = 0; j < numUnits; j++)
                        counts[j] -= village.troops[rowIdx][j] || 0;
                }
            }

            var bgColor = filteredCount % 2 == 0 ? "#fff5da" : "#ffe3a1";
            rowsHtml += "<tr style='background:" + bgColor + ";'>";

            // Village name/coords
            rowsHtml += "<td style='white-space:nowrap; font-size:11px;'>";
            if (village.coords) {
                rowsHtml += "<b>" + village.coords + "</b>";
            } else {
                rowsHtml += village.name.substring(0, 30);
            }
            rowsHtml += "</td>";

            // Group column
            rowsHtml += "<td style='text-align:center; font-size:10px; max-width:100px; word-wrap:break-word;'>";
            if (groups.length > 0) {
                for (var gi = 0; gi < groups.length; gi++) {
                    rowsHtml += "<span style='background:#e8d9a0; padding:1px 4px; border-radius:3px; margin:1px; display:inline-block;'>" + groups[gi] + "</span>";
                }
            } else {
                rowsHtml += "<span style='color:#ccc;'>-</span>";
            }
            rowsHtml += "</td>";

            // Troop columns
            for (var j = 0; j < numUnits; j++) {
                var val = counts[j];
                var style = "text-align:center; font-size:11px;";
                if (val === 0) style += " color:#ccc;";
                rowsHtml += "<td style='" + style + "'>" + val + "</td>";
            }
            rowsHtml += "</tr>";
        }

        if (filteredCount === 0) {
            rowsHtml = "<tr><td colspan='" + (numUnits + 2) + "' style='text-align:center; padding:8px;'>Nenhuma aldeia neste grupo.</td></tr>";
        }

        $("#tc_village_tbody").html(headerHtml + rowsHtml);

        // Generate BB code for filtered villages
        tc.generateVillageBB();
    };

    // Generate BB code per village (respecting group filter)
    tc.generateVillageBB = function () {
        if (!tc.villageData || tc.villageData.length === 0) return;

        var numUnits = tc.unitKeys.length;
        var which = String(tc.currentRow).match(/\d+/g);
        var ops = String(tc.currentRow).match(/[a-z]/g);
        var filterGroup = tc.villageFilterGroup;

        var bb = "[table]\n";
        bb += "[**]Aldeia[||]Grupo[||]Tropas[/**]\n";

        for (var v = 0; v < tc.villageData.length; v++) {
            var village = tc.villageData[v];
            var groups = tc.getVillageGroups(village.coords);

            // Apply group filter
            if (filterGroup !== "all") {
                if (groups.indexOf(filterGroup) === -1) continue;
            }

            var counts = [];
            for (var j = 0; j < numUnits; j++) counts[j] = 0;

            for (var i = 0; i < which.length; i++) {
                var rowIdx = parseInt(which[i]);
                if (!village.troops[rowIdx]) continue;
                if (i == 0 || ops[i - 1] == "p") {
                    for (var j = 0; j < numUnits; j++)
                        counts[j] += village.troops[rowIdx][j] || 0;
                } else {
                    for (var j = 0; j < numUnits; j++)
                        counts[j] -= village.troops[rowIdx][j] || 0;
                }
            }

            var groupText = groups.length > 0 ? groups.join(", ") : "-";
            var villageText = village.coords ? "[coord]" + village.coords + "[/coord]" : village.name.substring(0, 30);

            bb += "[*]" + villageText + "[|]" + groupText + "[|]";

            var parts = [];
            for (var j = 0; j < numUnits; j++) {
                if (counts[j] > 0) {
                    parts.push("[unit]" + tc.unitKeys[j] + "[/unit] " + counts[j]);
                }
            }
            bb += parts.join(" ") + "\n";
        }

        bb += "[/table]";

        $("#tc_village_bb_output").val(bb);
    };

    // Copy village BB code
    tc.copyVillageBB = function () {
        var $ta = $("#tc_village_bb_output");
        if ($ta.is(":hidden")) {
            $ta.show();
        }
        $ta[0].select();
        $ta[0].setSelectionRange(0, 99999);
        try {
            document.execCommand("copy");
            $("#tc_copy_bb_btn").text(lang[21]);
            setTimeout(function () {
                $("#tc_copy_bb_btn").text(lang[20]);
            }, 2000);
        } catch (e) {
            // textarea is shown for manual copy
        }
    };

    // Trigger initial data fetch
    tc.fetchData();
})();
void 0;
