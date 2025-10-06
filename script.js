// Assuming CombinedApiData.js defines combinedApiData as an array of objects
// Each object: { date: 'YYYY-MM', revenue: number, expenses: number, profit: number }

// Data structure: array of report objects with fields like fund, budget, orgPravForm, publishDate, etc.

const data = combinedApiData || [];
const typezvit = window.typezvit || [];
let filteredData = [...data];
let currentPage = 1;
const rowsPerPage = 10;

// Calculate min and max dates
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
    // Add more if needed
};

const fundMap = {
    "GENERAL": "Загальний",
    "SPECIAL": "Спеціальний",
    "null": "Інше",
    // Add more if needed
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


// Initialize charts
const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
const revenueChart = new Chart(revenueCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Звіти',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Звіти за Часом'
            }
        }
    }
});

const expensesProfitCtx = document.getElementById('expenses-profit-chart').getContext('2d');
const expensesProfitChart = new Chart(expensesProfitCtx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Кількість',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Звіти за Фондом'
            }
        }
    }
});

const bubbleColors = [
    'rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 205, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(153, 102, 255, 0.5)',
    'rgba(255, 159, 64, 0.5)',
    'rgba(199, 199, 199, 0.5)',
    'rgba(83, 102, 255, 0.5)',
    'rgba(255, 99, 255, 0.5)',
    'rgba(99, 255, 132, 0.5)'
];

const pieCtx = document.getElementById('pie-chart').getContext('2d');
const pieChart = new Chart(pieCtx, {
    type: 'bubble',
    data: {
        datasets: []
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: 'Типи Звітів'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const count = Math.round(Math.pow(context.raw.r / 3, 2));
                        return context.dataset.label + ': ' + count;
                    }
                }
            }
        },
        scales: {
            x: {
                display: false
            },
            y: {
                display: false
            }
        }
    }
});


// Initialize noUiSlider
const dateSlider = document.getElementById('date-slider');
noUiSlider.create(dateSlider, {
    start: [0, 100],
    connect: true,
    range: {
        'min': 0,
        'max': 100
    }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Populate filter options
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


    // Event listeners for filters
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

    // Function to update date displays
    function updateDateDisplays() {
        // Handled by noUiSlider update
    }

    // Function to update table
    function updateTable() {
        const tableBody = document.querySelector('#data-table tbody');
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);
        pageData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.publishDate || 'N/A'}</td>
                <td>${fundMap[item.fund] || item.fund || 'N/A'}</td>
                <td>${budgetMap[item.budget] || item.budget || 'N/A'}</td>
                <td>${orgMap[item.edrpou] || item.orgPravForm || 'N/A'}</td>
                <td title="${item.progKlas || ''}">${item.progKlas ? item.progKlas.substring(0, 50) + (item.progKlas.length > 50 ? '...' : '') : 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Function to update pagination
    function updatePagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>`;
            pagination.appendChild(li);
        }
    }

    function goToPage(page) {
        currentPage = page;
        updateTable();
        updatePagination();
    }

    // Function to update dashboard
    function updateDashboard() {

        // Calculate KPIs
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

        // Update KPI cards
        document.getElementById('total-revenue').textContent = totalReports;
        document.getElementById('total-expenses').textContent = fundMap[mostCommonFund] || mostCommonFund;
        document.getElementById('net-profit').textContent = budgetMap[mostCommonBudget] || mostCommonBudget;
        document.getElementById('profit-margin').textContent = filteredData.filter(item => item.orgName).length;

        // Reset to page 1 when filtering
        currentPage = 1;
        updateTable();
        updatePagination();

        // Update charts
        updateCharts();
    }

    // Function to update charts
    function updateCharts() {
        // Reports Over Time
        const dateCounts = filteredData.reduce((acc, item) => {
            const date = item.publishDate || 'Unknown';
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        const sortedDates = Object.keys(dateCounts).sort();
        revenueChart.data.labels = sortedDates;
        revenueChart.data.datasets[0].data = sortedDates.map(date => dateCounts[date]);
        revenueChart.update();

        // Fund Distribution
        const fundCounts = filteredData.reduce((acc, item) => {
            const fund = item.fund || 'null';
            acc[fund] = (acc[fund] || 0) + 1;
            return acc;
        }, {});
        const fundLabels = Object.keys(fundCounts).map(label => fundMap[label] || label);
        const fundData = Object.values(fundCounts);
        expensesProfitChart.data.labels = fundLabels;
        expensesProfitChart.data.datasets[0].data = fundData;
        expensesProfitChart.update();

        // Bubble Chart for Report Types
        const reportTypeCounts = filteredData.reduce((acc, item) => {
            const name = getReportName(item.reportTypeId, item.publishDate);
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});
        const reportTypeLabels = Object.keys(reportTypeCounts);
        const reportTypeDatasets = reportTypeLabels.map((label, index) => ({
            label: label,
            data: [{
                x: Math.random() * 100,
                y: Math.random() * 100,
                r: Math.sqrt(reportTypeCounts[label]) * 3
            }],
            backgroundColor: bubbleColors[index % bubbleColors.length],
            borderColor: bubbleColors[index % bubbleColors.length].replace('0.5', '1')
        }));
        pieChart.data.datasets = reportTypeDatasets;
        pieChart.update();
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

        updateDashboard();
    }

    // Initialize
    updateDashboard();
});

