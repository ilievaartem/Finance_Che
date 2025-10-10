// Assuming CombinedApiData.js defines combinedApiData as an array of objects
// Each object: { date: 'YYYY-MM', revenue: number, expenses: number, profit: number }

// Data structure: array of report objects with fields like fund, budget, orgPravForm, publishDate, etc.

const dataSources = {
    financial: combinedApiData || [],
    contracts: (function() { try { return combinedApiDataContracts; } catch { return []; } })(),
    acts: (function() { try { return combinedApiDataActs; } catch { return []; } })()
};

let currentTab = 'financial';
let data = dataSources[currentTab];
const reportTypes = (function() { try { return typezvit; } catch { return []; } })();
let filteredData = [...data];
let currentPage = 1;
const rowsPerPage = 10;
let timeGroupBy = 'month'; // for contracts time chart

// Calculate min and max dates
let dates = data.map(item => item.publishDate).filter(Boolean).sort();
let minDateStr = dates[0] || '2023-01-01';
let maxDateStr = dates[dates.length - 1] || '2025-12-31';
let minTimestamp = new Date(minDateStr).getTime();
let maxTimestamp = new Date(maxDateStr).getTime();

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

const contractorTypeMap = {
    "-1": "Не визначено",
    "0": "Фізична особа",
    "1": "Фізична особа-підприємець",
    "2": "Юридична особа"
};

