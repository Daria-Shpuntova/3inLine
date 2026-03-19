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
        this.goal = 1200;
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

            // ПРОВЕРКА ПОБЕДЫ ПОСЛЕ КАЖДОГО НАЧИСЛЕНИЯ ОЧКОВ
            if (this.score >= this.goal) {
                console.log('Victory condition met during chain! Score:', this.score, 'Goal:', this.goal);
                await this.animateAndClearMatches(matches); // Завершаем текущие совпадения
                this.matchChainInProgress = false;
                this.isProcessing = false;
                this.gameWon(); // Вызываем победу
                return; // ВАЖНО: выходим из метода
            }

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

        // Финальная проверка статуса (если еще не победили)
        if (this.score < this.goal) {
            this.checkGameStatus();
        }
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
                // Пробуем найти клетку по разным атрибутам
                let cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
                if (!cell) {
                    cell = document.querySelector(`.cell[data-col="${x}"][data-row="${y}"]`);
                }

                if (cell && this.board[y] && this.board[y][x] >= 0) {
                    const crystalUrl = this.getCrystalImage(this.board[y][x]);
                    cell.style.backgroundImage = crystalUrl;
                    cell.style.backgroundSize = 'contain';
                    cell.style.backgroundPosition = 'center';
                    cell.style.backgroundRepeat = 'no-repeat';
                    cell.style.opacity = '1';
                    cell.style.transform = 'scale(1)';
                }
            }
        }
        this.updateUI();
    }

    // Получение изображения кристалла
    getCrystalImage(type) {
        // Всегда используем themeManager, если он доступен
        if (window.themeManager) {
            return window.themeManager.getCrystalImage(type);
        }

        // Запасной вариант с градиентами
        console.warn('ThemeManager not available, using fallback gradients');
        const gradients = {
            0: 'linear-gradient(135deg, #ff6b6b, #ee5253)', // Красный
            1: 'linear-gradient(135deg, #4ecdc4, #45b7d1)', // Голубой
            2: 'linear-gradient(135deg, #96ceb4, #6b8e4c)', // Зеленый
            3: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)', // Желтый
            4: 'linear-gradient(135deg, #a8e6cf, #56ab2f)', // Салатовый
            5: 'linear-gradient(135deg, #dfe6e9, #b2bec3)'  // Серый
        };
        return gradients[type] || gradients[0];
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
                // Добавляем ОБА варианта атрибутов для совместимости
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.dataset.col = x;
                cell.dataset.row = y;

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

    refreshCrystals() {
        console.log('Refreshing all crystals');

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                // Пробуем найти клетку по разным атрибутам
                let cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);

                // Если не нашли, пробуем через data-col/data-row
                if (!cell) {
                    cell = document.querySelector(`.cell[data-col="${x}"][data-row="${y}"]`);
                }

                if (cell && this.board[y] && this.board[y][x] >= 0) {
                    const crystalUrl = this.getCrystalImage(this.board[y][x]);

                    cell.style.backgroundImage = crystalUrl;
                    cell.style.backgroundSize = 'contain';
                    cell.style.backgroundPosition = 'center';
                    cell.style.backgroundRepeat = 'no-repeat';
                }
            }
        }
    }

    // Добавление очков
    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    // Проверка статуса игры
    checkGameStatus() {
        // Не проверяем статус, если игра уже неактивна
        if (!this.gameActive || this.isProcessing) {
            return;
        }

        if (this.score >= this.goal) {
            this.gameWon();
        } else if (this.moves <= 0) {
            this.gameLost();
        }
    }

    // Победа
   // async processMatchChain() {
   //     console.log('Starting match chain');
   //     let hasMatches = true;
   //     let chainLength = 0;
   //     const maxChainLength = 10;
//
   //     while (hasMatches && chainLength < maxChainLength) {
   //         chainLength++;
//
   //         const matches = this.boardSystem.findAllMatches();
//
   //         if (matches.length === 0) {
   //             hasMatches = false;
   //             break;
   //         }
//
   //         console.log(`Chain ${chainLength}: found ${matches.length} matches`);
//
   //         this.addScore(matches.length * 10 * chainLength);
//
   //         // Проверяем победу ПОСЛЕ начисления очков
   //         if (this.score >= this.goal) {
   //             console.log('Victory condition met during chain!');
   //             this.gameWon();
   //             // Прерываем цепочку, если победили
   //             this.matchChainInProgress = false;
   //             this.isProcessing = false;
   //             return;
   //         }
//
   //         await this.animateAndClearMatches(matches);
   //         this.boardSystem.applyGravity();
   //         this.boardSystem.fillEmptyCells();
   //         this.softUpdate();
//
   //         await new Promise(resolve => setTimeout(resolve, 200));
   //     }
