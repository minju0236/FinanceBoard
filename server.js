const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET = 'mysecretkey';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

const pool = mysql.createPool({
    host: 'localhost',
    user: 'testuser',
    password: '1234',
    database: 'testdb',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('토큰 없음');
        return res.status(401).json({ success: false });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        console.log('토큰 decode:', decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('토큰 에러:', err);
        return res.status(401).json({ success: false });
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readTemplate(fileName) {
    return fs.readFileSync(path.join(__dirname, 'templates', fileName), 'utf8');
}

function renderTemplate(template, data) {
    let html = template;
    for (const key in data) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    }
    return html;
}

function sendMessagePage(res, title, message) {
    const template = readTemplate('board-message.html');
    const html = renderTemplate(template, {
        title: escapeHtml(title),
        message: escapeHtml(message)
    });
    res.send(html);
}

app.get('/', (req, res) => res.redirect('/login'));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'signup.html')));

app.post('/api/signup', async (req, res) => {
    const { name, user_id, password } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO users (name, user_id, password, balance, stock) 
             VALUES (?, ?, ?, 5000000, 0)`,
            [name, user_id, password]
        );
        console.log('signup result:', result);
        res.json({ success: true });
    } catch (err) {
        console.error('signup error:', err);
        res.json({ success: false });
    }
});

app.post('/api/login', async (req, res) => {
    const { user_id, password } = req.body;

    try {
        const [rows] = await pool.query(
            `SELECT id, user_id FROM users WHERE user_id = ? AND password = ?`,
            [user_id, password]
        );

        console.log('login rows:', rows);

        if (rows.length === 0) {
            console.log('로그인 실패:', user_id);
            return res.json({ success: false });
        }

        const token = jwt.sign(
            { id: rows[0].id, user_id: rows[0].user_id },
            SECRET,
            { expiresIn: '1h' }
        );

        console.log('token:', token);

        res.json({ success: true, token });
    } catch (err) {
        console.error('login error:', err);
        res.json({ success: false });
    }
});

app.get('/api/user/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const [rows] = await pool.query(`SELECT balance, stock FROM users WHERE user_id = ?`, [userId]);
        console.log('user/me rows:', rows);
        res.json({ success: true, data: rows[0] || {} });
    } catch (err) {
        console.error('user/me error:', err);
        res.json({ success: false });
    }
});

app.get('/api/user/profit', authMiddleware, async (req, res) => {
    const userId = req.user.user_id;
    try {
        const [[user]] = await pool.query(`SELECT stock FROM users WHERE user_id = ?`, [userId]);
        const [trades] = await pool.query(`SELECT type, price FROM trades WHERE user_id = ?`, [userId]);
        const [[priceRow]] = await pool.query(`SELECT price FROM market_data ORDER BY id DESC LIMIT 1`);

        console.log('profit data:', { user, trades, priceRow });

        const currentPrice = priceRow.price;
        let totalBuy = 0;
        let buyCount = 0;

        trades.forEach(t => {
            if (t.type === 'BUY') {
                totalBuy += t.price;
                buyCount++;
            }
        });

        const avgBuyPrice = buyCount ? totalBuy / buyCount : 0;
        const profitRate = avgBuyPrice
            ? ((currentPrice - avgBuyPrice) / avgBuyPrice * 100).toFixed(2)
            : 0;

        res.json({ success: true, profitRate });
    } catch (err) {
        console.error('profit error:', err);
        res.json({ success: false });
    }
});

app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT price, volume, trade_strength
            FROM market_data
            WHERE unit_type = '5sec'
            ORDER BY id DESC
            LIMIT 2
        `);

        console.log('summary rows:', rows);

        const latest = rows[0] || {};
        const prev = rows[1] || {};

        const change = (latest.price || 0) - (prev.price || 0);
        const rate = prev.price ? Number(((change / prev.price) * 100).toFixed(2)) : 0;

        res.json({
            success: true,
            summary: {
                latestPrice: latest.price || 0,
                latestVolume: latest.volume || 0,
                tradeStrength: latest.trade_strength || 0,
                changePrice: change,
                changeRate: rate
            }
        });
    } catch (err) {
        console.error('summary error:', err);
        res.json({ success: false });
    }
});

