DROP TABLE IF EXISTS market_data;

CREATE TABLE market_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stock_code VARCHAR(20) NOT NULL,
    price INT NOT NULL,
    volume INT NOT NULL,
    trade_strength DECIMAL(6,2) NOT NULL,
    unit_type VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);