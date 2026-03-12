const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'game.db'));
        this.init();
    }

    init() {
        // Создание таблиц
        this.db.run(`
            CREATE TABLE IF NOT EXISTS players (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   username TEXT UNIQUE,
                                                   password TEXT,
                                                   coins INTEGER DEFAULT 100,
                                                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS game_state (
                                                      player_id INTEGER PRIMARY KEY,
                                                      lives INTEGER DEFAULT 5,
                                                      last_life_update DATETIME,
                                                      current_level INTEGER DEFAULT 1,
                                                      high_score INTEGER DEFAULT 0,
                                                      total_score INTEGER DEFAULT 0,
                                                      games_played INTEGER DEFAULT 0,
                                                      FOREIGN KEY (player_id) REFERENCES players(id)
                )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS inventory (
                                                     player_id INTEGER,
                                                     bonus_type TEXT,
                                                     quantity INTEGER DEFAULT 0,
                                                     PRIMARY KEY (player_id, bonus_type),
                FOREIGN KEY (player_id) REFERENCES players(id)
                )
        `);
    }

    // Создание нового игрока
    createPlayer(username, password, callback) {
        const self = this; // Сохраняем ссылку на this

        self.db.serialize(() => {
            self.db.run(
                'INSERT INTO players (username, password) VALUES (?, ?)',
                [username, password],
                function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    const playerId = this.lastID;

                    // Создаем начальное состояние игры
                    self.db.run(
                        'INSERT INTO game_state (player_id, lives, last_life_update) VALUES (?, ?, ?)',
                        [playerId, 5, new Date().toISOString()],
                        function(err) {
                            if (err) callback(err);
                            else callback(null, playerId);
                        }
                    );
                }
            );
        });
    }

    // Получение состояния игры
    getGameState(playerId, callback) {
        this.db.get(
            `SELECT g.*, p.coins, p.username
             FROM game_state g
                      JOIN players p ON p.id = g.player_id
             WHERE g.player_id = ?`,
            [playerId],
            callback
        );
    }

    // Обновление жизней (проверка восстановления)
    updateLives(playerId, callback) {
        this.db.get(
            'SELECT lives, last_life_update FROM game_state WHERE player_id = ?',
            [playerId],
            (err, row) => {
                if (err || !row) {
                    callback(err);
                    return;
                }

                const now = new Date();
                const lastUpdate = new Date(row.last_life_update);
                const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));

                // Восстанавливаем 1 жизнь каждые 30 минут
                const livesToAdd = Math.floor(minutesPassed / 30);

                if (livesToAdd > 0 && row.lives < 5) {
                    const newLives = Math.min(row.lives + livesToAdd, 5);

                    // Обновляем время последнего обновления
                    const newLastUpdate = new Date(lastUpdate.getTime() + livesToAdd * 30 * 60 * 1000);

                    this.db.run(
                        'UPDATE game_state SET lives = ?, last_life_update = ? WHERE player_id = ?',
                        [newLives, newLastUpdate.toISOString(), playerId],
                        function(err) {
                            if (err) callback(err);
                            else callback(null, { lives: newLives, recovered: livesToAdd });
                        }
                    );
                } else {
                    callback(null, { lives: row.lives, recovered: 0 });
                }
            }
        );
    }

    // Сохранение результата игры
    saveGameResult(playerId, score, won, callback) {
        const self = this;

        self.db.serialize(() => {
            // Обновляем статистику
            self.db.run(
                `UPDATE game_state
                 SET total_score = total_score + ?,
                     games_played = games_played + 1,
                     high_score = MAX(high_score, ?)
                 WHERE player_id = ?`,
                [score, score, playerId],
                function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                }
            );

            // Если проиграли - тратим жизнь
            if (!won) {
                self.db.run(
                    `UPDATE game_state
                     SET lives = lives - 1,
                         last_life_update = ?
                     WHERE player_id = ? AND lives > 0`,
                    [new Date().toISOString(), playerId],
                    function(err) {
                        if (err) callback(err);
                    }
                );
            } else {
                // Если выиграли - добавляем монеты
                const coinsEarned = Math.floor(score / 10);
                self.db.run(
                    'UPDATE players SET coins = coins + ? WHERE id = ?',
                    [coinsEarned, playerId],
                    function(err) {
                        if (err) callback(err);
                    }
                );
            }

            callback(null);
        });
    }

    // Добавление бонуса в инвентарь
    addBonus(playerId, bonusType, quantity, callback) {
        this.db.run(
            `INSERT INTO inventory (player_id, bonus_type, quantity)
             VALUES (?, ?, ?)
                 ON CONFLICT(player_id, bonus_type) 
             DO UPDATE SET quantity = quantity + ?`,
            [playerId, bonusType, quantity, quantity],
            callback
        );
    }

    // Использование бонуса
    useBonus(playerId, bonusType, callback) {
        this.db.run(
            `UPDATE inventory
             SET quantity = quantity - 1
             WHERE player_id = ? AND bonus_type = ? AND quantity > 0`,
            [playerId, bonusType],
            function(err) {
                if (err) callback(err);
                else callback(null, this.changes > 0);
            }
        );
    }

    // Получение инвентаря
    getInventory(playerId, callback) {
        this.db.all(
            'SELECT bonus_type, quantity FROM inventory WHERE player_id = ?',
            [playerId],
            callback
        );
    }
}

module.exports = new Database();