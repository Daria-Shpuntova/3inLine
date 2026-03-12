// animations.js
class AnimationManager {
    constructor(game) {
        this.game = game;
        this.animations = [];
        this.isAnimating = false;
    }

    // Анимация обмена кристаллов
    animateSwap(x1, y1, x2, y2, callback) {
        this.isAnimating = true;
        console.log('Анимация обмена начата');

        const cell1 = this.getCellElement(x1, y1);
        const cell2 = this.getCellElement(x2, y2);

        if (!cell1 || !cell2) {
            console.log('Клетки не найдены');
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        const bg1 = cell1.style.backgroundImage;
        const bg2 = cell2.style.backgroundImage;
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        const boardRect = document.getElementById('gameBoard').getBoundingClientRect();

        const float1 = this.createFloatingCrystal(bg1, rect1, boardRect);
        const float2 = this.createFloatingCrystal(bg2, rect2, boardRect);

        cell1.style.opacity = '0';
        cell2.style.opacity = '0';

        requestAnimationFrame(() => {
            float1.style.transform = `translate(${rect2.left - rect1.left}px, ${rect2.top - rect1.top}px)`;
            float2.style.transform = `translate(${rect1.left - rect2.left}px, ${rect1.top - rect2.top}px)`;
        });

        setTimeout(() => {
            float1.remove();
            float2.remove();

            this.game.boardSystem.swap(x1, y1, x2, y2);

            cell1.style.backgroundImage = bg2;
            cell2.style.backgroundImage = bg1;
            cell1.style.opacity = '1';
            cell2.style.opacity = '1';

            console.log('Анимация обмена завершена');
            this.isAnimating = false;
            if (callback) callback();
        }, 300);
    }

    createFloatingCrystal(bgImage, rect, boardRect) {
        const float = document.createElement('div');
        float.className = 'floating-crystal';
        float.style.position = 'absolute';
        float.style.left = (rect.left - boardRect.left) + 'px';
        float.style.top = (rect.top - boardRect.top) + 'px';
        float.style.width = rect.width + 'px';
        float.style.height = rect.height + 'px';
        float.style.backgroundImage = bgImage;
        float.style.backgroundSize = 'contain';
        float.style.backgroundPosition = 'center';
        float.style.backgroundRepeat = 'no-repeat';
        float.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)';
        float.style.zIndex = '1000';
        float.style.pointerEvents = 'none';
        float.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        float.style.borderRadius = '8px';

        document.getElementById('gameBoard').appendChild(float);
        return float;
    }

    // Анимация уничтожения кристаллов
    animateDestroy(positions, callback) {
        if (positions.length === 0) {
            if (callback) callback();
            return;
        }

        this.isAnimating = true;
        console.log('Анимация уничтожения начата, позиций:', positions.length);

        let completed = 0;

        positions.forEach(({x, y}, index) => {
            const cell = this.getCellElement(x, y);
            if (!cell) {
                completed++;
                if (completed === positions.length) {
                    console.log('Анимация уничтожения завершена');
                    this.isAnimating = false;
                    if (callback) callback();
                }
                return;
            }

            setTimeout(() => {
                cell.style.transition = 'all 0.2s ease';
                cell.style.transform = 'scale(0)';
                cell.style.opacity = '0';

                setTimeout(() => {
                    completed++;
                    if (completed === positions.length) {
                        console.log('Анимация уничтожения завершена');
                        this.isAnimating = false;
                        if (callback) callback();
                    }
                }, 200);
            }, index * 30);
        });
    }

    // Анимация падения кристаллов (ИСПРАВЛЕННАЯ)
    animateFall(fallData, callback) {
        if (fallData.length === 0) {
            console.log('Нет падений, сразу вызываем callback');
            if (callback) callback();
            return;
        }

        this.isAnimating = true;
        console.log('Анимация падения начата, падений:', fallData.length);

        const boardElement = document.getElementById('gameBoard');
        const boardRect = boardElement.getBoundingClientRect();

        let animationsCompleted = 0;

        // Если по какой-то причине нет данных, все равно вызываем callback
        if (fallData.length === 0) {
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        fallData.forEach(({fromY, toY, x, color}) => {
            const fromCell = this.getCellElement(x, fromY);
            const toCell = this.getCellElement(x, toY);

            if (!fromCell || !toCell) {
                console.log('Клетка не найдена для падения');
                animationsCompleted++;
                if (animationsCompleted === fallData.length) {
                    console.log('Анимация падения завершена (с ошибками)');
                    this.isAnimating = false;
                    if (callback) callback();
                }
                return;
            }

            const fromRect = fromCell.getBoundingClientRect();
            const toRect = toCell.getBoundingClientRect();

            // Создаем падающий кристалл
            const fallingCrystal = document.createElement('div');
            fallingCrystal.className = 'falling-crystal';
            fallingCrystal.style.position = 'absolute';
            fallingCrystal.style.left = (fromRect.left - boardRect.left) + 'px';
            fallingCrystal.style.top = (fromRect.top - boardRect.top) + 'px';
            fallingCrystal.style.width = fromRect.width + 'px';
            fallingCrystal.style.height = fromRect.height + 'px';
            fallingCrystal.style.backgroundImage = themeManager.getCrystalImage(color);
            fallingCrystal.style.backgroundSize = 'contain';
            fallingCrystal.style.backgroundPosition = 'center';
            fallingCrystal.style.backgroundRepeat = 'no-repeat';
            fallingCrystal.style.transition = 'top 0.4s cubic-bezier(0.3, 0.8, 0.4, 1)';
            fallingCrystal.style.zIndex = '900';
            fallingCrystal.style.pointerEvents = 'none';

            boardElement.appendChild(fallingCrystal);

            // Прячем оригинал
            fromCell.style.opacity = '0';

            // Запускаем падение
            requestAnimationFrame(() => {
                fallingCrystal.style.top = (toRect.top - boardRect.top) + 'px';
            });

            // Обрабатываем завершение
            fallingCrystal.addEventListener('transitionend', () => {
                fallingCrystal.remove();

                // Обновляем целевую клетку
                toCell.style.backgroundImage = themeManager.getCrystalImage(color);
                toCell.style.opacity = '1';
                toCell.style.transform = 'scale(1)';

                animationsCompleted++;
                console.log(`Падение ${animationsCompleted}/${fallData.length} завершено`);

                if (animationsCompleted === fallData.length) {
                    // Восстанавливаем все скрытые клетки
                    document.querySelectorAll('.cell').forEach(cell => {
                        cell.style.opacity = '1';
                        cell.style.transform = 'scale(1)';
                    });

                    console.log('Анимация падения полностью завершена');
                    this.isAnimating = false;

                    // ВАЖНО: вызываем callback после завершения всех падений
                    if (callback) {
                        console.log('Вызываем callback после падения');
                        callback();
                    }
                }
            }, { once: true });
        });

        // Страховка на случай, если ни один transitionend не сработает
        setTimeout(() => {
            if (animationsCompleted < fallData.length) {
                console.log('Страховка: принудительно завершаем падение');
                animationsCompleted = fallData.length;
                this.isAnimating = false;
                if (callback) callback();
            }
        }, 1000);
    }

    // Анимация бонусов (заглушка)
    animateBonus(bonusType, centerX, centerY, destroyedPositions) {
        console.log('Анимация бонуса:', bonusType);
    }

    // Вспомогательный метод для получения клетки
    getCellElement(x, y) {
        const board = document.getElementById('gameBoard');
        if (!board) return null;

        const cells = board.querySelectorAll('.cell');
        const index = y * this.game.boardSize + x;
        return cells[index];
    }
}