class BonusSystem {
    constructor(game) {
        this.game = game;
        this.bonuses = {
            lightning: { name: 'Молния', icon: '⚡', price: 150 },
            cross: { name: 'Крест', icon: '⚡⚡', price: 250 },
            bomb: { name: 'Бомба', icon: '💣', price: 100 },
            rainbow: { name: 'Радуга', icon: '🌈', price: 200 }
        };
    }

    // Активация молнии (ряд)
    activateLightning(x, y, horizontal = true) {
        const destroyed = [];

        if (horizontal) {
            // Уничтожаем всю строку
            for (let i = 0; i < this.game.boardSize; i++) {
                destroyed.push({ x: i, y });
            }
        } else {
            // Уничтожаем всю колонку
            for (let i = 0; i < this.game.boardSize; i++) {
                destroyed.push({ x, y: i });
            }
        }

        this.applyDestruction(destroyed);
        return destroyed.length;
    }

    // Активация креста (две молнии)
    activateCross(centerX, centerY) {
        const destroyed = [];

        // Горизонталь
        for (let x = 0; x < this.game.boardSize; x++) {
            destroyed.push({ x, y: centerY });
        }

        // Вертикаль (без центра, чтобы не дублировать)
        for (let y = 0; y < this.game.boardSize; y++) {
            if (y !== centerY) {
                destroyed.push({ x: centerX, y });
            }
        }

        this.applyDestruction(destroyed);
        return destroyed.length;
    }

    // Активация бомбы (область 5x5)
    activateBomb(centerX, centerY) {
        const destroyed = [];
        const radius = 2;

        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (this.game.isValidPosition(x, y)) {
                    destroyed.push({ x, y });
                }
            }
        }

        this.applyDestruction(destroyed);
        return destroyed.length;
    }

    // Активация радуги (уничтожает все кристаллы выбранного цвета)
    activateRainbow(targetColor) {
        const destroyed = [];

        for (let y = 0; y < this.game.boardSize; y++) {
            for (let x = 0; x < this.game.boardSize; x++) {
                if (this.game.board[y][x] === targetColor) {
                    destroyed.push({ x, y });
                }
            }
        }

        this.applyDestruction(destroyed);
        return destroyed.length;
    }

    // Применение уничтожения
    applyDestruction(positions) {
        // Удаляем кристаллы
        positions.forEach(({ x, y }) => {
            this.game.board[y][x] = -1;
        });

        // Начисляем очки (по 10 за кристалл)
        this.game.addScore(positions.length * 10);

        // Запускаем гравитацию
        this.game.applyGravity();

        // Проверяем новые совпадения
        setTimeout(() => {
            this.game.processMatches();
        }, 300);
    }
}