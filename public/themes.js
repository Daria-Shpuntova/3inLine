// themes.js - Добавь новый файл
class ThemeManager {
    constructor() {
        this.themes = {
            forest: {
                name: 'Лесной',
                background: 'url("images/themes/forest/bg.png")',
                boardBg: 'url("images/themes/forest/board-bg.png")',
                cellBg: 'url("images/themes/forest/cell-bg.png")',
                crystals: {
                    0: 'url("./images/themes/forest/crystal-red.jpg")',
                    1: 'url("./images/themes/forest/crystal-blue.jpg")',
                    2: 'url("./images/themes/forest/crystal-green.jpg")',
                    3: 'url("images/themes/forest/crystal-yellow.jpg")',
                    4: 'url("images/themes/forest/crystal-purple.jpg")',
                    5: 'url("images/themes/forest/crystal-pink.jpg")'
                },
                music: 'audio/themes/forest.mp3'
            },
            space: {
                name: 'Космический',
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
                music: 'audio/themes/space.mp3'
            },
            magic: {
                name: 'Магический',
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
                music: 'audio/themes/magic.mp3'
            }
        };

        this.currentTheme = 'forest';
    }

    // Смена темы
    setTheme(themeName) {
        if (!this.themes[themeName]) return;

        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // Меняем фон всей страницы
        document.body.style.backgroundImage = theme.background;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';

        // Меняем фон игрового поля
        const boardElement = document.getElementById('gameBoard');
        boardElement.style.backgroundImage = theme.boardBg;
        boardElement.style.backgroundSize = 'cover';
        boardElement.style.backgroundPosition = 'center';

        // Сохраняем тему
        localStorage.setItem('gameTheme', themeName);

        // Перерисовываем кристаллы
        if (window.game) {
            window.game.render();
        }
    }

    // Получить URL кристалла по цвету
    getCrystalImage(color) {
        const theme = this.themes[this.currentTheme];
        return theme.crystals[color] || theme.crystals[0];
    }

    // Загрузить сохраненную тему
    loadSavedTheme() {
        const saved = localStorage.getItem('gameTheme');
        if (saved && this.themes[saved]) {
            this.setTheme(saved);
        }
    }
}

// Добавляем в глобальную область
window.themeManager = new ThemeManager();