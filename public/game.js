class Match3Game {
    constructor() {
        if (typeof api === 'undefined') {
            console.error('API не загружен! Ждем...');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.api = api;
        this.boardSystem = new Board(this);
        this.bonusSystem = new BonusSystem(this);

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
        this.gameActive = true;
        this.lifeTimer = null;
        this.animations = new AnimationManager(this);
        this.dragDrop = null;
        this.isInitialized = false;
        this.isProcessing = false; // Флаг для предотвращения множественных вызовов

        console.log('Match3Game создан');
        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        console.log('init() начат');
        this.isInitialized = true;

        const username = 'player_' + Math.floor(Math.random() * 1000);
        await this.api.login(username);
        await this.loadGameState();

        this.createBoard();
        this.startLifeTimer();

        this.dragDrop = new DragDropManager(this);
        this.render();
        this.setupEventListeners();

        console.log('init() завершен');
    }

    async loadGameState() {
        const result = await this.api.getGameState();
        if (result.success) {
            this.lives = result.data.lives;
            this.coins = result.data.coins;
            this.inventory = result.data.inventory || this.inventory;

            if (result.data.recoveredLives > 0) {
                this.showMessage(`Восстановлено ${result.data.recoveredLives} ❤️`, 'info');
            }
        }
    }

    createBoard() {
        this.board = this.boardSystem.createBoard(this.boardSize);
    }

    // Главный метод для обмена
    trySwap(x1, y1, x2, y2) {
        // Проверяем, можно ли обменять
        if (!this.boardSystem.hasMatchesAfterSwap(x1, y1, x2, y2)) {
            this.showMessage('Нет совпадений!', 'error');
            return;
        }

        if (this.animations.isAnimating || this.isProcessing) {
            console.log('Анимация уже идет, ждем');
            return;
        }

        this.isProcessing = true;
        console.log('Начинаем обмен', x1, y1, '->', x2, y2);

        // Уменьшаем ходы
        this.moves--;
        this.updateUI();

        // Анимируем обмен
        this.animations.animateSwap(x1, y1, x2, y2, () => {
            // После обмена проверяем совпадения
            this.processMatchesAfterSwap();
        });
    }

    processMatchesAfterSwap() {
        const matches = this.boardSystem.findAllMatches();

        if (matches.length === 0) {
            console.log('Нет совпадений, завершаем цепочку');
            this.isProcessing = false;
            this.checkGameStatus();
            this.render();
            return;
        }

        console.log('Найдены совпадения:', matches.length);

        // Начисляем очки
        this.addScore(matches.length * 10);

        // Анимируем уничтожение
        this.animations.animateDestroy(matches, () => {
            console.log('Уничтожение завершено, помечаем клетки как пустые');

            // Помечаем как пустые
            matches.forEach(({ x, y }) => {
                this.board[y][x] = -1;
            });

            // Подготавливаем падение
            const fallData = this.prepareFallAnimation();
            console.log('Подготовлены падения:', fallData.length);

            if (fallData.length === 0) {
                console.log('Нет падений, проверяем новые совпадения');
                setTimeout(() => {
                    this.processMatchesAfterSwap();
                }, 50);
                return;
            }

            // Анимируем падение
            this.animations.animateFall(fallData, () => {
                console.log('Падение завершено, callback вызван');

                // Применяем гравитацию
                this.boardSystem.applyGravity();

                // ВАЖНО: проверяем новые совпадения после падения
                console.log('Проверяем новые совпадения после падения');
                setTimeout(() => {
                    this.processMatchesAfterSwap();
                }, 50);
            });
        });
    }

    // ОБНОВЛЕННЫЙ метод prepareFallAnimation
    prepareFallAnimation() {
        const fallData = [];

        for (let x = 0; x < this.boardSize; x++) {
            let emptySpaces = 0;

            // Сначала считаем пустые места снизу вверх
            for (let y = this.boardSize - 1; y >= 0; y--) {
                if (this.board[y][x] === -1) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Этот кристалл должен упасть вниз
                    fallData.push({
                        fromY: y,
                        toY: y + emptySpaces,
                        x: x,
                        color: this.board[y][x]
                    });

                    // Временно помечаем как пустой, чтобы вышележащие тоже упали
                    this.board[y][x] = -1;
                }
            }

            // Заполняем сверху новыми кристаллами
            for (let y = 0; y < emptySpaces; y++) {
                this.board[y][x] = Math.floor(Math.random() * 6);
            }
        }

        console.log('Создано падений:', fallData.length);
        return fallData;
    }


    // НОВЫЙ метод для принудительной проверки совпадений
    checkForMatches() {
        const matches = this.boardSystem.findAllMatches();

        if (matches.length > 0) {
            console.log('Найдены новые совпадения при проверке');
            this.processMatchesAfterSwap();
            return true;
        }

        return false;
    }

    checkGameStatus() {
        if (this.score >= this.goal) {
            this.gameWon();
        } else if (this.moves <= 0) {
            this.gameLost();
        } else {
            this.gameActive = true;
            this.isProcessing = false;
        }
        this.updateUI();
    }

    async gameWon() {
        this.gameActive = false;
        this.showMessage('Победа! 🎉', 'success');

        await this.api.saveGameResult(this.score, true);
        this.coins += Math.floor(this.score / 10);
        this.updateUI();

        setTimeout(() => {
            this.gameActive = true;
            this.isProcessing = false;
        }, 2000);
    }

    async gameLost() {
        this.gameActive = false;

        if (this.lives > 0) {
            this.lives--;
            this.showMessage(`Вы проиграли! Осталось ❤️ ${this.lives}`, 'error');
            await this.api.saveGameResult(this.score, false);
        }

        this.updateUI();

        setTimeout(() => {
            this.gameActive = true;
            this.isProcessing = false;
        }, 2000);
    }

    addScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }

    newGame() {
        if (this.lives <= 0) {
            this.showMessage('Нет жизней! Подождите восстановления', 'error');
            return;
        }

        this.createBoard();
        this.score = 0;
        this.moves = this.getMovesForSize();
        this.goal = this.getGoalForSize();
        this.gameActive = true;
        this.isProcessing = false;
        this.selectedCell = null;
        this.render();
    }

    render() {
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) return;

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

                if (this.board[y][x] >= 0) {
                    const crystalUrl = themeManager.getCrystalImage(this.board[y][x]);
                    cell.style.backgroundImage = crystalUrl;
                    cell.style.backgroundSize = 'contain';
                    cell.style.backgroundPosition = 'center';
                    cell.style.backgroundRepeat = 'no-repeat';
                } else {
                    cell.style.background = 'rgba(0,0,0,0.1)';
                }

                grid.appendChild(cell);
            }
        }

        boardElement.appendChild(grid);
        this.updateUI();

        if (this.dragDrop) {
            setTimeout(() => this.dragDrop.init(), 50);
        }
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('goal').textContent = this.goal;
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('coins').textContent = `💰 ${this.coins}`;

        document.getElementById('lightningCount').textContent = this.inventory.lightning || 0;
        document.getElementById('crossCount').textContent = this.inventory.cross || 0;
        document.getElementById('bombCount').textContent = this.inventory.bomb || 0;
        document.getElementById('rainbowCount').textContent = this.inventory.rainbow || 0;
    }

    getMovesForSize() {
        const moves = { 6: 15, 8: 20, 10: 30 };
        return moves[this.boardSize];
    }

    getGoalForSize() {
        const goals = { 6: 300, 8: 500, 10: 800 };
        return goals[this.boardSize];
    }

    startLifeTimer() {
        this.lifeTimer = setInterval(() => {
            // Здесь будет логика восстановления жизней
        }, 1000);
    }

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('gameMessage');
        messageEl.textContent = text;
        messageEl.className = `game-message ${type}`;

        setTimeout(() => {
            messageEl.textContent = '';
            messageEl.className = 'game-message';
        }, 3000);
    }

    setupEventListeners() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.boardSize = parseInt(e.target.dataset.size);
                this.newGame();
            };
        });

        document.querySelectorAll('.bonus-card').forEach(card => {
            card.onclick = () => {
                const bonusType = card.dataset.bonus;
                this.useBonus(bonusType);
            };
        });

        document.getElementById('newGameBtn').onclick = () => this.newGame();
        document.getElementById('buyMovesBtn').onclick = () => this.buyMoves();
    }

    async useBonus(type) {
        if (!this.gameActive || this.lives <= 0) {
            this.showMessage('Игра не активна', 'error');
            return;
        }

        if (this.inventory[type] <= 0) {
            this.showMessage('Нет бонуса в инвентаре', 'error');
            return;
        }

        if (!this.selectedCell) {
            this.showMessage('Выберите клетку', 'error');
            return;
        }

        // ... остальная логика бонусов
    }

    async buyBonus(type) {
        const prices = {
            lightning: 150,
            cross: 250,
            bomb: 100,
            rainbow: 200
        };

        if (this.coins < prices[type]) {
            this.showMessage('Недостаточно монет', 'error');
            return;
        }

        const result = await this.api.buyBonus(type, prices[type]);
        if (result.success) {
            this.coins -= prices[type];
            this.inventory[type]++;
            this.showMessage('Бонус куплен!', 'success');
            this.updateUI();
        }
    }

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
}