//
   //     console.log('Match chain completed');
   //     this.matchChainInProgress = false;
   //     this.isProcessing = false;
//
   //     this.selectedCell = null;
   //     document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
//
   //     if (!this.hasAnyPossibleMove()) {
   //         console.log('No possible moves, shuffling...');
   //         this.showMessage('Нет ходов! Перемешиваем...', 'info');
   //         this.shuffleBoard();
   //     } else {
   //         this.gameActive = true;
   //     }
//
   //     // Финальная проверка статуса
   //     this.checkGameStatus();
   // }
//
    playVictorySound() {
        // Создаем простой звук с помощью Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Победоносный аккорд
        const notes = [523.25, 659.25, 783.99]; // До, Ми, Соль

        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0, 0);
            gainNode.gain.linearRampToValueAtTime(0.3, 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, 1);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(audioContext.currentTime + index * 0.1);
            oscillator.stop(audioContext.currentTime + index * 0.5);
        });
    }

// И добавьте вызов в gameWon:
    gameWon() {
        console.log('Victory! Game won with score:', this.score, 'Goal:', this.goal);

        // 1. Деактивируем игру
        this.gameActive = false;
        this.isProcessing = true;

        // 2. Блокируем все клики на поле
        this.disableBoardInteractions();

        // 3. ПОКАЗЫВАЕМ МОДАЛЬНОЕ ОКНО - УБЕДИТЕСЬ, ЧТО ЗДЕСЬ ВЫЗЫВАЕТСЯ ПРАВИЛЬНЫЙ МЕТОД
        this.showVictoryModal();  // НЕ showSimpleVictoryModal!

        // 4. Начисляем бонусные монеты
        const bonusCoins = Math.floor(this.score / 10);
        this.coins += bonusCoins;

        // 5. Обновляем UI
        this.updateUI();

        // 6. Запускаем визуальные эффекты
        this.playVictoryEffects();

        // 7. Запускаем звук
        this.playVictorySound();
    }

// Добавьте этот метод для теста
    showSimpleVictoryModal() {
        console.log('Showing simple victory modal');
        alert(`ПОБЕДА! Счет: ${this.score}`);

        // Удаляем предыдущие модальные окна
        const oldModal = document.getElementById('simpleVictoryModal');
        if (oldModal) oldModal.remove();

        // Создаем простое модальное окно
        const modal = document.createElement('div');
        modal.id = 'simpleVictoryModal';
        modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 100000;
        text-align: center;
        min-width: 300px;
        color: white;
    `;

        modal.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px;">🏆</div>
        <h1 style="font-size: 48px; margin-bottom: 20px;">ПОБЕДА!</h1>
        <div style="font-size: 24px; margin-bottom: 30px;">Счет: ${this.score}</div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="window.game.newGame(); this.parentElement.parentElement.remove();" 
                    style="padding: 15px 30px; font-size: 18px; border: none; border-radius: 10px; background: white; color: #333; cursor: pointer;">
                Новая игра
            </button>
            <button onclick="this.parentElement.parentElement.remove(); window.game.unlockBoardAfterVictory(); window.game.moves += 10; window.game.updateUI();" 
                    style="padding: 15px 30px; font-size: 18px; border: none; border-radius: 10px; background: rgba(255,255,255,0.2); color: white; cursor: pointer;">
                Продолжить (+10)
            </button>
        </div>
    `;

        document.body.appendChild(modal);
        console.log('Simple modal added to body');
    }

    // Новый метод для блокировки поля
    disableBoardInteractions() {
        console.log('Disabling board interactions');

        // Отключаем Drag & Drop
       // if (this.dragDrop) {
       //     this.dragDrop.disable();
       // }

        // Отключаем обработчики кликов на клетках
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.pointerEvents = 'none';
            cell.classList.add('disabled');
        });

        // Отключаем кнопки действий
        const actionButtons = document.querySelectorAll('.btn, .bonus-card, .size-btn, .theme-btn');
        actionButtons.forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.classList.add('disabled');
        });
    }