app.get('/api/dashboard/unit', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT price, created_at
            FROM market_data
            WHERE unit_type = '5sec'
            ORDER BY id DESC
            LIMIT 20
        `);

        console.log('unit rows:', rows);

        res.json({ success: true, rows: rows.reverse() });
    } catch (err) {
        console.error('unit error:', err);
        res.json({ success: true, rows: [] });
    }
});

app.get('/api/dashboard/day', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                AVG(price) avg_price,
                MAX(price) max_price,
                MIN(price) min_price,
                SUM(volume) total_volume
            FROM market_data
            WHERE DATE(created_at) = CURDATE()
        `);

        console.log('day rows:', rows);

        res.json({ success: true, data: rows[0] || {} });
    } catch (err) {
        console.error('day error:', err);
        res.json({ success: true, data: {} });
    }
});

app.post('/api/trade', authMiddleware, async (req, res) => {
    try {
        const { type, price } = req.body;
        const userId = req.user.user_id;

        console.log('trade request:', { type, price, userId });

        await pool.query(
            `INSERT INTO trades (user_id, type, price) VALUES (?, ?, ?)`,
            [userId, type, price]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('trade error:', err);
        res.json({ success: false });
    }
});

app.get('/api/trades', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const [rows] = await pool.query(`
            SELECT * FROM trades
            WHERE user_id = ?
            ORDER BY id DESC
        `, [userId]);

        console.log('trades rows:', rows);

        res.json({ success: true, rows });
    } catch (err) {
        console.error('trades error:', err);
        res.json({ success: true, rows: [] });
    }
});

app.get('/api/trades/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const [rows] = await pool.query(`
            SELECT id, type, price, created_at
            FROM trades
            WHERE user_id = ?
            ORDER BY id DESC
        `, [userId]);

        console.log('trades/me rows:', rows);

        res.json({ success: true, rows });
    } catch (err) {
        console.error('trades/me error:', err);
        res.json({ success: false, rows: [] });
    }
});

app.post('/api/trade/buy', authMiddleware, async (req, res) => {

    const raw = req.body?.quantity ?? req.query?.quantity;
    const quantity = Number(raw);

    if (!raw || isNaN(quantity) || quantity <= 0) {
        return res.json({ success: false, message: '수량 이상' });
    }

    const userId = req.user.user_id;

    try {
        const [[user]] = await pool.query(
            `SELECT balance, stock FROM users WHERE user_id = ?`,
            [userId]
        );

        const [[priceRow]] = await pool.query(
            `SELECT price FROM market_data ORDER BY id DESC LIMIT 1`
        );

        if (!user || !priceRow) {
            return res.json({ success: false });
        }

        const price = Number(priceRow.price);
        const totalCost = price * quantity;

        if (user.balance < totalCost) {
            return res.json({ success: false, message: '보유금 부족' });
        }

        await pool.query(
            `UPDATE users SET balance = balance - ?, stock = stock + ? WHERE user_id = ?`,
            [totalCost, quantity, userId]
        );

        await pool.query(
            `INSERT INTO trades (user_id, type, price) VALUES (?, 'BUY', ?)`,
            [userId, price]
        );

        return res.json({ success: true });

    } catch (err) {
        console.error('buy error:', err);
        return res.json({ success: false });
    }
});

app.post('/api/trade/sell', authMiddleware, async (req, res) => {

    const quantity = Number(req.body?.quantity);

    if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.json({ success: false, message: '수량 이상' });
    }

    const userId = req.user.user_id;

    try {
        const [[user]] = await pool.query(
            `SELECT balance, stock FROM users WHERE user_id = ?`,
            [userId]
        );

        const [[priceRow]] = await pool.query(
            `SELECT price FROM market_data ORDER BY id DESC LIMIT 1`
        );

        if (!user || !priceRow) {
            return res.json({ success: false });
        }

        if (user.stock < quantity) {
            return res.json({ success: false, message: '보유 주식 부족' });
        }

        const price = Number(priceRow.price);
        const totalGain = price * quantity;

        await pool.query(
            `UPDATE users SET balance = balance + ?, stock = stock - ? WHERE user_id = ?`,
            [totalGain, quantity, userId]
        );

        await pool.query(
            `INSERT INTO trades (user_id, type, price) VALUES (?, 'SELL', ?)`,
            [userId, price]
        );

        return res.json({ success: true });

    } catch (err) {
        console.error('sell error:', err);
        return res.json({ success: false });
    }
});

app.get('/board/list', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.id, p.title, p.writer, t.type, t.price,
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
            FROM posts p
            LEFT JOIN trades t ON p.trade_id = t.id
            ORDER BY p.id DESC
        `);
        let rowsHtml = rows.map(row => {
            const rowClass =
                row.type === 'BUY' ? 'row-buy' :
                    row.type === 'SELL' ? 'row-sell' : '';
            return `
                <tr class="${rowClass}" onclick="goDetail(${row.id})">
                    <td>${row.id}</td>
                    <td style="font-weight: bold;">${escapeHtml(row.title)}</td>
                    <td>${escapeHtml(row.writer || '')}</td>
                    <td>${row.type || ''} ${Number(row.price || 0).toLocaleString()}원</td>
                    <td>${row.created_at}</td>
                </tr>
            `;
        }).join('');
        const template = readTemplate('board-list.html');
        res.send(renderTemplate(template, { table_section: rowsHtml }));
    } catch {
        sendMessagePage(res, '오류', '목록 조회 실패');
    }
});

