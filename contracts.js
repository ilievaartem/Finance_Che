// Enhanced JavaScript для модернізованої сторінки договорів
class ContractsDashboard {
    constructor() {
        this.data = this.loadData();
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.rowsPerPage = 10;
    this.timeGroupBy = 'month';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchQuery = '';
        
        this.initializeDateRange();
        this.initializeEventListeners();
        this.initializeTheme();
        this.populateFilters();
        this.updateDashboard();
    }

    loadData() {
        try {
            return combinedApiDataContracts || [];
        } catch {
            console.warn('Дані договорів не знайдено');
            return [];
        }
    }

    initializeDateRange() {
        const dates = this.data.map(item => item.documentDate).filter(Boolean).sort();
        this.minDateStr = dates[0] || '2015-01-01';
        this.maxDateStr = dates[dates.length - 1] || '2025-12-31';
        this.minTimestamp = new Date(this.minDateStr).getTime();
        this.maxTimestamp = new Date(this.maxDateStr).getTime();

        // Initialize date slider
        const dateSlider = document.getElementById('date-slider-contracts');
        if (dateSlider && !dateSlider.noUiSlider) {
            noUiSlider.create(dateSlider, {
                start: [0, 100],
                connect: true,
                range: { 'min': 0, 'max': 100 },
                tooltips: false,
                format: {
                    to: (value) => Math.round(value),
                    from: (value) => Number(value)
                }
            });

            dateSlider.noUiSlider.on('update', (values) => {
                this.updateDateDisplay(values);
                this.applyFilters();
            });
        }

        this.updateDateDisplay(['0', '100']);
    }

    updateDateDisplay(values) {
        const minValue = parseFloat(values[0]);
        const maxValue = parseFloat(values[1]);
        const minDateSelected = new Date(this.minTimestamp + (this.maxTimestamp - this.minTimestamp) * (minValue / 100));
        const maxDateSelected = new Date(this.minTimestamp + (this.maxTimestamp - this.minTimestamp) * (maxValue / 100));
        
        const minDisplay = document.getElementById('min-date-display-contracts');
        const maxDisplay = document.getElementById('max-date-display-contracts');
        
        if (minDisplay) minDisplay.textContent = minDateSelected.toISOString().split('T')[0];
        if (maxDisplay) maxDisplay.textContent = maxDateSelected.toISOString().split('T')[0];
    }

    initializeEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Time grouping buttons (financial-style)
        const periodButtons = document.querySelectorAll('[data-period]');
        periodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                periodButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const period = e.currentTarget.getAttribute('data-period');
                this.timeGroupBy = period;
                this.updateTimeChart();
            });
        });

        // Clear filters
        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        // Reset filters (financial-style button)
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.clearFilters());
        }

        // Search
        const searchInput = document.getElementById('table-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Actions: Export PDF and Refresh Table
        const exportPdfBtn = document.getElementById('export-pdf');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPdf());
        }

        const refreshTableBtn = document.getElementById('refresh-table');
        if (refreshTableBtn) {
            refreshTableBtn.addEventListener('click', () => this.refreshTableData());
        }

        // Refresh
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Table sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.sortTable(th.dataset.column, th);
            });
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('contracts-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('contracts-theme', newTheme);
        this.updateThemeIcon(newTheme);
        console.log(`Тему змінено на ${newTheme === 'dark' ? 'темну' : 'світлу'}`);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    populateFilters() {
        const orgSelect = document.getElementById('org-filter-contracts');
        if (!orgSelect) return;

        const uniqueOrgs = [...new Set(this.data.map(item => item.edrpou).filter(Boolean))];
        
        orgSelect.innerHTML = '<option value="">Всі організації</option>';
        uniqueOrgs.forEach(org => {
            const option = document.createElement('option');
            option.value = org;
            option.textContent = this.orgMap[org] || org;
            orgSelect.appendChild(option);
        });

        orgSelect.addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        const orgSelect = document.getElementById('org-filter-contracts');
        const dateSlider = document.getElementById('date-slider-contracts');
        
        const org = orgSelect ? orgSelect.value : '';
        let minDateSelected = this.minDateStr;
        let maxDateSelected = this.maxDateStr;

        if (dateSlider && dateSlider.noUiSlider) {
            const values = dateSlider.noUiSlider.get();
            const minValue = parseFloat(values[0]);
            const maxValue = parseFloat(values[1]);
            minDateSelected = new Date(this.minTimestamp + (this.maxTimestamp - this.minTimestamp) * (minValue / 100)).toISOString().split('T')[0];
            maxDateSelected = new Date(this.minTimestamp + (this.maxTimestamp - this.minTimestamp) * (maxValue / 100)).toISOString().split('T')[0];
        }

        this.filteredData = this.data.filter(item => {
            const itemDate = item.documentDate;
            const orgMatch = !org || item.edrpou === org;
            const dateMatch = !itemDate || (itemDate >= minDateSelected && itemDate <= maxDateSelected);
            
            let searchMatch = true;
            if (this.searchQuery) {
                const searchableText = [
                    item.documentDate,
                    item.edrpou,
                    this.orgMap[item.edrpou],
                    item.amount?.toString(),
                    this.currencyMap[item.currency],
                    item.contractors?.[0]?.name
                ].filter(Boolean).join(' ').toLowerCase();
                
                searchMatch = searchableText.includes(this.searchQuery);
            }

            return orgMatch && dateMatch && searchMatch;
        });

        // Apply sorting
        if (this.sortColumn) {
            this.applySorting();
        }

        this.currentPage = 1;
        this.updateDashboard();
        console.log(`Знайдено ${this.filteredData.length} записів`);
    }

    sortTable(column, headerEl) {
        // Tri-state: none -> asc -> desc -> none
        if (this.sortColumn !== column) {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        } else if (this.sortDirection === 'asc') {
            this.sortDirection = 'desc';
        } else if (this.sortDirection === 'desc') {
            // back to neutral
            this.sortColumn = null;
            this.sortDirection = 'asc';
        } else {
            this.sortDirection = 'asc';
        }

        if (this.sortColumn) {
            this.applySorting();
        } else {
            // reset to original order by date then id to keep stable
            this.filteredData.sort((a, b) => (new Date(a.documentDate||0)) - (new Date(b.documentDate||0)));
        }
        this.updateTable();
        this.updateSortIcons();
    }

    applySorting() {
        this.filteredData.sort((a, b) => {
            let aVal, bVal;

            switch (this.sortColumn) {
                case 'documentDate':
                    aVal = new Date(a.documentDate || 0);
                    bVal = new Date(b.documentDate || 0);
                    break;
                case 'amount':
                    aVal = a.amount || 0;
                    bVal = b.amount || 0;
                    break;
                case 'contractor':
                    aVal = a.contractors?.[0]?.name || '';
                    bVal = b.contractors?.[0]?.name || '';
                    break;
                default:
                    aVal = a[this.sortColumn] || '';
                    bVal = b[this.sortColumn] || '';
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable .sort-icon').forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });

        if (this.sortColumn) {
            const currentColumnHeader = document.querySelector(`[data-column="${this.sortColumn}"] .sort-icon`);
            if (currentColumnHeader) {
                currentColumnHeader.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon`;
            }
        }
    }

    clearFilters() {
        const orgSelect = document.getElementById('org-filter-contracts');
        const searchInput = document.getElementById('table-search');
        const dateSlider = document.getElementById('date-slider-contracts');

        if (orgSelect) orgSelect.value = '';
        if (searchInput) searchInput.value = '';
        if (dateSlider && dateSlider.noUiSlider) {
            dateSlider.noUiSlider.set([0, 100]);
        }

        this.searchQuery = '';
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.applyFilters();
        console.log('Фільтри очищено');
    }

    updateDashboard() {
        const total = this.filteredData.length;
        const orgCounts = this.filteredData.reduce((acc, item) => {
            acc[item.edrpou] = (acc[item.edrpou] || 0) + 1;
            return acc;
        }, {});
        
        const mostCommonOrg = Object.keys(orgCounts).length 
            ? Object.keys(orgCounts).reduce((a, b) => orgCounts[a] > orgCounts[b] ? a : b) 
            : 'Н/Д';
        
        const totalAmount = this.filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
        const avgAmount = total > 0 ? (totalAmount / total) : 0;
        
    // Update metrics
        this.updateElement('total-contracts', total.toLocaleString());
        this.updateElement('most-common-org-contracts', this.orgMap[mostCommonOrg] || mostCommonOrg);
    // KPI amounts without decimals
    this.updateElement('total-amount-contracts', this.formatCurrency0(totalAmount));
    this.updateElement('avg-amount-contracts', this.formatCurrency0(avgAmount));

        // Update table info
        this.updateElement('table-info-text', `Показано ${Math.min(this.rowsPerPage, total)} з ${total} записів`);

        this.updateTable();
        this.updatePagination();
        this.updateCharts();

        // Initialize collapse handlers (chevron rotation, collapsed class)
        this.initializeCollapseHandlers();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('animate__pulse');
            setTimeout(() => element.classList.remove('animate__pulse'), 1000);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Currency with no decimals (for KPI tiles)
    formatCurrency0(amount) {
        return new Intl.NumberFormat('uk-UA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    updateTable() {
        const tableBody = document.querySelector('#data-table-contracts tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const pageData = this.filteredData.slice(start, end);

        pageData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.documentDate || 'N/A'}</td>
                <td>${item.edrpou || 'N/A'}</td>
                <td>${this.formatCurrency(item.amount || 0)}</td>
                <td>${this.currencyMap[item.currency] || item.currency || 'N/A'}</td>
                <td>${item.contractors?.[0]?.name || 'N/A'}</td>
                <td>
                    <button class="btn-table-action" title="Переглянути деталі" onclick="contractsDashboard.openContractModal('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    updatePagination() {
        const pagination = document.getElementById('pagination-contracts');
        if (!pagination) return;

        pagination.innerHTML = '';
        const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);

        if (totalPages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); contractsDashboard.goToPage(${this.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </a>`;
        pagination.appendChild(prevLi);

        // Determine start/end range
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, this.currentPage + 2);

        // First page quick jump
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.className = 'page-item';
            firstLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); contractsDashboard.goToPage(1)">1</a>`;
            pagination.appendChild(firstLi);

            if (startPage > 2) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(dotsLi);
            }
        }

        // Middle pages
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); contractsDashboard.goToPage(${i})">${i}</a>`;
            pagination.appendChild(li);
        }

        // Last page quick jump
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dotsLi = document.createElement('li');
                dotsLi.className = 'page-item disabled';
                dotsLi.innerHTML = `<span class="page-link">...</span>`;
                pagination.appendChild(dotsLi);
            }

            const lastLi = document.createElement('li');
            lastLi.className = 'page-item';
            lastLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); contractsDashboard.goToPage(${totalPages})">${totalPages}</a>`;
            pagination.appendChild(lastLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); contractsDashboard.goToPage(${this.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </a>`;
        pagination.appendChild(nextLi);
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.filteredData.length / this.rowsPerPage)) return;
        this.currentPage = page;
        this.updateTable();
        this.updatePagination();
    }

    exportToPdf() {
        const printContent = this.generatePrintContent();
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        console.log('Відкрито вікно друку для PDF!');
    }

    refreshTableData() {
        const refreshBtnIcon = document.querySelector('#refresh-table i');
        if (refreshBtnIcon) refreshBtnIcon.style.animation = 'spin 1s linear infinite';

        setTimeout(() => {
            // Reset table-specific settings
            const searchInput = document.getElementById('table-search');
            if (searchInput) searchInput.value = '';
            this.searchQuery = '';
            this.sortColumn = null;
            this.sortDirection = 'asc';
            this.currentPage = 1;
            // re-apply filters to reflect cleared search, keep selected org/date
            this.applyFilters();
            this.updateTable();
            this.updatePagination();
            if (refreshBtnIcon) refreshBtnIcon.style.animation = '';
            console.log('Таблицю оновлено!');
        }, 800);
    }

    generatePrintContent() {
        const rowsHtml = this.filteredData.slice(0, 100).map(item => `
            <tr>
                <td>${item.documentDate || 'N/A'}</td>
                <td>${item.edrpou || 'N/A'}</td>
                <td>${this.orgMap[item.edrpou] || ''}</td>
                <td>${this.formatCurrency(item.amount || 0)}</td>
                <td>${this.currencyMap[item.currency] || item.currency || 'N/A'}</td>
                <td>${item.contractors?.[0]?.name || 'N/A'}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Контракти</title>
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
                <h1>Дані договорів</h1>
                <div class="meta">
                    <p>Дата створення: ${new Date().toLocaleDateString('uk-UA')}</p>
                    <p>Загальна кількість записів: ${this.filteredData.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Дата документа</th>
                            <th>ЄДРПОУ</th>
                            <th>Організація</th>
                            <th>Сума</th>
                            <th>Валюта</th>
                            <th>Контрагент</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                ${this.filteredData.length > 100 ? '<p><em>Показано перші 100 записів з ' + this.filteredData.length + '</em></p>' : ''}
            </body>
            </html>
        `;
    }

    updateCharts() {
        this.updateTimeChart();
        this.updateOrganizationCharts();
        this.updateContractorCharts();
    }

    updateTimeChart() {
        const dateCounts = this.filteredData.reduce((acc, item) => {
            const dateStr = item.documentDate;
            if (dateStr) {
                const date = new Date(dateStr);
                let key;
                if (this.timeGroupBy === 'year') {
                    key = date.getFullYear().toString();
                } else if (this.timeGroupBy === 'month') {
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                } else {
                    key = dateStr;
                }
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedKeys = Object.keys(dateCounts).sort();
        const values = sortedKeys.map(key => dateCounts[key]);
        
        this.renderLineChart('contracts-chart', sortedKeys, values, {
            color: '#8b5cf6',
            title: 'Кількість договорів'
        });
    }

    updateOrganizationCharts() {
        const orgCounts = this.filteredData.reduce((acc, item) => {
            const org = item.edrpou || 'Unknown';
            acc[org] = (acc[org] || 0) + 1;
            return acc;
        }, {});

        // Top 5 organizations
        const topOrgs = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topOrgLabels = topOrgs.map(([org]) => this.orgMap[org] || org);
        const topOrgValues = topOrgs.map(([, count]) => count);
        
        this.renderBarChart('contracts-top-org-chart', topOrgLabels, topOrgValues, {
            color: '#a855f7'
        });

        // All organizations pie chart
        const allOrgLabels = Object.keys(orgCounts).map(org => this.orgMap[org] || org);
        const allOrgValues = Object.values(orgCounts);
        
        this.renderPieChart('contracts-org-chart', allOrgLabels, allOrgValues);
    }

    updateContractorCharts() {
        // Top contractors by count
        const contractorCounts = this.filteredData.reduce((acc, item) => {
            if (item.contractors && Array.isArray(item.contractors)) {
                item.contractors.forEach(contractor => {
                    const name = contractor.name || 'Unknown';
                    acc[name] = (acc[name] || 0) + 1;
                });
            }
            return acc;
        }, {});

        const topContractors = Object.entries(contractorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topContractorLabels = topContractors.map(([name]) => name);
        const topContractorValues = topContractors.map(([, count]) => count);
        
        this.renderBarChart('contracts-top-contractors-count-chart', topContractorLabels, topContractorValues, {
            color: '#10b981'
        });

        // Top contractors by amount
        const contractorAmounts = this.filteredData.reduce((acc, item) => {
            if (item.contractors && Array.isArray(item.contractors) && item.amount) {
                item.contractors.forEach(contractor => {
                    const name = contractor.name || 'Unknown';
                    acc[name] = (acc[name] || 0) + item.amount;
                });
            }
            return acc;
        }, {});

        const topContractorsByAmount = Object.entries(contractorAmounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topContractorAmountLabels = topContractorsByAmount.map(([name]) => name);
        const topContractorAmountValues = topContractorsByAmount.map(([, amount]) => amount);
        
        this.renderBarChart('contracts-top-contractors-amount-chart', topContractorAmountLabels, topContractorAmountValues, {
            color: '#f59e0b'
        });
    }

    setActiveTimeButton(activeId) {
        // Kept for backward compatibility (no-op with new buttons)
        const btn = document.querySelector(`[data-period="${activeId}"]`);
        if (!btn) return;
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // Chart rendering methods
    clearChart(id) {
        d3.select('#' + id).selectAll('*').remove();
    }

    getChartSize(id) {
        const node = document.getElementById(id);
        return { 
            width: Math.max(300, node?.clientWidth || 600), 
            height: node?.clientHeight || 350 
        };
    }

    renderLineChart(id, labels, values, opts = {}) {
        this.clearChart(id);
        const { width, height } = this.getChartSize(id);
        // Give the day view extra bottom space for more x-axis labels
        const isDay = this.timeGroupBy === 'day';
        const margin = { top: 20, right: 20, bottom: isDay ? 70 : 50, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scalePoint().domain(labels).range([0, w]);
        const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([h, 0]);

        const line = d3.line()
            .x((d, i) => x(labels[i]))
            .y(d => y(d))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(values)
            .attr('fill', 'none')
            .attr('stroke', opts.color || '#8b5cf6')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Add points
        g.selectAll('circle')
            .data(values)
            .enter().append('circle')
            .attr('cx', (d, i) => x(labels[i]))
            .attr('cy', d => y(d))
            .attr('r', 4)
            .attr('fill', opts.color || '#8b5cf6')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => this.showTooltip(event, d, labels[values.indexOf(d)]))
            .on('mouseout', () => this.hideTooltip());

        // Add axes
        // Bottom ticks: show a bit more labels for day granularity
        const divisor = isDay ? 12 : 8; // more ticks for day
        const step = Math.max(1, Math.ceil((labels.length || 1) / divisor));
        const tickValues = labels.filter((d, i) => i % step === 0);
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickValues(tickValues))
            .selectAll('text')
            .attr('transform', 'rotate(-40)')
            .style('text-anchor', 'end');

        g.append('g')
            .call(d3.axisLeft(y));
    }

    renderBarChart(id, labels, values, opts = {}) {
        this.clearChart(id);
        const { width, height } = this.getChartSize(id);
        const margin = { top: 20, right: 20, bottom: 80, left: 60 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([h, 0]);

        g.selectAll('.bar')
            .data(values)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', (d, i) => x(labels[i]))
            .attr('y', d => y(d))
            .attr('width', x.bandwidth())
            .attr('height', d => h - y(d))
            .attr('fill', opts.color || '#8b5cf6')
            .attr('rx', 4)
            .on('mouseover', (event, d) => this.showTooltip(event, d, labels[values.indexOf(d)]))
            .on('mouseout', () => this.hideTooltip());

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '11px')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        g.append('g')
            .call(d3.axisLeft(y));
    }

    renderPieChart(id, labels, values) {
        this.clearChart(id);
        const { width, height } = this.getChartSize(id);
        const radius = Math.min(width, height) / 2 - 40;

        const svg = d3.select('#' + id).append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width/2},${height/2})`);

        const pie = d3.pie().sort(null).value(d => d);
        const dataReady = pie(values);
        const arc = d3.arc().innerRadius(radius * 0.4).outerRadius(radius);

        svg.selectAll('slice')
            .data(dataReady)
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => this.bubbleColors[i % this.bubbleColors.length])
            .attr('stroke', '#fff')
            .style('stroke-width', '2px')
            .on('mouseover', (event, d) => {
                const i = dataReady.indexOf(d);
                this.showTooltip(event, values[i], labels[i]);
            })
            .on('mouseout', () => this.hideTooltip());

    }

    initializeCollapseHandlers() {
        const collapseButtons = document.querySelectorAll('.btn-collapse');
        collapseButtons.forEach(button => {
            const targetId = button.getAttribute('data-bs-target');
            const targetElement = document.querySelector(targetId);
            const card = button.closest('.chart-card') || button.closest('.panel-card');

            if (targetElement) {
                if (targetElement.classList.contains('show')) {
                    button.setAttribute('aria-expanded', 'true');
                    if (card) card.classList.remove('is-collapsed');
                } else {
                    button.setAttribute('aria-expanded', 'false');
                    if (card) card.classList.add('is-collapsed');
                }
                targetElement.addEventListener('shown.bs.collapse', function() {
                    button.setAttribute('aria-expanded', 'true');
                    if (card) card.classList.remove('is-collapsed');
                });
                targetElement.addEventListener('hidden.bs.collapse', function() {
                    button.setAttribute('aria-expanded', 'false');
                    if (card) card.classList.add('is-collapsed');
                });
            }
        });
    }

    showTooltip(event, value, label) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'd3-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'var(--bg-primary)')
            .style('padding', '8px 12px')
            .style('border', '1px solid var(--border-color)')
            .style('border-radius', '6px')
            .style('box-shadow', 'var(--shadow-lg)')
            .style('font-size', '12px')
            .style('color', 'var(--text-primary)')
            .style('z-index', '1000');

        tooltip.html(`<strong>${label}</strong><br/>${typeof value === 'number' ? this.formatCurrency(value) : value}`);
        
        tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        d3.selectAll('.d3-tooltip').remove();
    }

    openContractModal(itemId) {
        const item = this.data.find(contract => (contract.id ?? '').toString() === itemId.toString());
        if (!item) return;

        const modalBody = document.getElementById('contract-modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = this.generateModalContent(item);
        
        const modal = new bootstrap.Modal(document.getElementById('contract-modal'));
        modal.show();
    }

    generateModalContent(item) {
        const cpvCodes = item.cpvCode ? 
            (Array.isArray(item.cpvCode) ? 
                item.cpvCode.map(c => typeof c === 'object' ? c.code : c).join(', ') : 
                item.cpvCode) : 'N/A';
        
        const cpvNames = item.cpvCode ? 
            (Array.isArray(item.cpvCode) ? 
                item.cpvCode.map(c => typeof c === 'object' ? c.name : c).join(', ') : 
                'N/A') : 'N/A';

        const details = {
            'ID': item.id,
            'Найменування розпорядника': this.orgMap[item.edrpou] || 'N/A',
            'Тип організації': this.organizationTypeMap[item.orgPravForm] || 'N/A',
            'ЄДРПОУ': item.edrpou,
            'Номер документа': item.documentNumber,
            'Дата документа': item.documentDate,
            'Дата підписання': item.signDate,
            'Сума': this.formatCurrency(item.amount || 0),
            'Валюта': this.currencyMap[item.currency] || item.currency,
            'Сума в UAH': this.formatCurrency(item.currencyAmountUAH || 0),
            'Назва закупівлі': item.contractors?.[0]?.name || 'N/A',
            'Тендерна закупівля': item.isTender ? 'Так' : 'Ні',
            'Підстава закупівлі': item.reason || 'N/A',
            'Номер CPV': cpvCodes,
            'Назва CPV': cpvNames,
            'Підпис': item.signature?.caAddress || 'N/A'
        };

        let content = '<div class="row">';
        Object.entries(details).forEach(([key, value]) => {
            content += `
                <div class="col-md-6 mb-3">
                    <div class="detail-item">
                        <strong class="detail-label">${key}:</strong>
                        <span class="detail-value">${value}</span>
                    </div>
                </div>
            `;
        });
        content += '</div>';

        // Add contractors section
        if (item.contractors && Array.isArray(item.contractors)) {
            content += '<hr><h6><i class="fas fa-handshake me-2"></i>Контрагенти</h6>';
            content += '<div class="contractors-list">';
            
            item.contractors.forEach((contractor, index) => {
                content += `
                    <div class="contractor-card mb-3">
                        <h6>Контрагент ${index + 1}</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <strong>Назва:</strong> ${contractor.name || 'N/A'}<br>
                                <strong>Тип:</strong> ${this.contractorTypeMap[contractor.contractorType] || contractor.contractorType || 'N/A'}<br>
                                <strong>Ідентифікатор:</strong> ${contractor.identifier || 'N/A'}
                            </div>
                            <div class="col-md-6">
                `;
                
                const fullName = [contractor.firstName, contractor.lastName, contractor.middleName].filter(Boolean).join(' ');
                if (fullName) {
                    content += `<strong>ПІБ:</strong> ${fullName}<br>`;
                }
                
                if (contractor.address && typeof contractor.address === 'object') {
                    const addressParts = [
                        contractor.address.country,
                        contractor.address.region,
                        contractor.address.locality,
                        contractor.address.streetAddress,
                        contractor.address.postalCode
                    ].filter(Boolean);
                    
                    if (addressParts.length > 0) {
                        content += `<strong>Адреса:</strong> ${addressParts.join(', ')}`;
                    }
                }
                
                content += '</div></div></div>';
            });
            content += '</div>';
        }

        // Add specifications section
        if (item.specifications && Array.isArray(item.specifications)) {
            content += '<hr><h6><i class="fas fa-list me-2"></i>Специфікації</h6>';
            content += '<div class="specifications-list">';
            
            item.specifications.forEach((spec, index) => {
                content += `
                    <div class="specification-card mb-2">
                        <strong>Позиція ${index + 1}:</strong> ${spec.specificationName || 'N/A'}<br>
                        <strong>CPV Код:</strong> ${spec.cpvCode || 'N/A'}<br>
                        <strong>Кількість:</strong> ${spec.itemCount || 'N/A'} ${spec.itemDimension || ''}<br>
                        <strong>Вартість:</strong> ${this.formatCurrency(spec.itemCost || 0)}
                    </div>
                `;
            });
            content += '</div>';
        }

        return content;
    }

    exportData() {
        this.showLoading();
        
        setTimeout(() => {
            try {
                const csvContent = this.generateCSV();
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `contracts_export_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                
                console.log('Дані успішно експортовано');
            } catch (error) {
                console.log('Помилка експорту даних');
            } finally {
                this.hideLoading();
            }
        }, 1000);
    }

    generateCSV() {
        const headers = ['Дата документа', 'ЄДРПОУ', 'Організація', 'Сума', 'Валюта', 'Контрагент'];
        const rows = this.filteredData.map(item => [
            item.documentDate || '',
            item.edrpou || '',
            this.orgMap[item.edrpou] || '',
            item.amount || 0,
            this.currencyMap[item.currency] || item.currency || '',
            item.contractors?.[0]?.name || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    refreshData() {
        this.showLoading();
        
        setTimeout(() => {
            this.data = this.loadData();
            this.applyFilters();
            console.log('Дані оновлено');
            this.hideLoading();
        }, 1500);
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    get orgMap() {
        return {
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
            "00022680": "ЧЕРНІВЕЦЬКА ОДА",
            "45048943": "ДЕПАРТАМЕНТ СИСТЕМ ЖИТТЄЗАБЕЗПЕЧЕННЯ",
            "45776308": "УПРАВЛІННЯ ЦИФРОВОГО РОЗВИТКУ, ЦИФРОВИХ ТРАНСФОРМАЦІЙ І ЦИФРОВІЗАЦІЇ"
        };
    }

    get contractorTypeMap() {
        return {
            "-1": "Не визначено",
            "0": "Фізична особа",
            "1": "Фізична особа-підприємець",
            "2": "Юридична особа"
        };
    }

    get currencyMap() {
        return {
            "0": "Гривня",
            "1": "Долар США",
            "2": "Євро",
            "3": "Фунт стерлінгів",
            "4": "Єна",
            "5": "Юань",
            "6": "Російський рубль"
        };
    }

    get organizationTypeMap() {
        return {
            "mainDistrib": "Головний розпорядник бюджетних коштiв",
            "distrib": "Розпорядник бюджетних коштiв",
            "getter": "Одержувач бюджетних коштiв",
            "govOrg": "Державне пiдприємство",
            "comOrg": "Комунальне пiдприємство",
            "NBU": "Національний банк України",
            "govBanks": "Державний банк",
            "govFonds": "Державний цiльовий фонд",
            "pubAcCom": "Господарське товариство",
            "govIns": "Державна установа",
            "PFU": "Орган Пенсійного фонду",
            "socIns": "Фонд загальнообов'язкового державного соціального страхування"
        };
    }

    get bubbleColors() {
        return [
            '#8b5cf6', '#a855f7', '#c084fc', '#10b981', '#06b6d4',
            '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'
        ];
    }
}

let contractsDashboard;

document.addEventListener('DOMContentLoaded', function() {
    contractsDashboard = new ContractsDashboard();
    // Wire ESC to close chart modal if open
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeChartModal();
        }
    });
});

// Fullscreen chart helpers (aligned with financial.js UX)
function toggleFullscreen(elementId) {
    const chartElement = document.getElementById(elementId);
    if (!chartElement) {
        console.error('Element not found:', elementId);
        return;
    }
    const svgToClone = chartElement.querySelector('svg');
    const titleMap = {
        'contracts-chart': 'Динаміка Договорів у Часі',
        'contracts-top-org-chart': 'ТОП-5 Організацій',
        'contracts-org-chart': 'Розподіл за Організаціями',
        'contracts-top-contractors-count-chart': 'ТОП-5 Контрагентів (К-сть)',
        'contracts-top-contractors-amount-chart': 'ТОП-5 Контрагентів (Сума)'
    };
    const chartTitle = titleMap[elementId] || 'Графік';
    if (!svgToClone) {
        console.error('SVG not found for fullscreen:', elementId);
        return;
    }
    showChartModal(svgToClone, chartTitle);
}

function showChartModal(svgNode, chartTitle) {
    const modalContent = `
        <div class="chart-modal-backdrop" id="chart-modal-backdrop" onclick="closeChartModal()">
            <div class="chart-modal-content" onclick="event.stopPropagation()">
                <div class="chart-modal-header">
                    <h3><i class="fas fa-chart-line"></i> ${chartTitle}</h3>
                    <button class="chart-modal-close" id="chart-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="chart-modal-body" id="chart-modal-body"></div>
            </div>
        </div>`;

    const modalElement = document.createElement('div');
    modalElement.id = 'chart-modal';
    modalElement.innerHTML = modalContent;
    document.body.appendChild(modalElement);

    document.getElementById('chart-modal-close').addEventListener('click', closeChartModal);
    document.getElementById('chart-modal-backdrop').addEventListener('click', closeChartModal);

    const modalBody = document.getElementById('chart-modal-body');
    const svgClone = svgNode.cloneNode(true);
    // Preserve original viewport to make scaling clean in modal
    const origW = parseFloat(svgNode.getAttribute('width')) || svgNode.viewBox?.baseVal?.width || svgNode.getBoundingClientRect().width || 800;
    const origH = parseFloat(svgNode.getAttribute('height')) || svgNode.viewBox?.baseVal?.height || svgNode.getBoundingClientRect().height || 400;
    svgClone.setAttribute('viewBox', `0 0 ${origW} ${origH}`);
    svgClone.removeAttribute('width');
    svgClone.removeAttribute('height');
    svgClone.style.width = '100%';
    svgClone.style.height = '100%';
    modalBody.appendChild(svgClone);
    window.currentContractsModalSvg = svgClone;
}

function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        if (window.currentContractsModalSvg) {
            try { window.currentContractsModalSvg.remove(); } catch(e) {}
            window.currentContractsModalSvg = null;
        }
        modal.remove();
    }
}