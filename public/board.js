class Board {
    constructor(game) {
        this.game = game;
        this.board = [];
        this.selectedCell = null;
    }

    // Создание нового поля
    createBoard(size = 8) {
        this.board = [];
        for (let y = 0; y < size; y++) {
            this.board[y] = [];
            for (let x = 0; x < size; x++) {
                this.board[y][x] = Math.floor(Math.random() * 6);
            }
        }
        this.removeInitialMatches();
        return this.board;
    }

    // Удаление начальных совпадений
    removeInitialMatches() {
        let matches;
        do {
            matches = this.findAllMatches();
            if (matches.length > 0) {
                this.replaceMatches(matches);
            }
        } while (matches.length > 0);
    }

    // Поиск всех совпадений
    findAllMatches() {
        const matches = new Set();
        const size = this.game.boardSize;

        // Горизонтальные
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 2; x++) {
                const val = this.board[y][x];
                if (val !== -1 && val === this.board[y][x + 1] && val === this.board[y][x + 2]) {
                    matches.add(`${x},${y}`);
                    matches.add(`${x + 1},${y}`);
                    matches.add(`${x + 2},${y}`);
                }
            }
        }

        // Вертикальные
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size - 2; y++) {
                const val = this.board[y][x];
                if (val !== -1 && val === this.board[y + 1][x] && val === this.board[y + 2][x]) {
                    matches.add(`${x},${y}`);
                    matches.add(`${x},${y + 1}`);
                    matches.add(`${x},${y + 2}`);
                }
            }
        }

        return Array.from(matches).map(coord => {
            const [x, y] = coord.split(',').map(Number);
            return { x, y };
        });
    }

    // Замена совпадений
    replaceMatches(matches) {
        matches.forEach(({ x, y }) => {
            this.board[y][x] = Math.floor(Math.random() * 6);
        });
    }

    // Обмен двух кристаллов
    swap(x1, y1, x2, y2) {
        const temp = this.board[y1][x1];
        this.board[y1][x1] = this.board[y2][x2];
        this.board[y2][x2] = temp;
    }

    // Проверка, есть ли совпадения после обмена
    hasMatchesAfterSwap(x1, y1, x2, y2) {
        this.swap(x1, y1, x2, y2);
        const matches = this.findAllMatches();
        this.swap(x1, y1, x2, y2); // Возвращаем обратно
        return matches.length > 0;
    }

    // Применение гравитации
    applyGravity() {
        for (let x = 0; x < this.game.boardSize; x++) {
            for (let y = this.game.boardSize - 1; y >= 0; y--) {
                if (this.board[y][x] === -1) {
                    // Ищем кристалл сверху
                    for (let y2 = y - 1; y2 >= 0; y2--) {
                        if (this.board[y2][x] !== -1) {
                            this.board[y][x] = this.board[y2][x];
                            this.board[y2][x] = -1;
                            break;
                        }
                    }
                    // Если не нашли, создаем новый
                    if (this.board[y][x] === -1) {
                        this.board[y][x] = Math.floor(Math.random() * 6);
                    }
                }
            }
        }
    }
}