const currencyMap = {
    "7": "Дирхам ОАЕ",
    "9": "Лек",
    "11": "Гульден Нідерландських Антилів",
    "12": "Кванза",
    "13": "Аргентинське песо",
    "17": "Конвертована марка",
    "18": "Барбадоський долар",
    "31": "Білоруський рубль",
    "32": "Белізький долар",
    "52": "Накфа",
    "53": "Ефіопський бир",
    "2": "Євро",
    "54": "Фіджійський долар",
    "55": "Фолклендський фунт",
    "3": "Фунт стерлінгів",
    "56": "Ларі",
    "57": "Ганський седі",
    "58": "Ґібралтарський фунт",
    "60": "Гвінейський франк",
    "62": "Ґайанський долар",
    "63": "Гонконгівський долар",
    "64": "Лемпіра",
    "65": "Хорватська куна",
    "66": "Ґурд",
    "68": "Рупія",
    "69": "Новий ізраїльський шекель e",
    "83": "Долар Кайманових островів",
    "85": "Кіп",
    "86": "Ліванський фунт",
    "88": "Ліберійський долар",
    "89": "Лоті",
    "90": "Лівійський динар",
    "91": "Марокканський дирхам",
    "92": "Молдавський лей",
    "93": "Малагасійський аріарі",
    "94": "Денар",
    "95": "К'ят",
    "96": "Тугрик",
    "97": "Патака",
    "98": "Уґія",
    "99": "Маврикійська рупія",
    "100": "Руфія",
    "101": "Малавійська квача",
    "102": "Мексиканське песо",
    "103": "Мексиканська перерахункова одиницяc",
    "104": "Малайзійський рингіт",
    "105": "Метикал",
    "106": "Намібійський долар",
    "107": "Найра",
    "108": "Золота кордоба",
    "109": "Норвезька крона",
    "110": "Непальська рупія",
    "111": "Новозеландський долар",
    "112": "Оманський ріал",
    "151": "Узбецький сум",
    "153": "Донг",
    "154": "Вату",
    "155": "Тала",
    "160": "Єменський ріал",
    "163": "Зімбабвійський долар",
    "8": "Афгані",
    "10": "Вірменський драм",
    "14": "Австралійський долар",
    "15": "Арубський флорин",
    "16": "Азербайджанський манат",
    "19": "Така",
    "20": "Болгарський Лев",
    "21": "Бахрейнський динар",
    "22": "Бурундійський франк",
    "23": "Бермудський долар",
    "24": "Брунейський долар",
    "25": "Болівіано",
    "26": "Мвдол",
    "27": "Бразильський реал",
    "28": "Багамський долар",
    "29": "Нґултрум",
    "30": "Пула",
    "33": "Канадський долар",
    "34": "Конголезький франк",
    "35": "Євро WIR",
    "36": "Швейцарський франк",
    "37": "Франк WIR",
    "38": "Умовна розрахункова одиниця Чілі",
    "39": "Чілійське песо",
    "5": "Юань",
    "40": "Колумбійське песо",
    "41": "Унідада де валор ріал (Одиниця реальної вартості)",
    "42": "Коста-риканський колон",
    "43": "Кубинське конвертоване песо",
    "44": "Кубинське песо",
    "45": "Ескудо Кабо-Верде",
    "46": "Чеська крона",
    "47": "Джибутійський франк",
    "48": "Данська крона",
    "49": "Домініканське песо",
    "50": "Алжирський динар",
    "51": "Єгипетський фунт",
    "59": "Даласі",
    "61": "Кетcаль",
    "67": "Форинт",
    "70": "Індійська рупія",
    "71": "Іракський динар",
    "72": "Іранський ріал",
    "73": "Ісландська крона",
    "74": "Ямайський долар",
    "75": "Йорданський динар",
    "4": "Єна",
    "76": "Кенійський шилінг",
    "77": "Сом",
    "78": "Ріел",
    "79": "Коморський франк",
    "80": "Північнокорейська вона",
    "81": "Вона",
    "82": "Кувейтський динар",
    "84": "Теньґе",
    "87": "Рупія Шрі-Ланки",
    "113": "Бальбоа",
    "114": "Новий соль",
    "115": "Кіна",
    "116": "Філіппінський песо",
    "117": "Пакистанська рупія",
    "118": "Злотий",
    "119": "Ґуарані",
    "120": "Катарський ріал",
    "121": "Новий лей",
    "6": "Російський рубль",
    "122": "Сербський динар",
    "123": "Руандійський франк",
    "124": "Саудівський ріaл",
    "125": "Долар Соломонових островів",
    "126": "Сейшельська рупія",
    "127": "Суданський фунт",
    "128": "Шведська крона",
    "129": "Сінгапурський долар",
    "130": "Фунт острова Святої Єлени",
    "131": "Леоне",
    "132": "Сомалійський шилінг",
    "133": "Суринамський долар",
    "134": "Південносуданський фунт",
    "135": "Добра",
    "136": "Сальвадорський колон",
    "137": "Сирійський фунт",
    "138": "Ліланґені",
    "139": "Бат",
    "140": "Сомоні",
    "141": "Туркменський манат",
    "142": "Туніський динар",
    "143": "Паанга",
    "144": "Турецька ліра",
    "145": "Долар Трінідаду і Тобаго",
    "146": "Новий тайванський долар",
    "147": "Танзанійський шилінг",
    "0": "Гривня",
    "148": "Угандійський шилінг",
    "1": "Долар США",
    "149": "Уругвайське конвертоване песо",
    "150": "Уругвайське песо",
    "152": "Болівар",
    "156": "Франк CFA– BEAC",
    "157": "Східнокарибський долар",
    "159": "Франк СFP (Французький тихоокеанський франк)",
    "161": "Ренд",
    "158": "Франк CFA–BCEAO",
    "162": "Замбійська квача"
};

