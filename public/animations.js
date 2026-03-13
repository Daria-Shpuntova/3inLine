// AnimationManager.js - исправленная версия

class AnimationManager {
    constructor(game) {
        this.game = game;
        this.animations = [];
        this.isAnimating = false;
        this.animationQueue = [];
    }

    // Анимация обмена
    animateSwap(x1, y1, x2, y2, callback) {
        console.log('Animating swap');
        this.isAnimating = true;

        const cell1 = this.getCellElement(x1, y1);
        const cell2 = this.getCellElement(x2, y2);

        if (!cell1 || !cell2) {
            console.warn('Cells not found for swap animation');
            this.isAnimating = false;
            callback();
            return;
        }

        const bg1 = cell1.style.backgroundImage;
        const bg2 = cell2.style.backgroundImage;

        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        const boardElement = document.getElementById('gameBoard');
        const boardRect = boardElement.getBoundingClientRect();

        // Создаем плавающие кристаллы
        const float1 = this.createFloatingCrystal(bg1, rect1, boardRect);
        const float2 = this.createFloatingCrystal(bg2, rect2, boardRect);

        // Временно скрываем оригиналы
        cell1.style.opacity = '0';
        cell2.style.opacity = '0';

        // Анимируем
        requestAnimationFrame(() => {
            float1.style.transform = `translate(${rect2.left - rect1.left}px, ${rect2.top - rect1.top}px)`;
            float2.style.transform = `translate(${rect1.left - rect2.left}px, ${rect1.top - rect2.top}px)`;
        });

        setTimeout(() => {
            // Удаляем плавающие кристаллы
            if (float1.parentNode) float1.remove();
            if (float2.parentNode) float2.remove();

            // Меняем фоны и показываем
            cell1.style.backgroundImage = bg2;
            cell2.style.backgroundImage = bg1;
            cell1.style.opacity = '1';
            cell2.style.opacity = '1';

            // Сбрасываем трансформации
            cell1.style.transform = '';
            cell2.style.transform = '';

            this.isAnimating = false;
            console.log('Swap animation completed');

            // Вызываем колбэк
            if (callback) callback();
        }, 300);
    }

    // Анимация уничтожения - ИСПРАВЛЕНО
    animateDestroy(positions, callback) {
        if (!positions || positions.length === 0) {
            console.log('No positions to destroy');
            if (callback) callback();
            return;
        }

        console.log('Animating destroy for', positions.length, 'cells');
        this.isAnimating = true;

        let completed = 0;
        const total = positions.length;

        positions.forEach(({x, y}) => {
            const cell = this.getCellElement(x, y);
            if (!cell) {
                completed++;
                this.checkDestroyComplete(completed, total, callback);
                return;
            }

            // Добавляем эффект
            cell.style.transition = 'all 0.2s ease';
            cell.style.transform = 'scale(0)';
            cell.style.opacity = '0';

            setTimeout(() => {
                cell.style.backgroundImage = 'none';
                completed++;
                this.checkDestroyComplete(completed, total, callback);
            }, 200);
        });
    }

    checkDestroyComplete(completed, total, callback) {
        if (completed === total) {
            console.log('Destroy animation completed');
            this.isAnimating = false;
            if (callback) callback();
        }
    }

    // Анимация падения - ИСПРАВЛЕНО
    animateFall(fallData, callback) {
        if (!fallData || fallData.length === 0) {
            console.log('No fall data');
            if (callback) callback();
            return;
        }

        console.log('Animating fall for', fallData.length, 'crystals');
        this.isAnimating = true;

        const boardElement = document.getElementById('gameBoard');
        const boardRect = boardElement.getBoundingClientRect();

        let completed = 0;
        const total = fallData.length;

        // Если нет данных для падения, сразу завершаем
        if (total === 0) {
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        fallData.forEach(({fromY, toY, x, color}) => {
            const fromCell = this.getCellElement(x, fromY);
            const toCell = this.getCellElement(x, toY);

            if (!fromCell || !toCell) {
                console.warn('Cell not found for fall animation', {x, fromY, toY});
                completed++;
                this.checkFallComplete(completed, total, callback);
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

            // Получаем изображение
            const imageUrl = this.getCrystalImage(color);
            fallingCrystal.style.backgroundImage = imageUrl;
            fallingCrystal.style.backgroundSize = 'contain';
            fallingCrystal.style.backgroundPosition = 'center';
            fallingCrystal.style.backgroundRepeat = 'no-repeat';

            fallingCrystal.style.transition = 'top 0.4s cubic-bezier(0.3, 0.8, 0.4, 1)';
            fallingCrystal.style.zIndex = '1000';
            fallingCrystal.style.pointerEvents = 'none';

            boardElement.appendChild(fallingCrystal);

            // Прячем оригинал
            fromCell.style.opacity = '0';

            // Запускаем падение
            requestAnimationFrame(() => {
                fallingCrystal.style.top = (toRect.top - boardRect.top) + 'px';
            });

            // Обработчик завершения анимации
            const onTransitionEnd = () => {
                fallingCrystal.removeEventListener('transitionend', onTransitionEnd);
                fallingCrystal.remove();

                // Обновляем целевую клетку
                toCell.style.backgroundImage = imageUrl;
                toCell.style.opacity = '1';
                toCell.style.transform = 'scale(1)';

                completed++;
                this.checkFallComplete(completed, total, callback);
            };

            fallingCrystal.addEventListener('transitionend', onTransitionEnd);

            // Запасной таймер на случай, если transitionend не сработает
            setTimeout(() => {
                if (fallingCrystal.parentNode) {
                    fallingCrystal.remove();
                    toCell.style.backgroundImage = imageUrl;
                    toCell.style.opacity = '1';
                    completed++;
                    this.checkFallComplete(completed, total, callback);
                }
            }, 500);
        });
    }

    checkFallComplete(completed, total, callback) {
        if (completed === total) {
            console.log('Fall animation completed');

            // Восстанавливаем все клетки
            document.querySelectorAll('.cell').forEach(cell => {
                cell.style.transition = '';
                cell.style.transform = '';
                if (!cell.style.opacity || cell.style.opacity === '0') {
                    cell.style.opacity = '1';
                }
            });

            this.isAnimating = false;
            if (callback) callback();
        }
    }

    getCrystalImage(type) {
        if (typeof themeManager !== 'undefined' && themeManager.getCrystalImage) {
            return themeManager.getCrystalImage(type);
        }

        // Запасной вариант
        const colors = [
            'linear-gradient(135deg, #ff6b6b, #ee5253)',
            'linear-gradient(135deg, #ff9ff3, #f368e0)',
            'linear-gradient(135deg, #feca57, #ff9f43)',
            'linear-gradient(135deg, #48dbfb, #0abde3)',
            'linear-gradient(135deg, #1dd1a1, #10ac84)',
            'linear-gradient(135deg, #5f27cd, #341f97)'
        ];
        return colors[type] || colors[0];
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

        document.getElementById('gameBoard').appendChild(float);
        return float;
    }

    getCellElement(x, y) {
        const board = document.getElementById('gameBoard');
        if (!board) return null;

        // Ищем клетку по data-атрибутам
        const cells = board.querySelectorAll('.cell');
        for (let cell of cells) {
            if (parseInt(cell.dataset.x) === x && parseInt(cell.dataset.y) === y) {
                return cell;
            }
        }
        return null;
    }
}