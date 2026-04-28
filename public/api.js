class GameAPI {
    constructor() {
        this.baseUrl = window.location.origin;
        this.playerId = null;
        this.username = null;
    }

    async login(username) {
        try {
            const response = await fetch(`${this.baseUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (data.playerId) {
                this.playerId = data.playerId;
                this.username = data.username;
                return { success: true, data };
            }
            return { success: false };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getGameState() {
        try {
            const response = await fetch(`${this.baseUrl}/api/game-state/${this.playerId}`);
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveGameResult(score, won) {
        try {
            const response = await fetch(`${this.baseUrl}/api/game-result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.playerId, score, won })
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // В классе GameAPI замените метод buyBonus
    async buyBonus(bonusType, price) {
        try {
            // Если нет playerId, возвращаем успех для локальной покупки
            if (!this.playerId) {
                console.warn('No playerId, buying locally');
                return { success: true, local: true };
            }

            const response = await fetch(`${this.baseUrl}/api/buy-bonus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.playerId, bonusType, price })
            });

            // Проверяем статус ответа
            if (!response.ok) {
                console.warn('API response not ok, buying locally');
                return { success: true, local: true };
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.warn('API error, buying locally:', error.message);
            // Возвращаем успех чтобы локальная покупка прошла
            return { success: true, local: true, error: error.message };
        }
    }

    async useBonus(bonusType) {
        try {
            const response = await fetch(`${this.baseUrl}/api/use-bonus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.playerId, bonusType })
            });
            const data = await response.json();
            return { success: data.success };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Создаем глобальный экземпляр
const api = new GameAPI();