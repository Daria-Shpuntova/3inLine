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
                    0: 'url("./images/themes/space/crystal-red.jpg")',
                    1: 'url("./images/themes/space/crystal-blue.jpg")',
                    2: 'url("./images/themes/space/crystal-green.jpg")',
                    3: 'url("images/themes/space/crystal-yellow.jpg")',
                    4: 'url("images/themes/space/crystal-purple.jpg")',
                    5: 'url("images/themes/space/crystal-pink.jpg")'
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
                    0: 'url("./images/themes/magic/crystal-red.jpg")',
                    1: 'url("./images/themes/magic/crystal-blue.jpg")',
                    2: 'url("./images/themes/magic/crystal-green.jpg")',
                    3: 'url("images/themes/magic/crystal-yellow.jpg")',
                    4: 'url("images/themes/magic/crystal-purple.jpg")',
                    5: 'url("images/themes/magic/crystal-pink.jpg")'
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

        const colorBoard = document.querySelectorAll('.board-grid');
        colorBoard.forEach(btn => {
            btn.style.background = theme.colors.colorBoard;
        });



        // 4. Меняем стиль шапки
        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) {
            gameHeader.style.background = theme.colors.header;
        }

        // 5. Меняем стиль статистики
        const gameStats = document.querySelector('.game-stats');
        if (gameStats) {
            gameStats.style.background = theme.colors.stats;
            gameStats.style.color = 'white';
        }

        // 6. Меняем стиль кнопок
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            btn.style.background = theme.colors.buttons;
        });
        const buttonsStap = document.querySelectorAll('.btn-secondary');
        buttonsStap.forEach(btn => {
            btn.style.background = theme.colors.buttonsStap;
        });



        // 7. Меняем стиль бонусов
        const bonusCards = document.querySelectorAll('.bonus-card');
        bonusCards.forEach(card => {
            card.style.background = 'rgba(255, 255, 255, 0.1)';
            card.style.backdropFilter = 'blur(5px)';
            card.style.border = `1px solid ${theme.colors.border}`;
        });

        // 8. Меняем стиль селекторов размера
        const sizeBtns = document.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.color = 'white';
        });

        // Сохраняем тему
        localStorage.setItem('gameTheme', themeName);

        // Перерисовываем кристаллы
        this.updateAllCrystals();

        // Добавляем эффект перехода
        this.addTransitionEffect();
    }

    // Обновление всех кристаллов на поле
    updateAllCrystals() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = cell.dataset.row;
            const col = cell.dataset.col;

            if (row && col && window.game && window.game.board.grid[row] && window.game.board.grid[row][col] !== undefined) {
                const value = window.game.board.grid[row][col];
                cell.style.background = this.getCrystalImage(value);
                cell.style.backgroundSize = 'cover';
                cell.style.backgroundPosition = 'center';

                // Применяем эффекты темы
                const theme = this.themes[this.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            }
        });
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