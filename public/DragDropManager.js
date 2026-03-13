// DragDropManager.js - исправленная версия

class DragDropManager {
    constructor(game) {
        console.log('DragDropManager created');
        this.game = game;
        this.isDragging = false;
        this.dragStart = null;
        this.dragClone = null;
        this.clickTimer = null;
        this.clickThreshold = 200;

        // Привязываем методы
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    init() {
        console.log('DragDropManager.init() called, gameActive=', this.game.gameActive);

        // Удаляем старые обработчики
        this.removeAllListeners();

        const cells = document.querySelectorAll('.cell');
        console.log('Found cells:', cells.length);

        if (cells.length === 0) {
            console.warn('No cells found for drag drop');
            return;
        }

        cells.forEach(cell => {
            // Убираем старые обработчики и добавляем новые
            cell.removeEventListener('mousedown', this.handleMouseDown);
            cell.addEventListener('mousedown', this.handleMouseDown);
            cell.style.cursor = 'pointer';
        });

        // Глобальные обработчики
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        console.log('DragDropManager initialized');
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
        if (!cell) return;

        console.log('Mouse down on cell', cell.dataset, 'gameActive=', this.game.gameActive);
        e.preventDefault();

        // Проверяем, не застыла ли анимация
        if (this.game.animations?.isAnimating) {
            console.log('Animating, but checking if stuck...');
            // Если анимация длится слишком долго, сбрасываем
            setTimeout(() => {
                if (this.game.animations?.isAnimating) {
                    console.log('Animation seems stuck, resetting...');
                    this.game.resetAnimationState();
                }
            }, 2000);
            return;
        }

        // Проверяем, можно ли взаимодействовать - УПРОЩАЕМ ПРОВЕРКУ
        if (!this.game.gameActive) {
            console.log('Game not active');
            return;
        }

        if (this.game.lives <= 0) {
            console.log('No lives');
            return;
        }

        if (this.game.animations?.isAnimating) {
            console.log('Animating');
            return;
        }

        if (this.game.isProcessing || this.game.matchChainInProgress) {
            console.log('Processing matches');
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

        // Таймер для определения клика vs драга
        this.clickTimer = setTimeout(() => {
            if (this.dragStart && !this.isDragging) {
                console.log('Starting drag by timer');
                this.startDragging(e, cell);
            }
        }, this.clickThreshold);

        cell.classList.add('potential-drag');
    }

    handleMouseMove(e) {
        if (!this.dragStart) return;

        // Упрощаем проверку
        if (this.game.animations?.isAnimating) return;

        // Если еще не драг, проверяем смещение
        if (!this.isDragging) {
            const dx = Math.abs(e.clientX - this.dragStart.startX);
            const dy = Math.abs(e.clientY - this.dragStart.startY);

            if (dx > 10 || dy > 10) {
                console.log('Starting drag by movement');
                clearTimeout(this.clickTimer);
                this.startDragging(e, this.dragStart.cell);
            }
            return;
        }

        // Двигаем клон
        e.preventDefault();
        if (this.dragClone) {
            this.dragClone.style.left = (e.clientX - 30) + 'px';
            this.dragClone.style.top = (e.clientY - 30) + 'px';
            this.highlightDropTarget(e);
        }
    }

    handleMouseUp(e) {
        if (!this.dragStart) return;

        console.log('Mouse up', { isDragging: this.isDragging });
        clearTimeout(this.clickTimer);

        if (!this.isDragging) {
            this.handleClick(this.dragStart.cell);
        } else {
            this.handleDrop(e);
        }

        this.cleanupDrag();
    }

    handleClick(cell) {
        console.log('Click on cell', cell.dataset);

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        if (!this.game.selectedCell) {
            // Первый клик - выбираем
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            this.game.selectedCell = { x, y };
            console.log('Selected cell:', x, y);
        } else {
            // Второй клик - пробуем обменять
            const x1 = this.game.selectedCell.x;
            const y1 = this.game.selectedCell.y;

            // Проверяем соседство
            const dx = Math.abs(x - x1);
            const dy = Math.abs(y - y1);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Пробуем обменять
                const success = this.game.trySwap(x1, y1, x, y);
                if (success) {
                    // Если обмен успешен, снимаем выделение
                    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                    this.game.selectedCell = null;
                }
            } else {
                // Если не соседние - просто выбираем новую
                document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                this.game.selectedCell = { x, y };
            }
        }
    }

    handleDrop(e) {
        console.log('Handling drop');

        const elementsUnderMouse = document.elementsFromPoint(e.clientX, e.clientY);
        const dropCell = elementsUnderMouse.find(el => el.classList.contains('cell'));

        if (dropCell && dropCell !== this.dragStart.cell) {
            const targetX = parseInt(dropCell.dataset.x);
            const targetY = parseInt(dropCell.dataset.y);
            const startX = this.dragStart.x;
            const startY = this.dragStart.y;

            // Проверяем соседство
            const dx = Math.abs(targetX - startX);
            const dy = Math.abs(targetY - startY);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                const success = this.game.trySwap(startX, startY, targetX, targetY);
                if (success) {
                    // Если обмен успешен, снимаем выделение
                    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                    this.game.selectedCell = null;
                }
            }
        }
    }

    startDragging(e, cell) {
        this.isDragging = true;
        this.createDragClone(cell, e);
        cell.classList.add('dragging');

        // Убираем выделение
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