// Новый метод для добавления затемнения на поле
    addBoardOverlay() {
        const board = document.getElementById('gameBoard');
        if (!board) return;

        // Удаляем старый оверлей, если есть
        this.removeBoardOverlay();

        // Создаем оверлей
        const overlay = document.createElement('div');
        overlay.className = 'board-overlay victory-overlay';
        overlay.id = 'victoryOverlay';
        overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(3px);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 15px;
        animation: fadeIn 0.5s ease;
    `;

        // Добавляем мигающий текст
        const overlayText = document.createElement('div');
        overlayText.className = 'overlay-victory-text';
        overlayText.innerHTML = '🏆 ПОБЕДА! 🏆';
        overlayText.style.cssText = `
        color: gold;
        font-size: 36px;
        font-weight: bold;
        text-shadow: 0 0 20px gold;
        animation: victoryPulse 1s infinite;
    `;

        overlay.appendChild(overlayText);

        // Делаем позиционирование board относительным
        board.style.position = 'relative';
        board.appendChild(overlay);
    }

// Новый метод для удаления оверлея
    removeBoardOverlay() {
        const overlay = document.getElementById('victoryOverlay');
        if (overlay) overlay.remove();

        const board = document.getElementById('gameBoard');
        if (board) {
            board.style.position = '';
        }
    }

// Новый метод для разблокировки поля после победы
    unlockBoardAfterVictory() {
        console.log('Unlocking board after victory');

        // Убираем оверлей (но не модальное окно - оно уже закрыто)
        this.removeBoardOverlay();

        // Возвращаем активность игры
        this.gameActive = true;
        this.isProcessing = false;
        this.matchChainInProgress = false;

        // Включаем обработчики на клетках
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.pointerEvents = '';
            cell.classList.remove('disabled');
        });

        // Включаем кнопки
        const actionButtons = document.querySelectorAll('.btn, .bonus-card, .size-btn, .theme-btn');
        actionButtons.forEach(btn => {
            btn.style.pointerEvents = '';
            btn.classList.remove('disabled');
        });

        // Переинициализируем Drag&Drop
        if (this.dragDrop) {
            setTimeout(() => this.dragDrop.init(), 100);
        }

        console.log('Board unlocked');
    }




    // Новый метод для скрытия сообщения о победе
  //  hideVictoryMessage() {
  //      const messageEl = document.getElementById('gameMessage');
  //      if (messageEl) {
  //          messageEl.innerHTML = '';
  //          messageEl.className = 'game-message';
  //      }
//
  //      // Удаляем конфетти
  //      const confetti = document.querySelectorAll('.confetti-piece');
  //      confetti.forEach(piece => piece.remove());
  //  }

// Новый метод для создания конфетти
    createConfetti(count = 50) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#feca57', '#ff9ff3'];

        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';

            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = 3 + Math.random() * 2;
            const size = 5 + Math.random() * 10;

            confetti.style.cssText = `
            position: fixed;
            left: ${left}vw;
            top: -20px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            opacity: ${0.5 + Math.random() * 0.5};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            transform: rotate(${Math.random() * 360}deg);
            animation: confetti-fall ${duration}s ease-in forwards;
            animation-delay: ${delay}s;
            z-index: 10000;
            pointer-events: none;
        `;

            document.body.appendChild(confetti);

            setTimeout(() => {
                if (confetti.parentNode) confetti.remove();
            }, (duration + delay) * 1000);
        }
    }


// Новый метод для визуальных эффектов победы
    playVictoryEffects() {
        // Подсвечиваем все клетки
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            setTimeout(() => {
                cell.style.transform = 'scale(1.1)';
                cell.style.filter = 'brightness(1.3)';

                setTimeout(() => {
                    cell.style.transform = '';
                    cell.style.filter = '';
                }, 200);
            }, index * 20);
        });

        // Мигаем статистикой
        const stats = document.querySelectorAll('.stat-value');
        stats.forEach(stat => {
            stat.style.transition = 'all 0.2s ease';
            stat.style.transform = 'scale(1.2)';
            stat.style.color = 'gold';

            setTimeout(() => {
                stat.style.transform = '';
                stat.style.color = '';
            }, 1000);
        });

        // Показываем всплывающее сообщение с бонусом
        this.showFloatingBonus(`+${Math.floor(this.score / 10)} 🪙`);
    }

// Новый метод для всплывающего бонуса
    showFloatingBonus(text) {
        const board = document.getElementById('gameBoard');
        if (!board) return;

        const bonus = document.createElement('div');
        bonus.className = 'floating-bonus';
        bonus.textContent = text;
        bonus.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: gold;
        color: #333;
        font-size: 24px;
        font-weight: bold;
        padding: 15px 30px;
        border-radius: 50px;
        box-shadow: 0 0 30px gold;
        z-index: 2000;
        animation: float-up 2s ease-out forwards;
        pointer-events: none;
    `;

        board.appendChild(bonus);

        setTimeout(() => {
            if (bonus.parentNode) bonus.remove();
        }, 2000);
    }

    // Поражение
    gameLost() {
        console.log('Game lost!');

        this.gameActive = false;
        this.isProcessing = true;

        // Блокируем поле
        this.disableBoardInteractions();

        if (this.lives > 0) {
            this.lives--;
        }

        this.updateUI();

        // Показываем модальное окно поражения
        this.showDefeatModal();
    }

    // Новый метод для модального окна победы
    showVictoryModal() {
        console.log('showVictoryModal called', this.score, this.goal);

        // Удаляем старое модальное окно, если есть
        this.removeModal();
        console.log('Modal removed');

        // Создаем затемненный фон
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'gameModalOverlay';

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'game-modal victory-modal';
        modal.id = 'gameModal';

        // Наполнение модального окна
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon">🏆</div>
            <h2 class="modal-title">ПОБЕДА!</h2>
            <div class="modal-stats">
                <div class="modal-stat">
                    <span class="modal-stat-label">Счет:</span>
                    <span class="modal-stat-value">${this.score}</span>
                </div>
                <div class="modal-stat">
                    <span class="modal-stat-label">Цель:</span>
                    <span class="modal-stat-value">${this.goal}</span>
                </div>
                <div class="modal-stat bonus-stat">
                    <span class="modal-stat-label">Бонус:</span>
                    <span class="modal-stat-value">+${Math.floor(this.score / 10)} 🪙</span>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-primary" id="victoryNewGameBtn">Новая игра</button>
                <button class="modal-btn modal-btn-secondary" id="victoryContinueBtn">Продолжить</button>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        console.log('Modal appended to body');

        // Добавляем конфетти
        this.createConfetti(100);

        // Назначаем обработчики
        const newGameBtn = document.getElementById('victoryNewGameBtn');
        const continueBtn = document.getElementById('victoryContinueBtn');

        console.log('Buttons found:', {newGameBtn, continueBtn});

        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                console.log('New game button clicked');
                this.removeModal();
                this.unlockBoardAfterVictory();
                this.newGame();
            });
        }

        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                console.log('Continue button clicked');
                this.removeModal();
                this.unlockBoardAfterVictory();
                this.moves += 10;
                this.updateUI();
                this.showMessage('+10 ходов!', 'success');
            });
        }
    }

