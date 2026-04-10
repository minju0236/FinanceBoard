let chart;
let currentPrice = 0;

function numberFormat(value) {
    return Number(value || 0).toLocaleString('ko-KR');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setStatus(message) {
    setText('serverTime', message);
}

function getAuthHeader() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('로그인 필요');
        location.href = '/login';
        return null;
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

function createLineChart(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) return null;

    const ctx = el.getContext('2d');

    return new Chart(ctx, {
        data: {
            labels: [],
            datasets: [
                {
                    type: 'bar',
                    data: [],
                },
                {
                    type: 'line',
                    data: [],
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            animation: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

async function requestJson(url) {
    const headers = getAuthHeader();
    if (!headers) return;

    const res = await fetch(url, { headers });
    return await res.json();
}

async function loadSummary() {
    const headers = getAuthHeader();
    if (!headers) return;

    const res = await fetch('/api/dashboard/summary', { headers });
    const data = await res.json();
    const s = data.summary;

    currentPrice = s.latestPrice;

    setText('latestPrice', numberFormat(s.latestPrice));
    setText('changePrice', `${numberFormat(s.changePrice)} / ${s.changeRate}%`);
    setText('latestVolume', numberFormat(s.latestVolume));
    setText('tradeStrength', s.tradeStrength);

    updateMaxBuy();
    await loadUserInfo();
}

function updateMaxBuy() {
    const balanceText = document.getElementById('userBalance').textContent;
    const balance = Number(balanceText.replace(/,/g, '')) || 0;

    if (!currentPrice || currentPrice <= 0) {
        document.getElementById('maxBuy').textContent = 0;
        return;
    }

    const max = Math.floor(balance / currentPrice);
    document.getElementById('maxBuy').textContent = max;
}

function setMaxQuantity() {
    const max = Number(document.getElementById('maxBuy').textContent);
    document.getElementById('quantity').value = max;
}

function setQuantity(amount, type) {
    if (type === 'buy') {
        const input = document.getElementById('buyQuantity');
        const max = Number(document.getElementById('maxBuy').textContent);

        let value = Number(input.value || 0) + amount;
        if (value > max) value = max;

        input.value = value;

    } else {
        const input = document.getElementById('sellQuantity');
        const max = Number(document.getElementById('maxSell').textContent);

        let value = Number(input.value || 0) + amount;
        if (value > max) value = max;

        input.value = value;
    }
}

function resetQuantity(type) {
    if (type === 'buy') {
        document.getElementById('buyQuantity').value = '';
    } else {
        document.getElementById('sellQuantity').value = '';
    }
}

async function loadChart() {
    const data = await requestJson('/api/dashboard/unit?type=5sec');
    if (!data) return;

    const rows = data.rows || [];
    if (rows.length === 0) return;

    const labels = [];
    const prices = [];
    const colors = [];

    for (let i = 0; i < rows.length; i++) {
        const cur = rows[i].price;
        const prev = i > 0 ? rows[i - 1].price : cur;

        labels.push(rows[i].created_at.slice(11, 19));
        prices.push(cur);

        colors.push(cur >= prev ? 'red' : '#1f6feb');
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = prices;
    chart.data.datasets[0].backgroundColor = colors;
    chart.data.datasets[1].data = prices;

    chart.update();
}

async function loadDaySummary() {
    const data = await requestJson('/api/dashboard/day');
    if (!data) return;

    const d = data.data;

    setText('avgPriceDay', numberFormat(d.avg_price));
    setText('maxPriceDay', numberFormat(d.max_price));
    setText('minPriceDay', numberFormat(d.min_price));
    setText('totalVolumeDay', numberFormat(d.total_volume));
}

async function refresh() {
    try {
        setStatus('데이터 갱신 중...');
        await loadSummary();
        await loadChart();
        await loadDaySummary();
        setStatus('갱신 완료');
    } catch (e) {
        console.error(e);
        setStatus('에러 발생');
    }

    await loadProfit();
}

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('로그인 필요');
        location.href = '/login';
        return;
    }

    chart = createLineChart('secChart');
    await refresh();
    setInterval(refresh, 5000);
});