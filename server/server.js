const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Регистрация/вход (упрощенно для демо)
app.post('/api/login', (req, res) => {
    const { username } = req.body;

    // Для демо просто создаем или получаем игрока
    db.db.get(
        'SELECT id FROM players WHERE username = ?',
        [username],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (row) {
                // Игрок существует
                res.json({ playerId: row.id, username });
            } else {
                // Создаем нового
                db.createPlayer(username, 'demo', (err, playerId) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json({ playerId, username });
                    }
                });
            }
        }
    );
});

// Получение состояния игры
app.get('/api/game-state/:playerId', (req, res) => {
    const playerId = req.params.playerId;

    db.updateLives(playerId, (err, livesInfo) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.getGameState(playerId, (err, gameState) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            db.getInventory(playerId, (err, inventory) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                res.json({
                    ...gameState,
                    lives: livesInfo.lives,
                    recoveredLives: livesInfo.recovered,
                    inventory: inventory.reduce((acc, item) => {
                        acc[item.bonus_type] = item.quantity;
                        return acc;
                    }, {})
                });
            });
        });
    });
});

// Сохранение результата игры
app.post('/api/game-result', (req, res) => {
    const { playerId, score, won } = req.body;

    db.saveGameResult(playerId, score, won, (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// Покупка бонуса
app.post('/api/buy-bonus', (req, res) => {
    const { playerId, bonusType, price } = req.body;

    db.db.get('SELECT coins FROM players WHERE id = ?', [playerId], (err, row) => {
        if (err || !row) {
            res.status(500).json({ error: 'Player not found' });
            return;
        }

        if (row.coins < price) {
            res.json({ success: false, error: 'Not enough coins' });
            return;
        }

        db.db.serialize(() => {
            db.db.run('UPDATE players SET coins = coins - ? WHERE id = ?', [price, playerId]);
            db.addBonus(playerId, bonusType, 1, (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ success: true });
                }
            });
        });
    });
});

// Использование бонуса
app.post('/api/use-bonus', (req, res) => {
    const { playerId, bonusType } = req.body;

    db.useBonus(playerId, bonusType, (err, used) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: used });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});