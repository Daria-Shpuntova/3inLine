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

    async buyBonus(bonusType, price) {
        try {
            const response = await fetch(`${this.baseUrl}/api/buy-bonus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: this.playerId, bonusType, price })
            });
            const data = await response.json();
            return { success: data.success, error: data.error };
        } catch (error) {
            return { success: false, error: error.message };
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