const organizationTypeMap = {
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

function getReportName(reportType, publishDate) {
    if (!publishDate || !reportType) return reportType ? reportType.toString() : 'N/A';
    const date = new Date(publishDate);
    for (const period of reportTypes) {
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

function getQuarterYear(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `Q${quarter} ${year}`;
}


const bubbleColors = [
    '#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff','#ff9f40','#c7c7c7','#535cff','#ff63ff','#63ff84'
];

function clearChart(id) {
    d3.select('#' + id).selectAll('*').remove();
}

function getSize(id) {
    const node = document.getElementById(id);
    return { width: Math.max(300, node.clientWidth || 600), height: node.clientHeight || 320 };
}

function renderLine(id, labels, values, opts = {}) {
    clearChart(id);
    const { width, height } = getSize(id);
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(labels).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([h, 0]);

    const line = d3.line().x((d,i) => x(labels[i])).y(d => y(d)).curve(d3.curveMonotoneX);
    g.append('path').datum(values).attr('fill', 'none').attr('stroke', opts.color || '#4bc0c0').attr('stroke-width', 2).attr('d', line);

    g.selectAll('circle').data(values).enter().append('circle').attr('cx',(d,i) => x(labels[i])).attr('cy', d => y(d)).attr('r', 3).attr('fill', opts.color || '#4bc0c0')
        .on('mouseover', function(event,d){
            const i = values.indexOf(d);
            const tooltip = d3.select('body').append('div').attr('class','d3-tooltip').style('position','absolute').style('pointer-events','none').style('background','#fff').style('padding','6px').style('border','1px solid #ccc').style('border-radius','4px');
            tooltip.html(`<strong>${labels[i]}</strong><br/>${d}`);
            const [mx,my] = d3.pointer(event);
            tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
        }).on('mouseout', function(){ d3.selectAll('.d3-tooltip').remove(); });

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x)).selectAll('text').style('font-size','11px').attr('transform','rotate(-45)').style('text-anchor','end');
    g.append('g').call(d3.axisLeft(y));
}

function renderBar(id, labels, values, opts = {}) {
    clearChart(id);
    const { width, height } = getSize(id);
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).nice().range([h, 0]);

    g.selectAll('.bar').data(values).enter().append('rect').attr('class','bar').attr('x',(d,i)=>x(labels[i])).attr('y',d=>y(d)).attr('width',x.bandwidth()).attr('height',d=>h-y(d)).attr('fill', opts.color || '#36a2eb')
        .on('mouseover', function(event,d){
            const i = values.indexOf(d);
            const tooltip = d3.select('body').append('div').attr('class','d3-tooltip').style('position','absolute').style('pointer-events','none').style('background','#fff').style('padding','6px').style('border','1px solid #ccc').style('border-radius','4px');
            tooltip.html(`<strong>${labels[i]}</strong><br/>${d}`);
            tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
        }).on('mouseout', function(){ d3.selectAll('.d3-tooltip').remove(); });

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x)).selectAll('text').style('font-size','11px').attr('transform','rotate(-45)').style('text-anchor','end');
    g.append('g').call(d3.axisLeft(y));
}

function renderPie(id, labels, values, opts = {}) {
    clearChart(id);
    const { width, height } = getSize(id);
    const radius = Math.min(width, height) / 2 - 20;
    const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height).append('g').attr('transform', `translate(${width/2},${height/2})`);
    const pie = d3.pie().sort(null).value(d=>d);
    const data_ready = pie(values);
    const arc = d3.arc().innerRadius(radius*0.45).outerRadius(radius);
    svg.selectAll('slice').data(data_ready).enter().append('path').attr('d', arc).attr('fill', (d,i)=>bubbleColors[i % bubbleColors.length]).attr('stroke','#fff').style('stroke-width','1px')
        .on('mouseover', function(event,d){
            const i = data_ready.indexOf(d);
            const tooltip = d3.select('body').append('div').attr('class','d3-tooltip').style('position','absolute').style('pointer-events','none').style('background','#fff').style('padding','6px').style('border','1px solid #ccc').style('border-radius','4px');
            tooltip.html(`<strong>${labels[i]}</strong><br/>${values[i]}`);
            tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
        }).on('mouseout', function(){ d3.selectAll('.d3-tooltip').remove(); });

    // Legend
    const legend = d3.select('#' + id).append('div').style('display','flex').style('flex-wrap','wrap').style('justify-content','center').style('gap','8px').style('margin-top','8px');
    labels.forEach((lab,i)=>{
        const item = legend.append('div').style('display','flex').style('align-items','center').style('gap','6px');
        item.append('div').style('width','12px').style('height','12px').style('background', bubbleColors[i % bubbleColors.length]);
        item.append('div').text(`${lab} (${values[i]})`).style('font-size','12px');
    });
}

