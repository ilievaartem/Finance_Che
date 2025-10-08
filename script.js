const data = combinedApiData || [];
const typezvit = window.typezvit || [];
let filteredData = [...data];
let originalFilteredData = [...data];
let currentPage = 1;
const rowsPerPage = 10;

const dates = data.map(item => item.publishDate).filter(Boolean).sort();
const minDateStr = dates[0] || '2023-01-01';
const maxDateStr = dates[dates.length - 1] || '2025-12-31';
const minTimestamp = new Date(minDateStr).getTime();
const maxTimestamp = new Date(maxDateStr).getTime();

const orgMap = {
    "45905639": "ДЕПАРТАМЕНТ ОБОРОННОЇ РОБОТИ",
    "04014252": "ДЕПАРТАМЕНТ КАПІТАЛЬНОГО БУДІВНИЦТВА",
    "26184291": "СЛУЖБА У СПРАВАХ ДІТЕЙ",
    "03494540": "ДЕРЖАВНИЙ АРХІВ ЧЕРНІВЕЦЬКОЇ ОБЛАСТІ",
    "39300801": "УПРАВЛІННЯ ЦИВІЛЬНОГО ЗАХИСТУ НАСЕЛЕННЯ",
    "39301117": "УПРАВЛІННЯ МОЛОДІ ТА СПОРТУ",
    "37240220": "УПРАВЛІННЯ КУЛЬТУРИ",
    "40618131": "УПРАВЛІННЯ ЕКОЛОГІЇ ТА ПРИРОДНИХ РЕСУРСІВ",
    "45159978": "УПРАВЛІННЯ З ПИТАНЬ ВЕТЕРАНСЬКОЇ ПОЛІТИКИ",
    "38536252": "УПРАВЛІННЯ АГРОПРОМИСЛОВОГО РОЗВИТКУ",
    "44110123": "ЮРИДИЧНЕ УПРАВЛІННЯ",
    "43470010": "ДЕПАРТАМЕНТ КОМУНІКАЦІЙ",
    "39302152": "ДЕПАРТАМЕНТ ОХОРОНИ ЗДОРОВ'Я",
    "39301337": "ДЕПАРТАМЕНТ ОСВІТИ І НАУКИ",
    "38345436": "ДЕПАРТАМЕНТ СОЦІАЛЬНОГО ЗАХИСТУ НАСЕЛЕННЯ",
    "41601843": "ДЕПАРТАМЕНТ РЕГІОНАЛЬНОГО РОЗВИТКУ",
    "02317304": "ДЕПАРТАМЕНТ ФІНАНСІВ",
    "00022680": "ЧЕРНІВЕЦЬКА ОБЛАСНА ДЕРЖАВНА АДМІНІСТРАЦІЯ",
    "45048943": "ДЕПАРТАМЕНТ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ",
    "45776308": "УПРАВЛІННЯ ЦИФРОВОГО РОЗВИТКУ, ЦИФРОВИХ ТРАНСФОРМАЦІЙ І ЦИФРОВІЗАЦІЇ"
};

const budgetMap = {
    "LOCAL": "Місцевий",
    "STATE": "Державний",
    "null":"Інший",
    "REGIONAL": "Регіональний",
    "COMMUNAL": "Комунальний",
    "OTHER": "Інший",
    "NATIONAL": "Національний",
};

const fundMap = {
    "GENERAL": "Загальний",
    "SPECIAL": "Спеціальний",
    "null": "Інше",
};

function getReportName(reportType, publishDate) {
    if (!publishDate || !reportType) return reportType ? reportType.toString() : 'N/A';
    const date = new Date(publishDate);
    for (const period of typezvit) {
        const from = new Date(period.from);
        const to = new Date(period.to);
        if (date >= from && date <= to) {
            const report = period.reports.find(r => r.id == reportType);
            if (report) {
                return report.name || report.shortName;
            }
        }
    }
    return reportType.toString();
}


const d3Root = d3;

