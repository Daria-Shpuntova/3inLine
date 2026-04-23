// bonuses.js - Полная реализация всех бонусов

class BonusSystem {
    constructor(game) {
        this.game = game;
        this.bonuses = {
            lightning: {
                name: 'Молния',
                icon: '⚡',
                price: 150,
                description: 'Уничтожает ряд или колонку'
            },
            cross: {
                name: 'Крест',
                icon: '✚',
                price: 250,
                description: 'Уничтожает ряд и колонку'
            },
            bomb: {
                name: 'Бомба',
                icon: '💣',
                price: 100,
                description: 'Уничтожает область 3x3'
            },
            rainbow: {
                name: 'Радуга',
                icon: '🌈',
                price: 200,
                description: 'Уничтожает все кристаллы одного цвета'
            }
        };

        this.activeBonus = null;
        this.bonusMode = false;
    }

    // Покупка бонуса
    async buyBonus(type) {
        const bonus = this.bonuses[type];
        if (!bonus) {
            this.game.showMessage('Неизвестный бонус', 'error');
            return false;
        }

        if (this.game.coins < bonus.price) {
            this.game.showMessage(`Недостаточно монет! Нужно ${bonus.price} 🪙`, 'error');
            return false;
        }

        // Покупаем через API
        if (this.game.api) {
            const result = await this.game.api.buyBonus(type, bonus.price);
            if (!result.success) {
                this.game.showMessage('Ошибка покупки', 'error');
                return false;
            }
        }

        // Списываем монеты
        this.game.coins -= bonus.price;

        // Добавляем в инвентарь
        if (!this.game.inventory[type]) {
            this.game.inventory[type] = 0;
        }
        this.game.inventory[type]++;

        this.game.updateUI();
        this.game.showMessage(`Куплен бонус "${bonus.name}"!`, 'success');

        return true;
    }

