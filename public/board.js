// Board.js - исправленная версия

class Board {
    constructor(game) {
        this.game = game;
        this.boardSize = game.boardSize;
        this.board = [];
    }

    createBoard(size) {
        this.boardSize = size;
        this.board = [];

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
        const maxAttempts = 100; // Защита от бесконечного цикла

        while (matches.length > 0 && attempts < maxAttempts) {
            attempts++;

            // Заменяем совпадающие кристаллы на случайные
            matches.forEach(({x, y}) => {
                this.board[y][x] = Math.floor(Math.random() * 6);
            });

            // Проверяем снова
            matches = this.findAllMatches();
        }

        if (attempts >= maxAttempts) {
            console.warn('Max attempts reached in removeInitialMatches');
        }
    }

    findAllMatches() {
        const matches = [];
        const size = this.boardSize;
        const matched = new Set(); // Для избежания дубликатов

        // Проверка горизонтальных линий
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 2; x++) {
                const val = this.board[y][x];
                if (val === -1) continue;

                // Ищем линию минимум из 3 одинаковых
                let length = 1;
                while (x + length < size && this.board[y][x + length] === val) {
                    length++;
                }

                if (length >= 3) {
                    // Добавляем все клетки линии
                    for (let i = 0; i < length; i++) {
                        const key = `${x + i},${y}`;
                        if (!matched.has(key)) {
                            matched.add(key);
                            matches.push({x: x + i, y});
                        }
                    }
                }
                x += length - 1; // Пропускаем обработанные
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
        // Временно меняем
        this.swap(x1, y1, x2, y2);

        // Проверяем совпадения
        const matches = this.findAllMatches();

        // Возвращаем обратно
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
            // Собираем все непустые значения в столбце
            const column = [];
            for (let y = 0; y < this.boardSize; y++) {
                if (this.board[y][x] !== -1) {
                    column.push(this.board[y][x]);
                }
            }

            // Заполняем снизу вверх
            for (let y = this.boardSize - 1; y >= 0; y--) {
                const index = y - (this.boardSize - column.length);
                if (index >= 0) {
                    this.board[y][x] = column[index];
                } else {
                    this.board[y][x] = -1; // Пустота сверху
                }
            }
        }
    }

    // ИСПРАВЛЕНО: заполнение пустот новыми кристаллами БЕЗ создания новых совпадений
    fillEmptyCells() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === -1) {
                    // Генерируем кристалл, который не создает совпадений
                    this.board[y][x] = this.getSafeCrystal(x, y);
                }
            }
        }
    }

    // ИСПРАВЛЕНО: генерация безопасного кристалла
    getSafeCrystal(x, y) {
        const possibleValues = [0, 1, 2, 3, 4, 5];
        const safeValues = [];

        // Проверяем каждый возможный цвет
        for (const value of possibleValues) {
            // Временно ставим значение
            this.board[y][x] = value;

            // Проверяем, создает ли это значение совпадения
            const matches = this.findMatchesAt(x, y);

            if (matches.length === 0) {
                safeValues.push(value);
            }
        }

        // Если есть безопасные значения, выбираем случайное
        if (safeValues.length > 0) {
            const randomIndex = Math.floor(Math.random() * safeValues.length);
            return safeValues[randomIndex];
        }

        // Если все значения создают совпадения (редкий случай), возвращаем случайное
        console.warn('No safe values found for position', x, y);
        return Math.floor(Math.random() * 6);
    }

    // Находит совпадения только для конкретной клетки
    findMatchesAt(x, y) {
        const matches = [];
        const value = this.board[y][x];
        if (value === -1) return matches;

        // Проверка горизонтали
        let horizontalLength = 1;

        // Влево
        for (let i = x - 1; i >= 0; i--) {
            if (this.board[y][i] === value) {
                horizontalLength++;
            } else {
                break;
            }
        }

        // Вправо
        for (let i = x + 1; i < this.boardSize; i++) {
            if (this.board[y][i] === value) {
                horizontalLength++;
            } else {
                break;
            }
        }

        if (horizontalLength >= 3) {
            matches.push({x, y});
        }

        // Проверка вертикали
        let verticalLength = 1;

        // Вверх
        for (let i = y - 1; i >= 0; i--) {
            if (this.board[i][x] === value) {
                verticalLength++;
            } else {
                break;
            }
        }

        // Вниз
        for (let i = y + 1; i < this.boardSize; i++) {
            if (this.board[i][x] === value) {
                verticalLength++;
            } else {
                break;
            }
        }

        if (verticalLength >= 3) {
            matches.push({x, y});
        }

        return matches;
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