// Новый метод для модального окна поражения
    showDefeatModal() {
        // Удаляем старое модальное окно, если есть
        this.removeModal();

        // Создаем затемненный фон
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'gameModalOverlay';

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'game-modal defeat-modal';
        modal.id = 'gameModal';

        // Наполнение модального окна
        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon">💔</div>
            <h2 class="modal-title">ПОРАЖЕНИЕ</h2>
            <div class="modal-stats">
                <div class="modal-stat">
                    <span class="modal-stat-label">Счет:</span>
                    <span class="modal-stat-value">${this.score}</span>
                </div>
                <div class="modal-stat">
                    <span class="modal-stat-label">Цель:</span>
                    <span class="modal-stat-value">${this.goal}</span>
                </div>
                <div class="modal-stat">
                    <span class="modal-stat-label">Осталось жизней:</span>
                    <span class="modal-stat-value">❤️ ${this.lives}</span>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-primary" id="defeatNewGameBtn">Новая игра</button>
                <button class="modal-btn modal-btn-secondary" id="defeatBuyMovesBtn">Купить ходы</button>
            </div>
        </div>
    `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Назначаем обработчики
        document.getElementById('defeatNewGameBtn').addEventListener('click', () => {
            this.removeModal();
            this.unlockBoardAfterVictory();
            this.newGame();
        });

        document.getElementById('defeatBuyMovesBtn').addEventListener('click', () => {
            this.removeModal();
            this.unlockBoardAfterVictory();
            this.buyMoves();
        });
    }

    // Метод для удаления модального окна
    removeModal() {
        const overlay = document.getElementById('gameModalOverlay');
        if (overlay) overlay.remove();

        // Удаляем конфетти
        const confetti = document.querySelectorAll('.confetti-piece');
        confetti.forEach(piece => piece.remove());
    }



// Новый метод для оверлея поражения
    addDefeatOverlay() {
        const board = document.getElementById('gameBoard');
        if (!board) return;

        this.removeBoardOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'board-overlay defeat-overlay';
        overlay.id = 'defeatOverlay';
        overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(3px);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 15px;
        animation: fadeIn 0.5s ease;
    `;

        const overlayText = document.createElement('div');
        overlayText.className = 'overlay-defeat-text';
        overlayText.innerHTML = '💔 ПОРАЖЕНИЕ 💔';
        overlayText.style.cssText = `
        color: #ff6b6b;
        font-size: 36px;
        font-weight: bold;
        text-shadow: 0 0 20px #ff6b6b;
        animation: defeatPulse 1s infinite;
    `;

        overlay.appendChild(overlayText);

        board.style.position = 'relative';
        board.appendChild(overlay);
    }

    removeDefeatOverlay() {
        const overlay = document.getElementById('defeatOverlay');
        if (overlay) overlay.remove();
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
        const moves = { 6: 20, 8: 30, 10: 40 };
        return moves[this.boardSize] || 30;
    }

    // Получение цели для размера поля
    getGoalForSize() {
        const goals = { 6: 500, 8: 1000, 10: 2500 };
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