function renderBubblePack(id, labels, values) {
    clearChart(id);
    const data = labels.map((l,i)=>({name:l,value:values[i]}));
    const { width, height } = getSize(id);
    const root = d3.hierarchy({children: data}).sum(d=>d.value);
    const pack = d3.pack().size([width, height]).padding(5);
    pack(root);
    const svg = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);
    const node = svg.selectAll('g').data(root.leaves()).enter().append('g').attr('transform', d=>`translate(${d.x},${d.y})`);
    node.append('circle').attr('r', d=>d.r).attr('fill', (d,i)=>bubbleColors[i % bubbleColors.length]).attr('opacity',0.85);
    node.append('text').attr('text-anchor','middle').attr('dy','0.3em').style('font-size','11px').text(d=>d.data.name);
    node.on('mouseover', function(event,d){
        const tooltip = d3.select('body').append('div').attr('class','d3-tooltip').style('position','absolute').style('pointer-events','none').style('background','#fff').style('padding','6px').style('border','1px solid #ccc').style('border-radius','4px');
        tooltip.html(`${d.data.name}<br/>${d.data.value}`);
        tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
    }).on('mouseout', ()=>d3.selectAll('.d3-tooltip').remove());
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

const dateSliderContracts = document.getElementById('date-slider-contracts');
noUiSlider.create(dateSliderContracts, {
    start: [0, 100],
    connect: true,
    range: {
        'min': 0,
        'max': 100
    }
});


const dateSliderActs = document.getElementById('date-slider-acts');
noUiSlider.create(dateSliderActs, {
    start: [0, 100],
    connect: true,
    range: {
        'min': 0,
        'max': 100
    }
});

dateSlider.noUiSlider.on('update', function (values, handle) {
    const minValue = parseFloat(values[0]);
    const maxValue = parseFloat(values[1]);
    const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100));
    const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100));
    document.getElementById('min-date-display').textContent = minDateSelected.toISOString().split('T')[0];
    document.getElementById('max-date-display').textContent = maxDateSelected.toISOString().split('T')[0];
    applyFilters();
});

dateSliderContracts.noUiSlider.on('update', function (values, handle) {
    const minValue = parseFloat(values[0]);
    const maxValue = parseFloat(values[1]);
    const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100));
    const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100));
    document.getElementById('min-date-display-contracts').textContent = minDateSelected.toISOString().split('T')[0];
    document.getElementById('max-date-display-contracts').textContent = maxDateSelected.toISOString().split('T')[0];
    applyFilters();
});


dateSliderActs.noUiSlider.on('update', function (values, handle) {
    const minValue = parseFloat(values[0]);
    const maxValue = parseFloat(values[1]);
    const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100));
    const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100));
    document.getElementById('min-date-display-acts').textContent = minDateSelected.toISOString().split('T')[0];
    document.getElementById('max-date-display-acts').textContent = maxDateSelected.toISOString().split('T')[0];
    applyFilters();
});

// Function to update date displays
function updateDateDisplays() {
    // Handled by noUiSlider update
}

// Function to update table
function updateTable() {
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    const tableBody = document.querySelector('#data-table' + suffix + ' tbody');
    tableBody.innerHTML = '';
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);
    pageData.forEach(item => {
        const row = document.createElement('tr');
        if (currentTab === 'financial') {
            row.innerHTML = `
                <td>${getReportName(item.reportTypeId, item.publishDate)}</td>
                <td>${(budgetMap[item.budget] || item.budget || 'N/A') + ' / ' + (fundMap[item.fund] || item.fund || 'N/A')}</td>
                <td>${item.progKlas || 'N/A'}</td>
                <td>${getQuarterYear(item.publishDate)}</td>
                <td>${item.publishDate || 'N/A'}</td>
            `;
        } else if (currentTab === 'contracts') {
            row.innerHTML = `
                <td>${item.edrpou || 'N/A'}</td>
                <td>${item.amount || 'N/A'}</td>
                <td>${item.currency || 'N/A'}</td>
                <td>${item.contractors?.[0]?.name || 'N/A'}</td>
            `;
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => openContractModal(item));
        } else {
            row.innerHTML = `
                <td>${item.documentDate || 'N/A'}</td>
                <td>${item.documentNumber || 'N/A'}</td>
                <td>${orgMap[item.edrpou] || item.edrpou || 'N/A'}</td>
                <td>${item.amount || 'N/A'}</td>
                <td>${item.currency || 'N/A'}</td>
            `;
        }
        tableBody.appendChild(row);
    });
}