app.get('/board/write', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'board-write.html'));
});

app.post('/board/write', authMiddleware, async (req, res) => {
    const { title, content, writer } = req.body;
    const trade_id = Number(req.body.trade_id);
    const userId = req.user.user_id;

    try {
        await pool.query(`
            INSERT INTO posts (user_id, trade_id, title, content, writer)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, trade_id, title, content, writer]);

        return res.json({ success: true });

    } catch (err) {
        console.error(err);
        return res.json({ success: false });
    }
});

app.get('/board/detail/:id', async (req, res) => {
    const id = req.params.id;

    let user = null;

    const authHeader = req.headers.authorization;

    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            user = jwt.verify(token, SECRET);
        } catch (err) {
            user = null;
        }
    }

    const [rows] = await pool.query(`
        SELECT p.*, u.name, t.type, t.price
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.user_id
        LEFT JOIN trades t ON p.trade_id = t.id
        WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
        return sendMessagePage(res, '오류', '없음');
    }

    const row = rows[0];

    const isMine = user && String(row.user_id) === String(user.user_id);

    const template = readTemplate('board-detail.html');

    res.send(renderTemplate(template, {
        board_id: row.id,
        title: escapeHtml(row.title),
        writer: escapeHtml(row.writer || ''),
        content: escapeHtml(row.content),
        created_at: row.created_at,

        edit_buttons: isMine ? `
            <button class="btn" onclick="goEdit(${row.id})">수정</button>
            <button class="btn-danger" onclick="deletePost(${row.id})">삭제</button>
        ` : ''
    }));
});

app.get('/board/edit/:id', authMiddleware, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.user.user_id;

    try {
        const [[row]] = await pool.query(`
            SELECT id, title, content, writer, user_id
            FROM posts
            WHERE id = ?
        `, [boardId]);

        if (!row) {
            return sendMessagePage(res, '조회 실패', '게시글 없음');
        }

        if (row.user_id !== userId) {
            return sendMessagePage(res, '권한 없음', '수정 권한 없음');
        }

        const template = readTemplate('board-edit.html');

        res.send(renderTemplate(template, {
            board_id: row.id,
            title: escapeHtml(row.title),
            writer: escapeHtml(row.writer || ''),
            content: escapeHtml(row.content)
        }));

    } catch (err) {
        console.error(err);
        sendMessagePage(res, '오류', '수정 화면 실패');
    }
});

app.post('/board/edit/:id', authMiddleware, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.user.user_id;

    const { title, content, writer } = req.body;
    const trade_id = Number(req.body.trade_id);

    try {
        const [[post]] = await pool.query(`
            SELECT user_id FROM posts WHERE id = ?
        `, [boardId]);

        if (!post) {
            return res.json({ success: false, message: '게시글 없음' });
        }

        await pool.query(`
            UPDATE posts
            SET title = ?, content = ?, writer = ?, trade_id = ?
            WHERE id = ?
        `, [title, content, writer, trade_id, boardId]);

        return res.json({ success: true });

    } catch (err) {
        console.error(err);
        return res.json({ success: false });
    }
});

app.post('/board/delete/:id', authMiddleware, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.user.user_id;

    try {
        const [[post]] = await pool.query(`
            SELECT user_id FROM posts WHERE id = ?
        `, [boardId]);

        if (!post || post.user_id !== userId) {
            return res.json({ success: false, message: '권한 없음' });
        }

        await pool.query(`
            DELETE FROM posts WHERE id = ?
        `, [boardId]);

        return res.json({ success: true, redirect: '/board/list' });

    } catch (err) {
        console.error(err);
        return res.json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`서버 실행: http://localhost:${PORT}`);
});