const tooltip = d3Root.select('body').append('div')
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', '#fff')
    .style('padding', '6px 8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('max-width', '320px')
    .style('white-space', 'normal')
    .style('word-break', 'break-word')
    .style('display', 'none');

function showSmartTooltip(event, html) {
    const e = (event && event.touches && event.touches[0]) ? event.touches[0] : event;
    tooltip.html(html).style('display', 'block');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 8;
    const clientX = (e && (e.clientX ?? (e.pageX - window.scrollX))) || 0;
    const clientY = (e && (e.clientY ?? (e.pageY - window.scrollY))) || 0;
    const preferLeft = clientX > vw / 2;
    const preferTop = clientY > vh / 2;
    const rect = tooltip.node().getBoundingClientRect();
    let x = preferLeft ? (clientX - rect.width - 12) : (clientX + 12);
    let y = preferTop ? (clientY - rect.height - 12) : (clientY + 12);
    if (x + rect.width + padding > vw) x = vw - rect.width - padding;
    if (x < padding) x = padding;
    if (y + rect.height + padding > vh) y = vh - rect.height - padding;
    if (y < padding) y = padding;
    tooltip.style('left', (window.scrollX + x) + 'px').style('top', (window.scrollY + y) + 'px');
}

const revenueContainer = d3Root.select('#revenue-chart-container');
const revenueSvg = revenueContainer.append('svg')
    .attr('id', 'revenue-svg')
    .style('width', '100%')
    .style('height', '280px');

const revenueG = revenueSvg.append('g').attr('class', 'revenue-g');

const expensesContainer = d3Root.select('#expenses-chart-container');
const expensesSvg = expensesContainer.append('svg')
    .attr('id', 'expenses-svg')
    .style('width', '100%')
    .style('height', '280px');

const expensesG = expensesSvg.append('g').attr('class', 'expenses-g');

const bubbleContainer = d3Root.select('#pie-chart-container');
const bubbleSvg = bubbleContainer.append('svg')
    .attr('id', 'bubble-svg')
    .style('width', '100%')
    .style('height', '100%')
    .style('min-height', '420px');

const bubbleG = bubbleSvg.append('g').attr('class', 'bubble-g');

function clearGroup(g) {
    g.selectAll('*').remove();
}


const dateSlider = document.getElementById('date-slider');
noUiSlider.create(dateSlider, {
    start: [0, 100],
    connect: true,
    range: {
        'min': 0,
        'max': 100
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const fundSelect = document.getElementById('fund-filter');
    const budgetSelect = document.getElementById('budget-filter');
    const uniqueFunds = [...new Set(data.map(item => item.fund).filter(Boolean))];
    const uniqueBudgets = [...new Set(data.map(item => item.budget).filter(Boolean))];
    uniqueFunds.forEach(fund => {
        const option = document.createElement('option');
        option.value = fund;
        option.textContent = fundMap[fund] || fund;
        fundSelect.appendChild(option);
    });
    uniqueBudgets.forEach(budget => {
        const option = document.createElement('option');
        option.value = budget;
        option.textContent = budgetMap[budget] || budget;
        budgetSelect.appendChild(option);
    });


    fundSelect.addEventListener('change', applyFilters);
    budgetSelect.addEventListener('change', applyFilters);
    document.getElementById('org-filter').addEventListener('change', applyFilters);

    dateSlider.noUiSlider.on('update', function (values, handle) {
        const minValue = parseFloat(values[0]);
        const maxValue = parseFloat(values[1]);
        const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100));
        const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100));
        document.getElementById('min-date-display').textContent = minDateSelected.toISOString().split('T')[0];
        document.getElementById('max-date-display').textContent = maxDateSelected.toISOString().split('T')[0];
        applyFilters();
    });

    function updateTable() {
        const tableBody = document.querySelector('#data-table tbody');
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);
        
        if (pageData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center py-4">
                    <div class="no-data-message">
                        <i class="fas fa-search" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <p style="color: var(--text-muted); margin: 0;">Дані не знайдено</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        } else {
            pageData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = 'fade-in';
                row.style.animationDelay = `${index * 0.05}s`;
                row.innerHTML = `
                    <td>
                        <div class="date-cell">
                            <i class="fas fa-calendar-alt" style="color: var(--text-muted); margin-right: 0.5rem;"></i>
                            ${item.publishDate || 'N/A'}
                        </div>
                    </td>
                    <td>
                        <span class="fund-badge ${item.fund ? item.fund.toLowerCase() : 'default'}">
                            ${fundMap[item.fund] || item.fund || 'N/A'}
                        </span>
                    </td>
                    <td>
                        <span class="budget-badge ${item.budget ? item.budget.toLowerCase() : 'default'}">
                            ${budgetMap[item.budget] || item.budget || 'N/A'}
                        </span>
                    </td>
                    <td title="${orgMap[item.edrpou] || item.orgPravForm || 'N/A'}">
                        ${(orgMap[item.edrpou] || item.orgPravForm || 'N/A').length > 30 ? 
                          (orgMap[item.edrpou] || item.orgPravForm || 'N/A').substring(0, 30) + '...' : 
                          (orgMap[item.edrpou] || item.orgPravForm || 'N/A')}
                    </td>
                    <td title="${item.progKlas || 'N/A'}">
                        ${item.progKlas ? 
                          (item.progKlas.length > 40 ? item.progKlas.substring(0, 40) + '...' : item.progKlas) : 
                          'N/A'}
                    </td>
                    <td class="actions-column">
                        <div class="action-buttons-cell">
                            <button class="btn-table-action" title="Переглянути деталі" onclick="viewDetails('${item.id || index}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        updatePagination();
        updateStats();
    }

    function updatePagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        
        if (totalPages <= 1) return;
        
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </a>`;
        pagination.appendChild(prevLi);
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); goToPage(1)">1</a>`;
            pagination.appendChild(firstLi);
            
            if (startPage > 2) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(dotsLi);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); goToPage(${i})">${i}</a>`;
            pagination.appendChild(li);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(dotsLi);
            }
            
            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); goToPage(${totalPages})">${totalPages}</a>`;
            pagination.appendChild(lastLi);
        }
        
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </a>`;
        pagination.appendChild(nextLi);
    }

    function goToPage(page) {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        updateTable();
        
        const tableSection = document.querySelector('.data-table-section');
        if (tableSection) {
            tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.viewDetails = function(itemId) {
        const item = filteredData.find((record, index) => (record.id || index).toString() === itemId.toString());
        if (item) {
            showDetailsModal(item);
        } else {
            showNotification('Запис не знайдено', 'error');
        }
    };

    function showDetailsModal(item) {
        const modalContent = `
            <div class="modal-backdrop" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3><i class="fas fa-info-circle"></i> Деталі запису</h3>
                        <button class="modal-close" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Дата публікації:</label>
                                <span>${item.publishDate || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Фонд:</label>
                                <span>${fundMap[item.fund] || item.fund || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Бюджет:</label>
                                <span>${budgetMap[item.budget] || item.budget || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Організація:</label>
                                <span>${orgMap[item.edrpou] || item.orgPravForm || 'N/A'}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>Клас програми:</label>
                                <span>${item.progKlas || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>ЄДРПОУ:</label>
                                <span>${item.edrpou || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Тип звіту:</label>
                                <span>${getReportName(item.reportTypeId, item.publishDate)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline-secondary" onclick="closeModal()">Закрити</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalElement = document.createElement('div');
        modalElement.id = 'details-modal';
        modalElement.innerHTML = modalContent;
        document.body.appendChild(modalElement);
        
        const modalStyles = `
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }
            .modal-content {
                background: var(--bg-primary);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .modal-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: var(--radius-md);
            }
            .modal-close:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }
            .modal-body {
                padding: 1.5rem;
            }
            .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            .detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .detail-item.full-width {
                grid-column: 1 / -1;
            }
            .detail-item label {
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            .detail-item span {
                color: var(--text-primary);
                word-wrap: break-word;
            }
            .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = modalStyles;
        document.head.appendChild(styleElement);
    }

    window.closeModal = function() {
        const modal = document.getElementById('details-modal');
        if (modal) {
            modal.remove();
        }
    };

    window.goToPage = goToPage;

    function updateDashboard() {

        const totalReports = filteredData.length;
        const fundCounts = filteredData.reduce((acc, item) => {
            acc[item.fund] = (acc[item.fund] || 0) + 1;
            return acc;
        }, {});
        const mostCommonFund = Object.keys(fundCounts).length ? Object.keys(fundCounts).reduce((a, b) => fundCounts[a] > fundCounts[b] ? a : b) : 'N/A';
        const budgetCounts = filteredData.reduce((acc, item) => {
            acc[item.budget] = (acc[item.budget] || 0) + 1;
            return acc;
        }, {});
        const mostCommonBudget = Object.keys(budgetCounts).length ? Object.keys(budgetCounts).reduce((a, b) => budgetCounts[a] > budgetCounts[b] ? a : b) : 'N/A';
        
        const uniqueOrganizations = new Set(
            filteredData
                .map(item => item.edrpou)
                .filter(edrpou => edrpou && edrpou !== 'null' && edrpou !== '')
        ).size;

        document.getElementById('total-revenue').textContent = totalReports;
        document.getElementById('total-expenses').textContent = fundMap[mostCommonFund] || mostCommonFund;
        document.getElementById('net-profit').textContent = budgetMap[mostCommonBudget] || mostCommonBudget;
        document.getElementById('unique-organizations').textContent = uniqueOrganizations;

        currentPage = 1;
        updateTable();
        updatePagination();

        const activePeriod = document.querySelector('[data-period].active')?.getAttribute('data-period') || 'month';
        const activeView = document.querySelector('[data-view].active')?.getAttribute('data-view') || 'count';
        
        updateRevenueChart(activePeriod);
        updateExpensesChart(activeView);
        updateTreemapChart();
    }
    
    function updateTreemapChart() {
        const reportTypeCounts = filteredData.reduce((acc, item) => {
            const name = getReportName(item.reportTypeId, item.publishDate);
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});

        const treeData = {
            name: "Типи звітів",
            children: Object.keys(reportTypeCounts).map(key => ({
                name: key,
                value: reportTypeCounts[key]
            }))
        };

        clearGroup(bubbleG);

    const svgRect = bubbleSvg.node().getBoundingClientRect();
    const width = Math.max(320, svgRect.width - 24);
    const height = Math.max(300, svgRect.height - 24);

        const treemap = d3Root.treemap()
            .tile(d3Root.treemapSquarify)
            .size([width, height])
            .padding(2)
            .round(true);

        const root = d3Root.hierarchy(treeData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        treemap(root);

    bubbleG.attr('transform', 'translate(12,12)');

        const color = d3Root.scaleOrdinal(d3Root.schemeSet3);

        const leaf = bubbleG.selectAll('g.treemap-leaf')
            .data(root.leaves())
            .join('g')
            .attr('class', 'treemap-leaf')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        leaf.append('rect')
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill', (d, i) => color(i))
            .attr('fill-opacity', 0.8)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .attr('rx', 4) 
            .on('mousemove', (event, d) => {
                showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
            })
            .on('touchstart', (event, d) => {
                showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
            })
            .on('click', (event, d) => {
                showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
            })
            .on('mouseleave', () => tooltip.style('display', 'none'));

        leaf.append('clipPath')
            .attr('id', (d, i) => `treemap-clip-${i}`)
            .append('rect')
            .attr('width', d => Math.max(0, d.x1 - d.x0 - 6))
            .attr('height', d => Math.max(0, d.y1 - d.y0 - 6))
            .attr('x', 3)
            .attr('y', 3);

        leaf.each(function(d, i) {
            const leafGroup = d3Root.select(this);
            const rectWidth = d.x1 - d.x0;
            const rectHeight = d.y1 - d.y0;
            
            const fontSize = Math.min(14, Math.max(10, Math.min(rectWidth / 8, rectHeight / 6)));
            
            if (rectWidth > 40 && rectHeight > 20) {
                const textGroup = leafGroup.append('g')
                    .attr('class', 'treemap-text')
                    .attr('clip-path', `url(#treemap-clip-${i})`);

                const words = d.data.name.split(/\s+/);
                const lines = [];
                let currentLine = '';
                const maxLineLength = Math.floor(rectWidth / (fontSize * 0.6));
                
                words.forEach(word => {
                    if ((currentLine + word).length <= maxLineLength) {
                        currentLine = currentLine ? `${currentLine} ${word}` : word;
                    } else {
                        if (currentLine) lines.push(currentLine);
                        currentLine = word;
                    }
                });
                if (currentLine) lines.push(currentLine);
                
                const maxLines = Math.floor((rectHeight - 20) / (fontSize + 2));
                const displayLines = lines.slice(0, maxLines);
                
                displayLines.forEach((line, lineIndex) => {
                    textGroup.append('text')
                        .attr('x', rectWidth / 2)
                        .attr('y', (rectHeight / 2) - ((displayLines.length - 1) * (fontSize + 2) / 2) + (lineIndex * (fontSize + 2)))
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .style('fill', '#ffffff')
                        .style('font-size', `${fontSize}px`)
                        .style('font-weight', '600')
                        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
                        .text(line);
                });
                
                if (rectHeight > 40) {
                    textGroup.append('text')
                        .attr('x', rectWidth / 2)
                        .attr('y', rectHeight - 8)
                        .attr('text-anchor', 'middle')
                        .style('fill', '#ffffff')
                        .style('font-size', `${Math.max(10, fontSize - 2)}px`)
                        .style('font-weight', '700')
                        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
                        .text(`(${d.data.value})`);
                }
            }
        });

        showNotification('Оновлено типи звітів', 'success');
    }

    function applyFilters() {
        const fund = fundSelect.value;
        const budget = budgetSelect.value;
        const org = document.getElementById('org-filter').value;
        const values = dateSlider.noUiSlider.get();
        const minValue = parseFloat(values[0]);
        const maxValue = parseFloat(values[1]);
        const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100)).toISOString().split('T')[0];
        const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100)).toISOString().split('T')[0];

        filteredData = data.filter(item => {
            return (!fund || item.fund === fund) &&
                   (!budget || item.budget === budget) &&
                   (!org || item.edrpou === org) &&
                   (!item.publishDate || (item.publishDate >= minDateSelected && item.publishDate <= maxDateSelected));
        });

        originalFilteredData = [...filteredData];

        updateDashboard();
    }

    initializeEnhancedUI();

    function initializeEnhancedUI() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshData);
        }

        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetFilters);
        }

        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', applyFilters);
        }

        const tableSearch = document.getElementById('table-search');
        if (tableSearch) {
            tableSearch.addEventListener('input', handleTableSearch);
        }

        const exportPdf = document.getElementById('export-pdf');
        const refreshTable = document.getElementById('refresh-table');
        
        if (exportPdf) {
            exportPdf.addEventListener('click', () => exportToPdf());
        }

        if (refreshTable) {
            refreshTable.addEventListener('click', () => refreshTableData());
        }

        initializeChartControls();

        initializeTableSorting();

        initializeCollapseHandlers();

        hideLoadingStates();
    }

    function toggleTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('#theme-toggle i');
        
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        }
    }

    function refreshData() {
        const refreshBtn = document.getElementById('refresh-data');
        const icon = refreshBtn.querySelector('i');
        
        icon.style.animation = 'spin 1s linear infinite';
        
        setTimeout(() => {
            updateDashboard();
            icon.style.animation = '';
            
            showNotification('Дані успішно оновлено!', 'success');
        }, 1000);
    }

    function resetFilters() {
        document.getElementById('fund-filter').value = '';
        document.getElementById('budget-filter').value = '';
        document.getElementById('org-filter').value = '';
        
        if (dateSlider && dateSlider.noUiSlider) {
            dateSlider.noUiSlider.set([0, 100]);
        }
        
        const tableSearch = document.getElementById('table-search');
        if (tableSearch) {
            tableSearch.value = '';
        }
        
        filteredData = [...data];
        originalFilteredData = [...data];
        
        sortDirection = {};
        
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            icon.className = 'fas fa-sort sort-icon';
        });
        
        updateDashboard();
        
        showNotification('Фільтри скинуто!', 'info');
    }

    function handleTableSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        if (searchTerm === '') {
            applyFilters();
            return;
        }
        
        filteredData = data.filter(item => {
            return Object.values(item).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm)
            );
        });
        
        const fund = document.getElementById('fund-filter').value;
        const budget = document.getElementById('budget-filter').value;
        const org = document.getElementById('org-filter').value;
        
        if (fund || budget || org) {
            filteredData = filteredData.filter(item => {
                return (!fund || item.fund === fund) &&
                       (!budget || item.budget === budget) &&
                       (!org || item.edrpou === org);
            });
        }
        
        originalFilteredData = [...filteredData];
        
        sortDirection = {};
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            icon.className = 'fas fa-sort sort-icon';
        });
        
        updateTable();
        updateStats();
    }

    function exportToPdf() {
        const printContent = generatePrintContent();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        showNotification('Відкрито вікно друку для PDF!', 'success');
    }

    function refreshTableData() {
        const refreshIcon = document.querySelector('#refresh-table i');
        
        refreshIcon.style.animation = 'spin 1s linear infinite';
        
        setTimeout(() => {
            filteredData = [...data];
            originalFilteredData = [...data];
            
            currentPage = 1;
            
            sortDirection = {};
            
            document.querySelectorAll('.sortable').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                const icon = th.querySelector('.sort-icon');
                icon.className = 'fas fa-sort sort-icon';
            });
            
            const tableSearch = document.getElementById('table-search');
            if (tableSearch) {
                tableSearch.value = '';
            }
            
            updateTable();
            
            refreshIcon.style.animation = '';
            
            showNotification('Таблицю оновлено!', 'success');
        }, 800);
    }

    function generatePrintContent() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Фінансові Дані</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    h1 { color: #333; text-align: center; }
                    .meta { text-align: center; margin-bottom: 20px; color: #666; }
                </style>
            </head>
            <body>
                <h1>Звіт Фінансових Даних</h1>
                <div class="meta">
                    <p>Дата створення: ${new Date().toLocaleDateString('uk-UA')}</p>
                    <p>Загальна кількість записів: ${filteredData.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Дата Публікації</th>
                            <th>Фонд</th>
                            <th>Бюджет</th>
                            <th>Підрозділ</th>
                            <th>Клас Програми</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredData.slice(0, 100).map(item => `
                            <tr>
                                <td>${item.publishDate || 'N/A'}</td>
                                <td>${fundMap[item.fund] || item.fund || 'N/A'}</td>
                                <td>${budgetMap[item.budget] || item.budget || 'N/A'}</td>
                                <td>${(orgMap[item.edrpou] || item.orgPravForm || 'N/A').substring(0, 50)}</td>
                                <td>${(item.progKlas || 'N/A').substring(0, 50)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${filteredData.length > 100 ? '<p><em>Показано перші 100 записів з ' + filteredData.length + '</em></p>' : ''}
            </body>
            </html>
        `;
    }

    function initializeChartControls() {
        const periodButtons = document.querySelectorAll('[data-period]');
        periodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                periodButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const period = e.target.getAttribute('data-period');
                updateRevenueChart(period);
            });
        });

        const viewButtons = document.querySelectorAll('[data-view]');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                viewButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const view = e.target.getAttribute('data-view');
                updateExpensesChart(view);
            });
        });
    }

    function initializeTableSorting() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                sortTable(column, header);
            });
        });
    }

    function initializeCollapseHandlers() {
        const collapseButtons = document.querySelectorAll('.btn-collapse');
        collapseButtons.forEach(button => {
            const targetId = button.getAttribute('data-bs-target');
            const targetElement = document.querySelector(targetId);
            const card = button.closest('.chart-card') || button.closest('.panel-card');

            if (targetElement) {
                const icon = button.querySelector('i');
                if (icon) icon.style.transform = '';
                if (targetElement.classList.contains('show')) {
                    button.setAttribute('aria-expanded', 'true');
                    if (card) card.classList.remove('is-collapsed');
                } else {
                    button.setAttribute('aria-expanded', 'false');
                    if (card) card.classList.add('is-collapsed');
                }
                targetElement.addEventListener('shown.bs.collapse', function() {
                    button.setAttribute('aria-expanded', 'true');
                    if (card && card.classList.contains('is-collapsed')) {
                        card.classList.remove('is-collapsed');
                    }
                });
                targetElement.addEventListener('hidden.bs.collapse', function() {
                    button.setAttribute('aria-expanded', 'false');
                    if (card && !card.classList.contains('is-collapsed')) {
                        card.classList.add('is-collapsed');
                    }
                });
            }
        });
    }

    let sortDirection = {};

    function sortTable(column, header) {
        if (!sortDirection[column] || sortDirection[column] === 'none') {
            sortDirection[column] = 'asc';
        } else if (sortDirection[column] === 'asc') {
            sortDirection[column] = 'desc';
        } else if (sortDirection[column] === 'desc') {
            sortDirection[column] = 'none';
        }
        
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            icon.className = 'fas fa-sort sort-icon';
        });
        
        if (sortDirection[column] === 'none') {
            filteredData = [...originalFilteredData];
        } else {
            header.classList.add(`sort-${sortDirection[column]}`);
            const icon = header.querySelector('.sort-icon');
            icon.className = `fas fa-sort-${sortDirection[column] === 'asc' ? 'up' : 'down'} sort-icon`;
            
            filteredData.sort((a, b) => {
                let aVal = a[column] || '';
                let bVal = b[column] || '';
                
                if (column === 'publishDate') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }
                
                if (sortDirection[column] === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }
        
        currentPage = 1;
        updateTable();
    }

    function updateRevenueChart(period) {
        let groupedData = {};

        filteredData.forEach(item => {
            if (!item.publishDate) return;
            const date = new Date(item.publishDate);
            let key;
            switch(period) {
                case 'month':
                    key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                    break;
                case 'quarter':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    key = date.getFullYear() + '-Q' + quarter;
                    break;
                case 'year':
                    key = String(date.getFullYear());
                    break;
                default:
                    key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            }
            groupedData[key] = (groupedData[key] || 0) + 1;
        });

        const sortedKeys = Object.keys(groupedData).sort();
        const values = sortedKeys.map(key => groupedData[key]);

        clearGroup(revenueG);

    const isCompact = revenueSvg.node()?.closest('.chart-card')?.classList.contains('compact');
    const margin = isCompact ? { top: 10, right: 16, bottom: 44, left: 44 } : { top: 20, right: 20, bottom: 50, left: 50 };
    const width = (revenueSvg.node().getBoundingClientRect().width || 600) - margin.left - margin.right;
    const height = (parseInt(revenueSvg.style('height')) || 280) - margin.top - margin.bottom;

        revenueG.attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3Root.scalePoint()
            .domain(sortedKeys)
            .range([0, width]);

        const y = d3Root.scaleLinear()
            .domain([0, d3Root.max(values) || 1])
            .range([height, 0]);

        revenueG.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3Root.axisBottom(x).tickValues(sortedKeys.filter((d, i) => {
                return i % Math.ceil(sortedKeys.length / 8 || 1) === 0;
            })) )
            .selectAll('text')
            .attr('transform', 'rotate(-40)')
            .style('text-anchor', 'end');

        revenueG.append('g')
            .attr('class', 'y-axis')
            .call(d3Root.axisLeft(y).ticks(5));

        const line = d3Root.line()
            .x((d, i) => x(sortedKeys[i]))
            .y(d => y(d))
            .curve(d3Root.curveMonotoneX);

        revenueG.append('path')
            .datum(values)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(75,192,192,1)')
            .attr('stroke-width', 2)
            .attr('d', line);

        const area = d3Root.area()
            .x((d, i) => x(sortedKeys[i]))
            .y0(y(0))
            .y1(d => y(d))
            .curve(d3Root.curveMonotoneX);

        revenueG.append('path')
            .datum(values)
            .attr('fill', 'rgba(75,192,192,0.15)')
            .attr('d', area);

        revenueG.selectAll('circle.point')
            .data(values)
            .join('circle')
            .attr('class', 'point')
            .attr('cx', (d, i) => x(sortedKeys[i]))
            .attr('cy', d => y(d))
            .attr('r', 4)
            .attr('fill', 'rgba(75,192,192,1)')
            .on('mousemove', (event, d) => {
                const i = values.indexOf(d);
                tooltip.style('display', 'block')
                    .html(`<strong>${sortedKeys[i]}</strong><br/>Звіти: ${d}`)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY + 12) + 'px');
            })
            .on('mouseleave', () => tooltip.style('display', 'none'));

        showNotification(`Оновлено графік за ${getPeriodLabel(period)}`, 'success');
    }
    
    function getPeriodLabel(period) {
        switch(period) {
            case 'month': return 'за місяцями';
            case 'quarter': return 'за кварталами';
            case 'year': return 'за роками';
            default: return 'за місяцями';
        }
    }

    function updateExpensesChart(view) {
        const fundCounts = filteredData.reduce((acc, item) => {
            const fund = item.fund || 'null';
            acc[fund] = (acc[fund] || 0) + 1;
            return acc;
        }, {});

        const fundLabels = Object.keys(fundCounts).map(label => fundMap[label] || label);
        let fundData = Object.values(fundCounts);

        if (view === 'percentage') {
            const total = fundData.reduce((sum, val) => sum + val, 0);
            fundData = fundData.map(val => total > 0 ? ((val / total) * 100) : 0);
        }

        clearGroup(expensesG);

    const isCompact = expensesSvg.node()?.closest('.chart-card')?.classList.contains('compact');
    const margin = isCompact ? { top: 10, right: 16, bottom: 72, left: 52 } : { top: 20, right: 20, bottom: 80, left: 60 };
    const width = (expensesSvg.node().getBoundingClientRect().width || 600) - margin.left - margin.right;
    const height = (parseInt(expensesSvg.style('height')) || 280) - margin.top - margin.bottom;

        expensesG.attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3Root.scaleBand()
            .domain(fundLabels)
            .range([0, width])
            .padding(0.2);

        const y = d3Root.scaleLinear()
            .domain([0, d3Root.max(fundData) || 1])
            .range([height, 0]);

        expensesG.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3Root.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-40)')
            .style('text-anchor', 'end');

        const yAxis = d3Root.axisLeft(y).ticks(6).tickFormat(d => view === 'percentage' ? d.toFixed(1) + '%' : d);
        expensesG.append('g').call(yAxis);

        expensesG.selectAll('.bar')
            .data(fundLabels.map((label, i) => ({ label, value: fundData[i] })))
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.label))
            .attr('y', d => y(d.value))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('fill', 'rgba(54,162,235,0.7)')
            .on('mousemove', (event, d) => {
                tooltip.style('display', 'block')
                    .html(`<strong>${d.label}</strong><br/>${view === 'percentage' ? d.value.toFixed(1) + '%' : d.value + ' звітів'}`)
                    .style('left', (event.pageX + 12) + 'px')
                    .style('top', (event.pageY + 12) + 'px');
            })
            .on('mouseleave', () => tooltip.style('display', 'none'));

        const viewLabel = view === 'percentage' ? 'відсоток' : 'кількість';
        showNotification(`Змінено вигляд на ${viewLabel}`, 'success');
    }

    function hideLoadingStates() {
        setTimeout(() => {
            const loadingStates = document.querySelectorAll('.chart-loading');
            loadingStates.forEach(loading => {
                loading.style.display = 'none';
            });
        }, 1000);
    }

    function updateStats() {
        const totalRecords = document.getElementById('total-records');
        const filteredRecords = document.getElementById('filtered-records');
        
        if (totalRecords) totalRecords.textContent = data.length;
        if (filteredRecords) filteredRecords.textContent = filteredData.length;
        
        const showingStart = document.getElementById('showing-start');
        const showingEnd = document.getElementById('showing-end');
        const showingTotal = document.getElementById('showing-total');
        
        const start = (currentPage - 1) * rowsPerPage + 1;
        const end = Math.min(currentPage * rowsPerPage, filteredData.length);
        
        if (showingStart) showingStart.textContent = start;
        if (showingEnd) showingEnd.textContent = end;
        if (showingTotal) showingTotal.textContent = filteredData.length;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}-color);
            border-radius: var(--radius-md);
            padding: 1rem;
            box-shadow: var(--shadow-lg);
            z-index: 9999;
            min-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    window.toggleFullscreen = function(elementId) {
        const chartElement = document.getElementById(elementId);
        if (!chartElement) {
            console.error('Element not found:', elementId);
            return;
        }
        let svgToClone;
        let chartTitle = '';
        if (elementId === 'pie-chart-container') {
            svgToClone = document.getElementById('bubble-svg');
            chartTitle = 'Типи Звітів';
        } else if (elementId === 'revenue-chart-container') {
            svgToClone = document.getElementById('revenue-svg');
            chartTitle = 'Динаміка Звітів за Часом';
        } else if (elementId === 'expenses-chart-container') {
            svgToClone = document.getElementById('expenses-svg');
            chartTitle = 'Розподіл за Фондами';
        }

        if (!svgToClone) {
            console.error('SVG not found for fullscreen:', elementId);
            return;
        }

        showChartModal(svgToClone, chartTitle);
    };

    function showChartModal(chartInstance, chartTitle) {
        const modalContent = `
            <div class="chart-modal-backdrop" id="chart-modal-backdrop">
                <div class="chart-modal-content" onclick="event.stopPropagation()">
                    <div class="chart-modal-header">
                        <h3><i class="fas fa-chart-line"></i> ${chartTitle}</h3>
                        <button class="chart-modal-close" id="chart-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="chart-modal-body" id="chart-modal-body">
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.id = 'chart-modal';
        modalElement.innerHTML = modalContent;
        document.body.appendChild(modalElement);

        document.getElementById('chart-modal-close').addEventListener('click', closeChartModal);
        document.getElementById('chart-modal-backdrop').addEventListener('click', closeChartModal);

        const modalBody = document.getElementById('chart-modal-body');

        if (chartTitle === 'Типи Звітів') {
            const modalScale = 0.92; 
            const modalPadding = 0;   
            const minModalSize = 250;
            const strokeWidth = 1.0;  
            const textBaseSize = 12;  

            const rect = modalBody.getBoundingClientRect();
            const margin = { top: 0, right: 0, bottom: 0, left: 0 };
            const rawWidth = Math.max(minModalSize, rect.width - margin.left - margin.right);
            const rawHeight = Math.max(minModalSize, rect.height - margin.top - margin.bottom);
            const width = Math.floor(rawWidth * modalScale);
            const height = Math.floor(rawHeight * modalScale);

            const svg = d3Root.select(modalBody)
                .append('svg')
                .attr('id', 'modal-bubble-svg')
                .style('width', '100%')
                .style('height', '100%')
                .attr('viewBox', `0 0 ${rawWidth} ${rawHeight}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');

            const offsetX = Math.max(0, Math.floor((rawWidth - width) / 2));
            const offsetY = Math.max(0, Math.floor((rawHeight - height) / 2));
            const g = svg.append('g').attr('transform', `translate(${offsetX + margin.left},${offsetY + margin.top})`);

            const reportTypeCounts = filteredData.reduce((acc, item) => {
                const name = getReportName(item.reportTypeId, item.publishDate);
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});

            const treeData = {
                name: 'Типи звітів',
                children: Object.keys(reportTypeCounts).map(key => ({ name: key, value: reportTypeCounts[key] }))
            };

            const treemap = d3Root.treemap()
                .tile(d3Root.treemapSquarify)
                .size([width, height])
                .padding(modalPadding)
                .round(false);

            const root = d3Root.hierarchy(treeData)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value);

            treemap(root);

            const color = d3Root.scaleOrdinal(d3Root.schemeSet3);

            const leaf = g.selectAll('g.treemap-leaf')
                .data(root.leaves())
                .join('g')
                .attr('class', 'treemap-leaf')
                .attr('transform', d => `translate(${d.x0},${d.y0})`);

            const rectRx = Math.max(0, Math.round(4 * modalScale));
            const rectStroke = Math.max(0.5, strokeWidth * modalScale);

            leaf.append('rect')
                .attr('width', d => Math.max(0, d.x1 - d.x0))
                .attr('height', d => Math.max(0, d.y1 - d.y0))
                .attr('fill', (d, i) => color(i))
                .attr('fill-opacity', 0.85)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', rectStroke)
                .attr('rx', rectRx)
                .on('mousemove', (event, d) => {
                    showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
                })
                .on('touchstart', (event, d) => {
                    showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
                })
                .on('click', (event, d) => {
                    showSmartTooltip(event, `<strong>${d.data.name}</strong><br/>Кількість: ${d.data.value}<br/>Відсоток: ${((d.data.value / filteredData.length) * 100).toFixed(1)}%`);
                })
                .on('mouseleave', () => tooltip.style('display', 'none'));

            const modalFontSize = Math.max(8, Math.floor(textBaseSize * modalScale));
            leaf.append('text')
                .attr('x', 6)
                .attr('y', 6 + modalFontSize)
                .attr('fill', '#ffffff')
                .attr('class', 'treemap-text')
                .style('font-size', `${modalFontSize}px`)
                .style('font-weight', 600)
                .text(d => d.data.name)
                .each(function(d) {
                    const node = d3Root.select(this);
                    const maxWidth = Math.max(0, d.x1 - d.x0) - 12;
                    let text = d.data.name;
                    while (this.getComputedTextLength && this.getComputedTextLength() > maxWidth && text.length > 3) {
                        text = text.slice(0, -2);
                        node.text(text + '…');
                    }
                });

            window.currentModalSvg = svg.node();
        } else {
            const svgNode = chartInstance.cloneNode(true);
            svgNode.removeAttribute('width');
            svgNode.removeAttribute('height');
            svgNode.style.width = '100%';
            svgNode.style.height = '100%';
            modalBody.appendChild(svgNode);
            window.currentModalSvg = svgNode;
        }
    }

    window.closeChartModal = function() {
        const modal = document.getElementById('chart-modal');
        if (modal) {
            if (window.currentModalSvg) {
                try { window.currentModalSvg.remove(); } catch(e) {}
                window.currentModalSvg = null;
            }
            modal.remove();
        }
    };

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeChartModal();
        }
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    }

    // Перемальовуємо графіки при зміні розмірів вікна (з дебаунсом)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const activePeriod = document.querySelector('[data-period].active')?.getAttribute('data-period') || 'month';
            const activeView = document.querySelector('[data-view].active')?.getAttribute('data-view') || 'count';
            updateRevenueChart(activePeriod);
            updateExpensesChart(activeView);
            updateTreemapChart();
        }, 150);
    });

    updateDashboard();
});