// Function to update pagination
function updatePagination() {
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    const pagination = document.getElementById('pagination' + suffix);
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
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    if (currentTab === 'financial') {
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
    } else if (currentTab === 'contracts' || currentTab === 'acts') {
        const total = filteredData.length;
        const orgCounts = filteredData.reduce((acc, item) => {
            acc[item.edrpou] = (acc[item.edrpou] || 0) + 1;
            return acc;
        }, {});
        const mostCommonOrg = Object.keys(orgCounts).length ? Object.keys(orgCounts).reduce((a, b) => orgCounts[a] > orgCounts[b] ? a : b) : 'Н/Д';
        const totalAmount = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
        const avgAmount = total > 0 ? (totalAmount / total).toFixed(2) : 0;
        document.getElementById('total-' + currentTab).textContent = total;
        document.getElementById('most-common-org-' + currentTab).textContent = orgMap[mostCommonOrg] || mostCommonOrg;
        document.getElementById('total-amount-' + currentTab).textContent = totalAmount.toFixed(2);
        document.getElementById('avg-amount-' + currentTab).textContent = avgAmount;
    }

    // Reset to page 1 when filtering
    currentPage = 1;
    updateTable();
    updatePagination();

    // Update charts
    updateCharts();
}

// Function to update charts
function updateCharts() {
    if (currentTab === 'financial') {
        // Reports Over Time
        const dateCounts = filteredData.reduce((acc, item) => {
            const date = item.publishDate || 'Unknown';
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        const sortedDates = Object.keys(dateCounts).sort();
        renderLine('revenue-chart', sortedDates, sortedDates.map(date => dateCounts[date]), { color: 'rgba(75, 192, 192, 1)' });

        // Fund Distribution
        const fundCounts = filteredData.reduce((acc, item) => {
            const fund = item.fund || 'null';
            acc[fund] = (acc[fund] || 0) + 1;
            return acc;
        }, {});
        const fundLabels = Object.keys(fundCounts).map(label => fundMap[label] || label);
        const fundData = Object.values(fundCounts);
        renderBar('expenses-profit-chart', fundLabels, fundData, { color: 'rgba(54, 162, 235, 1)' });

        // Bubble Chart for KVK / KPK Types
        const progKlasCounts = filteredData.reduce((acc, item) => {
            const prog = item.progKlas || 'N/A';
            acc[prog] = (acc[prog] || 0) + 1;
            return acc;
        }, {});
        const progKlasLabels = Object.keys(progKlasCounts);
        const progKlasValues = progKlasLabels.map(l => progKlasCounts[l]);
        // Use bubble pack to visualize categories with size
        renderBubblePack('pie-chart', progKlasLabels, progKlasValues);
    } else {
        switch(currentTab) {
            case 'contracts':
                updateTimeChart();

                // TOP-5 Organizations pie
                const orgCountsPie = filteredData.reduce((acc, item) => {
                    const org = item.edrpou || 'null';
                    acc[org] = (acc[org] || 0) + 1;
                    return acc;
                }, {});
                const topOrgPie = Object.entries(orgCountsPie).sort((a,b) => b[1] - a[1]).slice(0,5);
                const orgLabelsPie = topOrgPie.map(([k,v]) => orgMap[k] || k);
                const orgDataPie = topOrgPie.map(([k,v]) => v);
                renderPie('contracts-top-org-chart', orgLabelsPie, orgDataPie);

                // Org radar
                const orgCountsC = filteredData.reduce((acc, item) => {
                    const org = item.edrpou || 'null';
                    acc[org] = (acc[org] || 0) + 1;
                    return acc;
                }, {});
                const topOrg = Object.entries(orgCountsC).sort((a,b) => b[1] - a[1]).slice(0,10);
                const orgLabelsC = topOrg.map(([k,v]) => orgMap[k] || k);
                const orgDataC = topOrg.map(([k,v]) => v);
                renderBar('contracts-org-chart', orgLabelsC, orgDataC, { color: 'rgba(54, 162, 235, 1)' });

                // TOP-5 Contractors by count
                const contractorCounts = filteredData.reduce((acc, item) => {
                    if (item.contractors && Array.isArray(item.contractors)) {
                        item.contractors.forEach(c => {
                            const name = c.name || 'Unknown';
                            acc[name] = (acc[name] || 0) + 1;
                        });
                    }
                    return acc;
                }, {});
                const topContractorsCount = Object.entries(contractorCounts).sort((a,b) => b[1] - a[1]).slice(0,5);
                const contractorLabelsCount = topContractorsCount.map(([k,v]) => k);
                const contractorDataCount = topContractorsCount.map(([k,v]) => v);
                renderPie('contracts-top-contractors-count-chart', contractorLabelsCount, contractorDataCount);

                // TOP-5 Contractors by amount
                const contractorAmounts = filteredData.reduce((acc, item) => {
                    if (item.contractors && Array.isArray(item.contractors)) {
                        item.contractors.forEach(c => {
                            const name = c.name || 'Unknown';
                            acc[name] = (acc[name] || 0) + (item.amount || 0);
                        });
                    }
                    return acc;
                }, {});
                const topContractorsAmount = Object.entries(contractorAmounts).sort((a,b) => b[1] - a[1]).slice(0,5);
                const contractorLabelsAmount = topContractorsAmount.map(([k,v]) => k);
                const contractorDataAmount = topContractorsAmount.map(([k,v]) => v);
                renderPie('contracts-top-contractors-amount-chart', contractorLabelsAmount, contractorDataAmount);
                break;
            case 'acts':
                const dateCountsAc = filteredData.reduce((acc, item) => {
                    const date = item.documentDate || 'Unknown';
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {});
                const sortedDatesAc = Object.keys(dateCountsAc).sort();
                renderLine('acts-chart', sortedDatesAc, sortedDatesAc.map(date => dateCountsAc[date]), { color: 'rgba(153, 102, 255, 1)' });

                const orgCountsAc = filteredData.reduce((acc, item) => {
                    const org = item.edrpou || 'null';
                    acc[org] = (acc[org] || 0) + 1;
                    return acc;
                }, {});
                const orgLabelsAc = Object.keys(orgCountsAc).map(label => orgMap[label] || label);
                const orgDataAc = Object.values(orgCountsAc);
                renderBar('acts-org-chart', orgLabelsAc, orgDataAc, { color: 'rgba(255, 159, 64, 1)' });
                break;
        }
    }
}

function applyFilters() {
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    const fundSelect = currentTab === 'financial' ? document.getElementById('fund-filter') : null;
    const budgetSelect = currentTab === 'financial' ? document.getElementById('budget-filter') : null;
    const orgSelect = document.getElementById('org-filter' + suffix);
    const dateSlider = document.getElementById('date-slider' + suffix);
    const fund = fundSelect ? fundSelect.value : '';
    const budget = budgetSelect ? budgetSelect.value : '';
    const org = orgSelect ? orgSelect.value : '';
    const values = dateSlider.noUiSlider.get();
    const minValue = parseFloat(values[0]);
    const maxValue = parseFloat(values[1]);
    const dateField = currentTab === 'financial' ? 'publishDate' : 'documentDate';
    const minDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (minValue / 100)).toISOString().split('T')[0];
    const maxDateSelected = new Date(minTimestamp + (maxTimestamp - minTimestamp) * (maxValue / 100)).toISOString().split('T')[0];

    filteredData = data.filter(item => {
        const itemDate = item[dateField];
        return (!fund || item.fund === fund) &&
               (!budget || item.budget === budget) &&
               (!org || item.edrpou === org) &&
               (!itemDate || (itemDate >= minDateSelected && itemDate <= maxDateSelected));
    });

    if (currentTab === 'contracts') {
        filteredData.sort((a, b) => new Date(b.documentDate || 0) - new Date(a.documentDate || 0));
    }

    updateDashboard();
}

function openContractModal(item) {
    const modalBody = document.getElementById('contract-modal-body');
    modalBody.innerHTML = '';
    const cpvCodes = item.cpvCode ? (Array.isArray(item.cpvCode) ? item.cpvCode.map(c => typeof c === 'object' ? c.code : c).join(', ') : item.cpvCode) : 'N/A';
    const cpvNames = item.cpvCode ? (Array.isArray(item.cpvCode) ? item.cpvCode.map(c => typeof c === 'object' ? c.name : c).join(', ') : 'N/A') : 'N/A';
    const details = {
        'ID': item.id,
        'Найменування розпорядника': orgMap[item.edrpou] || 'N/A',
        'Тип організації': organizationTypeMap[item.orgPravForm] || 'N/A',
        'ЄДРПОУ': item.edrpou,
        'Номер документа': item.documentNumber,
        'Дата документа': item.documentDate,
        'Дата підписання': item.signDate,
        'Сума': item.amount,
        'Валюта': currencyMap[item.currency] || item.currency,
        'Сума в UAH': item.currencyAmountUAH,
        'Назва закупівлі': item.contractors?.[0]?.name || 'N/A',
        'Тендерна закупівля': item.isTender ? 'Так' : 'Ні',
        'Підстава закупівлі': item.reason || 'N/A',
        'Номер CPV': cpvCodes,
        'Назва CPV': cpvNames,
        'Підпис': item.signature?.caAddress || 'N/A'
    };
    for (const [key, value] of Object.entries(details)) {
        modalBody.innerHTML += `<p><strong>${key}:</strong> ${value}</p>`;
    }
    if (item.contractors && Array.isArray(item.contractors)) {
        modalBody.innerHTML += '<p><strong>Контрагенти:</strong></p><ul>';
        item.contractors.forEach((c) => {
            modalBody.innerHTML += '<li>';
            if (c.name) modalBody.innerHTML += `<strong>Назва контрагента:</strong> ${c.name}<br>`;
            modalBody.innerHTML += `<strong>Тип контрагента:</strong> ${contractorTypeMap[c.contractorType] || c.contractorType || 'N/A'}<br>`;
            const fullName = [c.firstName, c.lastName, c.middleName].filter(Boolean).join(' ');
            if (fullName) modalBody.innerHTML += `<strong>ПІБ:</strong> ${fullName}<br>`;
            if (c.address && typeof c.address === 'object') {
                let addrParts = [];
                if (c.address.countryName) addrParts.push(c.address.countryName);
                if (c.address.regionName) addrParts.push(c.address.regionName);
                if (c.address.city) addrParts.push(c.address.city);
                if (c.address.street) addrParts.push(c.address.street.trim());
                let houseStr = c.address.house || '';
                if (c.address.housing) houseStr += c.address.housing;
                if (houseStr) addrParts.push(houseStr);
                if (c.address.office && c.address.office !== '0' && c.address.office !== '') {
                    addrParts.push('офіс ' + c.address.office);
                }
                const addressStr = addrParts.join(', ');
                if (addressStr) modalBody.innerHTML += `<strong>Адреса:</strong> ${addressStr}<br>`;
            }
            if (c.identifier) modalBody.innerHTML += `<strong>Ідентифікатор:</strong> ${c.identifier}<br>`;
            modalBody.innerHTML += '</li>';
        });
        modalBody.innerHTML += '</ul>';
    } else {
        modalBody.innerHTML += '<p><strong>Контрагенти:</strong> N/A</p>';
    }
    if (item.specifications && Array.isArray(item.specifications)) {
        modalBody.innerHTML += '<p><strong>Специфікації:</strong></p><ul>';
        item.specifications.forEach((s) => {
            modalBody.innerHTML += '<li>';
            modalBody.innerHTML += `<strong>Назва:</strong> ${s.specificationName || 'N/A'}<br>`;
            modalBody.innerHTML += `<strong>CPV Код:</strong> ${s.cpvCode || 'N/A'}<br>`;
            modalBody.innerHTML += `<strong>Кількість:</strong> ${s.itemCount || 'N/A'} ${s.itemDimension || ''}<br>`;
            modalBody.innerHTML += `<strong>Вартість:</strong> ${s.itemCost || 'N/A'}<br>`;
            modalBody.innerHTML += '</li>';
        });
        modalBody.innerHTML += '</ul>';
    } else {
        modalBody.innerHTML += '<p><strong>Специфікації:</strong> N/A</p>';
    }
    const modal = new bootstrap.Modal(document.getElementById('contract-modal'));
    modal.show();
}

function updateTimeChart() {
    if (currentTab !== 'contracts') return;
    const dateCounts = filteredData.reduce((acc, item) => {
        const dateStr = item.documentDate;
        if (dateStr) {
            const date = new Date(dateStr);
            let key;
            if (timeGroupBy === 'year') {
                key = date.getFullYear().toString();
            } else if (timeGroupBy === 'month') {
                key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            } else { // day
                key = dateStr;
            }
            acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
    }, {});
    const sortedKeys = Object.keys(dateCounts).sort();
    renderLine('contracts-chart', sortedKeys, sortedKeys.map(key => dateCounts[key]), { color: 'rgba(75, 192, 192, 1)' });
}

function setActiveButton(activeId) {
    document.querySelectorAll('#time-year, #time-month, #time-day').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    populateFilters();

    // Tab event listeners
    document.querySelectorAll('#dashboard-tabs .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (e) {
            currentTab = e.target.id.replace('-tab', '');
            switchTab();
        });
    });

    // Time grouping buttons for contracts
    document.getElementById('time-year').addEventListener('click', () => {
        timeGroupBy = 'year';
        updateTimeChart();
        setActiveButton('time-year');
    });
    document.getElementById('time-month').addEventListener('click', () => {
        timeGroupBy = 'month';
        updateTimeChart();
        setActiveButton('time-month');
    });
    document.getElementById('time-day').addEventListener('click', () => {
        timeGroupBy = 'day';
        updateTimeChart();
        setActiveButton('time-day');
    });

    // Initialize
    updateDashboard();
});

