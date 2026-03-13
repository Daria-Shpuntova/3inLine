// Match3Game.js - основной класс игры (исправленная версия)
// Match3Game.js - основной класс игры
class Match3Game {
    constructor() {
        console.log('Match3Game constructor started');

        // Проверяем наличие API
        if (typeof api === 'undefined') {
            console.error('API не загружен! Ждем...');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.api = api;
        this.boardSystem = null;
        this.bonusSystem = new BonusSystem(this);

        // Базовые настройки
        this.boardSize = 8;
        this.board = [];
        this.score = 0;
        this.moves = 20;
        this.goal = 500;
        this.lives = 5;
        this.coins = 100;
        this.inventory = {
            lightning: 0,
            cross: 0,
            bomb: 0,
            rainbow: 0
        };

        this.selectedCell = null;
        this.gameActive = true; // Важно: сразу устанавливаем в true
        this.lifeTimer = null;
        this.animations = null;
        this.dragDrop = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.matchChainInProgress = false;

        console.log('Match3Game создан, gameActive =', this.gameActive);

        // Запускаем инициализацию
        setTimeout(() => this.init(), 50);
    }

    async init() {
        if (this.isInitialized) {
            console.log('Already initialized');
            return;
        }

        console.log('init() started, gameActive =', this.gameActive);

        try {
            // Инициализируем системы
            this.boardSystem = new Board(this);
            this.animations = new AnimationManager(this);

            // Загружаем состояние
            const username = 'player_' + Math.floor(Math.random() * 1000);
            if (this.api) {
                await this.api.login(username);
                await this.loadGameState();
            }

            // Создаем поле
            this.createBoard();

            // Запускаем таймер жизней
            this.startLifeTimer();

            // Рендерим поле
            this.render();

            // Инициализируем Drag&Drop
            this.dragDrop = new DragDropManager(this);
            this.dragDrop.init();

            // Настраиваем обработчики событий
            this.setupEventListeners();

            this.isInitialized = true;
            this.gameActive = true; // Убеждаемся, что игра активна
            console.log('init() completed successfully, gameActive =', this.gameActive);

        } catch (error) {
            console.error('Init error:', error);
            this.gameActive = true; // Даже при ошибке пытаемся сделать игру активной
        }
    }

    createBoard() {
        console.log('Creating board with size:', this.boardSize);
        this.board = this.boardSystem.createBoard(this.boardSize);
        console.log('Board created:', this.board);
    }

    async loadGameState() {
        try {
            const result = await this.api.getGameState();
            if (result && result.success) {
                this.lives = result.data.lives || 5;
                this.coins = result.data.coins || 100;
                this.inventory = result.data.inventory || this.inventory;
            }
        } catch (error) {
            console.warn('Could not load game state:', error);
        }
    }

    // ИСПРАВЛЕННЫЙ метод trySwap
    trySwap(x1, y1, x2, y2) {
        console.log('trySwap called:', x1, y1, '->', x2, y2, 'gameActive=', this.gameActive);

        // Проверяем, можно ли обменивать
        if (this.animations?.isAnimating) {
            console.log('Animating, cannot swap');
            return false;
        }

        if (this.isProcessing || this.matchChainInProgress) {
            console.log('Processing, cannot swap');
            return false;
        }

        if (!this.gameActive) {
            console.log('Game not active');
            this.showMessage('Игра не активна', 'error');
            return false;
        }

        if (this.lives <= 0) {
            this.showMessage('Нет жизней!', 'error');
            return false;
        }

        if (this.moves <= 0) {
            this.showMessage('Нет ходов!', 'error');
            return false;
        }

        // Проверяем, приведет ли обмен к совпадениям
        if (!this.boardSystem.hasMatchesAfterSwap(x1, y1, x2, y2)) {
            this.showMessage('Нет совпадений!', 'error');
            return false;
        }

        console.log('Swap is valid, proceeding...');

        this.isProcessing = true;
        this.matchChainInProgress = true;

        // Уменьшаем ходы
        this.moves--;
        this.updateUI();

        // Выполняем обмен в данных
        this.boardSystem.swap(x1, y1, x2, y2);

        // Анимируем обмен
        this.animations.animateSwap(x1, y1, x2, y2, () => {
            // После анимации начинаем обработку совпадений
            this.processMatchChain();
        });

        return true;
    }

    // ИСПРАВЛЕННЫЙ метод processMatchChain
    async processMatchChain() {
        console.log('Starting match chain');
        let hasMatches = true;
        let chainLength = 0;
        const maxChainLength = 10;

        while (hasMatches && chainLength < maxChainLength) {
            chainLength++;

            // Находим все совпадения
            const matches = this.boardSystem.findAllMatches();

            if (matches.length === 0) {
                hasMatches = false;
                break;
            }

            console.log(`Chain ${chainLength}: found ${matches.length} matches`);

            // Начисляем очки
            this.addScore(matches.length * 10 * chainLength);

            // Анимируем уничтожение
            await this.animateAndClearMatches(matches);

            // Применяем гравитацию к данным
            this.boardSystem.applyGravity();

            // Заполняем пустоты новыми кристаллами
            this.boardSystem.fillEmptyCells();

            // Обновляем визуально
            this.softUpdate();

            // Небольшая пауза для визуального восприятия
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('Match chain completed');
        this.matchChainInProgress = false;
        this.isProcessing = false;

        // Снимаем выделение
        this.selectedCell = null;
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));

        // Проверяем наличие возможных ходов
        if (!this.hasAnyPossibleMove()) {
            console.log('No possible moves, shuffling...');
            this.showMessage('Нет ходов! Перемешиваем...', 'info');
            this.shuffleBoard();
        } else {
            // Важно! Убеждаемся, что игра снова активна
            this.gameActive = true;
        }

        this.checkGameStatus();
    }

