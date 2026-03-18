// themes.js
class ThemeManager {
    constructor() {
        this.themes = {
            forest: {
                name: 'Лесной',
                background: 'url("images/themes/forest/bg.png")',
                gameContainerBg: 'linear-gradient(135deg, #2e7d32, #1b5e20)', // Темно-зеленый градиент
                boardBg: 'url("images/themes/forest/board-bg.png")',
                colors: {
                    header: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
                    stats: '#2e7d32',
                    buttons: '#2e7d32',
                    buttonsStap: '#39a82c',
                    border: '#1b5e20',
                    colorBoard: '#d5ffd1',
                },
                cellBg: 'url("images/themes/forest/cell-bg.png")',
                crystals: {
                    0: 'url("./images/themes/forest/shiska11.png")',
                    1: 'url("./images/themes/forest/list11.png")',
                    2: 'url("./images/themes/forest/list12.png")',
                    3: 'url("images/themes/forest/kust13.png")',
                    4: 'url("images/themes/forest/derevo1.png")',
                    5: 'url("images/themes/forest/derevo22.png")'
                },
                effects: {
                    cellShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    cellHover: '0 8px 12px rgba(0,0,0,0.4)',
                    glowColor: 'rgba(255,215,0,0.5)'
                },
                music: 'audio/themes/forest.mp3'
            },
            space: {
                name: 'Космический',
                gameContainerBg: 'linear-gradient(135deg, #3F51B5, rgb(14 21 62))',
                colors: {
                    header: 'linear-gradient(135deg, #3F51B5, rgb(14 21 62))',
                    stats: '#030449',
                    buttons: '#020473',
                    buttonsStap: '#2a2bc5',
                    border: '#050781',
                    colorBoard: '#b5b5fa',
                },
                background: 'url("images/themes/space/bg.png")',
                boardBg: 'url("images/themes/space/board-bg.png")',
                cellBg: 'url("images/themes/space/cell-bg.png")',
                crystals: {
                    0: 'url("./images/themes/space/korabl22.png")',
                    1: 'url("./images/themes/space/moon1.png")',
                    2: 'url("./images/themes/space/saturn1.png")',
                    3: 'url("images/themes/space/sputnik11.png")',
                    4: 'url("images/themes/space/star1.png")',
                    5: 'url("images/themes/space/venera1.png")'
                },
                effects: {
                    cellShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    cellHover: '0 8px 12px rgba(0,0,0,0.4)',
                    glowColor: 'rgb(255,247,239)'
                },
                music: 'audio/themes/space.mp3'
            },
            magic: {
                name: 'Магический',
                gameContainerBg: 'linear-gradient(135deg, rgb(88 9 101), rgb(57 10 78))',
                colors: {
                    header: 'linear-gradient(135deg, rgb(88 9 101), rgb(57 10 78))',
                    stats: '#7e0983',
                    buttons: '#700673',
                    buttonsStap: '#9e29a2',
                    border: '#460748',
                    colorBoard: '#eaa1ef',
                },
                background: 'url("images/themes/magic/bg.png")',
                boardBg: 'url("images/themes/magic/board-bg.png")',
                cellBg: 'url("images/themes/magic/cell-bg.png")',
                crystals: {
                    0: 'url("./images/themes/magic/svecha1.png")',
                    1: 'url("./images/themes/magic/simvol22.png")',
                    2: 'url("./images/themes/magic/simvol1.png")',
                    3: 'url("images/themes/magic/shar1.png")',
                    4: 'url("images/themes/magic/fire2.png")',
                    5: 'url("images/themes/magic/fire22.png")'
                },
                effects: {
                    cellShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    cellHover: '0 8px 12px rgba(0,0,0,0.4)',
                    glowColor: 'rgb(126 141 240)'
                },
                music: 'audio/themes/magic.mp3'
            }
        };

        this.currentTheme = 'forest';
    }

    // Инициализация обработчиков тем
    initThemeButtons() {
        const themeButtons = document.querySelectorAll('.theme-btn');

        themeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.setTheme(theme);

                // Обновляем активный класс на кнопках
                themeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    // Смена темы
    setTheme(themeName) {
        if (!this.themes[themeName]) return;

        console.log('Setting theme to:', themeName);
        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // 1. Меняем фон всей страницы
        document.body.style.background = theme.background;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';

        // 2. Меняем фон главного контейнера
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.background = theme.gameContainerBg;
            gameContainer.style.backdropFilter = 'blur(10px)';
            gameContainer.style.border = `2px solid ${theme.colors.border}`;
        }

        // 3. Меняем фон игрового поля
        const boardElement = document.getElementById('gameBoard');
        if (boardElement) {
            boardElement.style.background = theme.boardBg;
            boardElement.style.backgroundSize = 'cover';
            boardElement.style.backgroundPosition = 'center';
            boardElement.style.boxShadow = `0 10px 20px ${theme.effects.glowColor}`;
        }

        // 4. Меняем цвет сетки (board-grid)
        const colorBoard = document.querySelectorAll('.board-grid');
        colorBoard.forEach(btn => {
            btn.style.background = theme.colors.colorBoard;
        });

        // 5. Меняем стиль шапки
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            gameHeader.style.background = theme.colors.header;
        }