function populateFilters() {
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    const fundSelect = currentTab === 'financial' ? document.getElementById('fund-filter') : null;
    const budgetSelect = currentTab === 'financial' ? document.getElementById('budget-filter') : null;
    const orgSelect = document.getElementById('org-filter' + suffix);
    const uniqueFunds = currentTab === 'financial' ? [...new Set(data.map(item => item.fund).filter(Boolean))] : [];
    const uniqueBudgets = currentTab === 'financial' ? [...new Set(data.map(item => item.budget).filter(Boolean))] : [];
    const uniqueOrgs = [...new Set(data.map(item => item.edrpou).filter(Boolean))];
    if (fundSelect) {
        fundSelect.innerHTML = '<option value="">Всі</option>';
        uniqueFunds.forEach(fund => {
            const option = document.createElement('option');
            option.value = fund;
            option.textContent = fundMap[fund] || fund;
            fundSelect.appendChild(option);
        });
    }
    if (budgetSelect) {
        budgetSelect.innerHTML = '<option value="">Всі</option>';
        uniqueBudgets.forEach(budget => {
            const option = document.createElement('option');
            option.value = budget;
            option.textContent = budgetMap[budget] || budget;
            budgetSelect.appendChild(option);
        });
    }
    if (orgSelect) {
        orgSelect.innerHTML = '<option value="">Всі</option>';
        uniqueOrgs.forEach(org => {
            const option = document.createElement('option');
            option.value = org;
            option.textContent = orgMap[org] || org;
            orgSelect.appendChild(option);
        });
    }

    if (fundSelect) fundSelect.addEventListener('change', applyFilters);
    if (budgetSelect) budgetSelect.addEventListener('change', applyFilters);
    if (orgSelect) orgSelect.addEventListener('change', applyFilters);
}

function switchTab() {
    data = dataSources[currentTab];
    filteredData = [...data];
    if (currentTab === 'contracts') {
        filteredData.sort((a, b) => new Date(b.documentDate || 0) - new Date(a.documentDate || 0));
    }
    const dateField = currentTab === 'financial' ? 'publishDate' : 'documentDate';
    const dates = data.map(item => item[dateField]).filter(Boolean).sort();
    minDateStr = dates[0] || '2015-01-01';
    maxDateStr = dates[dates.length - 1] || '2025-12-31';
    minTimestamp = new Date(minDateStr).getTime();
    maxTimestamp = new Date(maxDateStr).getTime();
    const suffix = currentTab === 'financial' ? '' : '-' + currentTab;
    document.getElementById('min-date-display' + suffix).textContent = minDateStr;
    document.getElementById('max-date-display' + suffix).textContent = maxDateStr;
    if (currentTab === 'contracts') {
        timeGroupBy = 'month';
        setActiveButton('time-month');
    }
    populateFilters();
    updateDashboard();
}