    // Также добавим метод для принудительного сброса анимации
    resetAnimationState() {
        if (this.animations) {
            this.animations.isAnimating = false;
        }
        this.isProcessing = false;
        this.matchChainInProgress = false;
        this.gameActive = true;

        // Восстанавливаем видимость всех клеток
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.opacity = '1';
            cell.style.transform = '';
            cell.style.transition = '';
        });

        console.log('Animation state reset');
    }


    // Вспомогательный метод для анимации
    animateAndClearMatches(matches) {
        return new Promise((resolve) => {
            // Помечаем совпадающие клетки как пустые
            matches.forEach(({x, y}) => {
                if (this.board[y] && this.board[y][x] !== undefined) {
                    this.board[y][x] = -1;
                }
            });

            // Анимируем уничтожение
            this.animations.animateDestroy(matches, () => {
                // Применяем гравитацию к данным
                this.boardSystem.applyGravity();

                // Подготавливаем данные для падения
                const fallData = this.prepareFallAnimation();

                if (fallData.length > 0) {
                    this.animations.animateFall(fallData, () => {
                        // После падения заполняем пустоты БЕЗ создания совпадений
                        this.boardSystem.fillEmptyCells();
                        this.softUpdate();
                        resolve();
                    });
                } else {
                    // Если нет падения, просто заполняем пустоты
                    this.boardSystem.fillEmptyCells();
                    this.softUpdate();
                    resolve();
                }
            });
        });
    }

    debugBoard() {
        console.log('Current board:');
        for (let y = 0; y < this.boardSize; y++) {
            let row = '';
            for (let x = 0; x < this.boardSize; x++) {
                row += (this.board[y][x] === -1 ? '⚪' : this.board[y][x]) + ' ';
            }
            console.log(row);
        }

        const matches = this.boardSystem.findAllMatches();
        console.log('Current matches:', matches.length);

        return { board: this.board, matches };
    }

    // Подготовка данных для анимации падения
    prepareFallAnimation() {
        const fallData = [];
        const size = this.boardSize;

        for (let x = 0; x < size; x++) {
            let emptySpaces = 0;

            // Считаем пустые места снизу вверх
            for (let y = size - 1; y >= 0; y--) {
                if (this.board[y][x] === -1) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Этот кристалл должен упасть
                    fallData.push({
                        fromY: y,
                        toY: y + emptySpaces,
                        x: x,
                        color: this.board[y][x]
                    });

                    // Временно помечаем как пустое
                    this.board[y][x] = -1;
                }
            }
        }

        return fallData;
    }

    // Проверка наличия возможных ходов
    hasAnyPossibleMove() {
        const size = this.boardSize;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Проверяем обмен с правым соседом
                if (x < size - 1) {
                    if (this.boardSystem.hasMatchesAfterSwap(x, y, x + 1, y)) {
                        return true;
                    }
                }
                // Проверяем обмен с нижним соседом
                if (y < size - 1) {
                    if (this.boardSystem.hasMatchesAfterSwap(x, y, x, y + 1)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Перемешивание поля
    shuffleBoard() {
        // Собираем все кристаллы
        const crystals = [];
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] >= 0) {
                    crystals.push(this.board[y][x]);
                }
            }
        }

        // Перемешиваем
        for (let i = crystals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [crystals[i], crystals[j]] = [crystals[j], crystals[i]];
        }

        // Заполняем поле
        let index = 0;
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                this.board[y][x] = crystals[index++];
            }
        }

        this.render();

        // Проверяем совпадения
        setTimeout(() => {
            if (this.boardSystem.findAllMatches().length > 0) {
                this.processMatchChain();
            }
        }, 100);
    }

    // Мягкое обновление UI
    softUpdate() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = this.animations.getCellElement(x, y);
                if (cell && this.board[y][x] >= 0) {
                    const crystalUrl = this.getCrystalImage(this.board[y][x]);
                    cell.style.backgroundImage = crystalUrl;
                    cell.style.opacity = '1';
                    cell.style.transform = 'scale(1)';
                }
            }
        }
        this.updateUI();
    }

    // Получение изображения кристалла
    getCrystalImage(type) {
        // Проверяем наличие themeManager
        if (typeof themeManager !== 'undefined') {
            return themeManager.getCrystalImage(type);
        }

        // Запасной вариант
        const colors = [
            'linear-gradient(135deg, #ff6b6b, #ee5253)', // Красный
            'linear-gradient(135deg, #ff9ff3, #f368e0)', // Розовый
            'linear-gradient(135deg, #feca57, #ff9f43)', // Оранжевый
            'linear-gradient(135deg, #ff6b6b, #ee5253)', // Красный
            'linear-gradient(135deg, #48dbfb, #0abde3)', // Голубой
            'linear-gradient(135deg, #1dd1a1, #10ac84)'  // Зеленый
        ];
        return colors[type] || colors[0];
    }

    // Рендер поля
    render() {
        console.log('Rendering board...');
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) {
            console.error('Board element not found!');
            return;
        }

        const selectedX = this.selectedCell?.x;
        const selectedY = this.selectedCell?.y;

        boardElement.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'board-grid';
        grid.style.gridTemplateColumns = `repeat(${this.boardSize}, 60px)`;

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                if (selectedX === x && selectedY === y) {
                    cell.classList.add('selected');
                }

                if (this.board[y] && this.board[y][x] >= 0) {
                    const crystalUrl = this.getCrystalImage(this.board[y][x]);
                    cell.style.backgroundImage = crystalUrl;
                    cell.style.backgroundSize = 'contain';
                    cell.style.backgroundPosition = 'center';
                    cell.style.backgroundRepeat = 'no-repeat';
                }

                grid.appendChild(cell);
            }
        }

        boardElement.appendChild(grid);
        this.updateUI();

        // Переинициализируем Drag&Drop
        if (this.dragDrop) {
            setTimeout(() => this.dragDrop.init(), 100);
        }
    }

    // Обновление UI
    updateUI() {
        const scoreEl = document.getElementById('score');
        const goalEl = document.getElementById('goal');
        const movesEl = document.getElementById('moves');
        const livesEl = document.getElementById('lives');
        const coinsEl = document.getElementById('coins');

        if (scoreEl) scoreEl.textContent = this.score;
        if (goalEl) goalEl.textContent = this.goal;
        if (movesEl) movesEl.textContent = this.moves;
        if (livesEl) livesEl.textContent = this.lives;
        if (coinsEl) coinsEl.textContent = `💰 ${this.coins}`;

        // Обновляем счетчики бонусов
        const lightningCount = document.getElementById('lightningCount');
        const crossCount = document.getElementById('crossCount');
        const bombCount = document.getElementById('bombCount');
        const rainbowCount = document.getElementById('rainbowCount');

        if (lightningCount) lightningCount.textContent = this.inventory.lightning || 0;
        if (crossCount) crossCount.textContent = this.inventory.cross || 0;
        if (bombCount) bombCount.textContent = this.inventory.bomb || 0;
        if (rainbowCount) rainbowCount.textContent = this.inventory.rainbow || 0;
    }

    // Добавление очков
    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    // Проверка статуса игры
    checkGameStatus() {
        if (this.score >= this.goal) {
            this.gameWon();
        } else if (this.moves <= 0) {
            this.gameLost();
        }
    }

    // Победа
    gameWon() {
        this.gameActive = false;
        this.showMessage('Победа! 🎉', 'success');

        this.coins += Math.floor(this.score / 10);
        this.updateUI();

        setTimeout(() => {
            this.gameActive = true;
        }, 2000);
    }

    // Поражение
    gameLost() {
        this.gameActive = false;

        if (this.lives > 0) {
            this.lives--;
            this.showMessage(`Вы проиграли! Осталось ❤️ ${this.lives}`, 'error');
        }

        this.updateUI();

        setTimeout(() => {
            this.gameActive = true;
        }, 2000);
    }

    // Новая игра
    newGame() {
        console.log('Starting new game, current gameActive =', this.gameActive);

        if (this.lives <= 0) {
            this.showMessage('Нет жизней! Подождите восстановления', 'error');
            return;
        }

        // Сбрасываем все флаги
        this.isProcessing = false;
        this.matchChainInProgress = false;
        this.gameActive = true;
        this.selectedCell = null;

        // Создаем новое поле
        this.createBoard();
        this.score = 0;
        this.moves = this.getMovesForSize();
        this.goal = this.getGoalForSize();

        // Рендерим
        this.render();

        // Переинициализируем Drag&Drop
        if (this.dragDrop) {
            setTimeout(() => {
                this.dragDrop.init();
            }, 100);
        }

        this.showMessage('Новая игра! Удачи!', 'info');
        console.log('New game started, gameActive =', this.gameActive);
    }

    // Получение количества ходов для размера поля
    getMovesForSize() {
        const moves = { 6: 15, 8: 20, 10: 30 };
        return moves[this.boardSize] || 20;
    }

    // Получение цели для размера поля
    getGoalForSize() {
        const goals = { 6: 300, 8: 500, 10: 800 };
        return goals[this.boardSize] || 500;
    }

    // Таймер жизней
    startLifeTimer() {
        // Заглушка для таймера
        console.log('Life timer started');
    }

    // Показать сообщение
    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('gameMessage');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `game-message ${type}`;

        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'game-message';
        }, 3000);
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        console.log('Setting up event listeners');

        // Кнопки размера поля
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.boardSize = parseInt(e.target.dataset.size);
                console.log('Board size changed to:', this.boardSize);
                this.newGame();
            };
        });

        // Кнопка новой игры
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.onclick = () => this.newGame();
        }

        // Кнопка покупки ходов
        const buyMovesBtn = document.getElementById('buyMovesBtn');
        if (buyMovesBtn) {
            buyMovesBtn.onclick = () => this.buyMoves();
        }

        // Бонусы
        document.querySelectorAll('.bonus-card').forEach(card => {
            card.onclick = () => {
                const bonusType = card.dataset.bonus;
                if (bonusType) {
                    this.useBonus(bonusType);
                }
            };
        });
    }

    // Покупка ходов
    buyMoves() {
        if (this.lives <= 0) {
            this.showMessage('Нет жизней', 'error');
            return;
        }

        this.moves += 5;
        this.gameActive = true;
        this.showMessage('+5 ходов!', 'success');
        this.updateUI();
    }

    // Использование бонуса (заглушка)
    useBonus(type) {
        if (!this.gameActive) {
            this.showMessage('Игра не активна', 'error');
            return;
        }

        if (this.inventory[type] <= 0) {
            this.showMessage('Нет бонуса', 'error');
            return;
        }

        if (!this.selectedCell) {
            this.showMessage('Выберите клетку', 'error');
            return;
        }

        this.showMessage(`Бонус ${type} активирован`, 'success');
    }
}


// В конце файла или в отдельном скрипте
window.onload = () => {
    console.log('Window loaded, starting game...');

    // Проверяем наличие необходимых элементов
    if (!document.getElementById('gameBoard')) {
        console.error('Game board element not found!');
        return;
    }

    // Создаем игру
    window.game = new Match3Game();

    // Для отладки
    console.log('Game instance created:', window.game);
};