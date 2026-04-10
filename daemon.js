const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'testuser',
    password: '1234',
    database: 'testdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const stockCode = 'FIN001';
let currentPrice = 100000;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createData() {
    const priceChange = randomInt(-500, 500);
    currentPrice += priceChange;

    if (currentPrice < 90000) currentPrice = 90000;
    if (currentPrice > 110000) currentPrice = 110000;

    return {
        stock_code: stockCode,
        price: currentPrice,
        volume: randomInt(10, 300),
        trade_strength: (80 + Math.random() * 40).toFixed(2),
        unit_type: '5sec'
    };
}

async function insertData() {
    const data = createData();

    await pool.query(`
        INSERT INTO market_data (stock_code, price, volume, trade_strength, unit_type)
        VALUES (?, ?, ?, ?, ?)
    `, [
        data.stock_code,
        data.price,
        data.volume,
        data.trade_strength,
        data.unit_type
    ]);

    console.log(`5sec insert: ${data.price}`);
}

async function runDaemon() {
    console.log('데몬 시작 (5초 단위)');

    await insertData();

    setInterval(async () => {
        try {
            await insertData();
        } catch (err) {
            console.error(err);
        }
    }, 5000);
}

runDaemon();