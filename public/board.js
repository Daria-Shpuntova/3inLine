// Board.js - исправленная версия с поддержкой тем

class Board {
    constructor(game) {
        this.game = game;
        this.boardSize = game.boardSize;
        this.board = [];
        this.selectedCell = null; // Добавляем выделенную ячейку
    }

    createBoard(size) {
        this.boardSize = size;
        this.board = [];
        this.selectedCell = null; // Сбрасываем выделение

        // Создаем поле со случайными кристаллами
        for (let y = 0; y < size; y++) {
            this.board[y] = [];
            for (let x = 0; x < size; x++) {
                this.board[y][x] = Math.floor(Math.random() * 6);
            }
        }

        // Убираем начальные совпадения
        this.removeInitialMatches();

        return this.board;
    }

    removeInitialMatches() {
        let matches = this.findAllMatches();
        let attempts = 0;
        const maxAttempts = 100;

        while (matches.length > 0 && attempts < maxAttempts) {
            attempts++;

            matches.forEach(({x, y}) => {
                this.board[y][x] = Math.floor(Math.random() * 6);
            });

            matches = this.findAllMatches();
        }

        if (attempts >= maxAttempts) {
            console.warn('Max attempts reached in removeInitialMatches');
        }
    }

    findAllMatches() {
        const matches = [];
        const size = this.boardSize;
        const matched = new Set();

        // Проверка горизонтальных линий
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 2; x++) {
                const val = this.board[y][x];
                if (val === -1) continue;

                let length = 1;
                while (x + length < size && this.board[y][x + length] === val) {
                    length++;
                }

                if (length >= 3) {
                    for (let i = 0; i < length; i++) {
                        const key = `${x + i},${y}`;
                        if (!matched.has(key)) {
                            matched.add(key);
                            matches.push({x: x + i, y});
                        }
                    }
                }
                x += length - 1;
            }
        }

        // Проверка вертикальных линий
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size - 2; y++) {
                const val = this.board[y][x];
                if (val === -1) continue;

                let length = 1;
                while (y + length < size && this.board[y + length][x] === val) {
                    length++;
                }

                if (length >= 3) {
                    for (let i = 0; i < length; i++) {
                        const key = `${x},${y + i}`;
                        if (!matched.has(key)) {
                            matched.add(key);
                            matches.push({x, y: y + i});
                        }
                    }
                }
                y += length - 1;
            }
        }

        return matches;
    }

    hasMatchesAfterSwap(x1, y1, x2, y2) {
        this.swap(x1, y1, x2, y2);
        const matches = this.findAllMatches();
        this.swap(x1, y1, x2, y2);
        return matches.length > 0;
    }

    swap(x1, y1, x2, y2) {
        const temp = this.board[y1][x1];
        this.board[y1][x1] = this.board[y2][x2];
        this.board[y2][x2] = temp;
    }

    applyGravity() {
        for (let x = 0; x < this.boardSize; x++) {
            const column = [];
            for (let y = 0; y < this.boardSize; y++) {
                if (this.board[y][x] !== -1) {
                    column.push(this.board[y][x]);
                }
            }

            for (let y = this.boardSize - 1; y >= 0; y--) {
                const index = y - (this.boardSize - column.length);
                if (index >= 0) {
                    this.board[y][x] = column[index];
                } else {
                    this.board[y][x] = -1;
                }
            }
        }
    }

    fillEmptyCells() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === -1) {
                    this.board[y][x] = this.getSafeCrystal(x, y);
                }
            }
        }
    }

    getSafeCrystal(x, y) {
        const possibleValues = [0, 1, 2, 3, 4, 5];
        const safeValues = [];

        for (const value of possibleValues) {
            this.board[y][x] = value;
            const matches = this.findMatchesAt(x, y);

            if (matches.length === 0) {
                safeValues.push(value);
            }
        }

        if (safeValues.length > 0) {
            const randomIndex = Math.floor(Math.random() * safeValues.length);
            return safeValues[randomIndex];
        }

        console.warn('No safe values found for position', x, y);
        return Math.floor(Math.random() * 6);
    }

    findMatchesAt(x, y) {
        const matches = [];
        const value = this.board[y][x];
        if (value === -1) return matches;

        // Проверка горизонтали
        let horizontalLength = 1;

        for (let i = x - 1; i >= 0; i--) {
            if (this.board[y][i] === value) horizontalLength++;
            else break;
        }

        for (let i = x + 1; i < this.boardSize; i++) {
            if (this.board[y][i] === value) horizontalLength++;
            else break;
        }

        if (horizontalLength >= 3) {
            matches.push({x, y});
        }

        // Проверка вертикали
        let verticalLength = 1;

        for (let i = y - 1; i >= 0; i--) {
            if (this.board[i][x] === value) verticalLength++;
            else break;
        }

        for (let i = y + 1; i < this.boardSize; i++) {
            if (this.board[i][x] === value) verticalLength++;
            else break;
        }

        if (verticalLength >= 3) {
            matches.push({x, y});
        }

        return matches;
    }

    // ============= НОВЫЕ МЕТОДЫ ДЛЯ ОТРИСОВКИ =============

    // Отрисовка всего поля
    render() {
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) return;

        // Создаем сетку
        const gridElement = document.createElement('div');
        gridElement.className = 'board-grid';
        gridElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gridElement.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;

        // Отрисовываем каждую клетку
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = this.createCellElement(x, y);
                gridElement.appendChild(cell);
            }
        }

        // Очищаем и добавляем новую сетку
        boardElement.innerHTML = '';
        boardElement.appendChild(gridElement);
    }

    // Создание элемента клетки
    createCellElement(x, y) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = y;
        cell.dataset.col = x;

        // Получаем значение кристалла
        const crystalValue = this.board[y][x];

        // Применяем стили из темы
        if (window.themeManager) {
            // Фон кристалла
            if (crystalValue !== -1) {
                cell.style.background = window.themeManager.getCrystalImage(crystalValue);
                cell.style.backgroundSize = 'cover';
                cell.style.backgroundPosition = 'center';

                // Тень из темы
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            } else {
                // Пустая клетка
                cell.style.background = 'rgba(0,0,0,0.1)';
                cell.style.border = '1px dashed rgba(255,255,255,0.2)';
            }
        } else {
            // Запасной вариант без темы
            if (crystalValue !== -1) {
                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
                cell.style.background = colors[crystalValue] || '#ddd';
            }
        }

        // Добавляем класс выделения
        if (this.selectedCell &&
            this.selectedCell.x === x &&
            this.selectedCell.y === y) {
            cell.classList.add('selected');

            // Добавляем свечение из темы
            if (window.themeManager) {
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = `0 0 20px ${theme.effects.glowColor}`;
            }
        }

        // Добавляем обработчики событий для drag & drop
        this.addCellEventListeners(cell, x, y);

        return cell;
    }

    // Обновление конкретной клетки
    updateCell(x, y) {
        const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
        if (!cell) return;

        const crystalValue = this.board[y][x];

        if (window.themeManager) {
            if (crystalValue !== -1) {
                cell.style.background = window.themeManager.getCrystalImage(crystalValue);
                cell.style.backgroundSize = 'cover';
                cell.style.backgroundPosition = 'center';

                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            } else {
                cell.style.background = 'rgba(0,0,0,0.1)';
                cell.style.border = '1px dashed rgba(255,255,255,0.2)';
            }
        }
    }

    // Обновление всех клеток (при смене темы)
    updateAllCells() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                this.updateCell(x, y);
            }
        }

        // Обновляем выделение если есть
        if (this.selectedCell) {
            this.selectCell(this.selectedCell.x, this.selectedCell.y);
        }
    }

    // Выделение клетки
    selectCell(x, y) {
        // Снимаем выделение со всех
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected');

            // Возвращаем обычную тень
            if (window.themeManager) {
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            }
        });

        // Выделяем новую
        const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
        if (cell) {
            cell.classList.add('selected');

            // Добавляем свечение
            if (window.themeManager) {
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = `0 0 20px ${theme.effects.glowColor}`;
            }

            this.selectedCell = { x, y };
        }
    }

    // Снять выделение
    deselectAll() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected');

            if (window.themeManager) {
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            }
        });
        this.selectedCell = null;
    }

    // Добавление обработчиков событий для клетки
    addCellEventListeners(cell, x, y) {
        // Для drag & drop (если используется DragDropManager)
        cell.addEventListener('mousedown', (e) => {
            if (window.dragDropManager) {
                window.dragDropManager.handleMouseDown(e, x, y);
            }
        });

        cell.addEventListener('mouseenter', (e) => {
            if (window.dragDropManager && window.dragDropManager.isDragging) {
                window.dragDropManager.handleMouseEnter(e, x, y);
            }
        });

        cell.addEventListener('mouseup', (e) => {
            if (window.dragDropManager) {
                window.dragDropManager.handleMouseUp(e, x, y);
            }
        });

        // Простой клик для выделения
        cell.addEventListener('click', (e) => {
            if (!window.dragDropManager || !window.dragDropManager.isDragging) {
                // Если есть выделенная клетка и это не та же самая
                if (this.selectedCell) {
                    const prevX = this.selectedCell.x;
                    const prevY = this.selectedCell.y;

                    // Проверяем соседние клетки
                    const isAdjacent = (Math.abs(prevX - x) === 1 && prevY === y) ||
                        (Math.abs(prevY - y) === 1 && prevX === x);

                    if (isAdjacent) {
                        // Пытаемся обменять
                        this.game.handleCellClick(prevX, prevY, x, y);
                        this.deselectAll();
                    } else {
                        // Выделяем новую клетку
                        this.selectCell(x, y);
                    }
                } else {
                    // Выделяем клетку
                    this.selectCell(x, y);
                }
            }
        });
    }

    // Подсветка совпадений (для анимации)
    highlightMatches(matches) {
        matches.forEach(({x, y}) => {
            const cell = document.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
            if (cell) {
                cell.classList.add('match-highlight');
                setTimeout(() => {
                    cell.classList.remove('match-highlight');
                }, 300);
            }
        });
    }

    // Визуализация поля для отладки
    printBoard() {
        console.log('Board state:');
        for (let y = 0; y < this.boardSize; y++) {
            let row = '';
            for (let x = 0; x < this.boardSize; x++) {
                row += (this.board[y][x] === -1 ? '.' : this.board[y][x]) + ' ';
            }
            console.log(row);
        }
    }
}