class DragDropManager {
    constructor(game) {
        console.log('DragDropManager создан');
        this.game = game;
        this.isDragging = false;
        this.dragStart = null;
        this.dragClone = null;
        this.clickTimer = null;
        this.clickThreshold = 200;

        // Привязываем методы к контексту
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    init() {
        console.log('DragDropManager.init() вызван');

        // Удаляем старые обработчики
        this.removeAllListeners();

        const cells = document.querySelectorAll('.cell');
        console.log('Найдено клеток:', cells.length);

        cells.forEach(cell => {
            // Добавляем обработчики
            cell.addEventListener('mousedown', this.handleMouseDown);

            // Визуальная подсказка
            cell.style.cursor = 'pointer';
        });

        // Добавляем глобальные обработчики для отслеживания движения и отпускания
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    removeAllListeners() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.removeEventListener('mousedown', this.handleMouseDown);
        });
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }

    handleMouseDown(e) {
        const cell = e.target.closest('.cell');
        if (!cell) {
            console.log('mousedown не на клетке');
            return;
        }

        console.log('mousedown на клетке', cell.dataset);
        e.preventDefault();

        if (this.game.animations.isAnimating || !this.game.gameActive || this.game.lives <= 0) {
            console.log('Блокировка: анимация или неактивна игра');
            return;
        }

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        this.dragStart = {
            x, y, cell,
            startX: e.clientX,
            startY: e.clientY,
            time: Date.now()
        };

        // Небольшая задержка для определения клика vs драга
        this.clickTimer = setTimeout(() => {
            if (this.dragStart && !this.isDragging) {
                console.log('Начинаем драг по таймеру');
                this.startDragging(e, cell);
            }
        }, this.clickThreshold);

        cell.classList.add('potential-drag');
    }

    handleMouseMove(e) {
        if (!this.dragStart || this.game.animations.isAnimating) return;

        // Если еще не драг, проверяем смещение
        if (!this.isDragging) {
            const dx = Math.abs(e.clientX - this.dragStart.startX);
            const dy = Math.abs(e.clientY - this.dragStart.startY);

            // Если сдвинули мышь больше чем на 10px - начинаем драг сразу
            if (dx > 10 || dy > 10) {
                console.log('Начинаем драг по смещению');
                clearTimeout(this.clickTimer);
                this.startDragging(e, this.dragStart.cell);
            }
            return;
        }

        // Если уже драг - двигаем клон
        e.preventDefault();
        if (this.dragClone) {
            this.dragClone.style.left = (e.clientX - 30) + 'px';
            this.dragClone.style.top = (e.clientY - 30) + 'px';

            // Подсвечиваем клетку под курсором
            this.highlightDropTarget(e);
        }
    }

    handleMouseUp(e) {
        if (!this.dragStart) return;

        console.log('mouseup', { isDragging: this.isDragging });
        clearTimeout(this.clickTimer);

        // Если это был клик (не драг)
        if (!this.isDragging) {
            this.handleClick(this.dragStart.cell);
        } else {
            // Если был драг
            this.handleDrop(e);
        }

        this.cleanupDrag();
    }

    handleClick(cell) {
        console.log('handleClick на клетке', cell.dataset);

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        // Логика выбора клетки
        if (!this.game.selectedCell) {
            // Первый клик - выбираем клетку
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            this.game.selectedCell = { x, y };
            console.log('Выбрана клетка:', x, y);
        } else {
            // Второй клик - пробуем обменять
            const x1 = this.game.selectedCell.x;
            const y1 = this.game.selectedCell.y;

            console.log('Обмен между:', x1, y1, 'и', x, y);

            // Проверяем соседство
            const dx = Math.abs(x - x1);
            const dy = Math.abs(y - y1);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                this.game.trySwap(x1, y1, x, y);
            } else {
                console.log('Не соседние клетки');
                // Если не соседние - просто выбираем новую
                document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                this.game.selectedCell = { x, y };
            }

            // Не снимаем выделение сразу - это сделает trySwap если нужно
        }
    }

    handleDrop(e) {
        console.log('handleDrop');

        // Находим клетку под мышкой
        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY);
        const dropCell = elementsUnderMouse.find(el => el.classList.contains('cell'));

        if (dropCell && dropCell !== this.dragStart.cell) {
            const targetX = parseInt(dropCell.dataset.x);
            const targetY = parseInt(dropCell.dataset.y);
            const startX = this.dragStart.x;
            const startY = this.dragStart.y;

            console.log('Дроп на клетку:', targetX, targetY);

            // Проверяем соседство
            const dx = Math.abs(targetX - startX);
            const dy = Math.abs(targetY - startY);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                this.game.trySwap(startX, startY, targetX, targetY);
            } else {
                console.log('Не соседние клетки для дропа');
            }
        } else {
            console.log('Дроп не на клетку');
        }
    }

    startDragging(e, cell) {
        this.isDragging = true;
        this.createDragClone(cell, e);
        cell.classList.add('dragging');

        // Убираем выделение, если было
        if (this.game.selectedCell) {
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            this.game.selectedCell = null;
        }
    }

    createDragClone(cell, e) {
        if (this.dragClone) {
            this.dragClone.remove();
        }

        this.dragClone = cell.cloneNode(true);
        this.dragClone.classList.add('drag-clone');
        this.dragClone.style.position = 'fixed';
        this.dragClone.style.left = (e.clientX - 30) + 'px';
        this.dragClone.style.top = (e.clientY - 30) + 'px';
        this.dragClone.style.width = '60px';
        this.dragClone.style.height = '60px';
        this.dragClone.style.zIndex = '2000';
        this.dragClone.style.opacity = '0.9';
        this.dragClone.style.transform = 'scale(1.1)';
        this.dragClone.style.cursor = 'grabbing';
        this.dragClone.style.pointerEvents = 'none';
        this.dragClone.style.transition = 'none';

        document.body.appendChild(this.dragClone);
    }

    highlightDropTarget(e) {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('drop-target'));

        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY);
        const dropCell = elementsUnderMouse.find(el => el.classList.contains('cell'));

        if (dropCell && dropCell !== this.dragStart?.cell) {
            const x = parseInt(dropCell.dataset.x);
            const y = parseInt(dropCell.dataset.y);
            const startX = this.dragStart.x;
            const startY = this.dragStart.y;

            const dx = Math.abs(x - startX);
            const dy = Math.abs(y - startY);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                dropCell.classList.add('drop-target');
            }
        }
    }

    cleanupDrag() {
        this.isDragging = false;

        if (this.dragClone) {
            this.dragClone.remove();
            this.dragClone = null;
        }

        document.querySelectorAll('.cell').forEach(c => {
            c.classList.remove('dragging', 'potential-drag', 'drop-target');
        });

        this.dragStart = null;
    }
}

// Запуск игры при загрузке страницы
window.onload = () => {
    window.game = new Match3Game();
};