    // Активация бонуса
    activateBonus(type) {
        console.log('activateBonus called:', type);

        if (!this.game.gameActive) {
            this.game.showMessage('Игра не активна', 'error');
            return false;
        }

        if (this.game.isProcessing || this.game.matchChainInProgress) {
            this.game.showMessage('Подождите завершения анимации', 'error');
            return false;
        }

        const count = this.game.inventory[type] || 0;
        console.log('Bonus count:', count);

        if (count <= 0) {
            this.buyBonus(type);
            return false;
        }

        // Отменяем предыдущий бонус если был
        if (this.bonusMode) {
            this.cancelBonus();
        }

        // Активируем режим бонуса
        this.bonusMode = true;
        this.activeBonus = type;

        // Подсвечиваем активный бонус
        this.highlightActiveBonus(type);

        // Показываем подсказку
        const bonus = this.bonuses[type];
        this.game.showMessage(`Выберите клетку для "${bonus.name}"`, 'info');

        // Меняем курсор
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.cursor = 'crosshair';
        });

        return true;
    }

    // Использование бонуса
    useBonus(x, y) {
        console.log('useBonus:', { x, y, mode: this.bonusMode, bonus: this.activeBonus });

        if (!this.bonusMode || !this.activeBonus) {
            return false;
        }

        const type = this.activeBonus;
        const count = this.game.inventory[type] || 0;

        if (count <= 0) {
            this.cancelBonus();
            return false;
        }

        // Проверяем позицию
        if (!this.game.isValidPosition(x, y)) {
            this.game.showMessage('Неверная позиция', 'error');
            return false;
        }

        // Для радуги нужно сохранить цвет до уничтожения
        let targetColor = null;
        if (type === 'rainbow') {
            targetColor = this.game.board[y][x];
            if (targetColor === -1) {
                this.game.showMessage('Выберите существующий кристалл', 'error');
                return false;
            }
        } else if (type !== 'rainbow' && this.game.board[y][x] === -1) {
            this.game.showMessage('Выберите существующий кристалл', 'error');
            return false;
        }

        let destroyed = [];
        let scoreBonus = 0;

        try {
            switch (type) {
                case 'lightning':
                    destroyed = this.activateLightning(x, y);
                    scoreBonus = 50;
                    break;
                case 'cross':
                    destroyed = this.activateCross(x, y);
                    scoreBonus = 100;
                    break;
                case 'bomb':
                    destroyed = this.activateBomb(x, y);
                    scoreBonus = 75;
                    break;
                case 'rainbow':
                    destroyed = this.activateRainbow(targetColor);
                    scoreBonus = 150;
                    break;
                default:
                    console.error('Unknown bonus type:', type);
                    this.cancelBonus();
                    return false;
            }
        } catch (error) {
            console.error('Error in bonus activation:', error);
            this.cancelBonus();
            return false;
        }

        console.log('Destroyed cells count:', destroyed.length);

        if (destroyed.length > 0) {
            // Тратим бонус
            this.game.inventory[type]--;

            // Начисляем очки
            this.game.addScore(destroyed.length * 10 + scoreBonus);

            // Обновляем UI
            this.game.updateUI();

            // Запускаем анимацию
            this.game.isProcessing = true;

            this.game.animations.animateDestroy(destroyed, () => {
                // Применяем гравитацию
                this.game.boardSystem.applyGravity();

                // Заполняем пустоты
                this.game.boardSystem.fillEmptyCells();

                // Обновляем отображение
                this.game.softUpdate();

                // Сбрасываем режим бонуса
                this.cancelBonus();

                const bonus = this.bonuses[type];
                this.game.showMessage(`"${bonus.name}" уничтожил ${destroyed.length} кристаллов!`, 'success');

                // Проверяем новые совпадения
                setTimeout(() => {
                    this.game.isProcessing = false;
                    this.game.processMatchChain();
                }, 300);
            });

            return true;
        }

        this.cancelBonus();
        this.game.showMessage('Нечего уничтожать', 'error');
        return false;
    }

    // Молния - уничтожает строку
    activateLightning(x, y) {
        console.log('=== LIGHTNING ===');
        console.log('Position:', x, y);

        const destroyed = [];
        const boardSize = this.game.boardSize;

        // Уничтожаем всю строку
        for (let i = 0; i < boardSize; i++) {
            if (this.game.board[y] && this.game.board[y][i] !== undefined &&
                this.game.board[y][i] !== -1) {
                destroyed.push({ x: i, y: y });
                this.game.board[y][i] = -1;
            }
        }

        console.log('Lightning destroyed:', destroyed.length);
        return destroyed;
    }

    // Крест - уничтожает строку и столбец
    activateCross(centerX, centerY) {
        console.log('=== CROSS ===');
        console.log('Position:', centerX, centerY);

        const destroyed = [];
        const boardSize = this.game.boardSize;
        const processed = new Set(); // Чтобы не дублировать центральную клетку

        // Горизонтальная линия
        for (let x = 0; x < boardSize; x++) {
            if (this.game.board[centerY] && this.game.board[centerY][x] !== undefined &&
                this.game.board[centerY][x] !== -1) {
                const key = `${x},${centerY}`;
                if (!processed.has(key)) {
                    processed.add(key);
                    destroyed.push({ x: x, y: centerY });
                    this.game.board[centerY][x] = -1;
                }
            }
        }

        // Вертикальная линия
        for (let y = 0; y < boardSize; y++) {
            if (this.game.board[y] && this.game.board[y][centerX] !== undefined &&
                this.game.board[y][centerX] !== -1) {
                const key = `${centerX},${y}`;
                if (!processed.has(key)) {
                    processed.add(key);
                    destroyed.push({ x: centerX, y: y });
                    this.game.board[y][centerX] = -1;
                }
            }
        }

        console.log('Cross destroyed:', destroyed.length);
        return destroyed;
    }

    // Бомба - уничтожает область 3x3
    activateBomb(centerX, centerY) {
        console.log('=== BOMB ===');
        console.log('Position:', centerX, centerY);

        const destroyed = [];
        const radius = 1;
        const boardSize = this.game.boardSize;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const newX = centerX + dx;
                const newY = centerY + dy;

                if (newX >= 0 && newX < boardSize &&
                    newY >= 0 && newY < boardSize) {

                    if (this.game.board[newY] &&
                        this.game.board[newY][newX] !== undefined &&
                        this.game.board[newY][newX] !== -1) {

                        destroyed.push({ x: newX, y: newY });
                        this.game.board[newY][newX] = -1;
                    }
                }
            }
        }

        console.log('Bomb destroyed:', destroyed.length);
        return destroyed;
    }

    // Радуга - уничтожает все кристаллы одного цвета
    activateRainbow(targetColor) {
        console.log('=== RAINBOW ===');
        console.log('Target color:', targetColor);

        const destroyed = [];
        const boardSize = this.game.boardSize;

        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (this.game.board[y] && this.game.board[y][x] === targetColor) {
                    destroyed.push({ x: x, y: y });
                    this.game.board[y][x] = -1;
                }
            }
        }

        console.log('Rainbow destroyed:', destroyed.length);
        return destroyed;
    }

    // Отмена бонуса
    cancelBonus() {
        console.log('Canceling bonus');

        this.bonusMode = false;
        this.activeBonus = null;

        // Убираем подсветку
        document.querySelectorAll('.bonus-card').forEach(card => {
            card.classList.remove('bonus-active');
            card.style.border = '2px solid #e0e0e0';
            card.style.boxShadow = '';
            card.style.transform = '';
        });

        // Возвращаем обычный курсор
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.cursor = '';
        });
    }

    // Подсветка активного бонуса
    highlightActiveBonus(type) {
        document.querySelectorAll('.bonus-card').forEach(card => {
            if (card.dataset.bonus === type) {
                card.classList.add('bonus-active');
                card.style.border = '2px solid gold';
                card.style.boxShadow = '0 0 20px gold';
                card.style.transform = 'scale(1.05)';
            } else {
                card.classList.remove('bonus-active');
                card.style.border = '2px solid #e0e0e0';
                card.style.boxShadow = '';
                card.style.transform = '';
            }
        });
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BonusSystem;
}

// Делаем доступным глобально
window.BonusSystem = BonusSystem;