        // 6. Меняем стиль статистики
        const gameStats = document.querySelector('.game-stats');
        if (gameStats) {
            gameStats.style.background = theme.colors.stats;
            gameStats.style.color = 'white';
        }

        // 7. Меняем стиль кнопок
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            btn.style.background = theme.colors.buttons;
        });

        const buttonsStap = document.querySelectorAll('.btn-secondary');
        buttonsStap.forEach(btn => {
            btn.style.background = theme.colors.buttonsStap;
        });

        // 8. Меняем стиль бонусов
        const bonusCards = document.querySelectorAll('.bonus-card');
        bonusCards.forEach(card => {
            card.style.background = 'rgba(255, 255, 255, 0.1)';
            card.style.backdropFilter = 'blur(5px)';
            card.style.border = `1px solid ${theme.colors.border}`;
        });

        // 9. Меняем стиль селекторов размера
        const sizeBtns = document.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.color = 'white';
        });

        // Сохраняем тему
        localStorage.setItem('gameTheme', themeName);

        // 10. Обновляем ВСЕ кристаллы на поле!
        this.updateAllCrystals();

        // Добавляем эффект перехода
        this.addTransitionEffect();
    }

    // Обновление всех кристаллов на поле
    // themes.js - исправленный метод updateAllCrystals

    updateAllCrystals() {
        console.log('Updating all crystals with theme:', this.currentTheme);

        // Находим все клетки на поле
        const cells = document.querySelectorAll('.cell');

        cells.forEach(cell => {
            // Пробуем разные варианты получения координат
            const x = cell.dataset.x !== undefined ? parseInt(cell.dataset.x) :
                (cell.dataset.col !== undefined ? parseInt(cell.dataset.col) : null);
            const y = cell.dataset.y !== undefined ? parseInt(cell.dataset.y) :
                (cell.dataset.row !== undefined ? parseInt(cell.dataset.row) : null);

            // Если есть координаты и игра существует
            if (x !== null && y !== null && window.game && window.game.board && window.game.board[y]) {
                const value = window.game.board[y][x];

                if (value !== undefined && value >= 0) {
                    // Получаем изображение для этого типа кристалла
                    const crystalImage = this.getCrystalImage(value);

                    // Применяем стиль
                    cell.style.backgroundImage = crystalImage;
                    cell.style.backgroundSize = 'contain';
                    cell.style.backgroundPosition = 'center';
                    cell.style.backgroundRepeat = 'no-repeat';

                    // Добавляем тень из темы
                    const theme = this.themes[this.currentTheme];
                    cell.style.boxShadow = theme.effects.cellShadow;
                }
            } else {
                console.warn('Cell without valid coordinates:', cell, {x, y});
            }
        });

        console.log('Crystals updated');
    }

    // Получить стиль кристалла по цвету
    getCrystalImage(color) {
        const theme = this.themes[this.currentTheme];
        return theme.crystals[color] || theme.crystals[0];
    }

    // Эффект смены темы
    addTransitionEffect() {
        const elements = [
            document.body,
            document.querySelector('.game-container'),
            document.getElementById('gameBoard')
        ];

        elements.forEach(el => {
            if (el) {
                el.style.transition = 'all 0.5s ease';
            }
        });

        setTimeout(() => {
            elements.forEach(el => {
                if (el) {
                    el.style.transition = '';
                }
            });
        }, 500);
    }

    loadSavedTheme() {
        const saved = localStorage.getItem('gameTheme');
        if (saved && this.themes[saved]) {
            this.setTheme(saved);

            const activeBtn = document.querySelector(`.theme-btn[data-theme="${saved}"]`);
            if (activeBtn) {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                activeBtn.classList.add('active');
            }
        }
    }
}

// Добавляем в глобальную область
window.themeManager = new ThemeManager();

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    if (window.themeManager) {
        window.themeManager.initThemeButtons();
        window.themeManager.loadSavedTheme();
    }
});